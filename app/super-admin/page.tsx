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

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (!serviceRoleKey || !supabaseUrl) {
      throw new Error("Server configuration error: SUPABASE_SERVICE_ROLE_KEY is required for super admin data access.");
    }

    const supabaseAdmin = createAdminClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // Fetch all global platform data securely bypassing tenant RLS using the server-only admin client
    const [bizRes, subRes, membersRes, profRes, superAdminsRes] = await Promise.all([
      supabaseAdmin.from("businesses").select("*").order("created_at", { ascending: false }),
      supabaseAdmin.from("subscriptions").select("*"),
      supabaseAdmin.from("business_members").select("*"),
      supabaseAdmin.from("profiles").select("*"),
      supabaseAdmin.from("super_admins").select("*"),
    ]);

    // Fetch all registered Auth users with full pagination
    let allAuthUsers: any[] = [];
    let page = 1;
    const perPage = 1000;
    let fetching = true;
    while (fetching) {
      const { data: authData, error: authListErr } = await supabaseAdmin.auth.admin.listUsers({
        page,
        perPage,
      });
      if (authListErr) {
        console.error("Error listing auth users:", authListErr);
        break;
      }
      const fetchedUsers = authData?.users || [];
      allAuthUsers.push(...fetchedUsers);
      if (fetchedUsers.length < perPage) {
        fetching = false;
      } else {
        page++;
      }
    }

    return (
      <SuperAdminClient
        adminEmail={adminEmail}
        initialBusinesses={bizRes.data || []}
        initialSubscriptions={subRes.data || []}
        initialMembers={membersRes.data || []}
        initialProfiles={profRes.data || []}
        initialSuperAdmins={superAdminsRes.data || []}
        initialAuthUsers={allAuthUsers}
      />
    );
  } catch (err: any) {
    console.error("SuperAdminPage error:", err);
    redirect(`/super-admin/login?error=${encodeURIComponent(err.message || "Super owner panel session error.")}`);
  }
}
