-- ============================================================================
-- REVIEW-ONLY SQL MIGRATION 018: PRODUCTION STOCK AUDIT & REPORTING SYSTEM
-- ============================================================================
-- IMPORTANT: REVIEW ONLY. Do NOT execute on production without approval.
-- Implements IST (Asia/Kolkata) fixed 12:00 AM midnight to 11:59:59 PM daily
-- audit cycle system and restricted current-calendar-month reporting filters.
-- ============================================================================

BEGIN;

-- 1. STOCK AUDIT CYCLES (Fixed Daily Cycle in Asia/Kolkata Timezone)
CREATE TABLE IF NOT EXISTS public.stock_audit_cycles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    cycle_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'CLOSED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    closed_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT unique_business_cycle_date UNIQUE (business_id, cycle_date)
);

CREATE INDEX IF NOT EXISTS idx_stock_audit_cycles_biz ON public.stock_audit_cycles(business_id, cycle_date);

ALTER TABLE public.stock_audit_cycles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Active business members can view stock audit cycles" ON public.stock_audit_cycles;
CREATE POLICY "Active business members can view stock audit cycles"
    ON public.stock_audit_cycles FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.businesses b WHERE b.id = stock_audit_cycles.business_id AND b.owner_id = auth.uid()
        ) OR EXISTS (
            SELECT 1 FROM public.business_members bm
            WHERE bm.business_id = stock_audit_cycles.business_id
              AND bm.user_id = auth.uid()
        )
    );

REVOKE INSERT, UPDATE, DELETE ON public.stock_audit_cycles FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.stock_audit_cycles TO authenticated;
GRANT ALL ON public.stock_audit_cycles TO service_role;


-- 2. STOCK AUDIT ENTRIES (Staff Physical Counts - NO EXPECTED QUANTITY FOR STAFF READS)
CREATE TABLE IF NOT EXISTS public.stock_audit_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    cycle_id UUID NOT NULL REFERENCES public.stock_audit_cycles(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    physical_quantity NUMERIC(12,3) NOT NULL CHECK (physical_quantity >= 0),
    submitted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    submitted_by_name TEXT,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_cycle_product_entry UNIQUE (cycle_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_stock_audit_entries_biz_cycle ON public.stock_audit_entries(business_id, cycle_id);
CREATE INDEX IF NOT EXISTS idx_stock_audit_entries_product ON public.stock_audit_entries(product_id);

ALTER TABLE public.stock_audit_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Active business members can view stock audit entries" ON public.stock_audit_entries;
CREATE POLICY "Active business members can view stock audit entries"
    ON public.stock_audit_entries FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.businesses b WHERE b.id = stock_audit_entries.business_id AND b.owner_id = auth.uid()
        ) OR EXISTS (
            SELECT 1 FROM public.business_members bm
            WHERE bm.business_id = stock_audit_entries.business_id
              AND bm.user_id = auth.uid()
        )
    );

REVOKE INSERT, UPDATE, DELETE ON public.stock_audit_entries FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.stock_audit_entries TO authenticated;
GRANT ALL ON public.stock_audit_entries TO service_role;


-- 3. STOCK AUDIT SNAPSHOTS (Admin-Only Expected Stock Snapshot at Cycle Creation)
CREATE TABLE IF NOT EXISTS public.stock_audit_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    cycle_id UUID NOT NULL REFERENCES public.stock_audit_cycles(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    expected_quantity NUMERIC(12,3) NOT NULL DEFAULT 0.000,
    snapshot_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_cycle_product_snapshot UNIQUE (cycle_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_stock_audit_snapshots_biz_cycle ON public.stock_audit_snapshots(business_id, cycle_id);

ALTER TABLE public.stock_audit_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin and Owner members can view expected stock snapshots" ON public.stock_audit_snapshots;
CREATE POLICY "Admin and Owner members can view expected stock snapshots"
    ON public.stock_audit_snapshots FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.businesses b
            WHERE b.id = stock_audit_snapshots.business_id AND b.owner_id = auth.uid()
        ) OR EXISTS (
            SELECT 1 FROM public.business_members bm
            WHERE bm.business_id = stock_audit_snapshots.business_id
              AND bm.user_id = auth.uid()
              AND lower(bm.role) IN ('owner', 'admin')
        )
    );

REVOKE INSERT, UPDATE, DELETE ON public.stock_audit_snapshots FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.stock_audit_snapshots TO authenticated;
GRANT ALL ON public.stock_audit_snapshots TO service_role;


