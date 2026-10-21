-- ============================================================================
-- REVIEW-ONLY SQL MIGRATION 020: SECURE PURCHASE BILL DELETION & STOCK REVERSAL RPC
-- ============================================================================
-- Target Production Project: bagufluurqjjelrvhjqu
-- REVIEW ONLY. DO NOT EXECUTE ON PRODUCTION WITHOUT APPROVAL.
-- ============================================================================

BEGIN;

DROP FUNCTION IF EXISTS public.delete_purchase_bill(UUID, UUID, UUID);

CREATE OR REPLACE FUNCTION public.delete_purchase_bill(
    p_business_id UUID,
    p_bill_id UUID,
    p_idempotency_key UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_caller_uid UUID;
    v_bill RECORD;
    v_payment_count INT;
    v_item JSONB;
    v_product_id UUID;
    v_qty NUMERIC;
    v_current_stock NUMERIC;
BEGIN
    v_caller_uid := auth.uid();
    IF v_caller_uid IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    -- Authorize Owner (via businesses.owner_id OR business_members) and Admin roles
    IF NOT EXISTS (
        SELECT 1 FROM public.businesses b
        WHERE b.id = p_business_id AND b.owner_id = v_caller_uid
    ) AND NOT EXISTS (
        SELECT 1 FROM public.business_members bm
        WHERE bm.business_id = p_business_id
          AND bm.user_id = v_caller_uid
          AND lower(bm.role) IN ('owner', 'admin')
    ) THEN
        RAISE EXCEPTION 'Access denied: Active Owner or Admin membership required to delete purchase bills.';
    END IF;

    IF p_idempotency_key IS NULL THEN
        RAISE EXCEPTION 'Idempotency key is required.';
    END IF;

    -- Lock bill row
    SELECT * INTO v_bill
    FROM public.purchase_bills
    WHERE id = p_bill_id AND business_id = p_business_id
    FOR UPDATE;

    IF v_bill.id IS NULL THEN
        RAISE EXCEPTION 'Purchase bill not found or does not belong to this business.';
    END IF;

    -- Check payment history
    SELECT COUNT(*) INTO v_payment_count
    FROM public.purchase_payments
    WHERE purchase_bill_id = p_bill_id;

    IF v_payment_count > 0 THEN
        RAISE EXCEPTION 'Cannot delete purchase bill: % payment(s) have been recorded. Please reverse or delete all associated payments first.', v_payment_count;
    END IF;

    -- If status is stock_added, verify sufficient current stock is available before reversing
    IF v_bill.status = 'stock_added' THEN
        FOR v_item IN SELECT value FROM jsonb_array_elements(v_bill.items)
        LOOP
            v_product_id := (v_item->>'product_id')::UUID;
            v_qty := COALESCE((v_item->>'quantity')::NUMERIC, 0);

            SELECT COALESCE(stock_quantity, 0) INTO v_current_stock
            FROM public.products
            WHERE id = v_product_id AND business_id = p_business_id
            FOR UPDATE;

            IF NOT FOUND THEN
                RAISE EXCEPTION 'Product % no longer exists in inventory.', v_product_id;
            END IF;

            IF v_current_stock < v_qty THEN
                RAISE EXCEPTION 'Cannot delete bill: insufficient stock for product % (Current stock: %, Required reversal: %). Some items may have already been sold.',
                    v_item->>'name', v_current_stock, v_qty;
            END IF;
        END LOOP;

        -- Insert stock reversals via stock_movements (trigger updates stock)
        FOR v_item IN SELECT value FROM jsonb_array_elements(v_bill.items)
        LOOP
            v_product_id := (v_item->>'product_id')::UUID;
            v_qty := COALESCE((v_item->>'quantity')::NUMERIC, 0);

            INSERT INTO public.stock_movements (
                business_id, product_id, quantity_change, movement_type, notes, created_by, supplier, reference, purchase_price, movement_date
            ) VALUES (
                p_business_id, v_product_id, -v_qty, 'purchase_reversal',
                'Purchase Bill Deletion Reversal: ' || v_bill.invoice_no,
                v_caller_uid, v_bill.supplier_name, v_bill.invoice_no, COALESCE((v_item->>'landedCostPerUnit')::NUMERIC, (v_item->>'purchase_price')::NUMERIC, 0), CURRENT_DATE
            );
        END LOOP;
    ELSIF v_bill.status = 'pending_stock' THEN
        -- Pending stock: no stock adjustment needed
        NULL;
    ELSE
        RAISE EXCEPTION 'Invalid purchase bill status: %', v_bill.status;
    END IF;

    -- Delete payments (if any) and bill
    DELETE FROM public.purchase_payments WHERE purchase_bill_id = p_bill_id;
    DELETE FROM public.purchase_bills WHERE id = p_bill_id;

    RETURN jsonb_build_object('success', true, 'bill_id', p_bill_id, 'status', 'deleted');
END;
$$;

REVOKE ALL ON FUNCTION public.delete_purchase_bill(UUID, UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_purchase_bill(UUID, UUID, UUID) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
