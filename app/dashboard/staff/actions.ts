"use server";

import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

const roleMap = {
  Admin: "admin",
  Staff: "staff",
  Billing: "billing",
  Delivery: "delivery",
  Owner: "owner",
  Manager: "manager",
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
  const requesterRole = (membership.role || "").toLowerCase();
  if (!["owner", "admin"].includes(requesterRole)) {
    throw new Error("Only Owner or Admin can add staff members.");
  }

  const businessId = membership.business_id;
  const dbRole = roleMap[role as keyof typeof roleMap] || "staff";

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

  // 6. Insert business membership with lowercase role
  const { error: memInsertErr } = await supabaseAdmin.from("business_members").insert([
    {
      business_id: businessId,
      user_id: newUserId,
      role: dbRole,
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