-- 4. STOCK AUDIT CORRECTIONS (Immutable Correction Audit Log for Admin Adjustments)
CREATE TABLE IF NOT EXISTS public.stock_audit_corrections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    audit_entry_id UUID NOT NULL REFERENCES public.stock_audit_entries(id) ON DELETE CASCADE,
    previous_quantity NUMERIC(12,3) NOT NULL,
    corrected_quantity NUMERIC(12,3) NOT NULL CHECK (corrected_quantity >= 0),
    reason TEXT NOT NULL,
    corrected_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    corrected_by_name TEXT,
    corrected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_audit_corrections_entry ON public.stock_audit_corrections(audit_entry_id);

ALTER TABLE public.stock_audit_corrections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin and Owner members can view stock audit corrections" ON public.stock_audit_corrections;
CREATE POLICY "Admin and Owner members can view stock audit corrections"
    ON public.stock_audit_corrections FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.businesses b
            WHERE b.id = stock_audit_corrections.business_id AND b.owner_id = auth.uid()
        ) OR EXISTS (
            SELECT 1 FROM public.business_members bm
            WHERE bm.business_id = stock_audit_corrections.business_id
              AND bm.user_id = auth.uid()
              AND lower(bm.role) IN ('owner', 'admin')
        )
    );

REVOKE INSERT, UPDATE, DELETE ON public.stock_audit_corrections FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.stock_audit_corrections TO authenticated;
GRANT ALL ON public.stock_audit_corrections TO service_role;


-- ============================================================================
-- 5. SECURE DATABASE RPC FUNCTIONS
-- ============================================================================

-- A. Get or Create Daily Stock Audit Cycle (Bound to Asia/Kolkata 12:00 AM Midnight IST)
CREATE OR REPLACE FUNCTION public.get_or_create_stock_audit_cycle(
    p_business_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_caller_uid UUID;
    v_cycle_id UUID;
    v_cycle_date DATE;
    v_status TEXT;
BEGIN
    v_caller_uid := auth.uid();
    IF v_caller_uid IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    -- Derive current date in Asia/Kolkata (IST) timezone
    v_cycle_date := (NOW() AT TIME ZONE 'Asia/Kolkata')::DATE;

    -- Subscription validity guard
    IF NOT EXISTS (
        SELECT 1 FROM public.subscriptions
        WHERE business_id = p_business_id
          AND ((status = 'active' AND current_period_end > NOW()) OR (status = 'trial' AND trial_ends_at > NOW()))
          AND (enabled_features IS NULL OR enabled_features @> '["inventory"]'::jsonb)
    ) THEN
        RAISE EXCEPTION 'Subscription expired, inactive, or does not include inventory feature access.';
    END IF;

    -- Verify active business ownership or membership
    IF NOT EXISTS (
        SELECT 1 FROM public.businesses b WHERE b.id = p_business_id AND b.owner_id = v_caller_uid
    ) AND NOT EXISTS (
        SELECT 1 FROM public.business_members bm
        WHERE bm.business_id = p_business_id
          AND bm.user_id = v_caller_uid
    ) THEN
        RAISE EXCEPTION 'Access denied: Active business membership required.';
    END IF;

    -- Lock cycle check to handle concurrent creation safely
    SELECT id, status INTO v_cycle_id, v_status
    FROM public.stock_audit_cycles
    WHERE business_id = p_business_id AND cycle_date = v_cycle_date
    FOR UPDATE;

    IF v_cycle_id IS NULL THEN
        BEGIN
            INSERT INTO public.stock_audit_cycles (
                business_id, cycle_date, status, created_at
            ) VALUES (
                p_business_id, v_cycle_date, 'ACTIVE', NOW()
            ) RETURNING id INTO v_cycle_id;

            -- Take expected stock snapshot for Admin reports at cycle start
            INSERT INTO public.stock_audit_snapshots (
                business_id, cycle_id, product_id, expected_quantity, snapshot_at
            )
            SELECT
                p_business_id, v_cycle_id, p.id, COALESCE(p.stock_quantity, 0), NOW()
            FROM public.products p
            WHERE p.business_id = p_business_id
            ON CONFLICT (cycle_id, product_id) DO NOTHING;

            v_status := 'ACTIVE';
        EXCEPTION WHEN unique_violation THEN
            SELECT id, status INTO v_cycle_id, v_status
            FROM public.stock_audit_cycles
            WHERE business_id = p_business_id AND cycle_date = v_cycle_date;
        END;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'cycle_id', v_cycle_id,
        'cycle_date', v_cycle_date,
        'status', v_status
    );
