-- Inventory & Stock Adding System with Supabase Storage & Transactions

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. STOCK TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS public.stock_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    product_name VARCHAR(255) NOT NULL,
    quantity NUMERIC(10,3) NOT NULL,
    unit VARCHAR(50) DEFAULT 'pcs',
    purchase_price NUMERIC(10,2) DEFAULT 0.00,
    supplier_id UUID,
    supplier_name VARCHAR(255),
    photo_url TEXT,
    notes TEXT,
    created_by VARCHAR(255) DEFAULT 'System',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.stock_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated full access on stock_transactions" ON public.stock_transactions;
CREATE POLICY "Allow authenticated full access on stock_transactions" ON public.stock_transactions
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 2. NOTE ON SUPABASE STORAGE BUCKETS
-- Please ensure two public or authenticated buckets are created in your Supabase project dashboard:
-- 1. 'product-images' (for product catalog photos)
-- 2. 'stock-photos' (for daily stock count and stock receiving photos)
