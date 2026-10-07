import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { Truck, Clock, CheckCircle, Package } from "lucide-react";

export default async function DeliveryPage() {
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
    <DashboardShell
      businessName={business?.name || "T MART"}
      userName={profileName}
      role={membership.role || "OWNER"}
      pageTitle="Delivery"
      breadcrumb="Home / Delivery"
    >
      <PageHeader
        title="Delivery Operations"
        description="Manage delivery dispatches, pending orders, and driver tracking."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard title="Pending" value="0" icon={<Clock className="w-5 h-5 text-amber-600" />} />
        <StatCard title="Preparing" value="0" icon={<Package className="w-5 h-5 text-blue-600" />} />
        <StatCard title="Out for Delivery" value="0" icon={<Truck className="w-5 h-5 text-indigo-600" />} />
        <StatCard title="Delivered" value="0" icon={<CheckCircle className="w-5 h-5 text-emerald-600" />} />
      </div>
    </DashboardShell>
  );
}
