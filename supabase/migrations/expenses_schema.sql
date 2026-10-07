-- Migration for T MART Expenses Management
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID DEFAULT '00000000-0000-0000-0000-000000000000',
    tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000000',
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT,
    amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    payment_method VARCHAR(50) DEFAULT 'Cash',
    expense_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users expenses policy" ON public.expenses;
CREATE POLICY "Authenticated users expenses policy" ON public.expenses FOR ALL TO authenticated USING (true) WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
