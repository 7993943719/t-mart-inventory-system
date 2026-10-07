-- T MART Supermarket Management Database Schema for Supabase

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- PRODUCTS TABLE (Exact required fields)
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    barcode VARCHAR(100) UNIQUE NOT NULL,
    image_url TEXT,
    category VARCHAR(100) DEFAULT 'General',
    brand VARCHAR(100) DEFAULT 'Generic',
    unit VARCHAR(50) DEFAULT 'pcs',
    purchase_price NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    selling_price NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    mrp NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    stock_quantity INT NOT NULL DEFAULT 0,
    minimum_stock INT NOT NULL DEFAULT 10,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated full access on products" ON public.products
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
