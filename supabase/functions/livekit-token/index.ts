import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// LiveKit token generation using JWT
async function createLiveKitToken(
  apiKey: string,
  apiSecret: string,
  roomName: string,
  participantName: string,
  participantIdentity: string,
  isHost: boolean = false
): Promise<string> {
  const header = { alg: "HS256", typ: "JWT" };
  
  const now = Math.floor(Date.now() / 1000);
  const exp = now + 86400; // 24 hours
  
  const videoGrant: Record<string, any> = {
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  };
  
  if (isHost) {
    videoGrant.roomAdmin = true;
    videoGrant.roomCreate = true;
    videoGrant.canUpdateOwnMetadata = true;
  }
  
  const payload = {
    iss: apiKey,
    sub: participantIdentity,
    name: participantName,
    exp,
    nbf: now,
    iat: now,
    video: videoGrant,
  };
  
  // Base64URL encode
  const encode = (obj: any) => {
    const str = JSON.stringify(obj);
    const bytes = new TextEncoder().encode(str);
    const base64 = btoa(String.fromCharCode(...bytes));
    return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  };
  
  const headerEncoded = encode(header);
  const payloadEncoded = encode(payload);
  const signatureInput = `${headerEncoded}.${payloadEncoded}`;
  
  // Sign with HMAC-SHA256
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(apiSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(signatureInput)
  );
  
  const signatureBytes = new Uint8Array(signature);
  const signatureBase64 = btoa(String.fromCharCode(...signatureBytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  
  return `${signatureInput}.${signatureBase64}`;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LIVEKIT_API_KEY = Deno.env.get("LIVEKIT_API_KEY");
    const LIVEKIT_API_SECRET = Deno.env.get("LIVEKIT_API_SECRET");
    const LIVEKIT_URL = Deno.env.get("LIVEKIT_URL");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET || !LIVEKIT_URL) {
      console.error("Missing LiveKit configuration");
      return new Response(
        JSON.stringify({ error: "LiveKit not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Verify user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { action, sessionId, roomName, participantName } = await req.json();
    console.log("Request:", { action, sessionId, roomName, participantName, userId: user.id });

    if (action === "create-room") {
      // Create a new room and get host token
      if (!sessionId) {
        return new Response(
          JSON.stringify({ error: "Session ID required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get session details
      const { data: session, error: sessionError } = await supabase
        .from("live_sessions")
        .select("*")
        .eq("id", sessionId)
        .single();

      if (sessionError || !session) {
        console.error("Session error:", sessionError);
        return new Response(
          JSON.stringify({ error: "Session not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Verify user is the host
      if (session.host_id !== user.id) {
        // Check if admin
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .single();

        if (roleData?.role !== "admin") {
          return new Response(
            JSON.stringify({ error: "Only the host can start this session" }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      // Generate room name
      const generatedRoomName = session.room_name || `session-${sessionId}`;
      
      // Generate host token
      const hostToken = await createLiveKitToken(
        LIVEKIT_API_KEY,
        LIVEKIT_API_SECRET,
        generatedRoomName,
        participantName || user.email || "Host",
        user.id,
        true
      );

      // Update session with room name and status
      await supabase
        .from("live_sessions")
        .update({
          room_name: generatedRoomName,
          status: "live",
          actual_start: new Date().toISOString(),
        })
        .eq("id", sessionId);

      // Add host as participant
      await supabase
        .from("session_participants")
        .upsert({
          session_id: sessionId,
          user_id: user.id,
          participant_name: participantName || user.email,
          role: "host",
          joined_at: new Date().toISOString(),
          is_approved: true,
        }, { onConflict: "session_id,user_id" });

      console.log("Room created:", generatedRoomName);

      return new Response(
        JSON.stringify({
          token: hostToken,
          roomName: generatedRoomName,
          livekitUrl: LIVEKIT_URL,
          sessionId,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "join-room") {
      // Join an existing room
      if (!sessionId && !roomName) {
        return new Response(
          JSON.stringify({ error: "Session ID or room name required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get session details
      let query = supabase.from("live_sessions").select("*");
      if (sessionId) {
        query = query.eq("id", sessionId);
      } else {
        query = query.eq("room_name", roomName);
      }
      
      const { data: session, error: sessionError } = await query.single();

      if (sessionError || !session) {
        console.error("Session error:", sessionError);
        return new Response(
          JSON.stringify({ error: "Session not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (session.status !== "live" && session.status !== "waiting") {
        return new Response(
          JSON.stringify({ error: "Session is not active" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check if waiting room is enabled and user is not approved
      if (session.enable_waiting_room) {
        const { data: existingParticipant } = await supabase
          .from("session_participants")
          .select("is_approved")
          .eq("session_id", session.id)
          .eq("user_id", user.id)
          .single();

        const isHost = session.host_id === user.id;
        
        if (!isHost && (!existingParticipant || !existingParticipant.is_approved)) {
          // Add to waiting room
          await supabase
            .from("session_participants")
            .upsert({
              session_id: session.id,
              user_id: user.id,
              participant_name: participantName || user.email,
              role: "participant",
              is_approved: false,
            }, { onConflict: "session_id,user_id" });

          return new Response(
            JSON.stringify({ 
              status: "waiting",
              message: "Waiting for host approval",
              sessionId: session.id,
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      const isHost = session.host_id === user.id;
      
      // Generate participant token
      const participantToken = await createLiveKitToken(
        LIVEKIT_API_KEY,
        LIVEKIT_API_SECRET,
        session.room_name!,
        participantName || user.email || "Participant",
        user.id,
        isHost
      );

      // Update or create participant record
      await supabase
        .from("session_participants")
        .upsert({
          session_id: session.id,
          user_id: user.id,
          participant_name: participantName || user.email,
          role: isHost ? "host" : "participant",
          joined_at: new Date().toISOString(),
          is_approved: true,
        }, { onConflict: "session_id,user_id" });

      console.log("User joined room:", session.room_name);

      return new Response(
        JSON.stringify({
          token: participantToken,
          roomName: session.room_name,
          livekitUrl: LIVEKIT_URL,
          sessionId: session.id,
          isHost,
          session: {
            title: session.title,
            enableChat: session.enable_chat,
            enableScreenShare: session.enable_screen_share,
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "end-room") {
      if (!sessionId) {
        return new Response(
          JSON.stringify({ error: "Session ID required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get session and verify host
      const { data: session } = await supabase
        .from("live_sessions")
        .select("*")
        .eq("id", sessionId)
        .single();

      if (!session) {
        return new Response(
          JSON.stringify({ error: "Session not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (session.host_id !== user.id) {
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .single();

        if (roleData?.role !== "admin") {
          return new Response(
            JSON.stringify({ error: "Only the host can end this session" }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      // Update session status
      await supabase
        .from("live_sessions")
        .update({
          status: "ended",
          actual_end: new Date().toISOString(),
        })
        .eq("id", sessionId);

      // Update all participants
      await supabase
        .from("session_participants")
        .update({ left_at: new Date().toISOString() })
        .eq("session_id", sessionId)
        .is("left_at", null);

      console.log("Room ended:", sessionId);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "approve-participant") {
      const { participantId } = await req.json();
      
      // Verify user is host of the session
      const { data: participant } = await supabase
        .from("session_participants")
        .select("session_id")
        .eq("id", participantId)
        .single();

      if (!participant) {
        return new Response(
          JSON.stringify({ error: "Participant not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: session } = await supabase
        .from("live_sessions")
        .select("host_id")
        .eq("id", participant.session_id)
        .single();

      if (!session || session.host_id !== user.id) {
        return new Response(
          JSON.stringify({ error: "Only the host can approve participants" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      await supabase
        .from("session_participants")
        .update({ is_approved: true })
        .eq("id", participantId);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
