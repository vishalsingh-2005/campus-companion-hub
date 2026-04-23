import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function generatePassword(): string {
  // 24-char URL-safe random password (never returned to caller)
  const arr = new Uint8Array(18);
  crypto.getRandomValues(arr);
  return btoa(String.fromCharCode(...arr))
    .replace(/\+/g, "A")
    .replace(/\//g, "B")
    .replace(/=/g, "");
}

interface TestUser {
  email: string;
  full_name: string;
  role: "admin" | "teacher" | "student" | "event_organizer";
}

const testUsers: TestUser[] = [
  { email: "admin@college.edu", full_name: "System Administrator", role: "admin" },
  { email: "teacher@college.edu", full_name: "John Smith", role: "teacher" },
  { email: "student@college.edu", full_name: "Jane Doe", role: "student" },
  { email: "organizer@college.edu", full_name: "Mike Johnson", role: "event_organizer" },
];

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // ---- AUTH GUARD: caller must be an authenticated admin ----
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }
    const accessToken = authHeader.slice("Bearer ".length);

    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userErr } = await userClient.auth.getUser(accessToken);
    if (userErr || !userData?.user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const { data: roleRows, error: roleCheckErr } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id);

    if (roleCheckErr) {
      console.error("seed-test-users: role check failed", roleCheckErr);
      return jsonResponse({ error: "Authorization check failed" }, 500);
    }

    const isAdmin = (roleRows ?? []).some((r) => r.role === "admin");
    if (!isAdmin) {
      return jsonResponse({ error: "Forbidden — admin role required" }, 403);
    }

    const results: { email: string; status: string; error?: string }[] = [];

    for (const user of testUsers) {
      try {
        const password = generatePassword();

        // Check if user already exists
        const { data: existingUsers } = await adminClient.auth.admin.listUsers();
        const existingUser = existingUsers?.users?.find(u => u.email === user.email);

        if (existingUser) {
          results.push({ email: user.email, status: "already_exists" });
          continue;
        }

        // Create the user
        const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
          email: user.email,
          password,
          email_confirm: true,
          user_metadata: { full_name: user.full_name },
        });

        if (createError) {
          results.push({ email: user.email, status: "error", error: createError.message });
          continue;
        }

        // Update profile with email
        await adminClient
          .from("profiles")
          .update({ email: user.email, full_name: user.full_name })
          .eq("user_id", newUser.user.id);

        // Assign role
        const { error: roleError } = await adminClient
          .from("user_roles")
          .insert({ user_id: newUser.user.id, role: user.role });

        if (roleError) {
          console.error(`Failed to assign role for ${user.email}:`, roleError);
        }

        // Create teacher/student record if applicable
        if (user.role === "teacher") {
          const nameParts = user.full_name.split(" ");
          await adminClient.from("teachers").insert({
            user_id: newUser.user.id,
            email: user.email,
            first_name: nameParts[0] || "John",
            last_name: nameParts.slice(1).join(" ") || "Smith",
            teacher_id: `TCH-${Date.now().toString().slice(-6)}`,
            status: "active",
          });
        } else if (user.role === "student") {
          const nameParts = user.full_name.split(" ");
          await adminClient.from("students").insert({
            user_id: newUser.user.id,
            email: user.email,
            first_name: nameParts[0] || "Jane",
            last_name: nameParts.slice(1).join(" ") || "Doe",
            student_id: `STU-${Date.now().toString().slice(-6)}`,
            status: "active",
          });
        }

        results.push({ email: user.email, status: "created" });
        console.log(`Created user: ${user.email} with role: ${user.role}`);
      } catch (error: any) {
        results.push({ email: user.email, status: "error", error: error.message });
      }
    }

    // NEVER return passwords. Admin must use the password-reset flow to set
    // a known password for any newly created seed account.
    return jsonResponse({
      success: true,
      message:
        "Test users seeded. Use the admin password-reset flow to set passwords for these accounts.",
      results,
    });
  } catch (error: any) {
    console.error("Error seeding users:", error);
    return jsonResponse({ error: error.message }, 500);
  }
});
