import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import DashboardView from "./DashboardView";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  // Check if authenticated user is Super Owner via database-backed public.is_super_admin RPC or super_admins table
  const { data: isSuper } = await supabase.rpc("is_super_admin", {
    p_user_id: user.id,
  });

  let isSuperOwner = Boolean(isSuper);
  if (!isSuperOwner) {
    const { data: superRecord } = await supabase
      .from("super_admins")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (superRecord) {
      isSuperOwner = true;
    }
  }

  if (isSuperOwner) {
    redirect("/super-admin");
  }

  const { data: memberships, error: memberError } = await supabase
    .from("business_members")
    .select("*, businesses(*)")
    .eq("user_id", user.id);

  if (memberError || !memberships || memberships.length === 0) {
    redirect("/create-business");
  }

  if (memberships.length > 1) {
    redirect("/select-business");
  }

  const membership = memberships[0];
  const business = membership.businesses;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  const userName = profile?.full_name || user.user_metadata?.full_name || "Admin";

  return (
    <DashboardView
      businessId={business?.id || user.id}
      businessName={business?.name || "TWEB"}
      userName={userName}
      role={membership.role || "Admin"}
    />
  );
}
