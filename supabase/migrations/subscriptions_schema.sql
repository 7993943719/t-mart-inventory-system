-- Business Subscription System Schema for T MART

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE UNIQUE,
    plan VARCHAR(100) DEFAULT 'T MART Business Monthly',
    amount NUMERIC(10,2) DEFAULT 350.00,
    billing_cycle VARCHAR(50) DEFAULT 'monthly',
    subscription_status VARCHAR(50) DEFAULT 'trial' CHECK (subscription_status IN ('trial', 'active', 'payment_due', 'expired', 'cancelled')),
    trial_started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    trial_ends_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '3 days'),
    subscription_id VARCHAR(255),
    provider VARCHAR(100) DEFAULT 'manual',
    current_period_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    current_period_end TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '3 days'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view subscriptions" ON public.subscriptions;
CREATE POLICY "Authenticated users can view subscriptions" ON public.subscriptions
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can manage subscriptions" ON public.subscriptions;
CREATE POLICY "Authenticated users can manage subscriptions" ON public.subscriptions
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
