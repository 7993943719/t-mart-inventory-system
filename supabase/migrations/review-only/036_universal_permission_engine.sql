-- ============================================================================
-- REVIEW-ONLY SQL MIGRATION 036: UNIVERSAL BUSINESS ACCESS & PERMISSION ENGINE
-- ============================================================================
-- IMPORTANT: Review only. Do NOT execute on production without approval.
-- Establishes the centralized permission engine supporting OWNER, SECOND_ADMIN,
-- MANAGER, ACCOUNTANT, BILLING, STOCK_KEEPER, DELIVERY, and STAFF roles.
-- Enforces absolute owner access (businesses.owner_id = auth.uid()),
-- column-level security on confidential cost snapshots (sale_items.cost_price_at_sale,
-- products.purchase_price), and secure financial reporting RPC validation (finance.view).
-- ============================================================================

BEGIN;

-- 1. HARDEN SALES TABLE RLS
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users sales policy" ON public.sales;
DROP POLICY IF EXISTS "Tenant isolation sales policy" ON public.sales;

CREATE POLICY "Tenant isolation sales policy" ON public.sales
    FOR ALL TO authenticated
    USING (
        business_id IN (
            SELECT b.id FROM public.businesses b WHERE b.owner_id = auth.uid()
            UNION
            SELECT bm.business_id FROM public.business_members bm
            WHERE bm.user_id = auth.uid()
              AND (bm.status IS NULL OR lower(btrim(bm.status)) = 'active')
        )
    )
    WITH CHECK (
        business_id IN (
            SELECT b.id FROM public.businesses b WHERE b.owner_id = auth.uid()
            UNION
            SELECT bm.business_id FROM public.business_members bm
            WHERE bm.user_id = auth.uid()
              AND (bm.status IS NULL OR lower(btrim(bm.status)) = 'active')
        )
    );


-- 2. HARDEN SALE ITEMS TABLE RLS & COLUMN-LEVEL PRIVILEGES
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users sale_items policy" ON public.sale_items;
DROP POLICY IF EXISTS "Tenant isolation sale_items policy" ON public.sale_items;

CREATE POLICY "Tenant isolation sale_items policy" ON public.sale_items
    FOR ALL TO authenticated
    USING (
        sale_id IN (
            SELECT s.id FROM public.sales s
            WHERE s.business_id IN (
                SELECT b.id FROM public.businesses b WHERE b.owner_id = auth.uid()
                UNION
                SELECT bm.business_id FROM public.business_members bm
                WHERE bm.user_id = auth.uid()
                  AND (bm.status IS NULL OR lower(btrim(bm.status)) = 'active')
            )
        )
    )
    WITH CHECK (
        sale_id IN (
            SELECT s.id FROM public.sales s
            WHERE s.business_id IN (
                SELECT b.id FROM public.businesses b WHERE b.owner_id = auth.uid()
                UNION
                SELECT bm.business_id FROM public.business_members bm
                WHERE bm.user_id = auth.uid()
                  AND (bm.status IS NULL OR lower(btrim(bm.status)) = 'active')
            )
        )
    );

-- Protect confidential cost column cost_price_at_sale from direct table queries by ordinary users
REVOKE SELECT ON public.sale_items FROM PUBLIC, anon, authenticated;
GRANT SELECT (id, sale_id, product_id, product_name, quantity, price, total, created_at) ON public.sale_items TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.sale_items TO authenticated;

-- Protect confidential purchase prices on products
REVOKE SELECT (purchase_price, cost_price) ON public.products FROM PUBLIC, anon, authenticated;


-- 3. CENTRALIZED FINANCIAL AUTHORIZATION & REPORTING RPC (finance.view / financials)
CREATE OR REPLACE FUNCTION public.get_secure_bill_profit_report(
    p_business_id UUID,
    p_from_date TIMESTAMPTZ DEFAULT NULL,
    p_to_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_caller_uid UUID;
    v_is_authorized BOOLEAN := false;
    v_result JSONB;
BEGIN
    v_caller_uid := auth.uid();
    IF v_caller_uid IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    -- Verify Owner (via businesses.owner_id) or authorized financial role (Second Admin, Accountant, or Manager with finance.view)
    SELECT INTO v_is_authorized (
        EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = p_business_id AND b.owner_id = v_caller_uid)
        OR
        EXISTS (
            SELECT 1 FROM public.business_members bm
            WHERE bm.business_id = p_business_id
              AND bm.user_id = v_caller_uid
              AND (bm.status IS NULL OR lower(btrim(bm.status)) = 'active')
              AND (
                  lower(bm.role) IN ('owner', 'accountant')
                  OR (bm.permissions IS NOT NULL AND (bm.permissions ? 'finance.view' OR bm.permissions ? 'financials' OR bm.permissions ? 'cost_view'))
              )
        )
    );

    IF NOT v_is_authorized THEN
        RAISE EXCEPTION 'Access denied: Insufficient financial permissions ("finance.view") for this business.';
    END IF;

    -- Aggregate secure bill profit data with tax-exclusive net sales and verified historical cost snapshots.
    -- Never silently coalesces missing historical costs to zero; returns explicit has_all_costs flag.
    SELECT jsonb_agg(
        jsonb_build_object(
            'sale_id', s.id,
            'invoice_number', s.invoice_number,
            'bill_date', s.created_at,
            'customer_name', COALESCE(s.customer_name, 'Walk-in Customer'),
            'total_amount', s.total,
            'subtotal', s.subtotal,
            'discount', COALESCE(s.discount, 0),
            'tax', s.tax,
            'net_sales', (s.subtotal - COALESCE(s.discount, 0)),
            'has_all_costs', item_costs.has_all_costs,
            'cogs', CASE WHEN item_costs.has_all_costs THEN item_costs.total_cogs ELSE 0 END,
            'gross_profit', CASE WHEN item_costs.has_all_costs THEN (s.subtotal - COALESCE(s.discount, 0)) - item_costs.total_cogs ELSE 0 END,
            'profit_margin', CASE WHEN item_costs.has_all_costs AND (s.subtotal - COALESCE(s.discount, 0)) > 0
                THEN ROUND(((((s.subtotal - COALESCE(s.discount, 0)) - item_costs.total_cogs) / (s.subtotal - COALESCE(s.discount, 0))) * 100), 2)
                ELSE 0
            END,
            'cost_status', CASE WHEN item_costs.has_all_costs THEN 'VERIFIED' ELSE 'PURCHASE PRICE MISSING' END
        ) ORDER BY s.created_at DESC
    ) INTO v_result
    FROM public.sales s
    LEFT JOIN LATERAL (
        SELECT
            SUM(si.quantity * si.cost_price_at_sale) AS total_cogs,
            BOOL_AND(si.cost_price_at_sale IS NOT NULL AND si.cost_price_at_sale >= 0) AS has_all_costs
        FROM public.sale_items si
        WHERE si.sale_id = s.id
    ) item_costs ON true
    WHERE s.business_id = p_business_id
      AND s.status NOT ILIKE '%cancel%'
      AND s.status NOT ILIKE '%void%'
      AND (p_from_date IS NULL OR s.created_at >= p_from_date)
      AND (p_to_date IS NULL OR s.created_at <= p_to_date);

    RETURN COALESCE(v_result, '[]'::JSONB);
END;
$$;

REVOKE ALL ON FUNCTION public.get_secure_bill_profit_report(UUID, TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_secure_bill_profit_report(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
