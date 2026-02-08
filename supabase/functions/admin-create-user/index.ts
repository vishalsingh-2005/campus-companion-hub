import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { createRemoteJWKSet, jwtVerify } from "https://esm.sh/jose@5.9.6";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface CreateUserRequest {
  email: string;
  password: string;
  full_name: string;
  role: "admin" | "teacher" | "student" | "event_organizer";
}

// Generate a unique ID for teacher/student records
function generateUniqueId(prefix: string): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 6);
  return `${prefix}-${timestamp}${random}`.toUpperCase();
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get("Authorization") ?? req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.error("Missing or invalid authorization header");
      return new Response(
        JSON.stringify({ error: "Unauthorized", code: "NO_AUTH" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.slice("Bearer ".length);

    // Create Supabase clients
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
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

    if (!["admin", "teacher", "student", "event_organizer"].includes(role)) {
      return new Response(
        JSON.stringify({ error: "Invalid role. Must be 'admin', 'teacher', 'student', or 'event_organizer'", code: "INVALID_ROLE" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Admin ${requesterUserId} creating user: ${email} with role: ${role}`);

    let userId: string;

    // Try to create the user first
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name },
    });

    if (createError) {
      // If user already exists, look them up and link instead
      if (createError.message?.includes("already been registered") || (createError as any).code === "email_exists") {
        console.log(`User with email ${email} already exists, attempting to link...`);
        
        // Find the existing user by email
        const { data: existingUsers, error: listError } = await adminClient.auth.admin.listUsers();
        
        if (listError) {
          console.error("Failed to list users:", listError);
          return new Response(
            JSON.stringify({ error: "Failed to look up existing user", code: "LOOKUP_FAILED" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const existingUser = existingUsers.users.find(u => u.email === email);
        
        if (!existingUser) {
          return new Response(
            JSON.stringify({ error: "User exists but could not be found. Please try a different email.", code: "USER_NOT_FOUND" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        userId = existingUser.id;

        // Update password for the existing user
        const { error: updateError } = await adminClient.auth.admin.updateUserById(userId, {
          password,
          email_confirm: true,
          user_metadata: { full_name },
        });

        if (updateError) {
          console.error("Failed to update existing user:", updateError);
          return new Response(
            JSON.stringify({ error: "Failed to update existing user credentials", code: "UPDATE_FAILED" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        console.log(`Updated existing user ${userId} with new credentials`);

        // Check if role already assigned
        const { data: existingRole } = await adminClient
          .from("user_roles")
          .select("role")
          .eq("user_id", userId)
          .maybeSingle();

        if (!existingRole) {
          // Assign role
          const { error: roleInsertError } = await adminClient
            .from("user_roles")
            .insert({ user_id: userId, role });

          if (roleInsertError) {
            console.error("Failed to assign role to existing user:", roleInsertError);
          }
        }

        // Update profile
        const { error: profileError } = await adminClient
          .from("profiles")
          .update({ email, full_name })
          .eq("user_id", userId);

        if (profileError) {
          console.error("Failed to update profile:", profileError);
        }

        console.log(`Linked existing user ${userId} with role: ${role}`);

        return new Response(
          JSON.stringify({
            success: true,
            message: "Existing user linked successfully with updated credentials",
            user_id: userId,
            email,
            was_existing: true,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Other creation errors
      console.error("Failed to create user:", createError);
      return new Response(
        JSON.stringify({ error: createError.message, code: "CREATE_FAILED" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    userId = newUser.user.id;

    // Update the profile with the email
    const { error: profileUpdateError } = await adminClient
      .from("profiles")
      .update({ email, full_name })
      .eq("user_id", userId);

    if (profileUpdateError) {
      console.error("Failed to update profile with email:", profileUpdateError);
    }

    // Assign the role to the user
    const { error: roleInsertError } = await adminClient
      .from("user_roles")
      .insert({ user_id: userId, role });

    if (roleInsertError) {
      console.error("Failed to assign role:", roleInsertError);
      return new Response(
        JSON.stringify({
          success: true,
          warning: "User created but role assignment failed",
          user_id: userId,
          email: newUser.user.email,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse the full name into first and last name
    const nameParts = full_name.trim().split(/\s+/);
    const firstName = nameParts[0] || full_name;
    const lastName = nameParts.slice(1).join(" ") || "";

    // Create the corresponding record in teachers or students table
    if (role === "teacher") {
      const teacherId = generateUniqueId("T");
      const { error: teacherInsertError } = await adminClient
        .from("teachers")
        .insert({
          user_id: userId,
          email,
          first_name: firstName,
          last_name: lastName,
          teacher_id: teacherId,
          status: "active",
        });

      if (teacherInsertError) {
        console.error("Failed to create teacher record:", teacherInsertError);
      } else {
        console.log(`Teacher record created with ID: ${teacherId}`);
      }
    } else if (role === "student") {
      const studentId = generateUniqueId("S");
      const { error: studentInsertError } = await adminClient
        .from("students")
        .insert({
          user_id: userId,
          email,
          first_name: firstName,
          last_name: lastName,
          student_id: studentId,
          status: "active",
        });

      if (studentInsertError) {
        console.error("Failed to create student record:", studentInsertError);
      } else {
        console.log(`Student record created with ID: ${studentId}`);
      }
    }

    console.log(`User created successfully: ${userId} with role: ${role}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "User created successfully",
        user_id: userId,
        email: newUser.user.email,
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
