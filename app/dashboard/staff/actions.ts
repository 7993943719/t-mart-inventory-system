"use server";

import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { verifyUserBusinessAccess, enforceModulePermission, ALLOWED_MODULES } from "@/lib/permissions";

const roleMap = {
  Admin: "admin",
  Staff: "staff",
  Billing: "billing",
  Delivery: "delivery",
  Owner: "owner",
  Manager: "manager",
  "Stock Keeper": "stockkeeper",
} as const;

export async function createStaffMember(formData: {
  fullName: string;
  email: string;
  password: string;
  role: string;
}) {
  const { fullName, email, password, role } = formData;

  if (!fullName || !email || !password || !role) {
    throw new Error("All fields are required.");
  }

  if (password.length < 6) {
    throw new Error("Temporary password must be at least 6 characters long.");
  }

  // 1. Verify requester session using server client (Owner's session remains active)
  const supabaseServer = await createClient();
  const { data: { user }, error: authError } = await supabaseServer.auth.getUser();

  if (authError || !user) {
    throw new Error("Unauthorized. Please log in again.");
  }

  // 2. Get requester's business membership & role
  const { data: memberships, error: memberError } = await supabaseServer
    .from("business_members")
    .select("*, businesses(*)")
    .eq("user_id", user.id);

  if (memberError || !memberships || memberships.length === 0) {
    throw new Error("Business membership not found for current user.");
  }

  const membership = memberships[0];
  const businessId = membership.business_id;

  // Enforce server-side staff module permission
  await enforceModulePermission(supabaseServer, user.id, businessId, "staff");

  const requesterRole = (membership.role || "").toLowerCase();
  if (!["owner", "admin"].includes(requesterRole)) {
    throw new Error("Only Owner or Admin can add staff members.");
  }

  // Verify subscription member limit
  const { data: limitCheck, error: limitErr } = await supabaseServer.rpc("check_business_member_limit", {
    p_business_id: businessId,
  });

  if (!limitErr && limitCheck && limitCheck.allowed === false) {
    throw new Error(limitCheck.message || `Your plan allows only ${limitCheck.limit} members. To add more members, contact T Mart Helpline: 7993943719.`);
  }

  if (limitErr) {
    const { count, error: countErr } = await supabaseServer
      .from("business_members")
      .select("*", { count: "exact", head: true })
      .eq("business_id", businessId);

    const { data: subData } = await supabaseServer
      .from("subscriptions")
      .select("member_limit")
      .eq("business_id", businessId)
      .maybeSingle();

    const maxLimit = subData?.member_limit || 5;
    if (!countErr && (count || 0) >= maxLimit) {
      throw new Error(`Your plan allows only ${maxLimit} members. To add more members, contact T Mart Helpline: 7993943719.`);
    }
  }

  const dbRole = roleMap[role as keyof typeof roleMap] || "staff";
  const defaultPermissions =
    ["owner", "admin"].includes(dbRole) ? ["billing", "customers", "inventory", "reports", "staff", "settings", "delivery"] :
    dbRole === "billing" ? ["billing", "customers"] :
    dbRole === "stockkeeper" ? ["inventory"] :
    dbRole === "delivery" ? ["delivery"] :
    ["billing", "inventory"];

  // 3. Create Admin Supabase client using service role key (or fallback to publishable if service role is omitted in local dev)
  const supabaseAdmin = createSupabaseAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  // 4. Create new Auth user securely via Admin API (does not affect Owner's browser session)
  const { data: newUserData, error: createUserErr } = await supabaseAdmin.auth.admin.createUser({
    email: email.trim(),
    password: password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName.trim(),
      role: role.toUpperCase(),
    },
  });

  if (createUserErr) {
    throw new Error(createUserErr.message || "Failed to create authentication user.");
  }

  const newUserId = newUserData.user?.id;
  if (!newUserId) {
    throw new Error("Failed to obtain new user ID.");
  }

  // 5. Upsert profile record
  const { error: profileErr } = await supabaseAdmin.from("profiles").upsert([
    {
      id: newUserId,
      full_name: fullName.trim(),
      role: role.toUpperCase(),
      is_active: true,
      updated_at: new Date().toISOString(),
    },
  ]);

  if (profileErr) {
    console.error("Profile upsert error:", profileErr);
  }

  // 6. Insert business membership with lowercase role and default permissions
  const { error: memInsertErr } = await supabaseAdmin.from("business_members").insert([
    {
      business_id: businessId,
      user_id: newUserId,
      role: dbRole,
      permissions: defaultPermissions,
    },
  ]);

  if (memInsertErr) {
    console.error("Business member insert error:", {
      message: memInsertErr?.message,
      details: memInsertErr?.details,
      hint: memInsertErr?.hint,
      code: memInsertErr?.code,
    });
    throw new Error(memInsertErr.message || "Failed to assign user to business.");
  }

  revalidatePath("/dashboard/staff");
  return { success: true, message: `Staff user ${fullName} created successfully` };
}

