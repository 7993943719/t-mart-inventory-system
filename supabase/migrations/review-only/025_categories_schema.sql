-- ============================================================================
-- REVIEW-ONLY MIGRATION 025: BUSINESS-SPECIFIC PRODUCT CATEGORIES
-- ============================================================================
-- Target Production Project: bagufluurqjjelrvhjqu
-- REVIEW ONLY. DO NOT EXECUTE ON PRODUCTION WITHOUT APPROVAL.
-- ============================================================================

BEGIN;

-- 1. BUSINESS-SPECIFIC CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Case-insensitive unique index to prevent duplicate category names per business
CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_business_lower_name
ON public.categories(business_id, lower(trim(name)));

-- 2. LINK PRODUCTS TO CATEGORIES
ALTER TABLE IF EXISTS public.products
    ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL;

-- 3. ENABLE RLS ON CATEGORIES
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Business members can view categories" ON public.categories;
CREATE POLICY "Business members can view categories" ON public.categories
    FOR SELECT TO authenticated
    USING (
        business_id IN (
            SELECT business_id FROM public.business_members WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Owners and admins can manage categories" ON public.categories;
CREATE POLICY "Owners and admins can manage categories" ON public.categories
    FOR ALL TO authenticated
    USING (
        business_id IN (
            SELECT business_id FROM public.business_members
            WHERE user_id = auth.uid() AND lower(role) IN ('owner', 'admin', 'manager')
        )
    )
    WITH CHECK (
        business_id IN (
            SELECT business_id FROM public.business_members
            WHERE user_id = auth.uid() AND lower(role) IN ('owner', 'admin', 'manager')
        )
    );

-- 4. IDEMPOTENT BACKFILL: Seed distinct product categories into public.categories
INSERT INTO public.categories (business_id, name)
SELECT DISTINCT business_id, trim(category)
FROM public.products
WHERE business_id IS NOT NULL AND category IS NOT NULL AND trim(category) <> ''
ON CONFLICT (business_id, lower(trim(name))) DO NOTHING;

-- Link products to their respective category_id based on matching text name
UPDATE public.products p
SET category_id = c.id
FROM public.categories c
WHERE p.business_id = c.business_id
  AND lower(trim(p.category)) = lower(trim(c.name))
  AND p.category_id IS NULL;

NOTIFY pgrst, 'reload schema';

COMMIT;
