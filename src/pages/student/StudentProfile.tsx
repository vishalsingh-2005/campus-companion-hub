import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  User, 
  Mail, 
  Phone, 
  GraduationCap, 
  Building2, 
  Calendar,
  Hash,
  Shield,
  Clock
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface StudentData {
  id: string;
  first_name: string;
  last_name: string;
  student_id: string;
  email: string;
  phone: string | null;
  status: string;
  avatar_url: string | null;
  gender: string | null;
  date_of_birth: string | null;
  address: string | null;
  enrollment_date: string | null;
  created_at: string;
}

export default function StudentProfile() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [studentData, setStudentData] = useState<StudentData | null>(null);

  useEffect(() => {
    async function fetchStudentData() {
      if (!user) return;

      try {
        const { data: student, error } = await supabase
          .from('students')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) throw error;
        setStudentData(student);
      } catch (error) {
        console.error('Error fetching student data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchStudentData();
  }, [user]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-80" />
          <Skeleton className="h-80 lg:col-span-2" />
        </div>
      </div>
    );
  }

  if (!studentData) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <User className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold">Profile Not Found</h2>
        <p className="text-muted-foreground mt-2">
          Your student profile has not been set up yet. Please contact an administrator.
        </p>
      </div>
    );
  }

  const profileFields = [
    { icon: Hash, label: 'Roll Number', value: studentData.student_id },
    { icon: User, label: 'Full Name', value: `${studentData.first_name} ${studentData.last_name}` },
    { icon: Mail, label: 'Email', value: studentData.email },
    { icon: Phone, label: 'Phone', value: studentData.phone || 'Not provided' },
    { icon: User, label: 'Gender', value: studentData.gender || 'Not specified' },
    { icon: Calendar, label: 'Date of Birth', value: studentData.date_of_birth ? format(new Date(studentData.date_of_birth), 'MMMM d, yyyy') : 'Not provided' },
    { icon: Calendar, label: 'Enrollment Date', value: studentData.enrollment_date ? format(new Date(studentData.enrollment_date), 'MMMM d, yyyy') : 'Not provided' },
    { icon: Building2, label: 'Status', value: studentData.status },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="My Profile"
        description="View your personal and academic information (read-only)"
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Profile Card */}
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/5 to-transparent h-32" />
          <CardContent className="pt-8 pb-6 flex flex-col items-center relative">
            <Avatar className="h-28 w-28 border-4 border-background shadow-xl">
              {studentData.avatar_url ? (
                <AvatarImage src={studentData.avatar_url} alt={studentData.first_name} />
              ) : (
                <AvatarFallback className="text-3xl bg-primary text-primary-foreground">
                  {studentData.first_name?.charAt(0)}{studentData.last_name?.charAt(0)}
                </AvatarFallback>
              )}
            </Avatar>
            
            <h2 className="text-xl font-bold mt-4">
              {studentData.first_name} {studentData.last_name}
            </h2>
            <p className="text-muted-foreground">{studentData.email}</p>
            
            <div className="flex flex-wrap justify-center gap-2 mt-4">
              <Badge 
                variant="secondary"
                className={cn(
                  studentData.status === 'active' 
                    ? 'bg-success/10 text-success' 
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {studentData.status}
              </Badge>
              {studentData.gender && (
                <Badge variant="outline">{studentData.gender}</Badge>
              )}
            </div>

            <div className="w-full mt-6 pt-6 border-t">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Shield className="h-4 w-4" />
                <span>Profile managed by administrator</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                <Clock className="h-4 w-4" />
                <span>Member since {format(new Date(studentData.created_at), 'MMMM yyyy')}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Details Card */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              {profileFields.map((field, index) => (
                <div 
                  key={index}
                  className="flex items-start gap-3 p-4 rounded-lg bg-muted/50 border"
                >
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <field.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-muted-foreground">{field.label}</p>
                    <p className="font-medium truncate">{field.value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Address Section */}
            {studentData.address && (
              <div className="mt-6 pt-6 border-t">
                <h3 className="font-semibold mb-4">Address</h3>
                <div className="p-4 rounded-lg bg-muted/50 border">
                  <p className="font-medium">
                    {studentData.address}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Notice */}
      <Card className="border-info/30 bg-info/5">
        <CardContent className="flex items-start gap-4 py-4">
          <div className="h-10 w-10 rounded-lg bg-info/10 flex items-center justify-center flex-shrink-0">
            <Shield className="h-5 w-5 text-info" />
          </div>
          <div>
            <p className="font-medium">Read-Only Profile</p>
            <p className="text-sm text-muted-foreground">
              Your profile information is managed by the college administration. 
              If you need to update any details, please contact the admin office or your department.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
