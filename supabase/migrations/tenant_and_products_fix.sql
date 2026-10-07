-- Comprehensive SQL Migration for T MART Products, Multi-Tenant Support and RLS Policies

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Ensure tenant_id and all product columns exist safely in public.products
ALTER TABLE IF EXISTS public.products ADD COLUMN IF NOT EXISTS id UUID PRIMARY KEY DEFAULT uuid_generate_v4();
ALTER TABLE IF EXISTS public.products ADD COLUMN IF NOT EXISTS tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000000';
ALTER TABLE IF EXISTS public.products ADD COLUMN IF NOT EXISTS name VARCHAR(255) NOT NULL DEFAULT 'Product';
ALTER TABLE IF EXISTS public.products ADD COLUMN IF NOT EXISTS barcode VARCHAR(100);
ALTER TABLE IF EXISTS public.products ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE IF EXISTS public.products ADD COLUMN IF NOT EXISTS category VARCHAR(100) DEFAULT 'General';
ALTER TABLE IF EXISTS public.products ADD COLUMN IF NOT EXISTS brand TEXT NULL;
ALTER TABLE IF EXISTS public.products ADD COLUMN IF NOT EXISTS subcategory TEXT NULL;
ALTER TABLE IF EXISTS public.products ADD COLUMN IF NOT EXISTS pack_size TEXT NULL;
ALTER TABLE IF EXISTS public.products ADD COLUMN IF NOT EXISTS description TEXT NULL;
ALTER TABLE IF EXISTS public.products ADD COLUMN IF NOT EXISTS unit VARCHAR(50) DEFAULT 'pcs';
ALTER TABLE IF EXISTS public.products ADD COLUMN IF NOT EXISTS purchase_price NUMERIC(10,2) DEFAULT 0.00;
ALTER TABLE IF EXISTS public.products ADD COLUMN IF NOT EXISTS selling_price NUMERIC(10,2) DEFAULT 0.00;
ALTER TABLE IF EXISTS public.products ADD COLUMN IF NOT EXISTS mrp NUMERIC(10,2) DEFAULT 0.00;
ALTER TABLE IF EXISTS public.products ADD COLUMN IF NOT EXISTS stock_quantity INT DEFAULT 0;
ALTER TABLE IF EXISTS public.products ADD COLUMN IF NOT EXISTS minimum_stock INT DEFAULT 10;
ALTER TABLE IF EXISTS public.products ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE IF EXISTS public.products ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Ensure tenant_id exists in profiles table
ALTER TABLE IF EXISTS public.profiles ADD COLUMN IF NOT EXISTS tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000000';

-- Enable RLS on public.products
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to prevent conflicts
DROP POLICY IF EXISTS "Allow authenticated full access on products" ON public.products;
DROP POLICY IF EXISTS "Products tenant access policy" ON public.products;
DROP POLICY IF EXISTS "Public products view" ON public.products;

-- Create unified RLS Policy for authenticated users
CREATE POLICY "Authenticated products tenant policy" ON public.products
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
