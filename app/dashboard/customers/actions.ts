"use server";

import { createClient } from "@/lib/supabase/server";
import { enforceModulePermission } from "@/lib/permissions";
import { revalidatePath } from "next/cache";

export async function saveCustomerAction(input: {
  id?: string;
  businessId: string;
  name: string;
  phone: string;
  altPhone?: string;
  address?: string;
  city?: string;
  email?: string;
  gstin?: string;
  customerType?: string;
  notes?: string;
}) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Please log in again.");
  }

  if (!input.businessId) {
    throw new Error("Business ID is required.");
  }

  // Enforce server-side customers module permission
  await enforceModulePermission(supabase, user.id, input.businessId, "customers");

  const name = String(input.name || "").trim();
  const phone = String(input.phone || "").trim();

  if (!name || !phone) {
    throw new Error("Customer name and phone are required.");
  }

  const payload = {
    business_id: input.businessId,
    name,
    phone,
    alt_phone: input.altPhone?.trim() || null,
    address: input.address?.trim() || null,
    city: input.city?.trim() || null,
    email: input.email?.trim() || null,
    gstin: input.gstin?.trim() || null,
    customer_type: input.customerType || "Regular Customer",
    notes: input.notes?.trim() || null,
    updated_at: new Date().toISOString(),
  };

  if (input.id) {
    const { error } = await supabase
      .from("customers")
      .update(payload)
      .eq("id", input.id)
      .eq("business_id", input.businessId);

    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from("customers")
      .insert([{ ...payload, created_at: new Date().toISOString() }]);

    if (error) throw new Error(error.message);
  }

  revalidatePath("/dashboard/customers");
  return { success: true, message: "Customer saved successfully." };
}

export async function deleteCustomerAction(input: {
  businessId: string;
  customerId: string;
}) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Please log in again.");
  }

  await enforceModulePermission(supabase, user.id, input.businessId, "customers");

  const { error } = await supabase
    .from("customers")
    .delete()
    .eq("id", input.customerId)
    .eq("business_id", input.businessId);

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/customers");
  return { success: true, message: "Customer deleted successfully." };
}
