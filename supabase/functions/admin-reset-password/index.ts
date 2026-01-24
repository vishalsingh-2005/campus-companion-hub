import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ResetPasswordRequest {
  user_id: string;
  new_password: string;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("No authorization header provided");
      return new Response(
        JSON.stringify({ error: "Unauthorized", code: "NO_AUTH" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");

    // Create Supabase clients
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // User client to verify the requesting user
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    // Service client for admin operations
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the requesting user
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) {
      console.error("Failed to verify user:", userError);
      return new Response(
        JSON.stringify({ error: "Unauthorized", code: "INVALID_TOKEN" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if the user is an admin
    const { data: roleData, error: roleError } = await userClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .single();

    if (roleError || roleData?.role !== "admin") {
      console.error("User is not an admin:", roleError || roleData);
      return new Response(
        JSON.stringify({ error: "Forbidden - Admin access required", code: "NOT_ADMIN" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const { user_id, new_password }: ResetPasswordRequest = await req.json();

    if (!user_id || !new_password) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: user_id and new_password", code: "MISSING_FIELDS" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (new_password.length < 6) {
      return new Response(
        JSON.stringify({ error: "Password must be at least 6 characters", code: "PASSWORD_TOO_SHORT" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Admin ${userData.user.id} resetting password for user ${user_id}`);

    // Use admin client to update the user's password
    const { data, error } = await adminClient.auth.admin.updateUserById(user_id, {
      password: new_password,
    });

    if (error) {
      console.error("Failed to reset password:", error);
      return new Response(
        JSON.stringify({ error: error.message, code: "RESET_FAILED" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Password reset successful for user ${user_id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Password reset successfully",
        user_id: data.user.id,
        email: data.user.email 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in admin-reset-password function:", error);
    return new Response(
      JSON.stringify({ error: error.message, code: "INTERNAL_ERROR" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
