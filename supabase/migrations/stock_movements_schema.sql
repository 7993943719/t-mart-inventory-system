-- Safe SQL Migration for T MART Stock Movements

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.stock_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000000',
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    product_name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'Purchase' CHECK (type IN ('Purchase', 'Adjustment', 'Sale', 'Return')),
    quantity INT NOT NULL,
    reference VARCHAR(100),
    user_name VARCHAR(255) DEFAULT 'Admin',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users stock_movements policy" ON public.stock_movements;
CREATE POLICY "Authenticated users stock_movements policy" ON public.stock_movements FOR ALL TO authenticated USING (true) WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
