"use server";

import { createClient } from "@/lib/supabase/server";
import { enforceModulePermission } from "@/lib/permissions";
import { revalidatePath } from "next/cache";

export async function updateBusinessProfileAction(input: {
  businessId: string;
  name: string;
  phone?: string;
  address?: string;
}) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Please log in again.");
  }

  if (!input.businessId) {
    throw new Error("Business ID is required.");
  }

  await enforceModulePermission(supabase, user.id, input.businessId, "settings");

  const name = String(input.name || "").trim();
  if (!name) {
    throw new Error("Business name is required.");
  }

  const { error } = await supabase
    .from("businesses")
    .update({
      name,
      phone: input.phone?.trim() || null,
      address: input.address?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.businessId);

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/settings");
  return { success: true, message: "Business profile updated successfully." };
}
