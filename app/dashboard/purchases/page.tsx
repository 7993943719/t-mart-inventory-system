import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { UnifiedDashboardShell } from "@/components/dashboard/UnifiedDashboardShell";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { ShoppingCart, Plus } from "lucide-react";

export default async function PurchasesPage() {
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
  const profileName = user.user_metadata?.full_name || user.email?.split("@")[0] || "Pavan";

  return (
    <UnifiedDashboardShell
      businessName={business?.name || "T MART"}
      userName={profileName}
      role={membership.role || "OWNER"}
      pageTitle="Purchases"
    >
      <PageHeader
        title="Purchases"
        description="Record and manage supplier purchase entries and history."
        action={
          <button className="px-5 py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-extrabold rounded-2xl text-xs shadow-md shadow-indigo-600/20 transition flex items-center gap-1.5 cursor-pointer">
            <Plus className="w-4 h-4" /> + New Purchase
          </button>
        }
      />
    </UnifiedDashboardShell>
  );
}
