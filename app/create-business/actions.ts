"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createBusiness(formData: FormData) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const businessType = String(formData.get("business_type") ?? "Supermarket").trim();
  const billingCycle = String(formData.get("billing_cycle") ?? "monthly").trim().toLowerCase();

  if (!name) {
    redirect(`/create-business?error=${encodeURIComponent("Business name is required.")}`);
  }

  if (!phone || phone.length < 10) {
    redirect(`/create-business?error=${encodeURIComponent("A valid owner mobile phone number is required.")}`);
  }

  // Invoke verified live production RPC using exact supported parameters:
  // p_business_name, p_business_type, p_billing_cycle
  const { data: rpcData, error: rpcError } = await supabase.rpc("create_business_with_trial", {
    p_business_name: name,
    p_business_type: businessType,
    p_billing_cycle: billingCycle === "yearly" ? "yearly" : "monthly",
  });

  if (rpcError || !rpcData || rpcData.success === false || !rpcData.business_id) {
    const errorMsg = rpcError?.message || rpcData?.error || "Failed to create business and trial subscription";
    console.error("create_business_with_trial RPC error:", rpcError || rpcData);
    redirect(`/create-business?error=${encodeURIComponent(errorMsg)}`);
  }

  revalidatePath("/", "layout");
  revalidatePath("/dashboard");
  // Redirect to post-signup Plan Selection page
  redirect("/select-plan");
}
