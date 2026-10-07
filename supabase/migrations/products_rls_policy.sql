-- Secure RLS Policies for public.products table
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated full access on products" ON public.products;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.products;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON public.products;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON public.products;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON public.products;

CREATE POLICY "Enable read access for authenticated users" ON public.products
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert access for authenticated users" ON public.products
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users" ON public.products
    FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Enable delete access for authenticated users" ON public.products
    FOR DELETE TO authenticated USING (true);
