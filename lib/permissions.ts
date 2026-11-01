import { createClient } from "@/lib/supabase/server";

export const ALLOWED_MODULES = [
  "billing",
  "customers",
  "inventory",
  "reports",
  "staff",
  "settings",
  "delivery",
  "finance.view",
] as const;

export type AppModule = typeof ALLOWED_MODULES[number];

export function canViewFinancials(role: string, permissions: any, isOwner: boolean = false): boolean {
  if (isOwner) return true;
  const r = (role || "").toLowerCase();
  if (r === "owner" || r === "accountant") return true;
  if (Array.isArray(permissions)) {
    return permissions.includes("finance.view") || permissions.includes("financials") || permissions.includes("cost_view");
  }
  return false;
}

export async function hasModulePermission(
  supabase: any,
  userId: string,
  businessId: string,
  moduleName: AppModule | "finance.view"
): Promise<boolean> {
  if (!userId || !businessId || !moduleName) return false;

  // 1. Authenticate & check direct ownership using businesses.owner_id
  const { data: biz } = await supabase
    .from("businesses")
    .select("owner_id")
    .eq("id", businessId)
    .maybeSingle();

  if (biz && biz.owner_id === userId) {
    return true;
  }

  // 2. Verify active business_members membership
  const { data: member, error } = await supabase
    .from("business_members")
    .select("role, permissions, status")
    .eq("user_id", userId)
    .eq("business_id", businessId)
    .maybeSingle();

  if (error || !member) return false;

  const status = String(member.status || "active").toLowerCase();
  if (status !== "active" && status !== "") return false;

  const role = (member.role || "").toLowerCase();
  if (role === "owner") return true;

  const perms = member.permissions;

  // 3. Handle canonical financial permission key "finance.view" (and legacy aliases)
  if (moduleName === "finance.view") {
    if (role === "accountant") return true;
    if (Array.isArray(perms)) {
      return perms.includes("finance.view") || perms.includes("financials") || perms.includes("cost_view");
    }
    return false;
  }

  // 4. Handle standard AppModule module permissions
  if (Array.isArray(perms)) {
    return perms.includes(moduleName);
  }

  if (perms !== null && perms !== undefined) {
    return false;
  }

  // 5. Default role presets
  if (role === "admin" || role === "second_admin") {
    return ["billing", "customers", "inventory", "reports", "staff", "settings", "delivery"].includes(moduleName);
  }
  if (role === "manager") {
    return ["billing", "customers", "inventory", "reports"].includes(moduleName);
  }
  if (role === "accountant") {
    return ["reports"].includes(moduleName);
  }
  if (role === "billing") {
    return ["billing", "customers"].includes(moduleName);
  }
  if (role === "stockkeeper" || role === "stock_keeper") {
    return ["inventory"].includes(moduleName);
  }
  if (role === "delivery") {
    return ["delivery"].includes(moduleName);
  }
  if (role === "staff") {
    return ["billing", "inventory"].includes(moduleName);
  }

  return false;
}

export async function enforceModulePermission(
  supabase: any,
  userId: string,
  businessId: string,
  moduleName: AppModule | "finance.view"
): Promise<void> {
  const allowed = await hasModulePermission(supabase, userId, businessId, moduleName);
  if (!allowed) {
    throw new Error(`Access denied: Required permission/module "${moduleName}" is disabled for your account.`);
  }
}

export async function verifyUserBusinessAccess(
  supabase: any,
  userId: string,
  businessMemberId: string
): Promise<{ businessId: string; requesterRole: string; targetMember: any }> {
  const { data: targetMember, error: targetErr } = await supabase
    .from("business_members")
    .select("*")
    .eq("id", businessMemberId)
    .maybeSingle();

  if (targetErr || !targetMember) {
    throw new Error("Target staff member not found.");
  }

  const { data: requesterMember, error: reqErr } = await supabase
    .from("business_members")
    .select("role, business_id")
    .eq("user_id", userId)
    .eq("business_id", targetMember.business_id)
    .maybeSingle();

  if (reqErr || !requesterMember) {
    throw new Error("Unauthorized: You do not have access to this business.");
  }

  const requesterRole = (requesterMember.role || "").toLowerCase();
  if (!["owner", "admin", "second_admin"].includes(requesterRole)) {
    throw new Error("Only Owner or Second Admin can perform this action.");
  }

  return {
    businessId: targetMember.business_id,
    requesterRole,
    targetMember,
  };
}
