import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import SuperAdminClient from "./SuperAdminClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SuperAdminPage() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      redirect("/super-admin/login");
    }

    // Fail-closed server-side verification strictly via database-backed public.is_super_admin(auth.uid()) RPC
    const { data: isSuper, error: rpcError } = await supabase.rpc("is_super_admin", {
      p_user_id: user.id,
    });

    if (rpcError || !isSuper) {
      redirect(`/super-admin/login?error=${encodeURIComponent("Access Denied: Super Owner authorization required.")}`);
    }

    const adminEmail = user.email || "superadmin@tweb.app";

    // Fetch standard data from client
    const [bizRes, subRes, membersRes, profRes, superAdminsRes] = await Promise.all([
      supabase.from("businesses").select("*").order("created_at", { ascending: false }),
      supabase.from("subscriptions").select("*"),
      supabase.from("business_members").select("*"),
      supabase.from("profiles").select("*"),
      supabase.from("super_admins").select("*"),
    ]);

    // Fetch all registered Auth users using server-only service role client with full pagination
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (!serviceRoleKey || !supabaseUrl) {
      throw new Error("Server configuration error: SUPABASE_SERVICE_ROLE_KEY is required to list platform users securely.");
    }

    let allAuthUsers: any[] = [];
    const supabaseAdmin = createAdminClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    let page = 1;
    const perPage = 1000;
    let fetching = true;
    while (fetching) {
      const { data: authData, error: authListErr } = await supabaseAdmin.auth.admin.listUsers({
        page,
        perPage,
      });
      if (authListErr) {
        throw new Error(authListErr.message || "Failed to list Supabase Auth users.");
      }
      const fetchedUsers = authData?.users || [];
      allAuthUsers.push(...fetchedUsers);
      if (fetchedUsers.length < perPage) {
        fetching = false;
      } else {
        page++;
      }
    }

    const profileMap = new Map((profRes.data || []).map((p: any) => [p.id, p]));
    const businessMap = new Map((bizRes.data || []).map((b: any) => [b.id, b]));

    const membershipsByUser = new Map<string, any[]>();
    for (const m of (membersRes.data || [])) {
      if (!membershipsByUser.has(m.user_id)) {
        membershipsByUser.set(m.user_id, []);
      }
      const biz = businessMap.get(m.business_id);
      membershipsByUser.get(m.user_id)!.push({ ...m, business: biz });
    }

    // Combine auth users with profiles and businesses (Each Auth user counted once)
    const combinedUsers = allAuthUsers.map((u: any) => {
      const prof = profileMap.get(u.id);
      const memberships = membershipsByUser.get(u.id) || [];
      const ownedBiz = (bizRes.data || []).find((b: any) => b.owner_id === u.id);
      const meta = u.user_metadata || {};

      return {
        id: u.id,
        email: u.email || meta.email || "N/A",
        full_name: prof?.full_name || meta.full_name || meta.name || u.email?.split("@")[0] || "User",
        phone: prof?.phone || meta.phone || u.phone || (ownedBiz?.phone) || "N/A",
        created_at: u.created_at,
        is_owner: !!ownedBiz || memberships.some((m: any) => String(m.role).toLowerCase() === 'owner'),
        memberships,
      };
    });

    return (
      <SuperAdminClient
        adminEmail={adminEmail}
        initialBusinesses={bizRes.data || []}
        initialSubscriptions={subRes.data || []}
        initialMembers={membersRes.data || []}
        initialProfiles={profRes.data || []}
        initialSuperAdmins={superAdminsRes.data || []}
        initialUsers={combinedUsers}
      />
    );
  } catch (err: any) {
    console.error("SuperAdminPage error:", err);
    redirect(`/super-admin/login?error=${encodeURIComponent(err.message || "Super owner panel session error.")}`);
  }
}
