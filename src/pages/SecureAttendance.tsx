import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useCourses } from '@/hooks/useCourses';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import {
  useSecureAttendanceSessions,
  useQRTokenGenerator,
  useSessionAttendanceRecords,
  useClassroomLocations,
} from '@/hooks/useSecureAttendance';
import { supabase } from '@/integrations/supabase/client';
import { Navigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import {
  QrCode,
  Play,
  Square,
  Users,
  Clock,
  MapPin,
  Camera,
  CheckCircle2,
  Timer,
  RefreshCw,
  Shield,
  Wifi,
} from 'lucide-react';
import { format, differenceInSeconds } from 'date-fns';
import { cn } from '@/lib/utils';

export default function SecureAttendance() {
  const { user } = useAuth();
  const { isAdmin, isTeacher, isLoading: roleLoading } = useUserRole();
  const { courses, loading: coursesLoading } = useCourses();
  const { locations } = useClassroomLocations();
  const { sessions, createSession, endSession, isLoading: sessionsLoading } = useSecureAttendanceSessions();

  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [activeSession, setActiveSession] = useState<string | null>(null);
  const [showStartForm, setShowStartForm] = useState(false);

  // Form state for starting new session
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [timeWindow, setTimeWindow] = useState('15');
  const [requireSelfie, setRequireSelfie] = useState(false);
  const [requireGps, setRequireGps] = useState(true);

  // Get teacher ID
  useEffect(() => {
    async function getTeacherId() {
      if (!user) return;

      const { data } = await supabase
        .from('teachers')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data) {
        setTeacherId(data.id);
      }
    }

    getTeacherId();
  }, [user]);

  // Find active session
  useEffect(() => {
    const active = sessions.find(s => s.status === 'active');
    setActiveSession(active?.id || null);
  }, [sessions]);

  const { token, expiresAt, isGenerating } = useQRTokenGenerator(
    activeSession,
    30
  );

  const { data: attendanceRecords, isLoading: recordsLoading } = useSessionAttendanceRecords(activeSession);

  const handleStartSession = async () => {
    if (!teacherId || !selectedCourse) return;

    await createSession.mutateAsync({
      course_id: selectedCourse,
      teacher_id: teacherId,
      classroom_location_id: selectedLocation || undefined,
      time_window_minutes: parseInt(timeWindow),
      require_selfie: requireSelfie,
      require_gps: requireGps,
    });

    setShowStartForm(false);
    setSelectedCourse('');
    setSelectedLocation('');
    setTimeWindow('15');
    setRequireSelfie(false);
    setRequireGps(true);
  };

  const handleEndSession = async () => {
    if (!activeSession) return;
    await endSession.mutateAsync(activeSession);
  };

  const activeSessionData = sessions.find(s => s.id === activeSession);

  // Calculate time remaining
  const getTimeRemaining = () => {
    if (!activeSessionData) return null;
    const start = new Date(activeSessionData.start_time);
    const windowEnd = new Date(start.getTime() + activeSessionData.time_window_minutes * 60 * 1000);
    const remaining = differenceInSeconds(windowEnd, new Date());
    if (remaining <= 0) return 'Expired';
    const mins = Math.floor(remaining / 60);
    const secs = remaining % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (roleLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!isAdmin && !isTeacher) {
    return <Navigate to="/access-denied" replace />;
  }

  if (!teacherId && !isAdmin) {
    return (
      <DashboardLayout>
        <PageHeader
          title="Secure Attendance"
          description="Your account is not linked to a teacher profile"
        />
        <Card>
          <CardContent className="py-12 text-center">
            <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p>Please contact an administrator to link your account.</p>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <PageHeader
        title="Secure Attendance"
        description="Anti-proxy attendance system with QR codes, GPS, and device verification"
      />

      {/* Active Session QR Display */}
      {activeSession && activeSessionData && (
        <Card className="mb-6 border-primary/50 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Wifi className="h-5 w-5 text-success animate-pulse" />
                  Live Session: {activeSessionData.courses?.course_name}
                </CardTitle>
                <CardDescription>
                  {activeSessionData.courses?.course_code} • Started {format(new Date(activeSessionData.start_time), 'h:mm a')}
                </CardDescription>
              </div>
              <Button variant="destructive" onClick={handleEndSession}>
                <Square className="mr-2 h-4 w-4" />
                End Session
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 lg:grid-cols-2">
              {/* QR Code Display */}
              <div className="flex flex-col items-center">
                <div className="relative p-4 bg-white rounded-2xl shadow-lg">
                  {token ? (
                    <QRCodeSVG
                      value={JSON.stringify({
                        session_id: activeSession,
                        token: token,
                        expires: expiresAt?.toISOString(),
                      })}
                      size={280}
                      level="H"
                      includeMargin
                    />
                  ) : (
                    <div className="w-[280px] h-[280px] flex items-center justify-center">
                      <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  )}
                  
                  {/* Rotating indicator */}
                  <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                    <RefreshCw className={cn('h-3 w-3', isGenerating && 'animate-spin')} />
                    Rotates every 30s
                  </div>
                </div>

                <div className="mt-6 text-center">
                  <p className="text-sm text-muted-foreground mb-2">Time Remaining</p>
                  <div className="text-3xl font-bold font-mono text-primary">
                    {getTimeRemaining()}
                  </div>
                </div>
              </div>

              {/* Session Info & Stats */}
              <div className="space-y-4">
                {/* Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
                          <Users className="h-5 w-5 text-success" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold">{activeSessionData.attendance_count}</p>
                          <p className="text-xs text-muted-foreground">Attended</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Timer className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold">{activeSessionData.time_window_minutes}</p>
                          <p className="text-xs text-muted-foreground">Min Window</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Security Features */}
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm font-medium mb-3">Security Features</p>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-success" />
                        <span className="text-sm">Rotating QR Code (30s)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {activeSessionData.require_gps ? (
                          <CheckCircle2 className="h-4 w-4 text-success" />
                        ) : (
                          <div className="h-4 w-4 rounded-full border-2 border-muted" />
                        )}
                        <span className="text-sm">GPS Verification (50m radius)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {activeSessionData.require_selfie ? (
                          <CheckCircle2 className="h-4 w-4 text-success" />
                        ) : (
                          <div className="h-4 w-4 rounded-full border-2 border-muted" />
                        )}
                        <span className="text-sm">Selfie Capture</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-success" />
                        <span className="text-sm">Device Binding</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Location */}
                {activeSessionData.classroom_locations && (
                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-primary" />
                        <span className="font-medium">{activeSessionData.classroom_locations.name}</span>
                        <Badge variant="outline" className="ml-auto">
                          {activeSessionData.classroom_locations.radius_meters}m radius
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>

            {/* Real-time Attendance List */}
            <div className="mt-6">
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Live Attendance ({attendanceRecords?.length || 0})
              </h4>
              
              {recordsLoading ? (
                <Skeleton className="h-32" />
              ) : attendanceRecords && attendanceRecords.length > 0 ? (
                <div className="rounded-xl border overflow-hidden max-h-64 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead>Distance</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {attendanceRecords.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">
                                {record.students?.first_name} {record.students?.last_name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {record.students?.student_id}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            {format(new Date(record.marked_at), 'h:mm:ss a')}
                          </TableCell>
                          <TableCell>
                            {record.distance_from_classroom_meters
                              ? `${Math.round(record.distance_from_classroom_meters)}m`
                              : '-'}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={record.verification_status === 'verified' ? 'default' : 'secondary'}
                              className={cn(
                                record.verification_status === 'verified' && 'bg-success text-success-foreground'
                              )}
                            >
                              {record.verification_status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground border rounded-xl">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Waiting for students to scan...</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Start New Session Form */}
      {!activeSession && (
        <>
          {!showStartForm ? (
            <Card className="mb-6">
              <CardContent className="py-12 text-center">
                <QrCode className="h-16 w-16 mx-auto mb-4 text-primary" />
                <h3 className="text-xl font-semibold mb-2">No Active Session</h3>
                <p className="text-muted-foreground mb-6">
                  Start a new secure attendance session for your class
                </p>
                <Button size="lg" onClick={() => setShowStartForm(true)}>
                  <Play className="mr-2 h-5 w-5" />
                  Start Attendance Session
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Start New Session</CardTitle>
                <CardDescription>Configure security settings for this attendance session</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Course *</Label>
                    <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a course" />
                      </SelectTrigger>
                      <SelectContent>
                        {courses?.map((course) => (
                          <SelectItem key={course.id} value={course.id}>
                            {course.course_code} - {course.course_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Classroom Location</Label>
                    <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select location (for GPS)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">No location</SelectItem>
                        {locations.map((loc) => (
                          <SelectItem key={loc.id} value={loc.id}>
                            {loc.name} ({loc.building} - {loc.room_number})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Time Window (minutes)</Label>
                    <Input
                      type="number"
                      min="5"
                      max="60"
                      value={timeWindow}
                      onChange={(e) => setTimeWindow(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Students can mark attendance within this time
                    </p>
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t">
                  <h4 className="font-medium">Security Settings</h4>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        GPS Verification
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Require students to be within 50m of classroom
                      </p>
                    </div>
                    <Switch checked={requireGps} onCheckedChange={setRequireGps} />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="flex items-center gap-2">
                        <Camera className="h-4 w-4" />
                        Selfie Capture
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Require students to take a photo when marking attendance
                      </p>
                    </div>
                    <Switch checked={requireSelfie} onCheckedChange={setRequireSelfie} />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button variant="outline" onClick={() => setShowStartForm(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleStartSession}
                    disabled={!selectedCourse || createSession.isPending}
                  >
                    <Play className="mr-2 h-4 w-4" />
                    {createSession.isPending ? 'Starting...' : 'Start Session'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Recent Sessions History */}
      <Card>
        <CardHeader>
          <CardTitle>Session History</CardTitle>
          <CardDescription>Your recent attendance sessions</CardDescription>
        </CardHeader>
        <CardContent>
          {sessionsLoading ? (
            <Skeleton className="h-32" />
          ) : sessions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No sessions yet</p>
            </div>
          ) : (
            <div className="rounded-xl border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Attendance</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.slice(0, 10).map((session) => (
                    <TableRow key={session.id}>
                      <TableCell>
                        {format(new Date(session.session_date), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{session.courses?.course_name}</p>
                          <p className="text-xs text-muted-foreground">{session.courses?.course_code}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {format(new Date(session.start_time), 'h:mm a')}
                        {session.end_time && ` - ${format(new Date(session.end_time), 'h:mm a')}`}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{session.attendance_count} students</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={session.status === 'active' ? 'default' : 'secondary'}
                          className={cn(
                            session.status === 'active' && 'bg-success text-success-foreground'
                          )}
                        >
                          {session.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
