import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { StatCard } from '@/components/ui/stat-card';
import { Code2, Clock, Trophy, CheckCircle2, Timer, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, isPast, isFuture } from 'date-fns';
import { cn } from '@/lib/utils';

interface Lab {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  time_limit_seconds: number;
  memory_limit_mb: number;
  allowed_languages: string[];
  start_date: string | null;
  end_date: string | null;
  courses: {
    course_code: string;
    course_name: string;
  } | null;
  best_submission?: {
    status: string;
    score: number;
  } | null;
}

export default function CodingLabs() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [labs, setLabs] = useState<Lab[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    pending: 0,
  });

  useEffect(() => {
    async function fetchLabs() {
      if (!user) return;

      try {
        // Get student ID
        const { data: student } = await supabase
          .from('students')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!student) return;

        // Fetch labs
        const { data: labsData, error } = await supabase
          .from('coding_labs')
          .select(`
            id,
            title,
            description,
            difficulty,
            time_limit_seconds,
            memory_limit_mb,
            allowed_languages,
            start_date,
            end_date,
            courses (
              course_code,
              course_name
            )
          `)
          .eq('status', 'active')
          .eq('is_enabled', true);

        if (error) throw error;

        // Fetch best submissions for each lab
        const labsWithSubmissions = await Promise.all(
          (labsData || []).map(async (lab: any) => {
            const { data: submissions } = await supabase
              .from('coding_lab_submissions')
              .select('status, score')
              .eq('lab_id', lab.id)
              .eq('student_id', student.id)
              .order('score', { ascending: false })
              .limit(1);

            return {
              ...lab,
              best_submission: submissions?.[0] || null,
            };
          })
        );

        setLabs(labsWithSubmissions);

        // Calculate stats
        const completed = labsWithSubmissions.filter(
          (l) => l.best_submission?.status === 'accepted'
        ).length;

        setStats({
          total: labsWithSubmissions.length,
          completed,
          pending: labsWithSubmissions.length - completed,
        });
      } catch (error) {
        console.error('Error fetching labs:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchLabs();
  }, [user]);

  const getDifficultyBadge = (difficulty: string) => {
    const variants: Record<string, string> = {
      easy: 'bg-success/10 text-success',
      medium: 'bg-warning/10 text-warning',
      hard: 'bg-destructive/10 text-destructive',
    };
    return variants[difficulty] || 'bg-muted text-muted-foreground';
  };

  const getLabStatus = (lab: Lab) => {
    if (lab.best_submission?.status === 'accepted') {
      return { label: 'Completed', class: 'bg-success/10 text-success', icon: CheckCircle2 };
    }
    if (lab.best_submission) {
      return { label: 'Attempted', class: 'bg-warning/10 text-warning', icon: Timer };
    }
    if (lab.end_date && isPast(new Date(lab.end_date))) {
      return { label: 'Expired', class: 'bg-muted text-muted-foreground', icon: Clock };
    }
    return { label: 'New', class: 'bg-primary/10 text-primary', icon: Code2 };
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Coding Labs"
        description="Practice your coding skills with programming challenges"
      />

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          title="Total Labs"
          value={stats.total}
          icon={Code2}
          description="Available challenges"
        />
        <StatCard
          title="Completed"
          value={stats.completed}
          icon={Trophy}
          description="All tests passed"
        />
        <StatCard
          title="Pending"
          value={stats.pending}
          icon={Timer}
          description="Yet to complete"
        />
      </div>

      {/* Labs Grid */}
      {labs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Code2 className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No Labs Available</h3>
            <p className="text-muted-foreground text-sm">
              Check back later for new coding challenges
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {labs.map((lab) => {
            const status = getLabStatus(lab);
            const StatusIcon = status.icon;
            const isExpired = lab.end_date && isPast(new Date(lab.end_date));

            return (
              <Card
                key={lab.id}
                className={cn(
                  'hover:shadow-md transition-shadow cursor-pointer group',
                  isExpired && 'opacity-60'
                )}
                onClick={() => !isExpired && navigate(`/student/coding-lab/${lab.id}`)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <CardTitle className="text-lg line-clamp-1 group-hover:text-primary transition-colors">
                        {lab.title}
                      </CardTitle>
                      {lab.courses && (
                        <CardDescription className="mt-1">
                          {lab.courses.course_code} - {lab.courses.course_name}
                        </CardDescription>
                      )}
                    </div>
                    <Badge className={status.class}>
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {status.label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {lab.description}
                  </p>

                  <div className="flex flex-wrap gap-2">
                    <Badge className={getDifficultyBadge(lab.difficulty)}>
                      {lab.difficulty}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      <Clock className="h-3 w-3 mr-1" />
                      {lab.time_limit_seconds}s limit
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div className="flex gap-1">
                      {lab.allowed_languages.map((lang) => (
                        <Badge key={lang} variant="secondary" className="text-xs">
                          {lang.toUpperCase()}
                        </Badge>
                      ))}
                    </div>

                    {lab.best_submission && (
                      <span className="text-sm font-medium">
                        Best: {lab.best_submission.score.toFixed(0)}%
                      </span>
                    )}
                  </div>

                  {lab.end_date && (
                    <div className="text-xs text-muted-foreground pt-1">
                      {isPast(new Date(lab.end_date))
                        ? 'Expired'
                        : `Due: ${format(new Date(lab.end_date), 'MMM d, yyyy h:mm a')}`}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