END;
$$;


-- B. Get Staff Stock Audit Products (SECURE: Zero Expected Stock or Discrepancy Returned)
CREATE OR REPLACE FUNCTION public.get_staff_stock_audit_products(
    p_business_id UUID,
    p_cycle_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_caller_uid UUID;
    v_cycle_biz UUID;
    v_products JSONB;
BEGIN
    v_caller_uid := auth.uid();
    IF v_caller_uid IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    -- Verify cycle belongs to p_business_id
    SELECT business_id INTO v_cycle_biz
    FROM public.stock_audit_cycles
    WHERE id = p_cycle_id;

    IF v_cycle_biz IS NULL OR v_cycle_biz <> p_business_id THEN
        RAISE EXCEPTION 'Stock audit cycle not found or does not belong to this business.';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.businesses b WHERE b.id = p_business_id AND b.owner_id = v_caller_uid
    ) AND NOT EXISTS (
        SELECT 1 FROM public.business_members bm
        WHERE bm.business_id = p_business_id
          AND bm.user_id = v_caller_uid
    ) THEN
        RAISE EXCEPTION 'Access denied: Active business membership required.';
    END IF;

    -- Return product details + staff saved physical count (NO EXPECTED STOCK OR DIFFERENCE RETURNED)
    SELECT jsonb_agg(
        jsonb_build_object(
            'product_id', p.id,
            'name', p.name,
            'barcode', COALESCE(p.barcode, ''),
            'category', COALESCE(p.category, 'General'),
            'unit', COALESCE(p.unit, 'Piece'),
            'is_checked', CASE WHEN e.id IS NOT NULL THEN true ELSE false END,
            'physical_quantity', COALESCE(e.physical_quantity, 0),
            'submitted_by_name', COALESCE(e.submitted_by_name, ''),
            'submitted_at', e.submitted_at
        ) ORDER BY p.name ASC
    ) INTO v_products
    FROM public.products p
    LEFT JOIN public.stock_audit_entries e
      ON e.product_id = p.id AND e.cycle_id = p_cycle_id AND e.business_id = p_business_id
    WHERE p.business_id = p_business_id;

    RETURN jsonb_build_object(
        'success', true,
        'products', COALESCE(v_products, '[]'::JSONB)
    );
END;
$$;


-- C. Submit Staff Stock Audit Item (Only allowed for ACTIVE cycle belonging to business)
CREATE OR REPLACE FUNCTION public.submit_stock_audit_item(
    p_business_id UUID,
    p_cycle_id UUID,
    p_product_id UUID,
    p_physical_quantity NUMERIC,
    p_submitted_by_name TEXT DEFAULT 'Staff Member'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_caller_uid UUID;
    v_cycle_biz UUID;
    v_cycle_status TEXT;
    v_entry_id UUID;
    v_user_name TEXT;
BEGIN
    v_caller_uid := auth.uid();
    IF v_caller_uid IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    -- Verify cycle belongs to p_business_id and is in ACTIVE status
    SELECT business_id, status INTO v_cycle_biz, v_cycle_status
    FROM public.stock_audit_cycles
    WHERE id = p_cycle_id;

    IF v_cycle_biz IS NULL OR v_cycle_biz <> p_business_id THEN
        RAISE EXCEPTION 'Stock audit cycle not found or does not belong to this business.';
    END IF;

    IF v_cycle_status <> 'ACTIVE' THEN
        RAISE EXCEPTION 'Submissions are only allowed for active audit cycles.';
    END IF;

    -- Verify product belongs to p_business_id
    IF NOT EXISTS (SELECT 1 FROM public.products WHERE id = p_product_id AND business_id = p_business_id) THEN
        RAISE EXCEPTION 'Product does not belong to this business inventory.';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.businesses b WHERE b.id = p_business_id AND b.owner_id = v_caller_uid
    ) AND NOT EXISTS (
        SELECT 1 FROM public.business_members bm
        WHERE bm.business_id = p_business_id
          AND bm.user_id = v_caller_uid
    ) THEN
        RAISE EXCEPTION 'Access denied: Active business membership required.';
    END IF;

    IF COALESCE(p_physical_quantity, -1) < 0 OR (p_physical_quantity)::TEXT IN ('NaN', 'Infinity', '-Infinity') THEN
        RAISE EXCEPTION 'Physical quantity must be a non-negative finite number.';
    END IF;

    SELECT COALESCE(full_name, p_submitted_by_name) INTO v_user_name
    FROM public.profiles
    WHERE id = v_caller_uid;

    IF v_user_name IS NULL OR TRIM(v_user_name) = '' THEN
        v_user_name := COALESCE(NULLIF(TRIM(p_submitted_by_name), ''), 'Staff Member');
    END IF;

    -- Upsert physical count entry for this (cycle_id, product_id)
    INSERT INTO public.stock_audit_entries (
        business_id, cycle_id, product_id, physical_quantity, submitted_by, submitted_by_name, submitted_at
    ) VALUES (
        p_business_id, p_cycle_id, p_product_id, ROUND(p_physical_quantity, 3), v_caller_uid, v_user_name, NOW()
    )
    ON CONFLICT (cycle_id, product_id)
    DO UPDATE SET
        physical_quantity = EXCLUDED.physical_quantity,
        submitted_by = EXCLUDED.submitted_by,
        submitted_by_name = EXCLUDED.submitted_by_name,
        submitted_at = NOW()
    RETURNING id INTO v_entry_id;

    RETURN jsonb_build_object(
        'success', true,
        'entry_id', v_entry_id
    );
