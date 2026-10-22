"use server";

import { createClient } from "@/lib/supabase/server";
import { enforceModulePermission } from "@/lib/permissions";
import { revalidatePath } from "next/cache";

export async function deleteProductAction(input: {
  businessId: string;
  productId: string;
}) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Please log in again.");
  }

  await enforceModulePermission(supabase, user.id, input.businessId, "inventory");

  const { error } = await supabase
    .from("products")
    .delete()
    .eq("id", input.productId)
    .eq("business_id", input.businessId);

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/products");
  return { success: true, message: "Product deleted successfully." };
}
