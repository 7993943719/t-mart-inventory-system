import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import SuperAdminClient from "./SuperAdminClient";

export default async function SuperAdminPage() {
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
}
