"use server";

import { createClient } from "@/lib/supabase/server";
import { enforceModulePermission } from "@/lib/permissions";
import { revalidatePath } from "next/cache";

export async function recordStockMovementAction(input: {
  businessId: string;
  productId: string;
  quantityChange: number;
  movementType: string;
  notes?: string;
  reference?: string;
}) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Please log in again.");
  }

  if (!input.businessId || !input.productId) {
    throw new Error("Business ID and Product ID are required.");
  }

  await enforceModulePermission(supabase, user.id, input.businessId, "inventory");

  // Insert stock movement (triggers product stock update automatically)
  const { error: moveErr } = await supabase.from("stock_movements").insert([
    {
      business_id: input.businessId,
      product_id: input.productId,
      quantity_change: input.quantityChange,
      movement_type: input.movementType || "Adjustment",
      notes: input.notes?.trim() || null,
      created_by: user.id,
      reference: input.reference?.trim() || null,
      movement_date: new Date().toISOString(),
    },
  ]);

  if (moveErr) throw new Error(moveErr.message);

  revalidatePath("/dashboard/stock");
  return { success: true, message: "Stock movement recorded successfully." };
}
