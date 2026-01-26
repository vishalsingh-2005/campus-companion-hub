-- Create student_fees table for managing student fees
CREATE TABLE public.student_fees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    fee_type VARCHAR NOT NULL, -- tuition, exam, library, lab, etc.
    description TEXT,
    amount DECIMAL(10,2) NOT NULL,
    due_date DATE NOT NULL,
    paid_amount DECIMAL(10,2) DEFAULT 0,
    payment_date TIMESTAMP WITH TIME ZONE,
    payment_method VARCHAR, -- cash, card, bank_transfer, etc.
    transaction_id VARCHAR,
    status VARCHAR NOT NULL DEFAULT 'pending', -- pending, partial, paid, overdue
    academic_year VARCHAR,
    semester VARCHAR,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.student_fees ENABLE ROW LEVEL SECURITY;

-- Admin can manage all fees
CREATE POLICY "Admins can manage all fees"
ON public.student_fees
FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Students can view their own fees
CREATE POLICY "Students can view own fees"
ON public.student_fees
FOR SELECT
USING (student_id IN (
    SELECT id FROM students WHERE user_id = auth.uid()
));

-- Create trigger for updated_at
CREATE TRIGGER update_student_fees_updated_at
BEFORE UPDATE ON public.student_fees
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();