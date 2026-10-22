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
    const [bizRes, subRes, membersRes, profRes] = await Promise.all([
      supabase.from("businesses").select("*").order("created_at", { ascending: false }),
      supabase.from("subscriptions").select("*"),
      supabase.from("business_members").select("*"),
      supabase.from("profiles").select("*"),
    ]);

    // Fetch all registered Auth users using server-only service role client to ensure 100% visibility (e.g. stock@gmail.com)
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    let allAuthUsers: any[] = [];
    if (serviceRoleKey && supabaseUrl) {
      try {
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
            console.error("Error listing auth users:", authListErr);
            break;
          }
          const users = authData?.users || [];
          allAuthUsers.push(...users);
          if (users.length < perPage) {
            fetching = false;
          } else {
            page++;
          }
        }
      } catch (adminErr) {
        console.error("Admin user listing failed:", adminErr);
      }
    } else {
      console.warn("SUPABASE_SERVICE_ROLE_KEY is not configured on the server. Falling back to public.profiles data.");
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

    // Combine auth users with profiles and businesses
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

    // Fallback if admin auth fetch returned empty (e.g. missing service role key)
    if (combinedUsers.length === 0) {
      for (const p of (profRes.data || [])) {
        const memberships = membershipsByUser.get(p.id) || [];
        const ownedBiz = (bizRes.data || []).find((b: any) => b.owner_id === p.id);
        combinedUsers.push({
          id: p.id,
          email: p.email || "N/A",
          full_name: p.full_name || "User",
          phone: p.phone || "N/A",
          created_at: p.created_at,
          is_owner: !!ownedBiz || memberships.some((m: any) => String(m.role).toLowerCase() === 'owner'),
          memberships,
        });
      }
    }

    return (
      <SuperAdminClient
        adminEmail={adminEmail}
        initialBusinesses={bizRes.data || []}
        initialSubscriptions={subRes.data || []}
        initialMembers={membersRes.data || []}
        initialProfiles={profRes.data || []}
        initialUsers={combinedUsers}
      />
    );
  } catch (err: any) {
    console.error("SuperAdminPage error:", err);
    redirect(`/super-admin/login?error=${encodeURIComponent(err.message || "Super owner panel session error.")}`);
  }
}
