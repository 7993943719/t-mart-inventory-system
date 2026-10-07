import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const roleMap = {
  Admin: "admin",
  Billing: "billing",
  "Stock Keeper": "stockkeeper",
  Delivery: "delivery",
  Staff: "staff",
  Owner: "owner",
  Manager: "manager",
} as const;

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "This endpoint requires a valid Bearer token" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "").trim();

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

    const supabaseAuth = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });

    const { data: { user }, error: userErr } = await supabaseAuth.auth.getUser(token);

    if (userErr || !user) {
      return NextResponse.json({ error: "Authentication session expired. Please log in again." }, { status: 401 });
    }

    const body = await request.json();
    const { fullName, email, temporaryPassword, role, business_id } = body;

    if (!email || !role) {
      return NextResponse.json({ error: "Email and role are required." }, { status: 400 });
    }

    const requestedRoleDb = roleMap[role as keyof typeof roleMap] || "staff";
    if (requestedRoleDb === "owner") {
      return NextResponse.json({ error: "Owner role cannot be assigned through Add Staff." }, { status: 400 });
    }

    const supabaseAdmin = createClient(
      supabaseUrl,
      process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseKey,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    // Verify requester membership and role
    const { data: memberships, error: memErr } = await supabaseAdmin
      .from("business_members")
      .select("*")
      .eq("user_id", user.id);

    if (memErr || !memberships || memberships.length === 0) {
      return NextResponse.json({ error: "Unauthorized: Business membership not found." }, { status: 403 });
    }

    const membership = memberships[0];
    const requesterRole = (membership.role || "").toLowerCase();
    if (!["owner", "admin"].includes(requesterRole)) {
      return NextResponse.json({ error: "Unauthorized: Only Owner or Admin can add staff." }, { status: 403 });
    }

    const bizId = business_id || membership.business_id;

    // Check if user already exists in Supabase Auth
    const { data: listUsersData, error: listErr } = await supabaseAdmin.auth.admin.listUsers();
    const existingAuthUser = listUsersData?.users?.find(
      (u: any) => u.email?.toLowerCase() === email.trim().toLowerCase()
    );

    let targetUserId = existingAuthUser?.id;

    if (!existingAuthUser) {
      // 1. Create new Auth user if not exists
      if (!temporaryPassword || temporaryPassword.length < 6) {
        return NextResponse.json({ error: "Temporary password (min 6 characters) is required for new users." }, { status: 400 });
      }

      const { data: newUserData, error: createUserErr } = await supabaseAdmin.auth.admin.createUser({
        email: email.trim(),
        password: temporaryPassword,
        email_confirm: true,
        user_metadata: {
          full_name: (fullName || email.split("@")[0]).trim(),
          role: role.toUpperCase(),
        },
      });

      if (createUserErr) {
        return NextResponse.json({ error: createUserErr.message || "Failed to create user." }, { status: 400 });
      }

      targetUserId = newUserData.user?.id;
      if (!targetUserId) {
        return NextResponse.json({ error: "Failed to obtain new user ID." }, { status: 400 });
      }
    }

    // Check if target user already belongs to this business
    const { data: existingMembers } = await supabaseAdmin
      .from("business_members")
      .select("*")
      .eq("business_id", bizId)
      .eq("user_id", targetUserId);

    if (existingMembers && existingMembers.length > 0) {
      const existingMember = existingMembers[0];
      if ((existingMember.role || "").toLowerCase() === "owner") {
        return NextResponse.json({ error: "This user is already the Owner of this business." }, { status: 400 });
      }

      // Update role if changed
      await supabaseAdmin
        .from("business_members")
        .update({ role: requestedRoleDb })
        .eq("id", existingMember.id);

      return NextResponse.json({ success: true, message: "Existing staff member role updated successfully." });
    }

    // Upsert profile
    await supabaseAdmin.from("profiles").upsert([
      {
        id: targetUserId,
        full_name: (fullName || email.split("@")[0]).trim(),
        role: role.toUpperCase(),
        is_active: true,
        updated_at: new Date().toISOString(),
      },
    ]);

    // Insert business membership
    const { error: insertMemberErr } = await supabaseAdmin.from("business_members").insert([
      {
        business_id: bizId,
        user_id: targetUserId,
        role: requestedRoleDb,
      },
    ]);

    if (insertMemberErr) {
      return NextResponse.json({ error: insertMemberErr.message || "Failed to assign staff to business." }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: "Staff user created successfully." });
  } catch (err: any) {
    console.error("Staff create API error:", err);
    return NextResponse.json({ error: err.message || "Internal server error." }, { status: 500 });
  }
}
