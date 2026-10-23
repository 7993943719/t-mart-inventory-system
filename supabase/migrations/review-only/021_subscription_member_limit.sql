-- ============================================================================
-- REVIEW-ONLY SQL MIGRATION 021: SUBSCRIPTION MEMBER LIMIT & CONCURRENCY GUARD
-- ============================================================================
-- Target Production Project: bagufluurqjjelrvhjqu
-- REVIEW ONLY. DO NOT EXECUTE ON PRODUCTION WITHOUT APPROVAL.
-- ============================================================================

BEGIN;

-- 1. Add member_limit column to subscriptions table if not exists (default 5 members)
ALTER TABLE IF EXISTS public.subscriptions
    ADD COLUMN IF NOT EXISTS member_limit INT DEFAULT 5;

-- Ensure existing null values default to 5 without overwriting custom numbers
UPDATE public.subscriptions
SET member_limit = 5
WHERE member_limit IS NULL;

-- 2. Concurrency-safe atomic member limit check function
CREATE OR REPLACE FUNCTION public.check_business_member_limit(
    p_business_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_limit INT := 5;
    v_current_count INT := 0;
BEGIN
    -- Acquire row-level lock on subscription to prevent concurrent over-limit additions
    SELECT COALESCE(member_limit, 5) INTO v_limit
    FROM public.subscriptions
    WHERE business_id = p_business_id
    FOR UPDATE;

    IF v_limit IS NULL THEN
        v_limit := 5;
    END IF;

    -- Count current business members
    SELECT COUNT(*) INTO v_current_count
    FROM public.business_members
    WHERE business_id = p_business_id;

    IF v_current_count >= v_limit THEN
        RETURN jsonb_build_object(
            'allowed', false,
            'limit', v_limit,
            'current_count', v_current_count,
            'message', format('Your plan allows only %s members. To add more members, contact T Mart Helpline: 7993943719.', v_limit)
        );
    END IF;

    RETURN jsonb_build_object(
        'allowed', true,
        'limit', v_limit,
        'current_count', v_current_count
    );
END;
$$;

-- 3. Strict Execution Permissions
REVOKE ALL ON FUNCTION public.check_business_member_limit(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_business_member_limit(UUID) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
