import { createClient } from "@/lib/supabase/server";

export const ALLOWED_MODULES = [
  "billing",
  "customers",
  "inventory",
  "reports",
  "staff",
  "settings",
  "delivery",
] as const;

export type AppModule = typeof ALLOWED_MODULES[number];

export function canViewFinancials(role: string, permissions: any): boolean {
  const r = (role || "").toLowerCase();
  // Strict requirement: ONLY Owner and Admin roles can view financials (purchase prices, costs, profits, margins, reports)
  return r === "owner" || r === "admin";
}

export async function hasModulePermission(
  supabase: any,
  userId: string,
  businessId: string,
  moduleName: AppModule
): Promise<boolean> {
  if (!userId || !businessId || !moduleName) return false;

  const { data: member, error } = await supabase
    .from("business_members")
    .select("role, permissions")
    .eq("user_id", userId)
    .eq("business_id", businessId)
    .maybeSingle();

  if (error || !member) return false;

  const role = (member.role || "").toLowerCase();

  // 1. Owners always retain full access
  if (role === "owner") return true;

  const perms = member.permissions;

  // 2. When permissions is a valid array, treat it as authoritative
  if (Array.isArray(perms)) {
    return perms.includes(moduleName);
  }

  // 4. Ensure malformed permissions data fails closed rather than granting access
  if (perms !== null && perms !== undefined) {
    return false;
  }

  // 3. When permissions is NULL, use defaults consistent with migration 010:
  if (role === "admin") {
    // Admin has all modules enabled by default
    return true;
  }
  if (role === "manager") {
    return ["billing", "customers", "inventory", "reports"].includes(moduleName);
  }
  if (role === "billing") {
    return ["billing", "customers"].includes(moduleName);
  }
  if (role === "stockkeeper") {
    return ["inventory"].includes(moduleName);
  }
  if (role === "delivery") {
    return ["delivery"].includes(moduleName);
  }
  if (role === "staff") {
    return ["billing", "inventory"].includes(moduleName);
  }

  // Unknown roles: deny by default
  return false;
}

export async function enforceModulePermission(
  supabase: any,
  userId: string,
  businessId: string,
  moduleName: AppModule
): Promise<void> {
  const allowed = await hasModulePermission(supabase, userId, businessId, moduleName);
  if (!allowed) {
    throw new Error(`Access denied: Required module permission "${moduleName}" is disabled for your account.`);
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
  if (!["owner", "admin"].includes(requesterRole)) {
    throw new Error("Only Owner or Admin can perform this action.");
  }

  return {
    businessId: targetMember.business_id,
    requesterRole,
    targetMember,
  };
}
