import { createClient } from "https://esm.sh/@supabase/supabase-js@2.91.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { message } = await req.json();
    if (!message || typeof message !== "string" || message.length > 500) {
      return new Response(JSON.stringify({ error: "Invalid message" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Get user role
    const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", user.id).maybeSingle();
    const role = roleData?.role || "user";

    const query = message.toLowerCase().trim();
    let response = "";

    if (role === "student") {
      response = await handleStudentQuery(supabase, user.id, query);
    } else if (role === "teacher") {
      response = await handleTeacherQuery(supabase, user.id, query);
    } else if (role === "admin") {
      response = await handleAdminQuery(supabase, query);
    } else if (role === "event_organizer") {
      response = await handleOrganizerQuery(supabase, user.id, query);
    } else {
      response = "I'm sorry, your role doesn't have assistant access yet.";
    }

    return new Response(JSON.stringify({ response, role }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Assistant error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

// ─── Student Handlers ───
async function handleStudentQuery(supabase: any, userId: string, query: string): Promise<string> {
  const { data: student } = await supabase.from("students").select("id, first_name").eq("user_id", userId).maybeSingle();
  if (!student) return "Your student profile hasn't been set up yet. Please contact admin.";
  const sid = student.id;
  const name = student.first_name;

  if (matches(query, ["attendance", "present", "absent"])) {
    const { data, count } = await supabase.from("attendance").select("status", { count: "exact" }).eq("student_id", sid);
    if (!data || data.length === 0) return `Hi ${name}, no attendance records found yet.`;
    const present = data.filter((r: any) => r.status === "present").length;
    const total = data.length;
    const pct = ((present / total) * 100).toFixed(1);
    return `Hi ${name}, your attendance is **${pct}%** (${present}/${total} classes attended).`;
  }

  if (matches(query, ["gpa", "cgpa", "sgpa", "result", "grade point"])) {
    const { data } = await supabase.from("semester_results").select("semester, sgpa, cgpa, percentage").eq("student_id", sid).order("created_at", { ascending: false }).limit(1);
    if (!data || data.length === 0) return `Hi ${name}, no semester results available yet.`;
    const r = data[0];
    return `Your latest result (${r.semester}): **SGPA ${r.sgpa || 'N/A'}**, CGPA **${r.cgpa || 'N/A'}**, Percentage **${r.percentage || 'N/A'}%**.`;
  }

  if (matches(query, ["assignment", "pending assignment", "homework", "submission"])) {
    const { data: enrollments } = await supabase.from("course_enrollments").select("course_id").eq("student_id", sid).eq("status", "enrolled");
    if (!enrollments || enrollments.length === 0) return "You're not enrolled in any courses currently.";
    const courseIds = enrollments.map((e: any) => e.course_id);
    const { data: assignments } = await supabase.from("assignments").select("id, title, due_date, course_id").in("course_id", courseIds).eq("status", "active").order("due_date", { ascending: true });
    if (!assignments || assignments.length === 0) return `No pending assignments, ${name}! 🎉`;
    const { data: submissions } = await supabase.from("assignment_submissions").select("assignment_id").eq("student_id", sid);
    const submittedIds = new Set((submissions || []).map((s: any) => s.assignment_id));
    const pending = assignments.filter((a: any) => !submittedIds.has(a.id));
    if (pending.length === 0) return `All assignments submitted! Great work, ${name}! ✅`;
    const list = pending.slice(0, 5).map((a: any) => `• **${a.title}** — due ${new Date(a.due_date).toLocaleDateString()}`).join("\n");
    return `You have **${pending.length}** pending assignment(s):\n${list}`;
  }

  if (matches(query, ["library", "fine", "book", "overdue"])) {
    const { data: issues } = await supabase.from("book_issues").select("*, library_books(title)").eq("student_id", sid).eq("status", "issued");
    if (!issues || issues.length === 0) return "No active book issues. Your library account is clear! 📚";
    const overdue = issues.filter((i: any) => new Date(i.due_date) < new Date());
    const totalFine = issues.reduce((sum: number, i: any) => sum + (i.fine_amount || 0), 0);
    let msg = `You have **${issues.length}** book(s) issued.`;
    if (overdue.length > 0) msg += ` ⚠️ **${overdue.length}** overdue!`;
    if (totalFine > 0) msg += ` Total fine: **₹${totalFine}**.`;
    return msg;
  }

  if (matches(query, ["timetable", "schedule", "class today", "today's class"])) {
    const { data: enrollments } = await supabase.from("course_enrollments").select("course_id").eq("student_id", sid).eq("status", "enrolled");
    if (!enrollments || enrollments.length === 0) return "You're not enrolled in any courses.";
    const courseIds = enrollments.map((e: any) => e.course_id);
    const today = new Date().getDay();
    const { data: schedules } = await supabase.from("class_schedules").select("*, courses(course_name)").in("course_id", courseIds).eq("day_of_week", today).order("start_time");
    if (!schedules || schedules.length === 0) return "No classes scheduled for today! 🎉";
    const list = schedules.map((s: any) => `• **${s.courses?.course_name}** — ${s.start_time.slice(0, 5)} to ${s.end_time.slice(0, 5)} ${s.room ? `(${s.room})` : ""}`).join("\n");
    return `Today's schedule:\n${list}`;
  }

  if (matches(query, ["leave", "leave request", "leave status"])) {
    const { data } = await supabase.from("leave_requests").select("leave_type, start_date, end_date, status").eq("student_id", sid).order("created_at", { ascending: false }).limit(5);
    if (!data || data.length === 0) return "No leave requests found.";
    const list = data.map((l: any) => `• **${l.leave_type}** (${l.start_date} to ${l.end_date}) — ${l.status}`).join("\n");
    return `Recent leave requests:\n${list}`;
  }

  return `I can help you with: attendance, GPA/results, pending assignments, library/fines, timetable, and leave requests. Try asking about one of these!`;
}

// ─── Teacher Handlers ───
async function handleTeacherQuery(supabase: any, userId: string, query: string): Promise<string> {
  const { data: teacher } = await supabase.from("teachers").select("id, first_name").eq("user_id", userId).maybeSingle();
  if (!teacher) return "Your teacher profile hasn't been set up yet.";
  const tid = teacher.id;

  const { data: courses } = await supabase.from("courses").select("id, course_name").eq("teacher_id", tid);
  const courseIds = (courses || []).map((c: any) => c.id);

  if (matches(query, ["low attendance", "poor attendance", "below"])) {
    if (courseIds.length === 0) return "No courses assigned to you.";
    const { data: enrollments } = await supabase.from("course_enrollments").select("student_id, students(first_name, last_name, student_id)").in("course_id", courseIds).eq("status", "enrolled");
    if (!enrollments || enrollments.length === 0) return "No students enrolled.";
    // Simplified: just count for each student
    const results: string[] = [];
    for (const e of enrollments.slice(0, 20)) {
      const { data: att, count } = await supabase.from("attendance").select("status", { count: "exact" }).eq("student_id", e.student_id).in("course_id", courseIds);
      if (att && att.length > 0) {
        const present = att.filter((a: any) => a.status === "present").length;
        const pct = (present / att.length) * 100;
        if (pct < 75) {
          results.push(`• **${e.students?.first_name} ${e.students?.last_name}** (${e.students?.student_id}) — ${pct.toFixed(0)}%`);
        }
      }
    }
    if (results.length === 0) return "All students have attendance above 75%! 🎉";
    return `Students with low attendance (<75%):\n${results.slice(0, 10).join("\n")}`;
  }

  if (matches(query, ["how many students", "student count", "enrolled students"])) {
    if (courseIds.length === 0) return "No courses assigned to you.";
    const { count } = await supabase.from("course_enrollments").select("id", { count: "exact", head: true }).in("course_id", courseIds).eq("status", "enrolled");
    return `You have **${count || 0}** students enrolled across **${courses!.length}** course(s).`;
  }

  if (matches(query, ["pending leave", "leave approval", "leave request"])) {
    if (courseIds.length === 0) return "No courses assigned.";
    const { data: enrollments } = await supabase.from("course_enrollments").select("student_id").in("course_id", courseIds).eq("status", "enrolled");
    const studentIds = (enrollments || []).map((e: any) => e.student_id);
    if (studentIds.length === 0) return "No students enrolled.";
    const { data: leaves } = await supabase.from("leave_requests").select("*, students(first_name, last_name)").in("student_id", studentIds).eq("status", "pending");
    if (!leaves || leaves.length === 0) return "No pending leave requests. ✅";
    const list = leaves.slice(0, 5).map((l: any) => `• **${l.students?.first_name} ${l.students?.last_name}** — ${l.leave_type} (${l.start_date} to ${l.end_date})`).join("\n");
    return `**${leaves.length}** pending leave request(s):\n${list}`;
  }

  if (matches(query, ["assignment", "submission status"])) {
    if (courseIds.length === 0) return "No courses assigned.";
    const { data: assignments } = await supabase.from("assignments").select("id, title").in("course_id", courseIds).eq("status", "active");
    if (!assignments || assignments.length === 0) return "No active assignments.";
    const { data: subs } = await supabase.from("assignment_submissions").select("assignment_id").in("assignment_id", assignments.map((a: any) => a.id));
    const subCount = (subs || []).length;
    return `You have **${assignments.length}** active assignment(s) with **${subCount}** total submission(s).`;
  }

  if (matches(query, ["today", "class today", "schedule"])) {
    if (courseIds.length === 0) return "No courses assigned.";
    const today = new Date().getDay();
    const { data: schedules } = await supabase.from("class_schedules").select("*, courses(course_name)").in("course_id", courseIds).eq("day_of_week", today).order("start_time");
    if (!schedules || schedules.length === 0) return "No classes scheduled for today.";
    const list = schedules.map((s: any) => `• **${s.courses?.course_name}** — ${s.start_time.slice(0, 5)} to ${s.end_time.slice(0, 5)} ${s.room ? `(${s.room})` : ""}`).join("\n");
    return `Today's classes:\n${list}`;
  }

  return `I can help you with: low attendance students, student count, pending leave requests, assignment submissions, and today's schedule.`;
}

// ─── Admin Handlers ───
async function handleAdminQuery(supabase: any, query: string): Promise<string> {
  // Use service role client for admin queries
  const serviceClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  if (matches(query, ["total student", "how many student", "student count"])) {
    const { count } = await serviceClient.from("students").select("id", { count: "exact", head: true }).eq("status", "active");
    return `There are **${count || 0}** active students in the system.`;
  }

  if (matches(query, ["total teacher", "how many teacher", "teacher count"])) {
    const { count } = await serviceClient.from("teachers").select("id", { count: "exact", head: true }).eq("status", "active");
    return `There are **${count || 0}** active teachers in the system.`;
  }

  if (matches(query, ["pending leave", "leave request"])) {
    const { count } = await serviceClient.from("leave_requests").select("id", { count: "exact", head: true }).eq("status", "pending");
    return `There are **${count || 0}** pending leave request(s).`;
  }

  if (matches(query, ["overdue", "library", "book"])) {
    const { data } = await serviceClient.from("book_issues").select("id").eq("status", "issued").lt("due_date", new Date().toISOString());
    return `There are **${data?.length || 0}** overdue library book(s).`;
  }

  if (matches(query, ["proxy", "proxy attempt"])) {
    const today = new Date().toISOString().split("T")[0];
    const { count } = await serviceClient.from("proxy_attempt_logs").select("id", { count: "exact", head: true }).gte("created_at", today);
    return `**${count || 0}** proxy attempt(s) detected today.`;
  }

  if (matches(query, ["attendance session", "active session"])) {
    const { count } = await serviceClient.from("secure_attendance_sessions").select("id", { count: "exact", head: true }).eq("status", "active");
    return `**${count || 0}** attendance session(s) are currently active.`;
  }

  if (matches(query, ["total course", "how many course"])) {
    const { count } = await serviceClient.from("courses").select("id", { count: "exact", head: true }).eq("status", "active");
    return `There are **${count || 0}** active courses.`;
  }

  if (matches(query, ["pending profile", "profile approval", "profile request"])) {
    const { count } = await serviceClient.from("profile_update_requests").select("id", { count: "exact", head: true }).eq("status", "pending");
    return `**${count || 0}** pending profile update request(s).`;
  }

  return `I can help you with: total students/teachers/courses, pending leave requests, overdue library books, proxy attempts, active attendance sessions, and profile approvals.`;
}

// ─── Organizer Handlers ───
async function handleOrganizerQuery(supabase: any, userId: string, query: string): Promise<string> {
  if (matches(query, ["upcoming event", "next event", "my event"])) {
    const { data } = await supabase.from("events").select("title, start_date, venue, status").eq("created_by", userId).gte("start_date", new Date().toISOString()).order("start_date").limit(5);
    if (!data || data.length === 0) return "No upcoming events.";
    const list = data.map((e: any) => `• **${e.title}** — ${new Date(e.start_date).toLocaleDateString()} ${e.venue ? `at ${e.venue}` : ""}`).join("\n");
    return `Upcoming events:\n${list}`;
  }

  if (matches(query, ["registration", "total registration", "how many registered"])) {
    const { data: events } = await supabase.from("events").select("id").eq("created_by", userId);
    if (!events || events.length === 0) return "No events found.";
    const { count } = await supabase.from("event_registrations").select("id", { count: "exact", head: true }).in("event_id", events.map((e: any) => e.id));
    return `Total registrations across your events: **${count || 0}**.`;
  }

  if (matches(query, ["today", "attendance today", "today's attendance"])) {
    const today = new Date().toISOString().split("T")[0];
    const { data: events } = await supabase.from("events").select("id, title").eq("created_by", userId);
    if (!events || events.length === 0) return "No events found.";
    const { count } = await supabase.from("event_attendance").select("id", { count: "exact", head: true }).in("event_id", events.map((e: any) => e.id)).gte("check_in_time", today);
    return `**${count || 0}** attendee(s) checked in today.`;
  }

  return `I can help you with: upcoming events, total registrations, and today's event attendance.`;
}

function matches(query: string, keywords: string[]): boolean {
  return keywords.some((k) => query.includes(k));
}
