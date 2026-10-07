import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { CreditCard, ShieldCheck, Sparkles, CheckCircle2 } from "lucide-react";

export default async function SubscriptionPage() {
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
  const profileName = user.user_metadata?.full_name || user.email?.split("@")[0] || "Admin";

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("business_id", business?.id || "")
    .single();

  const planName = subscription?.plan || "T MART Business Monthly";
  const status = subscription?.subscription_status || "trial";
  const trialStarted = subscription?.trial_started_at ? new Date(subscription.trial_started_at).toLocaleString() : "N/A";
  const trialEnds = subscription?.trial_ends_at ? new Date(subscription.trial_ends_at).toLocaleString() : "N/A";
  const currentPeriodStart = subscription?.current_period_start ? new Date(subscription.current_period_start).toLocaleDateString() : "N/A";
  const currentPeriodEnd = subscription?.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString() : "N/A";
  const amount = subscription?.amount || 350;

  // Calculate days remaining if trial or active
  const now = new Date().getTime();
  const endsTime = subscription?.trial_ends_at ? new Date(subscription.trial_ends_at).getTime() : now;
  const daysRemaining = Math.max(0, Math.ceil((endsTime - now) / (1000 * 60 * 60 * 24)));

  return (
    <DashboardShell
      businessName={business?.name || "T MART"}
      userName={profileName}
      role={membership.role || "OWNER"}
      pageTitle="Subscription"
      breadcrumb="Home / Subscription"
    >
      <PageHeader
        title="Subscription & Plan"
        description="Manage your T MART business subscription and billing status."
      />

      <div className="max-w-2xl space-y-6">
        {/* Active Plan Card */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b border-slate-100 gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-blue-50 text-blue-700 font-extrabold text-[10px] uppercase tracking-widest rounded-full border border-blue-200">
                  {status === "trial" ? "3-Day Free Trial" : status}
                </span>
                <span className="text-xs font-bold text-slate-400">• {business?.name || "T MART Business"}</span>
              </div>
              <h2 className="text-2xl font-black text-slate-900 mt-2">
                {status === "trial" ? `${daysRemaining} days remaining in trial` : `${planName}`}
              </h2>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
              <CreditCard className="w-6 h-6" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
              <span className="text-slate-400 uppercase text-[10px] font-bold">Trial Started</span>
              <p className="text-slate-900 font-extrabold">{trialStarted}</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
              <span className="text-slate-400 uppercase text-[10px] font-bold">Trial Ends</span>
              <p className="text-slate-900 font-extrabold">{trialEnds}</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
              <span className="text-slate-400 uppercase text-[10px] font-bold">Current Period</span>
              <p className="text-slate-900 font-extrabold">{currentPeriodStart} → {currentPeriodEnd}</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
              <span className="text-slate-400 uppercase text-[10px] font-bold">Next Payment</span>
              <p className="text-slate-900 font-extrabold">₹{amount.toFixed(2)} / month</p>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={() => alert("Payment gateway integration pending. Subscriptions will become active upon verified payment confirmation.")}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl text-xs text-center transition shadow-md shadow-blue-600/20 cursor-pointer"
            >
              Subscribe ₹{amount}/month
            </button>
            <p className="text-center text-[11px] text-slate-400 mt-2 font-medium">
              Recurring monthly subscription for the entire business. Covers all staff roles.
            </p>
          </div>
        </div>

        {/* Plan Comparison Card */}
        <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white p-6 sm:p-8 rounded-3xl shadow-xl space-y-5">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-black">T MART Business Plans</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-5 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 space-y-3">
              <h4 className="font-extrabold text-sm text-amber-300">3-Day Free Trial</h4>
              <p className="text-2xl font-black">₹0 <span className="text-xs font-normal text-slate-300">/ 3 days</span></p>
              <ul className="text-xs space-y-1.5 text-slate-200">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Full app access</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> One trial per business</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> All business members included</li>
              </ul>
            </div>

            <div className="p-5 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 space-y-3">
              <h4 className="font-extrabold text-sm text-blue-300">T MART Business Monthly</h4>
              <p className="text-2xl font-black">₹350 <span className="text-xs font-normal text-slate-300">/ month</span></p>
              <ul className="text-xs space-y-1.5 text-slate-200">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Recurring monthly plan</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Unlimited POS billing & stock</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Priority support & multi-user</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
