-- Daily Stock Count & Photo Verification Schema

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. STOCK COUNTS TABLE
CREATE TABLE IF NOT EXISTS public.stock_counts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    product_name VARCHAR(255) NOT NULL,
    barcode VARCHAR(100),
    stock_keeper_id VARCHAR(255),
    stock_keeper_name VARCHAR(255) DEFAULT 'Stock Keeper',
    expected_stock NUMERIC(10,3) NOT NULL DEFAULT 0.000,
    actual_stock NUMERIC(10,3) NOT NULL DEFAULT 0.000,
    difference NUMERIC(10,3) NOT NULL DEFAULT 0.000,
    unit VARCHAR(50) DEFAULT 'pcs',
    status VARCHAR(50) NOT NULL CHECK (status IN ('MATCHED', 'SHORTAGE', 'EXCESS')),
    photo_url TEXT NOT NULL,
    notes TEXT,
    admin_status VARCHAR(50) DEFAULT 'PENDING' CHECK (admin_status IN ('PENDING', 'ACCEPTED', 'REJECTED', 'INVESTIGATED')),
    admin_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. STOCK DISCREPANCIES TABLE (Admin Alerts)
CREATE TABLE IF NOT EXISTS public.stock_discrepancies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stock_count_id UUID REFERENCES public.stock_counts(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    product_name VARCHAR(255) NOT NULL,
    discrepancy_type VARCHAR(50) NOT NULL CHECK (discrepancy_type IN ('SHORTAGE', 'EXCESS')),
    expected_qty NUMERIC(10,3) NOT NULL,
    actual_qty NUMERIC(10,3) NOT NULL,
    difference_qty NUMERIC(10,3) NOT NULL,
    unit VARCHAR(50) DEFAULT 'pcs',
    stock_keeper_name VARCHAR(255),
    photo_url TEXT,
    status VARCHAR(50) DEFAULT 'PENDING_REVIEW' CHECK (status IN ('PENDING_REVIEW', 'ACCEPTED', 'REJECTED', 'CORRECTED', 'INVESTIGATED')),
    admin_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.stock_counts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_discrepancies ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Allow authenticated full access on stock_counts" ON public.stock_counts;
DROP POLICY IF EXISTS "Allow authenticated full access on stock_discrepancies" ON public.stock_discrepancies;

CREATE POLICY "Allow authenticated full access on stock_counts" ON public.stock_counts
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated full access on stock_discrepancies" ON public.stock_discrepancies
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
