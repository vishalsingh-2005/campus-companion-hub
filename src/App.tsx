import { Suspense, lazy } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { PreferencesProvider } from "@/contexts/PreferencesContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { Loader2 } from 'lucide-react';

// Eagerly loaded (small, critical path)
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import AccessDenied from "./pages/AccessDenied";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";

// Lazy loaded — admin
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const UserManagement = lazy(() => import("./pages/admin/UserManagement"));
const Reports = lazy(() => import("./pages/admin/Reports"));
const ClassroomLocations = lazy(() => import("./pages/admin/ClassroomLocations"));
const EventOrganizers = lazy(() => import("./pages/admin/EventOrganizers"));
const FeesManagement = lazy(() => import("./pages/admin/FeesManagement"));
const HolidaysManagement = lazy(() => import("./pages/admin/HolidaysManagement"));
const LibraryManagement = lazy(() => import("./pages/admin/LibraryManagement"));
const ProfileApprovals = lazy(() => import("./pages/admin/ProfileApprovals"));
const ProxyMonitoring = lazy(() => import("./pages/admin/ProxyMonitoring"));
const CodingLabAnalytics = lazy(() => import("./pages/admin/CodingLabAnalytics"));
const SystemDocumentation = lazy(() => import("./pages/admin/SystemDocumentation"));

// Lazy loaded — teacher
const TeacherDashboard = lazy(() => import("./pages/teacher/TeacherDashboard"));
const TeacherProfile = lazy(() => import("./pages/teacher/TeacherProfile"));
const TeacherTests = lazy(() => import("./pages/teacher/TeacherTests"));
const TestAnalytics = lazy(() => import("./pages/teacher/TestAnalytics"));
const TeacherCodingLabs = lazy(() => import("./pages/teacher/TeacherCodingLabs"));
const TeacherHolidays = lazy(() => import("./pages/teacher/TeacherHolidays"));
const TeacherAssignments = lazy(() => import("./pages/teacher/TeacherAssignments"));
const TeacherLeave = lazy(() => import("./pages/teacher/TeacherLeave"));
const TeacherMarks = lazy(() => import("./pages/teacher/TeacherMarks"));

// Lazy loaded — student
const StudentDashboard = lazy(() => import("./pages/student/StudentDashboard"));
const StudentCourses = lazy(() => import("./pages/student/StudentCourses"));
const StudentSchedule = lazy(() => import("./pages/student/StudentSchedule"));
const StudentProfile = lazy(() => import("./pages/student/StudentProfile"));
const StudentSettings = lazy(() => import("./pages/student/StudentSettings"));
const StudentNotices = lazy(() => import("./pages/student/StudentNotices"));
const StudentSyllabus = lazy(() => import("./pages/student/StudentSyllabus"));
const StudentTests = lazy(() => import("./pages/student/StudentTests"));
const MarkAttendance = lazy(() => import("./pages/student/MarkAttendance"));
const MyAttendance = lazy(() => import("./pages/student/MyAttendance"));
const TakeTest = lazy(() => import("./pages/student/TakeTest"));
const CodingLabs = lazy(() => import("./pages/student/CodingLabs"));
const CodingLabEditor = lazy(() => import("./pages/student/CodingLabEditor"));
const StudentEvents = lazy(() => import("./pages/student/StudentEvents"));
const StudentFees = lazy(() => import("./pages/student/StudentFees"));
const StudentHolidays = lazy(() => import("./pages/student/StudentHolidays"));
const StudentLibrary = lazy(() => import("./pages/student/StudentLibrary"));
const StudentAssignments = lazy(() => import("./pages/student/StudentAssignments"));
const StudentLeave = lazy(() => import("./pages/student/StudentLeave"));
const StudentMarks = lazy(() => import("./pages/student/StudentMarks"));

// Lazy loaded — shared heavy pages
const Students = lazy(() => import("./pages/Students"));
const Teachers = lazy(() => import("./pages/Teachers"));
const Courses = lazy(() => import("./pages/Courses"));
const Enrollments = lazy(() => import("./pages/Enrollments"));
const Attendance = lazy(() => import("./pages/Attendance"));
const AttendanceReports = lazy(() => import("./pages/AttendanceReports"));
const SecureAttendance = lazy(() => import("./pages/SecureAttendance"));
const Schedules = lazy(() => import("./pages/Schedules"));
const LiveSessions = lazy(() => import("./pages/LiveSessions"));
const LiveRoom = lazy(() => import("./pages/LiveRoom"));
const MessagesPage = lazy(() => import("./pages/MessagesPage"));
const SettingsPage = lazy(() => import("./pages/settings/SettingsPage"));

