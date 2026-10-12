import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import MoreClient from "./MoreClient";

export default async function MorePage() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) redirect("/login");

  const { data: memberships } = await supabase
    .from("business_members")
    .select("*, businesses(*)")
    .eq("user_id", user.id);

  if (!memberships || memberships.length === 0) redirect("/create-business");

  const membership = memberships[0];
  const business = membership.businesses;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  const profileName = profile?.full_name || user.user_metadata?.full_name || "Admin";

  return <MoreClient businessName={business?.name || "TWEB"} userName={profileName} />;
}
