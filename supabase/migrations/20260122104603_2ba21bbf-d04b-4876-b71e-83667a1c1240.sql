-- Create a secure function to process sales that bypasses RLS for stock updates
-- This ensures inventory is updated regardless of who creates the sale
CREATE OR REPLACE FUNCTION public.process_sale(
    p_business_id uuid,
    p_user_id uuid,
    p_total numeric,
    p_payment_method payment_method,
    p_notes text DEFAULT NULL,
    p_items jsonb DEFAULT '[]'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_sale_id uuid;
    v_item jsonb;
    v_product_id uuid;
    v_quantity integer;
    v_current_stock integer;
BEGIN
    -- Validate user is a clerk or owner of this business
    IF NOT is_business_clerk(p_business_id) THEN
        RAISE EXCEPTION 'User does not have permission to create sales for this business';
    END IF;

    -- Create the sale record
    INSERT INTO public.sales (business_id, user_id, total, payment_method, notes)
    VALUES (p_business_id, p_user_id, p_total, p_payment_method, p_notes)
    RETURNING id INTO v_sale_id;

    -- Process each item in the sale
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_product_id := (v_item->>'productId')::uuid;
        v_quantity := (v_item->>'quantity')::integer;

        -- Insert sale item
        INSERT INTO public.sale_items (sale_id, product_id, product_name, quantity, unit_price, subtotal)
        VALUES (
            v_sale_id,
            v_product_id,
            v_item->>'productName',
            v_quantity,
            (v_item->>'unitPrice')::numeric,
            v_quantity * (v_item->>'unitPrice')::numeric
        );

        -- Get current stock and update it
        SELECT stock INTO v_current_stock
        FROM public.products
        WHERE id = v_product_id;

        IF v_current_stock IS NOT NULL THEN
            UPDATE public.products
            SET stock = GREATEST(0, v_current_stock - v_quantity),
                updated_at = now()
            WHERE id = v_product_id;
        END IF;
    END LOOP;

    RETURN v_sale_id;
END;
$$;