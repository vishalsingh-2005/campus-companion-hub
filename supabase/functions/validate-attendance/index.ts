import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createRemoteJWKSet, jwtVerify } from 'https://esm.sh/jose@5.9.6';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Calculate distance between two coordinates in meters (Haversine formula)
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

// Generate a cryptographically secure token using HMAC-SHA256
async function generateToken(secret: string, timestamp: number): Promise<string> {
  const data = `${secret}-${timestamp}`;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(data)
  );
  const hashArray = Array.from(new Uint8Array(signature));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex.substring(0, 16);
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization') ?? req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized', code: 'NO_AUTH' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Service client for database operations
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    // Verify JWT locally using signing keys (JWKS)
    const token = authHeader.slice('Bearer '.length);
    const issuer = `${supabaseUrl}/auth/v1`;
    const jwks = createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`));

    let userId: string;
    try {
      const { payload } = await jwtVerify(token, jwks, {
        issuer,
        audience: 'authenticated',
      });
      userId = String(payload.sub || '');
      if (!userId) throw new Error('Missing sub');
    } catch (e) {
      console.error('Auth error:', e);
      return new Response(
        JSON.stringify({ error: 'Invalid token', code: 'INVALID_TOKEN' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { action } = body;

    console.log(`Action: ${action}, User: ${userId}`);

    // ==============================
    // ACTION: Generate QR Token (Teacher)
    // ==============================
    if (action === 'generate_qr') {
      const { session_id } = body;

      // Verify teacher owns this session OR user is admin
      const { data: session, error: sessionError } = await serviceClient
        .from('secure_attendance_sessions')
        .select(`
          *,
          teachers(user_id),
          classroom_locations(latitude, longitude, radius_meters)
        `)
        .eq('id', session_id)
        .single();

      if (sessionError || !session) {
        return new Response(
          JSON.stringify({ error: 'Session not found', code: 'SESSION_NOT_FOUND' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if user is admin
      const { data: userRole } = await serviceClient
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();
      
      const isAdmin = userRole?.role === 'admin';
      const isSessionTeacher = session.teachers?.user_id === userId;

      if (!isAdmin && !isSessionTeacher) {
        return new Response(
          JSON.stringify({ error: 'Not authorized', code: 'NOT_AUTHORIZED' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (session.status !== 'active') {
        return new Response(
          JSON.stringify({ error: 'Session is not active', code: 'SESSION_INACTIVE' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Generate new token
      const now = Date.now();
      const rotationMs = (session.qr_rotation_interval_seconds || 30) * 1000;
      const currentWindow = Math.floor(now / rotationMs);
      const newToken = await generateToken(session.qr_secret, currentWindow);
      const expiresAt = new Date((currentWindow + 1) * rotationMs);

      // Update session with new token
      await serviceClient
        .from('secure_attendance_sessions')
        .update({
          current_qr_token: newToken,
          current_qr_expires_at: expiresAt.toISOString(),
        })
        .eq('id', session_id);

      return new Response(
        JSON.stringify({
          success: true,
          token: newToken,
          expires_at: expiresAt.toISOString(),
          session_id,
          rotation_seconds: session.qr_rotation_interval_seconds,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ==============================
    // ACTION: Mark Attendance (Student)
    // ==============================
    if (action === 'mark_attendance') {
      const {
        session_id,
        qr_token,
        latitude,
        longitude,
        gps_accuracy,
        device_fingerprint,
        selfie_url,
      } = body;

      // Get student record
      const { data: student, error: studentError } = await serviceClient
        .from('students')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (studentError || !student) {
        await logProxyAttempt(serviceClient, {
          session_id,
          attempt_type: 'NO_STUDENT_RECORD',
          failure_reason: 'User is not linked to a student record',
          device_fingerprint,
          latitude,
          longitude,
          qr_token_attempted: qr_token,
          user_agent: req.headers.get('user-agent'),
        });
        return new Response(
          JSON.stringify({ error: 'Not a registered student', code: 'NOT_STUDENT' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get session with location
      const { data: session, error: sessionError } = await serviceClient
        .from('secure_attendance_sessions')
        .select(`
          *,
          classroom_locations(latitude, longitude, radius_meters)
        `)
        .eq('id', session_id)
        .single();

      if (sessionError || !session) {
        await logProxyAttempt(serviceClient, {
          session_id,
          student_id: student.id,
          attempt_type: 'INVALID_SESSION',
          failure_reason: 'Session not found',
          device_fingerprint,
          latitude,
          longitude,
          qr_token_attempted: qr_token,
          user_agent: req.headers.get('user-agent'),
        });
        return new Response(
          JSON.stringify({ error: 'Invalid session', code: 'INVALID_SESSION' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Validation 1: Session is active
      if (session.status !== 'active') {
        await logProxyAttempt(serviceClient, {
          session_id,
          student_id: student.id,
          attempt_type: 'SESSION_ENDED',
          failure_reason: 'Attendance session has ended',
          device_fingerprint,
          latitude,
          longitude,
          qr_token_attempted: qr_token,
          user_agent: req.headers.get('user-agent'),
        });
        return new Response(
          JSON.stringify({ error: 'Session has ended', code: 'SESSION_ENDED' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Validation 2: Time window
      const now = new Date();
      const sessionStart = new Date(session.start_time);
      const windowEnd = new Date(sessionStart.getTime() + session.time_window_minutes * 60 * 1000);
      
      if (now > windowEnd) {
        await logProxyAttempt(serviceClient, {
          session_id,
          student_id: student.id,
          attempt_type: 'TIME_EXPIRED',
          failure_reason: `Time window expired at ${windowEnd.toISOString()}`,
          device_fingerprint,
          latitude,
          longitude,
          qr_token_attempted: qr_token,
          user_agent: req.headers.get('user-agent'),
        });
        return new Response(
          JSON.stringify({ error: 'Attendance time window has expired', code: 'TIME_EXPIRED' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Validation 3: QR token validity
      const rotationMs = (session.qr_rotation_interval_seconds || 30) * 1000;
      const currentWindow = Math.floor(Date.now() / rotationMs);
      const prevWindow = currentWindow - 1;
      
      const validTokens = [
        await generateToken(session.qr_secret, currentWindow),
        await generateToken(session.qr_secret, prevWindow), // Allow previous window for latency
      ];

      if (!validTokens.includes(qr_token)) {
        await logProxyAttempt(serviceClient, {
          session_id,
          student_id: student.id,
          attempt_type: 'INVALID_QR',
          failure_reason: 'QR code is expired or invalid',
          device_fingerprint,
          latitude,
          longitude,
          qr_token_attempted: qr_token,
          user_agent: req.headers.get('user-agent'),
        });
        return new Response(
          JSON.stringify({ error: 'Invalid or expired QR code', code: 'INVALID_QR' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Validation 4: GPS location (if required)
      let distanceFromClassroom: number | null = null;
      
      if (session.require_gps && session.classroom_locations) {
        const classLat = parseFloat(session.classroom_locations.latitude);
        const classLon = parseFloat(session.classroom_locations.longitude);
        const radiusMeters = session.classroom_locations.radius_meters || 50;

        if (!latitude || !longitude) {
          await logProxyAttempt(serviceClient, {
            session_id,
            student_id: student.id,
            attempt_type: 'NO_GPS',
            failure_reason: 'GPS location not provided but required',
            device_fingerprint,
            qr_token_attempted: qr_token,
            user_agent: req.headers.get('user-agent'),
          });
          return new Response(
            JSON.stringify({ error: 'GPS location is required', code: 'GPS_REQUIRED' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        distanceFromClassroom = calculateDistance(latitude, longitude, classLat, classLon);
        
        if (distanceFromClassroom > radiusMeters) {
          await logProxyAttempt(serviceClient, {
            session_id,
            student_id: student.id,
            attempt_type: 'OUTSIDE_RADIUS',
            failure_reason: `Distance ${distanceFromClassroom.toFixed(0)}m exceeds allowed ${radiusMeters}m`,
            device_fingerprint,
            latitude,
            longitude,
            qr_token_attempted: qr_token,
            user_agent: req.headers.get('user-agent'),
          });
          return new Response(
            JSON.stringify({ 
              error: 'You are too far from the classroom', 
              code: 'OUTSIDE_RADIUS',
              distance: Math.round(distanceFromClassroom),
              allowed_radius: radiusMeters,
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // Validation 5: Device binding
      if (device_fingerprint) {
        const { data: devices } = await serviceClient
          .from('student_devices')
          .select('*')
          .eq('student_id', student.id)
          .eq('is_active', true);

        if (devices && devices.length > 0) {
          const registeredDevice = devices.find(d => d.device_fingerprint === device_fingerprint);
          
          if (!registeredDevice) {
            await logProxyAttempt(serviceClient, {
              session_id,
              student_id: student.id,
              attempt_type: 'UNREGISTERED_DEVICE',
              failure_reason: 'Attendance attempted from unregistered device',
              device_fingerprint,
              latitude,
              longitude,
              qr_token_attempted: qr_token,
              user_agent: req.headers.get('user-agent'),
            });
            return new Response(
              JSON.stringify({ 
                error: 'This device is not registered. Please use your registered device.', 
                code: 'UNREGISTERED_DEVICE' 
              }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          // Update last used
          await serviceClient
            .from('student_devices')
            .update({ last_used_at: new Date().toISOString() })
            .eq('id', registeredDevice.id);
        }
      }

      // Validation 6: Selfie (if required)
      if (session.require_selfie && !selfie_url) {
        await logProxyAttempt(serviceClient, {
          session_id,
          student_id: student.id,
          attempt_type: 'NO_SELFIE',
          failure_reason: 'Selfie not provided but required',
          device_fingerprint,
          latitude,
          longitude,
          qr_token_attempted: qr_token,
          user_agent: req.headers.get('user-agent'),
        });
        return new Response(
          JSON.stringify({ error: 'Selfie photo is required', code: 'SELFIE_REQUIRED' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Validation 7: Check for duplicate attendance
      const { data: existing } = await serviceClient
        .from('secure_attendance_records')
        .select('id')
        .eq('session_id', session_id)
        .eq('student_id', student.id)
        .single();

      if (existing) {
        return new Response(
          JSON.stringify({ error: 'Attendance already marked', code: 'ALREADY_MARKED' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // All validations passed - record attendance
      const { data: record, error: insertError } = await serviceClient
        .from('secure_attendance_records')
        .insert({
          session_id,
          student_id: student.id,
          latitude,
          longitude,
          gps_accuracy_meters: gps_accuracy,
          distance_from_classroom_meters: distanceFromClassroom,
          selfie_url,
          qr_token_used: qr_token,
          verification_status: 'verified',
        })
        .select()
        .single();

      if (insertError) {
        console.error('Insert error:', insertError);
        return new Response(
          JSON.stringify({ error: 'Failed to record attendance', code: 'INSERT_FAILED' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Update attendance count
      await serviceClient
        .from('secure_attendance_sessions')
        .update({ attendance_count: session.attendance_count + 1 })
        .eq('id', session_id);

      console.log(`Attendance marked for student ${student.id} in session ${session_id}`);

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Attendance marked successfully',
          record_id: record.id,
          marked_at: record.marked_at,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Unknown action', code: 'UNKNOWN_ACTION' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', code: 'SERVER_ERROR' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Helper to log proxy attempts
async function logProxyAttempt(
  client: any,
  data: {
    session_id?: string;
    student_id?: string;
    attempt_type: string;
    failure_reason: string;
    device_fingerprint?: string;
    ip_address?: string;
    user_agent?: string | null;
    latitude?: number;
    longitude?: number;
    qr_token_attempted?: string;
  }
) {
  try {
    await client.from('proxy_attempt_logs').insert({
      session_id: data.session_id || null,
      student_id: data.student_id || null,
      attempt_type: data.attempt_type,
      failure_reason: data.failure_reason,
      device_fingerprint: data.device_fingerprint || null,
      ip_address: data.ip_address || null,
      user_agent: data.user_agent || null,
      latitude: data.latitude || null,
      longitude: data.longitude || null,
      qr_token_attempted: data.qr_token_attempted || null,
    });
  } catch (err) {
    console.error('Failed to log proxy attempt:', err);
  }
}
