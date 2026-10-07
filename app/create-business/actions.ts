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
  const businessType = String(formData.get("business_type") ?? "Grocery").trim();
  const billingCycle = String(formData.get("billing_cycle") ?? "monthly").trim().toLowerCase();

  if (!name) {
    redirect(`/create-business?error=${encodeURIComponent("Business name is required.")}`);
  }

  if (billingCycle !== "monthly" && billingCycle !== "yearly") {
    redirect(`/create-business?error=${encodeURIComponent("Invalid billing cycle selected.")}`);
  }

  const amount = billingCycle === "yearly" ? 5000 : 450;

  // 1. Create business using only allowed columns (no updated_at)
  const { data: biz, error: bizError } = await supabase
    .from("businesses")
    .insert([
      {
        name,
        business_type: businessType,
        country: "India",
        owner_id: user.id,
        created_at: new Date().toISOString(),
      },
    ])
    .select()
    .single();

  if (bizError || !biz) {
    redirect(`/create-business?error=${encodeURIComponent(bizError?.message || "Failed to create business")}`);
  }

  // 2. Create business_members
  const { error: memError } = await supabase.from("business_members").insert([
    {
      business_id: biz.id,
      user_id: user.id,
      role: "owner",
      created_at: new Date().toISOString(),
    },
  ]);

  if (memError) {
    await supabase.from("businesses").delete().eq("id", biz.id);
    redirect(`/create-business?error=${encodeURIComponent(memError.message || "Failed to create business membership")}`);
  }

  // 3. Create subscription
  const now = new Date();
  const trialEnds = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  const { error: subError } = await supabase.from("subscriptions").insert([
    {
      business_id: biz.id,
      plan: "business",
      status: "trial",
      billing_cycle: billingCycle,
      amount: amount,
      trial_ends_at: trialEnds.toISOString(),
      current_period_start: now.toISOString(),
      current_period_end: trialEnds.toISOString(),
      created_at: now.toISOString(),
    },
  ]);

  if (subError) {
    await supabase.from("business_members").delete().eq("business_id", biz.id);
    await supabase.from("businesses").delete().eq("id", biz.id);
    redirect(`/create-business?error=${encodeURIComponent(subError.message || "Failed to create trial subscription")}`);
  }

  revalidatePath("/", "layout");
  revalidatePath("/dashboard");
  redirect("/dashboard?success=business_created");
}