END;
$$;


-- D. Get Admin Stock Audit Report (RESTRICTED TO ADMIN/OWNER: Enforces Current Calendar Month in Asia/Kolkata)
DROP FUNCTION IF EXISTS public.get_admin_stock_audit_report(UUID, UUID, DATE, UUID);
DROP FUNCTION IF EXISTS public.get_admin_stock_audit_report(UUID, UUID, DATE, UUID, DATE, DATE);

CREATE OR REPLACE FUNCTION public.get_admin_stock_audit_report(
    p_business_id UUID,
    p_cycle_id UUID DEFAULT NULL,
    p_cycle_date DATE DEFAULT NULL,
    p_staff_id UUID DEFAULT NULL,
    p_from_date DATE DEFAULT NULL,
    p_to_date DATE DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_caller_uid UUID;
    v_target_cycle_id UUID;
    v_ist_today DATE := (NOW() AT TIME ZONE 'Asia/Kolkata')::DATE;
    v_ist_month_start DATE := date_trunc('month', (NOW() AT TIME ZONE 'Asia/Kolkata'))::DATE;
    v_from_date DATE;
    v_to_date DATE;
    v_total_products INT := 0;
    v_checked_count INT := 0;
    v_unchecked_count INT := 0;
    v_shortage_count INT := 0;
    v_excess_count INT := 0;
    v_matched_count INT := 0;
    v_items JSONB;
    v_cycles JSONB;
BEGIN
    v_caller_uid := auth.uid();
    IF v_caller_uid IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    -- Restrict strictly to Owners and Admins
    IF NOT EXISTS (
        SELECT 1 FROM public.businesses b WHERE b.id = p_business_id AND b.owner_id = v_caller_uid
    ) AND NOT EXISTS (
        SELECT 1 FROM public.business_members bm
        WHERE bm.business_id = p_business_id
          AND bm.user_id = v_caller_uid
          AND lower(bm.role) IN ('owner', 'admin')
    ) THEN
        RAISE EXCEPTION 'Access denied: Admin or Owner role required to view audit discrepancy reports.';
    END IF;

    -- Validate and restrict date filters to current calendar month in Asia/Kolkata time
    v_from_date := COALESCE(p_from_date, v_ist_month_start);
    v_to_date := COALESCE(p_to_date, v_ist_today);

    IF v_from_date < v_ist_month_start OR v_from_date > v_ist_today THEN
        RAISE EXCEPTION 'From Date (%) must be within the current calendar month (between % and %).', v_from_date, v_ist_month_start, v_ist_today;
    END IF;

    IF v_to_date < v_ist_month_start OR v_to_date > v_ist_today THEN
        RAISE EXCEPTION 'To Date (%) must be within the current calendar month (between % and %).', v_to_date, v_ist_month_start, v_ist_today;
    END IF;

    IF v_from_date > v_to_date THEN
        RAISE EXCEPTION 'From Date cannot be after To Date.';
    END IF;

    -- Resolve target cycle ID within current calendar month
    IF p_cycle_id IS NOT NULL THEN
        SELECT id INTO v_target_cycle_id FROM public.stock_audit_cycles WHERE id = p_cycle_id AND business_id = p_business_id AND cycle_date BETWEEN v_from_date AND v_to_date;
    ELSIF p_cycle_date IS NOT NULL THEN
        SELECT id INTO v_target_cycle_id FROM public.stock_audit_cycles WHERE business_id = p_business_id AND cycle_date = p_cycle_date AND cycle_date BETWEEN v_from_date AND v_to_date;
    ELSE
        SELECT id INTO v_target_cycle_id FROM public.stock_audit_cycles WHERE business_id = p_business_id AND cycle_date BETWEEN v_from_date AND v_to_date ORDER BY cycle_date DESC LIMIT 1;
    END IF;

    -- Get list of available cycles restricted to current calendar month in Asia/Kolkata time (older records remain saved)
    SELECT jsonb_agg(
        jsonb_build_object('id', id, 'cycle_date', cycle_date, 'status', status) ORDER BY cycle_date DESC
    ) INTO v_cycles
    FROM public.stock_audit_cycles
    WHERE business_id = p_business_id
      AND cycle_date BETWEEN v_ist_month_start AND v_ist_today;

    IF v_target_cycle_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', true,
            'total_products', 0,
            'checked_count', 0,
            'unchecked_count', 0,
            'shortage_count', 0,
            'excess_count', 0,
            'matched_count', 0,
            'completion_percentage', 0,
            'items', '[]'::JSONB,
            'cycles', COALESCE(v_cycles, '[]'::JSONB)
        );
    END IF;

    SELECT COUNT(*) INTO v_total_products FROM public.products WHERE business_id = p_business_id;

    -- Build item report joining entries and snapshots
    SELECT
        jsonb_agg(
            jsonb_build_object(
                'audit_entry_id', e.id,
                'product_id', p.id,
                'name', p.name,
                'barcode', COALESCE(p.barcode, ''),
                'category', COALESCE(p.category, 'General'),
                'unit', COALESCE(p.unit, 'Piece'),
                'is_checked', CASE WHEN e.id IS NOT NULL THEN true ELSE false END,
                'physical_quantity', COALESCE(e.physical_quantity, 0),
                'expected_quantity', COALESCE(s.expected_quantity, p.stock_quantity, 0),
                'difference', COALESCE(e.physical_quantity, 0) - COALESCE(s.expected_quantity, p.stock_quantity, 0),
                'discrepancy_type', CASE
                    WHEN e.id IS NULL THEN 'UNCHECKED'
                    WHEN (COALESCE(e.physical_quantity, 0) - COALESCE(s.expected_quantity, p.stock_quantity, 0)) < 0 THEN 'SHORTAGE'
                    WHEN (COALESCE(e.physical_quantity, 0) - COALESCE(s.expected_quantity, p.stock_quantity, 0)) > 0 THEN 'EXCESS'
                    ELSE 'MATCHED'
                END,
                'submitted_by', e.submitted_by,
                'submitted_by_name', COALESCE(e.submitted_by_name, 'Staff Member'),
                'submitted_at', e.submitted_at
            ) ORDER BY p.name ASC
        ),
        COUNT(e.id),
        COUNT(CASE WHEN e.id IS NOT NULL AND (COALESCE(e.physical_quantity, 0) - COALESCE(s.expected_quantity, p.stock_quantity, 0)) < 0 THEN 1 END),
        COUNT(CASE WHEN e.id IS NOT NULL AND (COALESCE(e.physical_quantity, 0) - COALESCE(s.expected_quantity, p.stock_quantity, 0)) > 0 THEN 1 END),
        COUNT(CASE WHEN e.id IS NOT NULL AND (COALESCE(e.physical_quantity, 0) - COALESCE(s.expected_quantity, p.stock_quantity, 0)) = 0 THEN 1 END)
    INTO v_items, v_checked_count, v_shortage_count, v_excess_count, v_matched_count
    FROM public.products p
    LEFT JOIN public.stock_audit_entries e
      ON e.product_id = p.id AND e.cycle_id = v_target_cycle_id AND e.business_id = p_business_id
    LEFT JOIN public.stock_audit_snapshots s
      ON s.product_id = p.id AND s.cycle_id = v_target_cycle_id AND s.business_id = p_business_id
    WHERE p.business_id = p_business_id
      AND (p_staff_id IS NULL OR e.submitted_by = p_staff_id);

    v_unchecked_count := GREATEST(0, v_total_products - v_checked_count);

    RETURN jsonb_build_object(
        'success', true,
        'cycle_id', v_target_cycle_id,
        'total_products', v_total_products,
        'checked_count', v_checked_count,
        'unchecked_count', v_unchecked_count,
        'shortage_count', v_shortage_count,
        'excess_count', v_excess_count,
        'matched_count', v_matched_count,
        'completion_percentage', CASE WHEN v_total_products > 0 THEN ROUND((v_checked_count::NUMERIC / v_total_products::NUMERIC) * 100, 1) ELSE 0 END,
        'items', COALESCE(v_items, '[]'::JSONB),
        'cycles', COALESCE(v_cycles, '[]'::JSONB)
    );
