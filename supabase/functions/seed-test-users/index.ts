import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TestUser {
  email: string;
  password: string;
  full_name: string;
  role: "admin" | "teacher" | "student" | "event_organizer";
}

const testUsers: TestUser[] = [
  {
    email: "admin@college.edu",
    password: "Admin@123",
    full_name: "System Administrator",
    role: "admin",
  },
  {
    email: "teacher@college.edu",
    password: "Teacher@123",
    full_name: "John Smith",
    role: "teacher",
  },
  {
    email: "student@college.edu",
    password: "Student@123",
    full_name: "Jane Doe",
    role: "student",
  },
  {
    email: "organizer@college.edu",
    password: "Organizer@123",
    full_name: "Mike Johnson",
    role: "event_organizer",
  },
];

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const results: { email: string; status: string; error?: string }[] = [];

    for (const user of testUsers) {
      try {
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
          password: user.password,
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

    return new Response(
      JSON.stringify({
        success: true,
        message: "Test users seeded",
        results,
        credentials: testUsers.map(u => ({
          role: u.role,
          email: u.email,
          password: u.password,
        })),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error seeding users:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
