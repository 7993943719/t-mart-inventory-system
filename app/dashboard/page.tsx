import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import DashboardView from "./DashboardView";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
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

  const userName = profile?.full_name || user.user_metadata?.full_name || user.email?.split("@")[0] || "Admin";

  return (
    <DashboardView
      businessId={business?.id || user.id}
      businessName={business?.name || "T MART"}
      userName={userName}
      role={membership.role || "Admin"}
    />
  );
}