END;
$$;


-- E. Correct Staff Stock Audit Item (Admin Correction with Immutable Audit Log)
CREATE OR REPLACE FUNCTION public.correct_stock_audit_item(
    p_business_id UUID,
    p_audit_entry_id UUID,
    p_corrected_quantity NUMERIC,
    p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_caller_uid UUID;
    v_entry RECORD;
    v_user_name TEXT;
    v_reason TEXT;
BEGIN
    v_caller_uid := auth.uid();
    IF v_caller_uid IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    -- Restrict strictly to Owners and Admins
    IF NOT EXISTS (
        SELECT 1 FROM public.businesses b WHERE b.id = p_business_id AND b.owner_id = v_caller_uid
    ) AND NOT EXISTS (
        SELECT 1 FROM public.business_members bm
        WHERE bm.business_id = p_business_id
          AND bm.user_id = v_caller_uid
          AND lower(bm.role) IN ('owner', 'admin')
    ) THEN
        RAISE EXCEPTION 'Access denied: Admin or Owner role required to correct audit entries.';
    END IF;

    v_reason := NULLIF(TRIM(p_reason), '');
    IF v_reason IS NULL THEN
        RAISE EXCEPTION 'Correction reason is required.';
    END IF;

    IF COALESCE(p_corrected_quantity, -1) < 0 OR (p_corrected_quantity)::TEXT IN ('NaN', 'Infinity', '-Infinity') THEN
        RAISE EXCEPTION 'Corrected quantity must be a non-negative finite number.';
    END IF;

    -- Lock audit entry row
    SELECT * INTO v_entry
    FROM public.stock_audit_entries
    WHERE id = p_audit_entry_id AND business_id = p_business_id
    FOR UPDATE;

    IF v_entry.id IS NULL THEN
        RAISE EXCEPTION 'Audit entry not found or does not belong to this business.';
    END IF;

    SELECT COALESCE(full_name, 'Admin') INTO v_user_name
    FROM public.profiles
    WHERE id = v_caller_uid;

    -- Log immutable correction history
    INSERT INTO public.stock_audit_corrections (
        business_id, audit_entry_id, previous_quantity, corrected_quantity, reason, corrected_by, corrected_by_name, corrected_at
    ) VALUES (
        p_business_id, p_audit_entry_id, v_entry.physical_quantity, ROUND(p_corrected_quantity, 3), v_reason, v_caller_uid, COALESCE(v_user_name, 'Admin'), NOW()
    );

    -- Update audit entry physical quantity (WITHOUT CHANGING products.stock_quantity OR INSERTING STOCK MOVEMENTS)
    UPDATE public.stock_audit_entries
    SET physical_quantity = ROUND(p_corrected_quantity, 3),
        submitted_by = v_caller_uid,
        submitted_by_name = COALESCE(v_user_name, submitted_by_name) || ' (Corrected)',
        submitted_at = NOW()
    WHERE id = p_audit_entry_id;

    RETURN jsonb_build_object(
        'success', true,
        'audit_entry_id', p_audit_entry_id,
        'new_quantity', ROUND(p_corrected_quantity, 3)
    );
END;
$$;


-- Grants
REVOKE ALL ON FUNCTION public.get_or_create_stock_audit_cycle(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_or_create_stock_audit_cycle(UUID) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_staff_stock_audit_products(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_staff_stock_audit_products(UUID, UUID) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.submit_stock_audit_item(UUID, UUID, UUID, NUMERIC, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_stock_audit_item(UUID, UUID, UUID, NUMERIC, TEXT) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_admin_stock_audit_report(UUID, UUID, DATE, UUID, DATE, DATE) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_stock_audit_report(UUID, UUID, DATE, UUID, DATE, DATE) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.correct_stock_audit_item(UUID, UUID, NUMERIC, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.correct_stock_audit_item(UUID, UUID, NUMERIC, TEXT) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
