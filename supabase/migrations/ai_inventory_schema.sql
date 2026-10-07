-- AI-Assisted Inventory Camera System Schema for T MART

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.purchase_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000000',
    supplier_name VARCHAR(255),
    invoice_no VARCHAR(100),
    invoice_date DATE,
    image_url TEXT,
    status VARCHAR(50) DEFAULT 'PENDING',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.purchase_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_id UUID REFERENCES public.purchase_documents(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    product_name VARCHAR(255) NOT NULL,
    quantity INT NOT NULL,
    purchase_price NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    mrp NUMERIC(10,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.stock_checks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000000',
    image_url TEXT,
    status VARCHAR(50) DEFAULT 'COMPLETED',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.stock_check_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stock_check_id UUID REFERENCES public.stock_checks(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    product_name VARCHAR(255) NOT NULL,
    system_stock INT NOT NULL,
    physical_stock INT NOT NULL,
    difference INT NOT NULL,
    confidence INT DEFAULT 90,
    status VARCHAR(50) DEFAULT 'MATCHED',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.purchase_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_check_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Auth purchase_documents" ON public.purchase_documents;
CREATE POLICY "Auth purchase_documents" ON public.purchase_documents FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Auth purchase_items" ON public.purchase_items;
CREATE POLICY "Auth purchase_items" ON public.purchase_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Auth stock_checks" ON public.stock_checks;
CREATE POLICY "Auth stock_checks" ON public.stock_checks FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Auth stock_check_items" ON public.stock_check_items;
CREATE POLICY "Auth stock_check_items" ON public.stock_check_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
