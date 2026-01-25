import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { 
  Loader2, 
  Clock, 
  AlertTriangle, 
  Camera, 
  MapPin,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Send
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Question {
  id: string;
  question_type: 'mcq' | 'true_false' | 'short_answer';
  question_text: string;
  options: Array<{ id: string; text: string }> | null;
  marks: number;
  order_index: number;
}

interface Test {
  id: string;
  title: string;
  description: string | null;
  duration_minutes: number;
  total_marks: number;
  courses: {
    course_name: string;
  };
}

interface Attempt {
  id: string;
  started_at: string;
}

export default function TakeTest() {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  // State
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [test, setTest] = useState<Test | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [studentId, setStudentId] = useState<string | null>(null);

  // Proctoring state
  const [proctoringComplete, setProctoringComplete] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selfieUrl, setSelfieUrl] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Anti-cheat state
  const [warningCount, setWarningCount] = useState(0);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize test
  useEffect(() => {
    async function init() {
      if (!user || !testId) return;

      try {
        // Get student
        const { data: student } = await supabase
          .from('students')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!student) {
          toast({ title: 'Error', description: 'Student not found', variant: 'destructive' });
          navigate('/student/tests');
          return;
        }
        setStudentId(student.id);

        // Check for existing attempt
        const { data: existingAttempt } = await supabase
          .from('test_attempts')
          .select('*')
          .eq('test_id', testId)
          .eq('student_id', student.id)
          .maybeSingle();

        if (existingAttempt?.status === 'submitted' || existingAttempt?.status === 'auto_submitted') {
          toast({ title: 'Already Submitted', description: 'You have already completed this test', variant: 'destructive' });
          navigate('/student/tests');
          return;
        }

        // Fetch test
        const { data: testData, error: testError } = await supabase
          .from('tests')
          .select(`
            id,
            title,
            description,
            duration_minutes,
            total_marks,
            status,
            courses (course_name)
          `)
          .eq('id', testId)
          .single();

        if (testError || !testData) throw testError;

        if (testData.status !== 'active') {
          toast({ title: 'Test Not Active', description: 'This test is not currently available', variant: 'destructive' });
          navigate('/student/tests');
          return;
        }

        setTest(testData as unknown as Test);

        // Fetch questions
        const { data: questionsData } = await supabase
          .from('test_questions')
          .select('id, question_type, question_text, options, marks, order_index')
          .eq('test_id', testId)
          .order('order_index', { ascending: true });

        setQuestions(questionsData as Question[] || []);

        // If existing attempt, resume
        if (existingAttempt) {
          setAttempt(existingAttempt);
          setProctoringComplete(true);
          
          // Calculate remaining time
          const startTime = new Date(existingAttempt.started_at).getTime();
          const elapsed = (Date.now() - startTime) / 1000 / 60;
          const remaining = Math.max(0, testData.duration_minutes - elapsed);
          setTimeRemaining(Math.floor(remaining * 60));

          // Load existing answers
          const { data: existingAnswers } = await supabase
            .from('student_answers')
            .select('question_id, answer_text')
            .eq('attempt_id', existingAttempt.id);

          const answersMap: Record<string, string> = {};
          existingAnswers?.forEach(a => {
            answersMap[a.question_id] = a.answer_text || '';
          });
          setAnswers(answersMap);
        } else {
          setTimeRemaining(testData.duration_minutes * 60);
        }
      } catch (error) {
        console.error('Error initializing test:', error);
        toast({ title: 'Error', description: 'Failed to load test', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    }

    init();
  }, [user, testId, navigate, toast]);

  // Timer
  useEffect(() => {
    if (!proctoringComplete || timeRemaining <= 0) return;

    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          handleSubmit(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [proctoringComplete]);

  // Tab switch detection
  useEffect(() => {
    if (!proctoringComplete) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setTabSwitchCount(prev => prev + 1);
        setWarningCount(prev => {
          const newCount = prev + 1;
          if (newCount >= 1) {
            setShowWarning(true);
            // Start 5 second countdown
            if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
            warningTimeoutRef.current = setTimeout(() => {
              handleSubmit(true);
            }, 5000);
          }
          return newCount;
        });
      } else {
        // User came back
        if (warningTimeoutRef.current) {
          clearTimeout(warningTimeoutRef.current);
          warningTimeoutRef.current = null;
        }
        setShowWarning(false);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
    };
  }, [proctoringComplete]);

  // Update attempt with tab switch count
  useEffect(() => {
    if (attempt && tabSwitchCount > 0) {
      supabase
        .from('test_attempts')
        .update({ tab_switch_count: tabSwitchCount, warning_count: warningCount })
        .eq('id', attempt.id)
        .then();
    }
  }, [tabSwitchCount, warningCount, attempt]);

  // Start proctoring
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      toast({ title: 'Camera Required', description: 'Please allow camera access to take the test', variant: 'destructive' });
    }
  };

  const getLocation = () => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
      },
      (error) => {
        toast({ title: 'Location Required', description: 'Please allow location access to take the test', variant: 'destructive' });
      }
    );
  };

  const captureSelfie = async () => {
    if (!videoRef.current || !canvasRef.current || !studentId || !user) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0);
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg'));
      
      if (blob) {
        const fileName = `${user.id}/${testId}_start_${Date.now()}.jpg`;
        const { data, error } = await supabase.storage
          .from('proctoring-selfies')
          .upload(fileName, blob);

        if (!error) {
          const { data: urlData } = supabase.storage
            .from('proctoring-selfies')
            .getPublicUrl(fileName);
          setSelfieUrl(urlData.publicUrl);
        }
      }
    }

    // Stop camera after selfie
    cameraStream?.getTracks().forEach(track => track.stop());
    setCameraStream(null);
  };

  const startTest = async () => {
    if (!studentId || !testId || !test || !location) return;

    try {
      await captureSelfie();

      // Create attempt
      const { data: attemptData, error } = await supabase
        .from('test_attempts')
        .insert({
          test_id: testId,
          student_id: studentId,
          start_latitude: location.lat,
          start_longitude: location.lng,
          start_selfie_url: selfieUrl,
        })
        .select()
        .single();

      if (error) throw error;
      setAttempt(attemptData);
      setProctoringComplete(true);

      toast({ title: 'Test Started', description: 'Good luck!' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to start test', variant: 'destructive' });
    }
  };

  // Answer handling
  const handleAnswerChange = async (questionId: string, answer: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));

    if (!attempt) return;

    // Upsert answer
    const { error } = await supabase
      .from('student_answers')
      .upsert({
        attempt_id: attempt.id,
        question_id: questionId,
        answer_text: answer,
        answered_at: new Date().toISOString(),
      }, { onConflict: 'attempt_id,question_id' });

    if (error) console.error('Error saving answer:', error);
  };

  // Submit test
  const handleSubmit = async (autoSubmit = false) => {
    if (!attempt || submitting) return;
    setSubmitting(true);

    try {
      // Calculate score for MCQ and True/False
      let totalMarks = 0;
      for (const question of questions) {
        const answer = answers[question.id];
        if (!answer) continue;

        const { data: questionData } = await supabase
          .from('test_questions')
          .select('correct_answer, marks')
          .eq('id', question.id)
          .single();

        if (questionData) {
          let isCorrect = false;
          if (question.question_type === 'mcq' || question.question_type === 'true_false') {
            isCorrect = answer === questionData.correct_answer;
            if (isCorrect) totalMarks += questionData.marks;
          }

          await supabase
            .from('student_answers')
            .update({
              is_correct: isCorrect,
              marks_awarded: isCorrect ? questionData.marks : 0,
            })
            .eq('attempt_id', attempt.id)
            .eq('question_id', question.id);
        }
      }

      // Update attempt
      const { error } = await supabase
        .from('test_attempts')
        .update({
          status: autoSubmit ? 'auto_submitted' : 'submitted',
          submitted_at: new Date().toISOString(),
          was_auto_submitted: autoSubmit,
          total_marks_obtained: totalMarks,
        })
        .eq('id', attempt.id);

      if (error) throw error;

      toast({
        title: autoSubmit ? 'Test Auto-Submitted' : 'Test Submitted',
        description: autoSubmit 
          ? 'Your test was automatically submitted due to violations' 
          : 'Your test has been submitted successfully',
      });

      navigate('/student/tests');
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to submit test', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
  const answeredCount = Object.keys(answers).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Warning overlay
  if (showWarning) {
    return (
      <div className="fixed inset-0 bg-background z-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <AlertTriangle className="h-16 w-16 text-destructive mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-destructive mb-2">Warning!</h2>
            <p className="text-muted-foreground mb-4">
              You left the test window. Return within 5 seconds or your test will be automatically submitted.
            </p>
            <p className="text-sm text-muted-foreground">
              Tab switches: {tabSwitchCount}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Proctoring setup
  if (!proctoringComplete) {
    return (
      <div className="space-y-6 animate-fade-in max-w-2xl mx-auto">
        <PageHeader
          title={test?.title || 'Test'}
          description="Complete verification to start the test"
          showBackButton={false}
        />

        <Card>
          <CardHeader>
            <CardTitle>Identity Verification</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Important</AlertTitle>
              <AlertDescription>
                You must verify your identity before starting. Camera and location access are required.
                <br />
                <strong>Warning:</strong> Leaving the test window will trigger an automatic submission after 1 warning.
              </AlertDescription>
            </Alert>

            {/* Camera */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Camera className="h-5 w-5" />
                  <span className="font-medium">Camera Access</span>
                </div>
                {cameraStream ? (
                  <Badge className="bg-success/10 text-success">
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Ready
                  </Badge>
                ) : (
                  <Button size="sm" onClick={startCamera}>Enable Camera</Button>
                )}
              </div>
              {cameraStream && (
                <div className="relative rounded-lg overflow-hidden bg-muted aspect-video max-w-sm mx-auto">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <canvas ref={canvasRef} className="hidden" />
            </div>

            {/* Location */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                <span className="font-medium">Location Access</span>
              </div>
              {location ? (
                <Badge className="bg-success/10 text-success">
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  Captured
                </Badge>
              ) : (
                <Button size="sm" onClick={getLocation}>Get Location</Button>
              )}
            </div>

            <div className="pt-4">
              <Button
                className="w-full"
                size="lg"
                disabled={!cameraStream || !location}
                onClick={startTest}
              >
                Start Test ({test?.duration_minutes} minutes)
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Test taking interface
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header with timer */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b py-4 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">{test?.title}</h1>
            <p className="text-sm text-muted-foreground">{test?.courses?.course_name}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Answered</div>
              <div className="font-medium">{answeredCount}/{questions.length}</div>
            </div>
            <div className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-lg font-bold",
              timeRemaining <= 300 ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
            )}>
              <Clock className="h-5 w-5" />
              {formatTime(timeRemaining)}
            </div>
          </div>
        </div>
        <Progress value={progress} className="mt-3 h-2" />
      </div>

      {/* Question */}
      {currentQuestion && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <Badge variant="outline">
                Question {currentQuestionIndex + 1} of {questions.length}
              </Badge>
              <Badge>{currentQuestion.marks} marks</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-lg">{currentQuestion.question_text}</p>

            {currentQuestion.question_type === 'mcq' && currentQuestion.options && (
              <RadioGroup
                value={answers[currentQuestion.id] || ''}
                onValueChange={(value) => handleAnswerChange(currentQuestion.id, value)}
              >
                {currentQuestion.options.map((option) => (
                  <div
                    key={option.id}
                    className={cn(
                      "flex items-center space-x-3 p-4 rounded-lg border transition-colors cursor-pointer",
                      answers[currentQuestion.id] === option.id
                        ? "border-primary bg-primary/5"
                        : "hover:bg-muted/50"
                    )}
                    onClick={() => handleAnswerChange(currentQuestion.id, option.id)}
                  >
                    <RadioGroupItem value={option.id} id={option.id} />
                    <Label htmlFor={option.id} className="flex-1 cursor-pointer">
                      {option.text}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            )}

            {currentQuestion.question_type === 'true_false' && (
              <RadioGroup
                value={answers[currentQuestion.id] || ''}
                onValueChange={(value) => handleAnswerChange(currentQuestion.id, value)}
                className="flex gap-4"
              >
                <div
                  className={cn(
                    "flex-1 flex items-center justify-center p-6 rounded-lg border cursor-pointer",
                    answers[currentQuestion.id] === 'true'
                      ? "border-primary bg-primary/5"
                      : "hover:bg-muted/50"
                  )}
                  onClick={() => handleAnswerChange(currentQuestion.id, 'true')}
                >
                  <RadioGroupItem value="true" id="true" className="sr-only" />
                  <Label htmlFor="true" className="text-lg font-medium cursor-pointer">
                    True
                  </Label>
                </div>
                <div
                  className={cn(
                    "flex-1 flex items-center justify-center p-6 rounded-lg border cursor-pointer",
                    answers[currentQuestion.id] === 'false'
                      ? "border-primary bg-primary/5"
                      : "hover:bg-muted/50"
                  )}
                  onClick={() => handleAnswerChange(currentQuestion.id, 'false')}
                >
                  <RadioGroupItem value="false" id="false" className="sr-only" />
                  <Label htmlFor="false" className="text-lg font-medium cursor-pointer">
                    False
                  </Label>
                </div>
              </RadioGroup>
            )}

            {currentQuestion.question_type === 'short_answer' && (
              <Textarea
                value={answers[currentQuestion.id] || ''}
                onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                placeholder="Type your answer here..."
                rows={5}
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
          disabled={currentQuestionIndex === 0}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Previous
        </Button>

        <div className="flex gap-2 flex-wrap justify-center">
          {questions.map((q, i) => (
            <Button
              key={q.id}
              variant={currentQuestionIndex === i ? "default" : answers[q.id] ? "secondary" : "outline"}
              size="icon"
              className="w-8 h-8"
              onClick={() => setCurrentQuestionIndex(i)}
            >
              {i + 1}
            </Button>
          ))}
        </div>

        {currentQuestionIndex < questions.length - 1 ? (
          <Button
            onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button
            onClick={() => handleSubmit(false)}
            disabled={submitting}
            className="bg-success hover:bg-success/90"
          >
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            <Send className="h-4 w-4 mr-2" />
            Submit Test
          </Button>
        )}
      </div>
    </div>
  );
}
