"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

const ALLOWED_PLANS = ["basic", "pro", "plus"];

export async function selectBusinessPlanAction(formData: FormData) {
  const rawPlanId = String(formData.get("planId") || "basic").toLowerCase().trim();

  if (!ALLOWED_PLANS.includes(rawPlanId)) {
    redirect(`/select-plan?error=${encodeURIComponent("Invalid subscription plan selected.")}`);
  }

  const planId = rawPlanId;

  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();

  if (authErr || !user) {
    redirect(`/select-plan?error=${encodeURIComponent("Authentication required. Please log in again.")}`);
  }

  // 1. Authoritative active business resolution matching TWEB pattern
  const { data: memberships, error: memErr } = await supabase
    .from("business_members")
    .select("business_id, role, businesses(id, name, owner_id)")
    .eq("user_id", user.id);

  if (memErr || !memberships || memberships.length === 0) {
    redirect("/create-business");
  }

  if (memberships.length > 1) {
    redirect("/select-business");
  }

  const activeMembership = memberships[0];
  const joinedBiz = Array.isArray(activeMembership.businesses)
    ? activeMembership.businesses[0]
    : activeMembership.businesses;
  const businessId = activeMembership.business_id || joinedBiz?.id;

  if (!businessId) {
    redirect(`/select-plan?error=${encodeURIComponent("Invalid active business workspace.")}`);
  }

  // 2. Authorize requester role (must be Owner or Admin)
  const requesterRole = (activeMembership.role || "").toLowerCase();
  if (!["owner", "admin"].includes(requesterRole)) {
    redirect(`/select-plan?error=${encodeURIComponent("Only an Owner or Admin can select or change subscription plans for this business.")}`);
  }

  // 3. Invoke secure atomic database RPC for plan selection (prices derived server-side in PostgreSQL)
  const { data, error: rpcErr } = await supabase.rpc("select_business_plan", {
    p_business_id: businessId,
    p_plan: planId,
  });

  if (rpcErr) {
    redirect(`/select-plan?error=${encodeURIComponent(rpcErr.message || "Failed to save plan selection.")}`);
  }

  if (data && data.success === false) {
    redirect(`/select-plan?error=${encodeURIComponent(data.error || "Failed to save plan selection.")}`);
  }

  redirect("/dashboard?success=plan_selected");
}
