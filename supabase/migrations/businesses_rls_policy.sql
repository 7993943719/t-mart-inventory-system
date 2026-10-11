-- Secure RLS Policies for public.businesses table
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can access businesses" ON public.businesses;
DROP POLICY IF EXISTS "Enable read access for authenticated users on businesses" ON public.businesses;
DROP POLICY IF EXISTS "Enable insert access for authenticated users on businesses" ON public.businesses;
DROP POLICY IF EXISTS "Enable update access for authenticated users on businesses" ON public.businesses;
DROP POLICY IF EXISTS "Enable delete access for authenticated users on businesses" ON public.businesses;

CREATE POLICY "Enable read access for authenticated users on businesses" ON public.businesses
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert access for authenticated users on businesses" ON public.businesses
    FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Enable update access for authenticated users on businesses" ON public.businesses
    FOR UPDATE TO authenticated USING (owner_id = auth.uid() OR id IN (SELECT business_id FROM public.business_members WHERE user_id = auth.uid())) WITH CHECK (true);

CREATE POLICY "Enable delete access for authenticated users on businesses" ON public.businesses
    FOR DELETE TO authenticated USING (owner_id = auth.uid());

NOTIFY pgrst, 'reload schema';
