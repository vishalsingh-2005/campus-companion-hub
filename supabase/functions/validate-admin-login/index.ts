import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let payload: { email?: unknown; password?: unknown };
    try {
      payload = await req.json();
    } catch {
      return jsonResponse(
        { valid: false, field: "form", error: "Invalid request payload." },
        400,
      );
    }

    const rawEmail = typeof payload.email === "string" ? payload.email.trim() : "";
    const rawPassword = typeof payload.password === "string" ? payload.password : "";

    // Required: email
    if (!rawEmail) {
      return jsonResponse(
        { valid: false, field: "email", error: "Email is required." },
        400,
      );
    }

    if (rawEmail.length > 255) {
      return jsonResponse(
        { valid: false, field: "email", error: "Email must be 255 characters or fewer." },
        400,
      );
    }

    // Email format
    if (!EMAIL_REGEX.test(rawEmail)) {
      return jsonResponse(
        { valid: false, field: "email", error: "Please enter a valid email address." },
        400,
      );
    }

    // Required: password
    if (!rawPassword) {
      return jsonResponse(
        { valid: false, field: "password", error: "Password is required." },
        400,
      );
    }

    if (rawPassword.length < 6) {
      return jsonResponse(
        { valid: false, field: "password", error: "Password must be at least 6 characters." },
        400,
      );
    }

    if (rawPassword.length > 128) {
      return jsonResponse(
        { valid: false, field: "password", error: "Password must be 128 characters or fewer." },
        400,
      );
    }

    // Optional admin-existence pre-check (does not leak whether the password matches)
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (supabaseUrl && serviceKey) {
      const admin = createClient(supabaseUrl, serviceKey);

      const { data: profile, error: profileErr } = await admin
        .from("profiles")
        .select("user_id, is_active")
        .eq("email", rawEmail.toLowerCase())
        .maybeSingle();

      if (profileErr) {
        console.error("validate-admin-login: profile lookup error", profileErr);
      }

      if (profile && profile.is_active === false) {
        return jsonResponse(
          {
            valid: false,
            field: "form",
            error:
              "Your account has been deactivated by admin. Please contact your administrator.",
          },
          403,
        );
      }
    }

    return jsonResponse({ valid: true, email: rawEmail.toLowerCase() }, 200);
  } catch (err) {
    console.error("validate-admin-login: unexpected error", err);
    return jsonResponse(
      { valid: false, field: "form", error: "Server validation failed. Please try again." },
      500,
    );
  }
});
