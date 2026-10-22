import { createClient } from "@/lib/supabase/server";
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

    const [bizRes, subRes, membersRes, profRes] = await Promise.all([
      supabase.from("businesses").select("*").order("created_at", { ascending: false }),
      supabase.from("subscriptions").select("*"),
      supabase.from("business_members").select("*"),
      supabase.from("profiles").select("*"),
    ]);

    return (
      <SuperAdminClient
        adminEmail={adminEmail}
        initialBusinesses={bizRes.data || []}
        initialSubscriptions={subRes.data || []}
        initialMembers={membersRes.data || []}
        initialProfiles={profRes.data || []}
      />
    );
  } catch (err: any) {
    console.error("SuperAdminPage error:", err);
    redirect(`/super-admin/login?error=${encodeURIComponent(err.message || "Super owner panel session error.")}`);
  }
}
