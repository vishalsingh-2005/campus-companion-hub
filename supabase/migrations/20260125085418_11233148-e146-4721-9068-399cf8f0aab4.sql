-- Create coding_labs table (problems)
CREATE TABLE public.coding_labs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    title VARCHAR NOT NULL,
    description TEXT NOT NULL,
    difficulty VARCHAR NOT NULL DEFAULT 'medium', -- easy, medium, hard
    
    -- Problem constraints
    time_limit_seconds INTEGER NOT NULL DEFAULT 2,
    memory_limit_mb INTEGER NOT NULL DEFAULT 256,
    
    -- Allowed languages (array of language codes)
    allowed_languages TEXT[] NOT NULL DEFAULT ARRAY['c', 'cpp', 'java', 'python'],
    
    -- Template code for each language (JSON object)
    starter_code JSONB DEFAULT '{}',
    
    -- Course/batch assignment
    course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
    
    -- Metadata
    created_by UUID,
    status VARCHAR NOT NULL DEFAULT 'draft', -- draft, active, archived
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    
    -- Deadline settings
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create test cases table
CREATE TABLE public.coding_lab_test_cases (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    lab_id UUID NOT NULL REFERENCES public.coding_labs(id) ON DELETE CASCADE,
    
    input TEXT NOT NULL,
    expected_output TEXT NOT NULL,
    
    -- Test case type
    is_sample BOOLEAN NOT NULL DEFAULT false, -- visible to students
    is_hidden BOOLEAN NOT NULL DEFAULT true,  -- hidden from students
    
    -- Metadata
    weight INTEGER NOT NULL DEFAULT 1, -- marks/weight for this test case
    description VARCHAR, -- optional explanation (for sample cases)
    order_index INTEGER NOT NULL DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create submissions table
CREATE TABLE public.coding_lab_submissions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    lab_id UUID NOT NULL REFERENCES public.coding_labs(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    
    -- Code submission
    language VARCHAR NOT NULL, -- c, cpp, java, python
    source_code TEXT NOT NULL,
    
    -- Execution results
    status VARCHAR NOT NULL DEFAULT 'pending', -- pending, running, accepted, wrong_answer, time_limit, memory_limit, runtime_error, compile_error
    execution_time_ms INTEGER,
    memory_used_kb INTEGER,
    
    -- Test results (JSON array of individual test case results)
    test_results JSONB DEFAULT '[]',
    passed_test_cases INTEGER DEFAULT 0,
    total_test_cases INTEGER DEFAULT 0,
    
    -- Scoring
    score NUMERIC DEFAULT 0,
    max_score NUMERIC DEFAULT 100,
    
    -- Judge0 tracking
    judge0_token VARCHAR,
    
    -- Error info
    compile_output TEXT,
    stderr TEXT,
    
    -- Metadata
    submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    evaluated_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create plagiarism results table
CREATE TABLE public.coding_lab_plagiarism (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    lab_id UUID NOT NULL REFERENCES public.coding_labs(id) ON DELETE CASCADE,
    
    submission_1_id UUID NOT NULL REFERENCES public.coding_lab_submissions(id) ON DELETE CASCADE,
    submission_2_id UUID NOT NULL REFERENCES public.coding_lab_submissions(id) ON DELETE CASCADE,
    
    similarity_score NUMERIC NOT NULL, -- 0-100 percentage
    matching_lines INTEGER,
    
    flagged BOOLEAN NOT NULL DEFAULT false,
    reviewed_by UUID,
    review_notes TEXT,
    
    detected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create activity logs table
CREATE TABLE public.coding_lab_activity_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    lab_id UUID REFERENCES public.coding_labs(id) ON DELETE SET NULL,
    user_id UUID NOT NULL,
    
    action VARCHAR NOT NULL, -- view, submit, run, grade
    details JSONB,
    
    ip_address VARCHAR,
    user_agent TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.coding_labs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coding_lab_test_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coding_lab_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coding_lab_plagiarism ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coding_lab_activity_logs ENABLE ROW LEVEL SECURITY;

-- RLS for coding_labs
CREATE POLICY "Admins can manage all labs"
    ON public.coding_labs FOR ALL
    USING (has_role(auth.uid(), 'admin'))
    WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Teachers can manage their labs"
    ON public.coding_labs FOR ALL
    USING (
        has_role(auth.uid(), 'teacher') AND (
            created_by = auth.uid() OR
            course_id IN (
                SELECT c.id FROM courses c
                JOIN teachers t ON c.teacher_id = t.id
                WHERE t.user_id = auth.uid()
            )
        )
    )
    WITH CHECK (
        has_role(auth.uid(), 'teacher') AND (
            created_by = auth.uid() OR
            course_id IN (
                SELECT c.id FROM courses c
                JOIN teachers t ON c.teacher_id = t.id
                WHERE t.user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Students can view active labs for enrolled courses"
    ON public.coding_labs FOR SELECT
    USING (
        has_role(auth.uid(), 'student') AND
        status = 'active' AND
        is_enabled = true AND
        course_id IN (
            SELECT ce.course_id FROM course_enrollments ce
            JOIN students s ON ce.student_id = s.id
            WHERE s.user_id = auth.uid() AND ce.status = 'enrolled'
        )
    );

-- RLS for test_cases
CREATE POLICY "Admins can manage test cases"
    ON public.coding_lab_test_cases FOR ALL
    USING (has_role(auth.uid(), 'admin'))
    WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Teachers can manage test cases for their labs"
    ON public.coding_lab_test_cases FOR ALL
    USING (
        has_role(auth.uid(), 'teacher') AND
        lab_id IN (
            SELECT id FROM coding_labs WHERE created_by = auth.uid() OR
            course_id IN (
                SELECT c.id FROM courses c
                JOIN teachers t ON c.teacher_id = t.id
                WHERE t.user_id = auth.uid()
            )
        )
    )
    WITH CHECK (
        has_role(auth.uid(), 'teacher') AND
        lab_id IN (
            SELECT id FROM coding_labs WHERE created_by = auth.uid() OR
            course_id IN (
                SELECT c.id FROM courses c
                JOIN teachers t ON c.teacher_id = t.id
                WHERE t.user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Students can view sample test cases"
    ON public.coding_lab_test_cases FOR SELECT
    USING (
        has_role(auth.uid(), 'student') AND
        is_sample = true AND
        lab_id IN (
            SELECT id FROM coding_labs
            WHERE status = 'active' AND is_enabled = true AND
            course_id IN (
                SELECT ce.course_id FROM course_enrollments ce
                JOIN students s ON ce.student_id = s.id
                WHERE s.user_id = auth.uid() AND ce.status = 'enrolled'
            )
        )
    );

-- RLS for submissions
CREATE POLICY "Admins can view all submissions"
    ON public.coding_lab_submissions FOR ALL
    USING (has_role(auth.uid(), 'admin'))
    WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Teachers can view submissions for their labs"
    ON public.coding_lab_submissions FOR SELECT
    USING (
        has_role(auth.uid(), 'teacher') AND
        lab_id IN (
            SELECT id FROM coding_labs WHERE created_by = auth.uid() OR
            course_id IN (
                SELECT c.id FROM courses c
                JOIN teachers t ON c.teacher_id = t.id
                WHERE t.user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Students can manage own submissions"
    ON public.coding_lab_submissions FOR ALL
    USING (
        student_id IN (SELECT id FROM students WHERE user_id = auth.uid())
    )
    WITH CHECK (
        student_id IN (SELECT id FROM students WHERE user_id = auth.uid())
    );

-- RLS for plagiarism
CREATE POLICY "Admins can view plagiarism"
    ON public.coding_lab_plagiarism FOR ALL
    USING (has_role(auth.uid(), 'admin'))
    WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Teachers can view plagiarism for their labs"
    ON public.coding_lab_plagiarism FOR SELECT
    USING (
        has_role(auth.uid(), 'teacher') AND
        lab_id IN (
            SELECT id FROM coding_labs WHERE created_by = auth.uid() OR
            course_id IN (
                SELECT c.id FROM courses c
                JOIN teachers t ON c.teacher_id = t.id
                WHERE t.user_id = auth.uid()
            )
        )
    );

-- RLS for activity logs
CREATE POLICY "Admins can view all logs"
    ON public.coding_lab_activity_logs FOR ALL
    USING (has_role(auth.uid(), 'admin'))
    WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Teachers can view logs for their labs"
    ON public.coding_lab_activity_logs FOR SELECT
    USING (
        has_role(auth.uid(), 'teacher') AND
        lab_id IN (
            SELECT id FROM coding_labs WHERE created_by = auth.uid() OR
            course_id IN (
                SELECT c.id FROM courses c
                JOIN teachers t ON c.teacher_id = t.id
                WHERE t.user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can insert their own logs"
    ON public.coding_lab_activity_logs FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- Triggers for updated_at
CREATE TRIGGER update_coding_labs_updated_at
    BEFORE UPDATE ON public.coding_labs
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();