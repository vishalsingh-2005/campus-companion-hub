import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Server, Shield, Database, Layout, BookOpen, Users,
  GraduationCap, Video, Code2, CalendarDays, IndianRupee,
  ClipboardList, Bell, MessageSquare, FileText,
} from 'lucide-react';

const Section = ({ title, icon: Icon, children }: { title: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) => (
  <Card>
    <CardHeader className="pb-3">
      <CardTitle className="text-base flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        {title}
      </CardTitle>
    </CardHeader>
    <CardContent className="text-sm text-muted-foreground space-y-2 leading-relaxed">
      {children}
    </CardContent>
  </Card>
);

export default function SystemDocumentation() {
  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <PageHeader title="System Documentation" description="Architecture, security, and module reference for Campus Companion" />

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="architecture">Architecture</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="database">Database</TabsTrigger>
            <TabsTrigger value="modules">Modules</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <Section title="System Overview" icon={Server}>
              <p><strong>Campus Companion Hub</strong> is a production-grade College Management System (CMS / Academic ERP) built with modern web technologies.</p>
              <p>It supports four user roles: <Badge variant="outline">Admin</Badge> <Badge variant="outline">Teacher</Badge> <Badge variant="outline">Student</Badge> <Badge variant="outline">Event Organizer</Badge>, each with a dedicated portal, navigation, and access controls.</p>
              <p><strong>Tech Stack:</strong> React 18 + TypeScript, Vite, Tailwind CSS, Supabase (PostgreSQL + Auth + Edge Functions + Realtime + Storage), Recharts, LiveKit, CodeMirror.</p>
              <p><strong>Key Capabilities:</strong> Role-based auth, secure QR+GPS attendance, live video classes, internal marks &amp; GPA, library with auto-fines, assignments, leave management, fee tracking, timetable management, event management, messaging, notifications, and audit logging.</p>
            </Section>
          </TabsContent>

          <TabsContent value="architecture" className="space-y-4">
            <Section title="Frontend Architecture" icon={Layout}>
              <p>Single Page Application using React Router v6 with lazy-loaded route modules for performance. The app uses a centralized <code>AuthProvider</code> context and <code>ProtectedRoute</code> wrapper enforcing role-based access on every route.</p>
              <p><strong>State Management:</strong> React Context (Auth, Preferences) + TanStack Query for server state caching. Custom hooks encapsulate all database operations.</p>
              <p><strong>Component Architecture:</strong> Shadcn/UI primitives → composed feature components → page-level containers with <code>DashboardLayout</code>. Design tokens defined in <code>index.css</code> with HSL color system supporting light/dark modes.</p>
            </Section>
            <Section title="Backend Architecture" icon={Server}>
              <p>Supabase provides PostgreSQL database, Row Level Security, Auth, Edge Functions (Deno runtime), Realtime subscriptions, and file storage.</p>
              <p><strong>Edge Functions:</strong> <code>admin-create-user</code>, <code>admin-reset-password</code> (JWT-validated admin operations), <code>validate-attendance</code> (HMAC token verification), <code>execute-code</code> &amp; <code>check-plagiarism</code> (coding lab), <code>livekit-token</code> (video session tokens).</p>
              <p><strong>Auth Pattern:</strong> Edge functions use manual JWT validation via JWKS endpoint and the <code>jose</code> library for stable authentication in the Deno runtime.</p>
            </Section>
          </TabsContent>

          <TabsContent value="security" className="space-y-4">
            <Section title="Security Design" icon={Shield}>
              <p><strong>Authentication:</strong> Supabase Auth with email/password. Sessions are persisted in localStorage with auto-refresh. A 30-minute inactivity timeout automatically logs users out.</p>
              <p><strong>Authorization:</strong> Role stored in <code>user_roles</code> table (separate from profiles to prevent privilege escalation). A <code>SECURITY DEFINER</code> function <code>has_role()</code> is used in all RLS policies to prevent recursive checks.</p>
              <p><strong>Row Level Security:</strong> Every table has RLS enabled with role-appropriate policies. Students can only access their own data, teachers see their assigned courses/students, admins have full access.</p>
              <p><strong>Attendance Anti-Proxy:</strong> QR codes rotate every N seconds using HMAC-SHA256 signatures. GPS validation verifies student proximity. Device binding prevents multi-device attendance. All failed attempts are logged.</p>
              <p><strong>Input Validation:</strong> Zod schemas on forms. Content rendered via safe text methods (no <code>dangerouslySetInnerHTML</code>). Storage buckets use public-read/private-write policies.</p>
              <p><strong>Audit Trail:</strong> Critical actions (login, grade changes, leave approvals, attendance edits) are logged to <code>audit_logs</code> table, visible on the admin dashboard.</p>
            </Section>
          </TabsContent>

          <TabsContent value="database" className="space-y-4">
            <Section title="Database Design" icon={Database}>
              <p>PostgreSQL with 30+ tables following normalized relational design. Key tables:</p>
              <div className="grid gap-2 sm:grid-cols-2 mt-2">
                {[
                  { name: 'students / teachers / profiles', desc: 'User identity & metadata' },
                  { name: 'user_roles', desc: 'Role assignments (admin/teacher/student/organizer)' },
                  { name: 'courses / course_enrollments', desc: 'Curriculum & student enrollment' },
                  { name: 'attendance / secure_attendance_*', desc: 'Traditional + QR/GPS attendance' },
                  { name: 'internal_marks / semester_results', desc: 'Grading & GPA calculations' },
                  { name: 'assignments / assignment_submissions', desc: 'Homework & grading pipeline' },
                  { name: 'tests / test_attempts / student_answers', desc: 'Online exam engine' },
                  { name: 'coding_labs / coding_lab_submissions', desc: 'Code editor with test cases' },
                  { name: 'library_books / book_issues / book_reservations', desc: 'Library inventory & lending' },
                  { name: 'leave_requests', desc: 'Student leave with teacher approval' },
                  { name: 'events / event_registrations / event_attendance', desc: 'Event lifecycle management' },
                  { name: 'notifications / messages', desc: 'In-app alerts & messaging' },
                  { name: 'audit_logs', desc: 'System activity tracking' },
                ].map((t) => (
                  <div key={t.name} className="p-2 rounded-lg bg-muted/50 border border-border/50">
                    <p className="text-xs font-mono text-foreground">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.desc}</p>
                  </div>
                ))}
              </div>
              <p className="mt-2"><strong>Conventions:</strong> UUIDs as primary keys, <code>created_at</code>/<code>updated_at</code> timestamps on all tables, <code>update_updated_at_column()</code> trigger, foreign keys with appropriate cascading.</p>
            </Section>
          </TabsContent>

          <TabsContent value="modules" className="space-y-4">
            {[
              { icon: GraduationCap, title: 'Student Management', desc: 'CRUD for student profiles with linked auth accounts. Profile photo uploads, department tracking, enrollment history. Profile update requests require admin approval.' },
              { icon: Users, title: 'Teacher Management', desc: 'Faculty records with qualification tracking, department assignment, and course linkage. Teachers manage their own profile and view their assigned course data.' },
              { icon: BookOpen, title: 'Course & Enrollment', desc: 'Course catalog with credit system. Enrollment workflow links students to courses. Used as the basis for attendance, marks, assignments, and schedule modules.' },
              { icon: Shield, title: 'Secure Attendance', desc: 'Multi-factor attendance: rotating QR codes (HMAC-SHA256), GPS geofencing against classroom locations, device fingerprinting. Proxy attempt detection and logging.' },
              { icon: ClipboardList, title: 'Internal Marks & GPA', desc: 'Per-course marks entry by teachers (internal 1/2, mid-term, assignments). Automated SGPA/CGPA calculation based on credit-weighted grade points. Semester result publishing.' },
              { icon: FileText, title: 'Assignments', desc: 'Teachers create assignments with file attachments. Students submit text or file responses. Grading with feedback. Auto-lock after deadline.' },
              { icon: Video, title: 'Live Sessions', desc: 'LiveKit-powered video conferencing for classes and interviews. Waiting room, chat, screen share, recording controls. Participant management with role-based permissions.' },
              { icon: Code2, title: 'Coding Labs', desc: 'In-browser code editor (CodeMirror) supporting C, C++, Java, Python. Server-side execution via Judge0. Test case evaluation, scoring, and plagiarism detection.' },
              { icon: BookOpen, title: 'Library System', desc: 'Book inventory with ISBN, categories, quantity tracking. Issue/return workflow with auto fine calculation (₹2/day overdue). Book reservations with 3-day expiry.' },
              { icon: CalendarDays, title: 'Leave Management', desc: 'Students apply for medical/casual/academic leave. Teachers review and approve/reject with remarks. Leave history and status tracking.' },
              { icon: IndianRupee, title: 'Fee Management', desc: 'Fee structure definition by admin. Student fee tracking with payment status, amounts, and due dates.' },
              { icon: Bell, title: 'Notifications & Messages', desc: 'Real-time notifications via Supabase Realtime. Category-based filtering (assignment, library, leave, event). Direct messaging between users.' },
            ].map((m) => (
              <Section key={m.title} title={m.title} icon={m.icon}>
                <p>{m.desc}</p>
              </Section>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
