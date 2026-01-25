-- Create question types enum
CREATE TYPE public.question_type AS ENUM ('mcq', 'true_false', 'short_answer');

-- Create questions table
CREATE TABLE public.test_questions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    test_id UUID NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
    question_type question_type NOT NULL DEFAULT 'mcq',
    question_text TEXT NOT NULL,
    options JSONB, -- For MCQ: [{id: 1, text: "Option A"}, ...]
    correct_answer TEXT NOT NULL, -- For MCQ: option id, for T/F: "true"/"false", for short: expected answer
    marks INTEGER NOT NULL DEFAULT 1,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create test attempts table (tracks student's test session)
CREATE TABLE public.test_attempts (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    test_id UUID NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    submitted_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR NOT NULL DEFAULT 'in_progress', -- in_progress, submitted, auto_submitted
    
    -- Proctoring data
    start_selfie_url TEXT,
    start_latitude NUMERIC,
    start_longitude NUMERIC,
    end_selfie_url TEXT,
    end_latitude NUMERIC,
    end_longitude NUMERIC,
    
    -- Anti-cheat tracking
    tab_switch_count INTEGER DEFAULT 0,
    warning_count INTEGER DEFAULT 0,
    was_auto_submitted BOOLEAN DEFAULT false,
    
    -- Score (calculated after submission)
    total_marks_obtained NUMERIC,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    
    UNIQUE(test_id, student_id)
);

-- Create student answers table
CREATE TABLE public.student_answers (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    attempt_id UUID NOT NULL REFERENCES public.test_attempts(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES public.test_questions(id) ON DELETE CASCADE,
    answer_text TEXT,
    is_correct BOOLEAN,
    marks_awarded NUMERIC DEFAULT 0,
    answered_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    
    UNIQUE(attempt_id, question_id)
);

-- Enable RLS
ALTER TABLE public.test_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_answers ENABLE ROW LEVEL SECURITY;

-- RLS for test_questions
CREATE POLICY "Admins can manage questions"
    ON public.test_questions FOR ALL
    USING (has_role(auth.uid(), 'admin'))
    WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Teachers can manage questions for their tests"
    ON public.test_questions FOR ALL
    USING (
        has_role(auth.uid(), 'teacher') AND
        test_id IN (
            SELECT t.id FROM tests t
            JOIN courses c ON t.course_id = c.id
            JOIN teachers te ON c.teacher_id = te.id
            WHERE te.user_id = auth.uid()
        )
    )
    WITH CHECK (
        has_role(auth.uid(), 'teacher') AND
        test_id IN (
            SELECT t.id FROM tests t
            JOIN courses c ON t.course_id = c.id
            JOIN teachers te ON c.teacher_id = te.id
            WHERE te.user_id = auth.uid()
        )
    );

CREATE POLICY "Students can view questions during active test"
    ON public.test_questions FOR SELECT
    USING (
        has_role(auth.uid(), 'student') AND
        test_id IN (
            SELECT t.id FROM tests t
            JOIN course_enrollments ce ON t.course_id = ce.course_id
            JOIN students s ON ce.student_id = s.id
            WHERE s.user_id = auth.uid() AND ce.status = 'enrolled'
            AND t.status = 'active'
        )
    );

-- RLS for test_attempts
CREATE POLICY "Admins can manage attempts"
    ON public.test_attempts FOR ALL
    USING (has_role(auth.uid(), 'admin'))
    WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Teachers can view attempts for their tests"
    ON public.test_attempts FOR SELECT
    USING (
        has_role(auth.uid(), 'teacher') AND
        test_id IN (
            SELECT t.id FROM tests t
            JOIN courses c ON t.course_id = c.id
            JOIN teachers te ON c.teacher_id = te.id
            WHERE te.user_id = auth.uid()
        )
    );

CREATE POLICY "Students can manage own attempts"
    ON public.test_attempts FOR ALL
    USING (
        student_id IN (SELECT id FROM students WHERE user_id = auth.uid())
    )
    WITH CHECK (
        student_id IN (SELECT id FROM students WHERE user_id = auth.uid())
    );

-- RLS for student_answers
CREATE POLICY "Admins can manage answers"
    ON public.student_answers FOR ALL
    USING (has_role(auth.uid(), 'admin'))
    WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Teachers can view and grade answers"
    ON public.student_answers FOR ALL
    USING (
        has_role(auth.uid(), 'teacher') AND
        attempt_id IN (
            SELECT ta.id FROM test_attempts ta
            JOIN tests t ON ta.test_id = t.id
            JOIN courses c ON t.course_id = c.id
            JOIN teachers te ON c.teacher_id = te.id
            WHERE te.user_id = auth.uid()
        )
    )
    WITH CHECK (
        has_role(auth.uid(), 'teacher') AND
        attempt_id IN (
            SELECT ta.id FROM test_attempts ta
            JOIN tests t ON ta.test_id = t.id
            JOIN courses c ON t.course_id = c.id
            JOIN teachers te ON c.teacher_id = te.id
            WHERE te.user_id = auth.uid()
        )
    );

CREATE POLICY "Students can manage own answers"
    ON public.student_answers FOR ALL
    USING (
        attempt_id IN (
            SELECT id FROM test_attempts 
            WHERE student_id IN (SELECT id FROM students WHERE user_id = auth.uid())
        )
    )
    WITH CHECK (
        attempt_id IN (
            SELECT id FROM test_attempts 
            WHERE student_id IN (SELECT id FROM students WHERE user_id = auth.uid())
        )
    );

-- Create storage bucket for proctoring selfies
INSERT INTO storage.buckets (id, name, public) VALUES ('proctoring-selfies', 'proctoring-selfies', false);

-- Storage policies for proctoring selfies
CREATE POLICY "Students can upload own selfies"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'proctoring-selfies' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can view own selfies"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'proctoring-selfies' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Teachers and admins can view all selfies"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'proctoring-selfies' AND
        (has_role(auth.uid(), 'teacher') OR has_role(auth.uid(), 'admin'))
    );

-- Add triggers for updated_at
CREATE TRIGGER update_test_questions_updated_at
    BEFORE UPDATE ON public.test_questions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_test_attempts_updated_at
    BEFORE UPDATE ON public.test_attempts
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();