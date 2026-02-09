import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { PreferencesProvider } from "@/contexts/PreferencesContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import AccessDenied from "./pages/AccessDenied";
import Dashboard from "./pages/Dashboard";
import Students from "./pages/Students";
import Teachers from "./pages/Teachers";
import Courses from "./pages/Courses";
import Enrollments from "./pages/Enrollments";
import StudentDashboard from "./pages/student/StudentDashboard";
import StudentCourses from "./pages/student/StudentCourses";
import StudentSchedule from "./pages/student/StudentSchedule";
import StudentProfile from "./pages/student/StudentProfile";
import StudentSettings from "./pages/student/StudentSettings";
import StudentNotices from "./pages/student/StudentNotices";
import StudentSyllabus from "./pages/student/StudentSyllabus";
import StudentTests from "./pages/student/StudentTests";
import MarkAttendance from "./pages/student/MarkAttendance";
import MyAttendance from "./pages/student/MyAttendance";
import TeacherDashboard from "./pages/teacher/TeacherDashboard";
import TeacherProfile from "./pages/teacher/TeacherProfile";
import TeacherTests from "./pages/teacher/TeacherTests";
import TestAnalytics from "./pages/teacher/TestAnalytics";
import TeacherCodingLabs from "./pages/teacher/TeacherCodingLabs";
import TakeTest from "./pages/student/TakeTest";
import CodingLabs from "./pages/student/CodingLabs";
import CodingLabEditor from "./pages/student/CodingLabEditor";
import StudentEvents from "./pages/student/StudentEvents";
import AdminDashboard from "./pages/admin/AdminDashboard";
import UserManagement from "./pages/admin/UserManagement";
import Reports from "./pages/admin/Reports";
import ClassroomLocations from "./pages/admin/ClassroomLocations";
import EventOrganizers from "./pages/admin/EventOrganizers";
import FeesManagement from "./pages/admin/FeesManagement";
import OrganizerDashboard from "./pages/organizer/OrganizerDashboard";
import EventsManagement from "./pages/organizer/EventsManagement";
import EventAttendance from "./pages/organizer/EventAttendance";
import EventAnnouncements from "./pages/organizer/EventAnnouncements";
import EventAnalytics from "./pages/organizer/EventAnalytics";
import Attendance from "./pages/Attendance";
import AttendanceReports from "./pages/AttendanceReports";
import SecureAttendance from "./pages/SecureAttendance";
import Schedules from "./pages/Schedules";
import LiveSessions from "./pages/LiveSessions";
import LiveRoom from "./pages/LiveRoom";
import StudentFees from "./pages/student/StudentFees";
import StudentHolidays from "./pages/student/StudentHolidays";
import TeacherHolidays from "./pages/teacher/TeacherHolidays";
import HolidaysManagement from "./pages/admin/HolidaysManagement";
import SettingsPage from "./pages/settings/SettingsPage";
import MessagesPage from "./pages/MessagesPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <PreferencesProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
              {/* Public routes */}
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/access-denied" element={<AccessDenied />} />

              {/* Messages - accessible to all authenticated users */}
              <Route
                path="/messages"
                element={
                  <ProtectedRoute>
                    <MessagesPage />
                  </ProtectedRoute>
                }
              />

              {/* Role-based dashboard redirects */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />

              {/* Admin-only routes */}
              <Route
                path="/admin/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <DashboardLayout><AdminDashboard /></DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/users"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <UserManagement />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/reports"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <Reports />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/locations"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <ClassroomLocations />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/organizers"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <EventOrganizers />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/fees"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <FeesManagement />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/holidays"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <HolidaysManagement />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/settings"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <SettingsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/attendance"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'teacher']}>
                    <Attendance />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/attendance/reports"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'teacher']}>
                    <AttendanceReports />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/secure-attendance"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'teacher']}>
                    <SecureAttendance />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/schedules"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'teacher']}>
                    <Schedules />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/live-sessions"
                element={
                  <ProtectedRoute>
                    <LiveSessions />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/live-room/:sessionId"
                element={
                  <ProtectedRoute>
                    <LiveRoom />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/students"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <Students />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/teachers"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <Teachers />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/courses"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <Courses />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/enrollments"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <Enrollments />
                  </ProtectedRoute>
                }
              />

              {/* Teacher routes */}
              <Route
                path="/teacher/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['teacher']}>
                    <DashboardLayout><TeacherDashboard /></DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/teacher/profile"
                element={
                  <ProtectedRoute allowedRoles={['teacher']}>
                    <TeacherProfile />
                </ProtectedRoute>
                }
              />
              <Route
                path="/teacher/tests"
                element={
                  <ProtectedRoute allowedRoles={['teacher']}>
                    <TeacherTests />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/teacher/tests/:testId/analytics"
                element={
                  <ProtectedRoute allowedRoles={['teacher']}>
                    <TestAnalytics />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/teacher/holidays"
                element={
                  <ProtectedRoute allowedRoles={['teacher']}>
                    <TeacherHolidays />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/teacher/coding-labs"
                element={
                  <ProtectedRoute allowedRoles={['teacher']}>
                    <TeacherCodingLabs />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/teacher/settings"
                element={
                  <ProtectedRoute allowedRoles={['teacher']}>
                    <SettingsPage />
                  </ProtectedRoute>
                }
              />

              {/* Student routes */}
              <Route
                path="/student/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['student']}>
                    <DashboardLayout><StudentDashboard /></DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student/courses"
                element={
                  <ProtectedRoute allowedRoles={['student']}>
                    <StudentCourses />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student/attendance"
                element={
                  <ProtectedRoute allowedRoles={['student']}>
                    <MyAttendance />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student/schedule"
                element={
                  <ProtectedRoute allowedRoles={['student']}>
                    <StudentSchedule />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student/profile"
                element={
                  <ProtectedRoute allowedRoles={['student']}>
                    <StudentProfile />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student/settings"
                element={
                  <ProtectedRoute allowedRoles={['student']}>
                    <SettingsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student/notices"
                element={
                  <ProtectedRoute allowedRoles={['student']}>
                    <StudentNotices />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student/mark-attendance"
                element={
                  <ProtectedRoute allowedRoles={['student']}>
                    <MarkAttendance />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student/syllabus"
                element={
                  <ProtectedRoute allowedRoles={['student']}>
                    <StudentSyllabus />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student/tests"
                element={
                  <ProtectedRoute allowedRoles={['student']}>
                    <StudentTests />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student/take-test/:testId"
                element={
                  <ProtectedRoute allowedRoles={['student']}>
                    <TakeTest />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student/coding-labs"
                element={
                  <ProtectedRoute allowedRoles={['student']}>
                    <CodingLabs />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student/coding-lab/:labId"
                element={
                  <ProtectedRoute allowedRoles={['student']}>
                    <CodingLabEditor />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student/events"
                element={
                  <ProtectedRoute allowedRoles={['student']}>
                    <StudentEvents />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student/holidays"
                element={
                  <ProtectedRoute allowedRoles={['student']}>
                    <StudentHolidays />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student/fees"
                element={
                  <ProtectedRoute allowedRoles={['student']}>
                    <StudentFees />
                  </ProtectedRoute>
                }
              />

              {/* Event Organizer routes */}
              <Route
                path="/organizer/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['event_organizer']}>
                    <DashboardLayout><OrganizerDashboard /></DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/organizer/events"
                element={
                  <ProtectedRoute allowedRoles={['event_organizer']}>
                    <EventsManagement />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/organizer/attendance"
                element={
                  <ProtectedRoute allowedRoles={['event_organizer']}>
                    <EventAttendance />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/organizer/announcements"
                element={
                  <ProtectedRoute allowedRoles={['event_organizer']}>
                    <EventAnnouncements />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/organizer/analytics"
                element={
                  <ProtectedRoute allowedRoles={['event_organizer']}>
                    <EventAnalytics />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/organizer/settings"
                element={
                  <ProtectedRoute allowedRoles={['event_organizer']}>
                    <SettingsPage />
                  </ProtectedRoute>
                }
              />

              {/* Fallback */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
        </PreferencesProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
