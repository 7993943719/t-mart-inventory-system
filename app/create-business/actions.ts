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

  if (!name) {
    redirect(`/create-business?error=${encodeURIComponent("Business name is required.")}`);
  }

  // Insert business directly into businesses table
  const { data: biz, error: bizError } = await supabase
    .from("businesses")
    .insert([
      {
        name,
        business_type: businessType,
        country: "India",
        owner_id: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ])
    .select()
    .single();

  if (bizError || !biz) {
    redirect(`/create-business?error=${encodeURIComponent(bizError?.message || "Failed to create business")}`);
  }

  // Insert business member with role = 'owner'
  const { error: memError } = await supabase.from("business_members").insert([
    {
      business_id: biz.id,
      user_id: user.id,
      role: "owner",
      created_at: new Date().toISOString(),
    },
  ]);

  if (memError) {
    console.error("Business member insert error:", memError);
  }

  // Insert 3-day free trial subscription
  const now = new Date();
  const trialEnds = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  await supabase.from("subscriptions").insert([
    {
      business_id: biz.id,
      plan: "TWEB Business Monthly",
      amount: 350.00,
      billing_cycle: "monthly",
      subscription_status: "trial",
      trial_started_at: now.toISOString(),
      trial_ends_at: trialEnds.toISOString(),
      current_period_start: now.toISOString(),
      current_period_end: trialEnds.toISOString(),
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    },
  ]);

  revalidatePath("/", "layout");
  redirect("/dashboard?success=business_created");
}