// Lazy loaded — organizer
const OrganizerDashboard = lazy(() => import("./pages/organizer/OrganizerDashboard"));
const EventsManagement = lazy(() => import("./pages/organizer/EventsManagement"));
const EventAttendance = lazy(() => import("./pages/organizer/EventAttendance"));
const EventAnnouncements = lazy(() => import("./pages/organizer/EventAnnouncements"));
const EventAnalytics = lazy(() => import("./pages/organizer/EventAnalytics"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function PageLoader() {
  return (
    <div className="flex h-[50vh] items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <PreferencesProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <ErrorBoundary>
              <BrowserRouter>
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    {/* Public routes */}
                    <Route path="/" element={<Index />} />
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/access-denied" element={<AccessDenied />} />

                    {/* Role-based dashboard redirect */}
                    <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />

                    {/* Messages */}
                    <Route path="/messages" element={<ProtectedRoute><MessagesPage /></ProtectedRoute>} />

                    {/* ═══ Admin routes ═══ */}
                    <Route path="/admin/dashboard" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout><AdminDashboard /></DashboardLayout></ProtectedRoute>} />
                    <Route path="/admin/users" element={<ProtectedRoute allowedRoles={['admin']}><UserManagement /></ProtectedRoute>} />
                    <Route path="/admin/reports" element={<ProtectedRoute allowedRoles={['admin']}><Reports /></ProtectedRoute>} />
                    <Route path="/admin/locations" element={<ProtectedRoute allowedRoles={['admin']}><ClassroomLocations /></ProtectedRoute>} />
                    <Route path="/admin/organizers" element={<ProtectedRoute allowedRoles={['admin']}><EventOrganizers /></ProtectedRoute>} />
                    <Route path="/admin/fees" element={<ProtectedRoute allowedRoles={['admin']}><FeesManagement /></ProtectedRoute>} />
                    <Route path="/admin/holidays" element={<ProtectedRoute allowedRoles={['admin']}><HolidaysManagement /></ProtectedRoute>} />
                    <Route path="/admin/library" element={<ProtectedRoute allowedRoles={['admin']}><LibraryManagement /></ProtectedRoute>} />
                    <Route path="/admin/profile-approvals" element={<ProtectedRoute allowedRoles={['admin']}><ProfileApprovals /></ProtectedRoute>} />
                    <Route path="/admin/proxy-monitoring" element={<ProtectedRoute allowedRoles={['admin']}><ProxyMonitoring /></ProtectedRoute>} />
                    <Route path="/admin/coding-analytics" element={<ProtectedRoute allowedRoles={['admin']}><CodingLabAnalytics /></ProtectedRoute>} />
                    <Route path="/admin/documentation" element={<ProtectedRoute allowedRoles={['admin']}><SystemDocumentation /></ProtectedRoute>} />
                    <Route path="/admin/settings" element={<ProtectedRoute allowedRoles={['admin']}><SettingsPage /></ProtectedRoute>} />

                    {/* Shared admin/teacher routes */}
                    <Route path="/students" element={<ProtectedRoute allowedRoles={['admin']}><Students /></ProtectedRoute>} />
                    <Route path="/teachers" element={<ProtectedRoute allowedRoles={['admin']}><Teachers /></ProtectedRoute>} />
                    <Route path="/courses" element={<ProtectedRoute allowedRoles={['admin']}><Courses /></ProtectedRoute>} />
                    <Route path="/enrollments" element={<ProtectedRoute allowedRoles={['admin']}><Enrollments /></ProtectedRoute>} />
                    <Route path="/attendance" element={<ProtectedRoute allowedRoles={['admin', 'teacher']}><Attendance /></ProtectedRoute>} />
                    <Route path="/attendance/reports" element={<ProtectedRoute allowedRoles={['admin', 'teacher']}><AttendanceReports /></ProtectedRoute>} />
                    <Route path="/secure-attendance" element={<ProtectedRoute allowedRoles={['admin', 'teacher']}><SecureAttendance /></ProtectedRoute>} />
                    <Route path="/schedules" element={<ProtectedRoute allowedRoles={['admin', 'teacher']}><Schedules /></ProtectedRoute>} />
                    <Route path="/live-sessions" element={<ProtectedRoute><LiveSessions /></ProtectedRoute>} />
                    <Route path="/live-room/:sessionId" element={<ProtectedRoute><LiveRoom /></ProtectedRoute>} />

                    {/* ═══ Teacher routes ═══ */}
                    <Route path="/teacher/dashboard" element={<ProtectedRoute allowedRoles={['teacher']}><DashboardLayout><TeacherDashboard /></DashboardLayout></ProtectedRoute>} />
                    <Route path="/teacher/profile" element={<ProtectedRoute allowedRoles={['teacher']}><TeacherProfile /></ProtectedRoute>} />
                    <Route path="/teacher/tests" element={<ProtectedRoute allowedRoles={['teacher']}><TeacherTests /></ProtectedRoute>} />
                    <Route path="/teacher/tests/:testId/analytics" element={<ProtectedRoute allowedRoles={['teacher']}><TestAnalytics /></ProtectedRoute>} />
                    <Route path="/teacher/holidays" element={<ProtectedRoute allowedRoles={['teacher']}><TeacherHolidays /></ProtectedRoute>} />
                    <Route path="/teacher/coding-labs" element={<ProtectedRoute allowedRoles={['teacher']}><TeacherCodingLabs /></ProtectedRoute>} />
                    <Route path="/teacher/settings" element={<ProtectedRoute allowedRoles={['teacher']}><SettingsPage /></ProtectedRoute>} />
                    <Route path="/teacher/assignments" element={<ProtectedRoute allowedRoles={['teacher']}><TeacherAssignments /></ProtectedRoute>} />
                    <Route path="/teacher/leave" element={<ProtectedRoute allowedRoles={['teacher']}><TeacherLeave /></ProtectedRoute>} />
                    <Route path="/teacher/marks" element={<ProtectedRoute allowedRoles={['teacher']}><TeacherMarks /></ProtectedRoute>} />

                    {/* ═══ Student routes ═══ */}
                    <Route path="/student/dashboard" element={<ProtectedRoute allowedRoles={['student']}><DashboardLayout><StudentDashboard /></DashboardLayout></ProtectedRoute>} />
                    <Route path="/student/courses" element={<ProtectedRoute allowedRoles={['student']}><StudentCourses /></ProtectedRoute>} />
                    <Route path="/student/attendance" element={<ProtectedRoute allowedRoles={['student']}><MyAttendance /></ProtectedRoute>} />
                    <Route path="/student/schedule" element={<ProtectedRoute allowedRoles={['student']}><StudentSchedule /></ProtectedRoute>} />
                    <Route path="/student/profile" element={<ProtectedRoute allowedRoles={['student']}><StudentProfile /></ProtectedRoute>} />
                    <Route path="/student/settings" element={<ProtectedRoute allowedRoles={['student']}><SettingsPage /></ProtectedRoute>} />
                    <Route path="/student/notices" element={<ProtectedRoute allowedRoles={['student']}><StudentNotices /></ProtectedRoute>} />
                    <Route path="/student/mark-attendance" element={<ProtectedRoute allowedRoles={['student']}><MarkAttendance /></ProtectedRoute>} />
                    <Route path="/student/syllabus" element={<ProtectedRoute allowedRoles={['student']}><StudentSyllabus /></ProtectedRoute>} />
                    <Route path="/student/tests" element={<ProtectedRoute allowedRoles={['student']}><StudentTests /></ProtectedRoute>} />
                    <Route path="/student/take-test/:testId" element={<ProtectedRoute allowedRoles={['student']}><TakeTest /></ProtectedRoute>} />
                    <Route path="/student/coding-labs" element={<ProtectedRoute allowedRoles={['student']}><CodingLabs /></ProtectedRoute>} />
                    <Route path="/student/coding-lab/:labId" element={<ProtectedRoute allowedRoles={['student']}><CodingLabEditor /></ProtectedRoute>} />
                    <Route path="/student/events" element={<ProtectedRoute allowedRoles={['student']}><StudentEvents /></ProtectedRoute>} />
                    <Route path="/student/holidays" element={<ProtectedRoute allowedRoles={['student']}><StudentHolidays /></ProtectedRoute>} />
                    <Route path="/student/fees" element={<ProtectedRoute allowedRoles={['student']}><StudentFees /></ProtectedRoute>} />
                    <Route path="/student/library" element={<ProtectedRoute allowedRoles={['student']}><StudentLibrary /></ProtectedRoute>} />
                    <Route path="/student/assignments" element={<ProtectedRoute allowedRoles={['student']}><StudentAssignments /></ProtectedRoute>} />
                    <Route path="/student/leave" element={<ProtectedRoute allowedRoles={['student']}><StudentLeave /></ProtectedRoute>} />
                    <Route path="/student/marks" element={<ProtectedRoute allowedRoles={['student']}><StudentMarks /></ProtectedRoute>} />

                    {/* ═══ Organizer routes ═══ */}
                    <Route path="/organizer/dashboard" element={<ProtectedRoute allowedRoles={['event_organizer']}><DashboardLayout><OrganizerDashboard /></DashboardLayout></ProtectedRoute>} />
                    <Route path="/organizer/events" element={<ProtectedRoute allowedRoles={['event_organizer']}><EventsManagement /></ProtectedRoute>} />
                    <Route path="/organizer/attendance" element={<ProtectedRoute allowedRoles={['event_organizer']}><EventAttendance /></ProtectedRoute>} />
                    <Route path="/organizer/announcements" element={<ProtectedRoute allowedRoles={['event_organizer']}><EventAnnouncements /></ProtectedRoute>} />
                    <Route path="/organizer/analytics" element={<ProtectedRoute allowedRoles={['event_organizer']}><EventAnalytics /></ProtectedRoute>} />
                    <Route path="/organizer/settings" element={<ProtectedRoute allowedRoles={['event_organizer']}><SettingsPage /></ProtectedRoute>} />

                    {/* Fallback */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </BrowserRouter>
            </ErrorBoundary>
          </TooltipProvider>
        </PreferencesProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
