-- Customers table and sales customer_id integration for T MART

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    alt_phone VARCHAR(50),
    address TEXT,
    city VARCHAR(100),
    email VARCHAR(255),
    gstin VARCHAR(100),
    customer_type VARCHAR(50) DEFAULT 'Regular Customer' CHECK (customer_type IN ('Retail Customer', 'Wholesale Customer', 'Regular Customer')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Safely add customer_id to public.sales if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sales' AND column_name='customer_id') THEN
        ALTER TABLE public.sales ADD COLUMN customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Enable RLS
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can access customers" ON public.customers;
CREATE POLICY "Authenticated users can access customers" ON public.customers
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