export async function updateStaffPermissions(input: {
  businessMemberId: string;
  permissions: string[];
}) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Please log in again.");
  }

  // Securely verify access scoped to target member's business and requester owner/admin role
  const { businessId, targetMember } = await verifyUserBusinessAccess(
    supabase,
    user.id,
    input.businessMemberId
  );

  // Enforce staff module permission
  await enforceModulePermission(supabase, user.id, businessId, "staff");

  // Prevent modifying owner permissions
  if ((targetMember.role || "").toLowerCase() === "owner") {
    throw new Error("Cannot modify permissions of the business Owner.");
  }

  // Validate module names against explicit allowlist
  const validPermissions = (input.permissions || []).filter((p) =>
    (ALLOWED_MODULES as readonly string[]).includes(p)
  );

  const { error } = await supabase
    .from("business_members")
    .update({ permissions: validPermissions })
    .eq("id", input.businessMemberId)
    .eq("business_id", businessId);

  if (error) {
    throw new Error(error.message || "Failed to update permissions.");
  }

  revalidatePath("/dashboard/staff");
  return { success: true, message: "Staff permissions updated successfully." };
}

export async function saveStaffAttendance(input: {
  businessId: string;
  attendanceDate: string;
  records: {
    businessMemberId: string;
    status: "present" | "absent" | "half_day" | "leave";
    notes?: string;
  }[];
}) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Please log in again.");
  }

  await enforceModulePermission(supabase, user.id, input.businessId, "staff");

  const { data: memberships, error: membershipError } =
    await supabase
      .from("business_members")
      .select("business_id, role, status")
      .eq("user_id", user.id)
      .eq("business_id", input.businessId);

  if (membershipError || !memberships?.length) {
    throw new Error("Business membership not found.");
  }

  const role = (memberships[0].role || "").toLowerCase();

  if (!["owner", "admin", "manager"].includes(role)) {
    throw new Error("Only an owner, admin, or manager can mark attendance.");
  }

  if (!input.attendanceDate || !input.businessId) {
    throw new Error("Business and attendance date are required.");
  }

  if (!input.records.length) {
    throw new Error("No attendance records provided.");
  }

  const rows = input.records.map((record) => ({
    business_id: input.businessId,
    business_member_id: record.businessMemberId,
    attendance_date: input.attendanceDate,
    status: record.status,
    notes: record.notes?.trim() || null,
    marked_by: user.id,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from("staff_attendance")
    .upsert(rows, {
      onConflict: "business_member_id,attendance_date",
    });

  if (error) {
    throw new Error(`Could not save attendance: ${error.message}`);
  }

  revalidatePath("/dashboard/staff");

  return { success: true, message: "Attendance saved successfully." };
}

export async function saveStaffSalary(input: {
  businessId: string;
  businessMemberId: string;
  monthlySalary: number;
  workingDaysPerMonth: number;
  effectiveFrom: string;
}) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Please log in again.");
  }

  await enforceModulePermission(supabase, user.id, input.businessId, "staff");

  const { data: memberships, error: membershipError } =
    await supabase
      .from("business_members")
      .select("business_id, role, status")
      .eq("user_id", user.id)
      .eq("business_id", input.businessId);

  if (membershipError || !memberships?.length) {
    throw new Error("Business membership not found.");
  }

  const role = (memberships[0].role || "").toLowerCase();

  if (!["owner", "admin", "manager"].includes(role)) {
    throw new Error("Only an owner, admin, or manager can set salary.");
  }

  if (
    !Number.isFinite(input.monthlySalary) ||
    input.monthlySalary < 0
  ) {
    throw new Error("Enter a valid monthly salary.");
  }

  if (
    !Number.isInteger(input.workingDaysPerMonth) ||
    input.workingDaysPerMonth < 1 ||
    input.workingDaysPerMonth > 31
  ) {
    throw new Error("Working days must be between 1 and 31.");
  }

  if (!input.businessMemberId || !input.effectiveFrom) {
    throw new Error("Staff member and effective date are required.");
  }

  const { error } = await supabase
    .from("staff_salary_settings")
    .upsert(
      {
        business_id: input.businessId,
        business_member_id: input.businessMemberId,
        monthly_salary: input.monthlySalary,
        working_days_per_month: input.workingDaysPerMonth,
        effective_from: input.effectiveFrom,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "business_member_id" }
    );

  if (error) {
    throw new Error(`Could not save salary: ${error.message}`);
  }

  revalidatePath("/dashboard/staff");

  return { success: true, message: "Salary settings saved successfully." };
}
