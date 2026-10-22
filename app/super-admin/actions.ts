"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export async function superAdminLogin(formData: FormData) {
  const supabase = await createClient();

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    redirect(`/super-admin/login?error=${encodeURIComponent("Email and password are required.")}`);
  }

  // 1. Authenticate user via Supabase Auth
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data?.user) {
    redirect(`/super-admin/login?error=${encodeURIComponent(error?.message || "Invalid credentials.")}`);
  }

  // 2. Fail-closed server-side verification strictly via database-backed public.is_super_admin RPC
  const { data: isSuper, error: rpcError } = await supabase.rpc("is_super_admin", {
    p_user_id: data.user.id,
  });

  if (rpcError || !isSuper) {
    // Sign out unauthorized session from Super Owner login
    await supabase.auth.signOut();
    redirect(`/super-admin/login?error=${encodeURIComponent("Access Denied: Your account is not authorized as a Super Owner.")}`);
  }

  // 3. Authorized Super Owner -> revalidate and redirect to /super-admin
  revalidatePath("/", "layout");
  redirect("/super-admin");
}

export async function superAdminLogout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/super-admin/login");
}

export async function deletePlatformUserAction(input: { userId: string }) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Authentication required.");
  }

  // Verify super admin status server-side
  const { data: isSuper, error: rpcError } = await supabase.rpc("is_super_admin", {
    p_user_id: user.id,
  });

  if (rpcError || !isSuper) {
    throw new Error("Access Denied: Super Owner authorization required.");
  }

  if (user.id === input.userId) {
    throw new Error("Cannot delete your own active Super Owner account.");
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!serviceRoleKey || !supabaseUrl) {
    throw new Error("Server configuration error: Service role key not configured.");
  }

  const supabaseAdmin = createAdminClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  // Check if target user is a super admin
  const { data: targetIsSuper } = await supabase.rpc("is_super_admin", {
    p_user_id: input.userId,
  });

  if (targetIsSuper) {
    const { data: superAdminsList } = await supabaseAdmin.from("super_admins").select("id");
    if (superAdminsList && superAdminsList.length <= 1) {
      throw new Error("Cannot delete the last authorized Super Owner account.");
    }
  }

  // Check if user owns any businesses
  const { data: ownedBiz } = await supabaseAdmin.from("businesses").select("id, name").eq("owner_id", input.userId);
  if (ownedBiz && ownedBiz.length > 0) {
    throw new Error(`Cannot delete user: owns active business "${ownedBiz[0].name}". Please reassign or delete the business first.`);
  }

  // Delete user via Auth Admin API
  const { error: deleteErr } = await supabaseAdmin.auth.admin.deleteUser(input.userId);
  if (deleteErr) {
    throw new Error(deleteErr.message || "Failed to delete user account.");
  }

  revalidatePath("/super-admin");
  return { success: true, message: "Platform user deleted successfully." };
}

export async function adminActivateBusinessAction(input: { businessId: string }) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error("Authentication required.");

  const { data: isSuper, error: rpcError } = await supabase.rpc("is_super_admin", { p_user_id: user.id });
  if (rpcError || !isSuper) throw new Error("Access Denied: Super Owner authorization required.");

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!serviceRoleKey || !supabaseUrl) throw new Error("Server configuration error.");

  const supabaseAdmin = createAdminClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  // Fetch current subscription to check existing expiry without duplicate extensions
  const { data: sub } = await supabaseAdmin
    .from("subscriptions")
    .select("current_period_end")
    .eq("business_id", input.businessId)
    .maybeSingle();

  const currentEnd = sub?.current_period_end ? new Date(sub.current_period_end) : new Date();
  const baseDate = currentEnd > new Date() ? currentEnd : new Date();
  const newEnd = new Date(baseDate.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

  // Activate business access. Note: payment_status is strictly preserved and NOT marked approved automatically.
  const { error } = await supabaseAdmin
    .from("subscriptions")
    .update({
      status: "active",
      current_period_end: newEnd,
      updated_at: new Date().toISOString(),
    })
    .eq("business_id", input.businessId);

  if (error) throw new Error(error.message);

  revalidatePath("/super-admin");
  return { success: true, message: "Business subscription activated successfully (payment status preserved)." };
}

export async function adminDeactivateBusinessAction(input: { businessId: string }) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error("Authentication required.");

  const { data: isSuper, error: rpcError } = await supabase.rpc("is_super_admin", { p_user_id: user.id });
  if (rpcError || !isSuper) throw new Error("Access Denied: Super Owner authorization required.");

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!serviceRoleKey || !supabaseUrl) throw new Error("Server configuration error.");

  const supabaseAdmin = createAdminClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  // Set subscription status to expired to block access via server-side subscription guards
  const { error } = await supabaseAdmin
    .from("subscriptions")
    .update({
      status: "expired",
      updated_at: new Date().toISOString(),
    })
    .eq("business_id", input.businessId);

  if (error) throw new Error(error.message);

  revalidatePath("/super-admin");
  return { success: true, message: "Business successfully deactivated and access suspended." };
}

export async function adminArchiveBusinessAction(input: { businessId: string; confirmName: string }) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error("Authentication required.");

  const { data: isSuper, error: rpcError } = await supabase.rpc("is_super_admin", { p_user_id: user.id });
  if (rpcError || !isSuper) throw new Error("Access Denied: Super Owner authorization required.");

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!serviceRoleKey || !supabaseUrl) throw new Error("Server configuration error.");

  const supabaseAdmin = createAdminClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  const { data: biz, error: bizErr } = await supabaseAdmin
    .from("businesses")
    .select("name")
    .eq("id", input.businessId)
    .single();

  if (bizErr || !biz) throw new Error("Business not found.");

  if (biz.name.trim().toLowerCase() !== input.confirmName.trim().toLowerCase()) {
    throw new Error("Business name confirmation does not match.");
  }

  // Soft archive / cancel subscription to preserve transactional data and payment history
  const { error } = await supabaseAdmin
    .from("subscriptions")
    .update({
      status: "cancelled",
      updated_at: new Date().toISOString(),
    })
    .eq("business_id", input.businessId);

  if (error) throw new Error(error.message);

  revalidatePath("/super-admin");
  return { success: true, message: "Business successfully archived and subscription cancelled." };
}
