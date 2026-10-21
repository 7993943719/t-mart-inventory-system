"use server";

import { createClient } from "@/lib/supabase/server";
import { enforceModulePermission } from "@/lib/permissions";
import { revalidatePath } from "next/cache";

export async function saveSupplierAction(input: {
  id?: string;
  businessId: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  gstin?: string;
}) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Please log in again.");
  }

  if (!input.businessId) {
    throw new Error("Business ID is required.");
  }

  await enforceModulePermission(supabase, user.id, input.businessId, "inventory");

  const name = String(input.name || "").trim();
  if (!name) {
    throw new Error("Vendor name is required.");
  }

  const payload = {
    business_id: input.businessId,
    name,
    phone: input.phone?.trim() || null,
    email: input.email?.trim() || null,
    address: input.address?.trim() || null,
    gstin: input.gstin?.trim() || null,
    updated_at: new Date().toISOString(),
  };

  if (input.id) {
    const { error } = await supabase
      .from("suppliers")
      .update(payload)
      .eq("id", input.id)
      .eq("business_id", input.businessId);

    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from("suppliers")
      .insert([{ ...payload, created_at: new Date().toISOString() }]);

    if (error) throw new Error(error.message);
  }

  revalidatePath("/dashboard/purchases");
  return { success: true, message: "Vendor saved successfully." };
}

export async function deleteSupplierAction(input: {
  businessId: string;
  supplierId: string;
}) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Please log in again.");
  }

  await enforceModulePermission(supabase, user.id, input.businessId, "inventory");

  const { error } = await supabase
    .from("suppliers")
    .delete()
    .eq("id", input.supplierId)
    .eq("business_id", input.businessId);

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/purchases");
  return { success: true, message: "Vendor deleted successfully." };
}
