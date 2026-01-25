import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  FileText, 
  Download, 
  BookOpen,
  Calendar,
  ExternalLink
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';

interface SyllabusItem {
  id: string;
  title: string;
  description: string | null;
  file_url: string | null;
  file_name: string | null;
  created_at: string;
  courses: {
    id: string;
    course_code: string;
    course_name: string;
  };
}

export default function StudentSyllabus() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [syllabusList, setSyllabusList] = useState<SyllabusItem[]>([]);

  useEffect(() => {
    async function fetchSyllabus() {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('course_syllabus')
          .select(`
            id,
            title,
            description,
            file_url,
            file_name,
            created_at,
            courses (
              id,
              course_code,
              course_name
            )
          `)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setSyllabusList((data as unknown as SyllabusItem[]) || []);
      } catch (error) {
        console.error('Error fetching syllabus:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchSyllabus();
  }, [user]);

  const handleDownload = (fileUrl: string, fileName: string) => {
    window.open(fileUrl, '_blank');
  };

  // Group syllabus by course
  const groupedSyllabus = syllabusList.reduce((acc, item) => {
    const courseId = item.courses?.id || 'unknown';
    if (!acc[courseId]) {
      acc[courseId] = {
        course: item.courses,
        items: []
      };
    }
    acc[courseId].items.push(item);
    return acc;
  }, {} as Record<string, { course: SyllabusItem['courses']; items: SyllabusItem[] }>);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid gap-6">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Course Syllabus"
        description="View and download syllabus documents for your enrolled courses"
      />

      {Object.keys(groupedSyllabus).length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">No Syllabus Available</h3>
            <p className="text-muted-foreground text-center mt-2">
              Syllabus documents for your courses will appear here once uploaded by your teachers.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.values(groupedSyllabus).map(({ course, items }) => (
            <Card key={course?.id || 'unknown'}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  {course?.course_name || 'Unknown Course'}
                  <Badge variant="outline" className="ml-2">
                    {course?.course_code}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {items.map((syllabus) => (
                    <div 
                      key={syllabus.id}
                      className="flex items-start gap-4 p-4 rounded-lg bg-muted/50 border"
                    >
                      <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <FileText className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold">{syllabus.title}</h4>
                        {syllabus.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {syllabus.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>Uploaded {format(new Date(syllabus.created_at), 'MMM d, yyyy')}</span>
                        </div>
                      </div>
                      {syllabus.file_url && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownload(syllabus.file_url!, syllabus.file_name || 'syllabus')}
                          className="flex-shrink-0"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
