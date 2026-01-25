import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { createRemoteJWKSet, jwtVerify } from "https://esm.sh/jose@5.9.6";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateUserRequest {
  email: string;
  password: string;
  full_name: string;
  role: "teacher" | "student" | "event_organizer";
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get("Authorization") ?? req.headers.get("authorization");
    if (!authHeader) {
      console.error("No authorization header provided");
      return new Response(
        JSON.stringify({ error: "Unauthorized", code: "NO_AUTH" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!authHeader.startsWith("Bearer ")) {
      console.error("Authorization header is not Bearer token");
      return new Response(
        JSON.stringify({ error: "Unauthorized", code: "BAD_AUTH_HEADER" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.slice("Bearer ".length);

    // Create Supabase clients
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Service client for admin operations
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Verify JWT locally using signing keys (JWKS)
    const issuer = `${supabaseUrl}/auth/v1`;
    const jwks = createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`));

    let requesterUserId: string;
    try {
      const { payload } = await jwtVerify(token, jwks, { issuer });
      requesterUserId = String(payload.sub || "");
      if (!requesterUserId) throw new Error("Missing sub");
    } catch (e) {
      console.error("Failed to verify token:", e);
      return new Response(
        JSON.stringify({ error: "Unauthorized", code: "INVALID_TOKEN" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if the user is an admin using adminClient to bypass RLS
    const { data: roleData, error: roleError } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", requesterUserId)
      .single();

    if (roleError || roleData?.role !== "admin") {
      console.error("User is not an admin:", roleError || roleData);
      return new Response(
        JSON.stringify({ error: "Forbidden - Admin access required", code: "NOT_ADMIN" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const { email, password, full_name, role }: CreateUserRequest = await req.json();

    if (!email || !password || !full_name || !role) {
      return new Response(
        JSON.stringify({ error: "Missing required fields", code: "MISSING_FIELDS" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (password.length < 6) {
      return new Response(
        JSON.stringify({ error: "Password must be at least 6 characters", code: "PASSWORD_TOO_SHORT" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!["teacher", "student", "event_organizer"].includes(role)) {
      return new Response(
        JSON.stringify({ error: "Invalid role. Must be 'teacher', 'student', or 'event_organizer'", code: "INVALID_ROLE" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Admin ${requesterUserId} creating user: ${email} with role: ${role}`);

    // Use admin client to create the user (doesn't affect current session)
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm the email
      user_metadata: {
        full_name,
      },
    });

    if (createError) {
      console.error("Failed to create user:", createError);
      return new Response(
        JSON.stringify({ error: createError.message, code: "CREATE_FAILED" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update the profile with the email (since the trigger creates profile but may not have email)
    const { error: profileUpdateError } = await adminClient
      .from("profiles")
      .update({ email: email })
      .eq("user_id", newUser.user.id);

    if (profileUpdateError) {
      console.error("Failed to update profile with email:", profileUpdateError);
      // Not critical, continue
    }

    // Assign the role to the user
    const { error: roleInsertError } = await adminClient
      .from("user_roles")
      .insert({
        user_id: newUser.user.id,
        role: role,
      });

    if (roleInsertError) {
      console.error("Failed to assign role:", roleInsertError);
      // User was created but role assignment failed
      return new Response(
        JSON.stringify({ 
          success: true,
          warning: "User created but role assignment failed",
          user_id: newUser.user.id,
          email: newUser.user.email 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`User created successfully: ${newUser.user.id} with role: ${role}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "User created successfully",
        user_id: newUser.user.id,
        email: newUser.user.email 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in admin-create-user function:", error);
    return new Response(
      JSON.stringify({ error: error.message, code: "INTERNAL_ERROR" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
