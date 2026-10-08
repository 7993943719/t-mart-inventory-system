import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell/AppShell";
import Link from "next/link";
import {
  Boxes,
  Truck,
  TrendingUp,
  CreditCard,
  Settings,
  ChevronRight,
  LogOut,
} from "lucide-react";
import { logout } from "@/app/login/actions";

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

  const moreItems = [
    { label: "Inventory", desc: "Track stock levels and adjustments", icon: Boxes, href: "/dashboard/inventory", color: "bg-emerald-50 text-emerald-600" },
    { label: "Delivery", desc: "Manage fulfillment and dispatch", icon: Truck, href: "/dashboard/delivery", color: "bg-cyan-50 text-cyan-600" },
    { label: "Reports", desc: "View business sales & analytics", icon: TrendingUp, href: "/dashboard/reports", color: "bg-teal-50 text-teal-600" },
    { label: "Subscription", desc: "Manage your active subscription plan", icon: CreditCard, href: "/dashboard/subscription", color: "bg-purple-50 text-purple-600" },
    { label: "Settings", desc: "Configure business & security settings", icon: Settings, href: "/dashboard/settings", color: "bg-slate-100 text-slate-700" },
  ];

  return (
    <AppShell businessName={business?.name || "TWEB"} userName={profileName}>
      <div className="space-y-4">
        <div className="space-y-1 px-1">
          <h2 className="text-xl font-black text-slate-900">More Options</h2>
          <p className="text-xs text-slate-500 font-medium">Secondary business management modules</p>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden divide-y divide-slate-100">
          {moreItems.map((item, idx) => {
            const Icon = item.icon;
            return (
              <Link
                key={idx}
                href={item.href}
                className="p-4 sm:p-5 flex items-center justify-between hover:bg-slate-50 transition group"
              >
                <div className="flex items-center gap-3.5">
                  <div className={`p-3 rounded-2xl ${item.color} shadow-xs group-hover:scale-110 transition`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 group-hover:text-indigo-600 transition">{item.label}</h3>
                    <p className="text-xs text-slate-400 font-medium">{item.desc}</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition" />
              </Link>
            );
          })}
        </div>

        <div className="pt-2">
          <form action={logout}>
            <button
              type="submit"
              className="w-full py-4 bg-rose-50 hover:bg-rose-100 text-rose-600 font-black rounded-2xl text-xs flex items-center justify-center gap-2 transition shadow-xs cursor-pointer border border-rose-200"
            >
              <LogOut className="w-4 h-4" /> Logout from TWEB
            </button>
          </form>
        </div>
      </div>
    </AppShell>
  );
}
