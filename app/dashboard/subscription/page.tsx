import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { CreditCard, ShieldCheck, Sparkles, CheckCircle2, AlertCircle } from "lucide-react";

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

  const plan = subscription?.plan || "monthly";
  let status = subscription?.status || "trial";
  const trialEndsAt = subscription?.trial_ends_at ? new Date(subscription.trial_ends_at) : new Date();
  const currentPeriodEnd = subscription?.current_period_end ? new Date(subscription.current_period_end) : new Date();

  const now = new Date();
  const isTrialExpired = status === "trial" && now > trialEndsAt;
  const isActive = status === "active" && now < currentPeriodEnd;

  if (isTrialExpired && status === "trial") {
    status = "expired";
  }

  const daysRemaining = Math.max(0, Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

  return (
    <DashboardShell
      businessName={business?.name || "TWEB"}
      userName={profileName}
      role={membership.role || "OWNER"}
      pageTitle="Subscription"
      breadcrumb="Home / Subscription"
    >
      <PageHeader
        title="Subscription & Plan"
        description="Manage your TWEB business subscription and Google Play billing."
      />

      <div className="max-w-2xl space-y-6">
        {/* EXPIRED TRIAL BANNER */}
        {status === "expired" && (
          <div className="p-6 bg-rose-50 border border-rose-200 rounded-3xl space-y-3 shadow-xs">
            <div className="flex items-center gap-2.5 text-rose-700">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <h3 className="text-base font-black">Your 3-day free trial has ended.</h3>
            </div>
            <p className="text-xs text-rose-600 font-medium">
              Subscribe to a plan below to continue using TWEB without interruption.
            </p>
          </div>
        )}

        {/* Active Plan Card */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b border-slate-100 gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 font-extrabold text-[10px] uppercase tracking-widest rounded-full border ${
                  status === "active" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                  status === "trial" ? "bg-blue-50 text-blue-700 border-blue-200" :
                  "bg-rose-50 text-rose-700 border-rose-200"
                }`}>
                  {status === "trial" ? `Trial • ${daysRemaining} days remaining` : status}
                </span>
                <span className="text-xs font-bold text-slate-400">• {business?.name || "TWEB Business"}</span>
              </div>
              <h2 className="text-2xl font-black text-slate-900 mt-2">
                {status === "trial" ? "3-Day Free Trial Active" : plan === "yearly" ? "TWEB Yearly Plan" : "TWEB Monthly Plan"}
              </h2>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
              <CreditCard className="w-6 h-6" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
              <span className="text-slate-400 uppercase text-[10px] font-bold">Plan Type</span>
              <p className="text-slate-900 font-extrabold uppercase">{plan}</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
              <span className="text-slate-400 uppercase text-[10px] font-bold">Status</span>
              <p className="text-slate-900 font-extrabold uppercase">{status}</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
              <span className="text-slate-400 uppercase text-[10px] font-bold">Trial Ends At</span>
              <p className="text-slate-900 font-extrabold">{trialEndsAt.toLocaleString()}</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
              <span className="text-slate-400 uppercase text-[10px] font-bold">Current Period End</span>
              <p className="text-slate-900 font-extrabold">{currentPeriodEnd.toLocaleDateString()}</p>
            </div>
          </div>

          {/* PRICING PLANS / BUY BUTTONS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
            <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-extrabold text-blue-600 uppercase">Monthly Plan</span>
                <h4 className="text-xl font-black text-slate-900 mt-1">₹450 <span className="text-xs font-normal text-slate-500">/ month</span></h4>
                <p className="text-xs text-slate-500 mt-1">Billed monthly. Google Play Billing on Android.</p>
              </div>
              <button
                type="button"
                onClick={() => alert("Google Play Billing purchase flow triggered for TWEB Monthly (₹450/mo). Server verification pending.")}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl text-xs text-center transition shadow-md shadow-blue-600/20 cursor-pointer"
              >
                Buy Monthly
              </button>
            </div>

            <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-extrabold text-purple-600 uppercase">Yearly Plan</span>
                <h4 className="text-xl font-black text-slate-900 mt-1">₹5,000 <span className="text-xs font-normal text-slate-500">/ year</span></h4>
                <p className="text-xs text-slate-500 mt-1">Billed annually. Save more with yearly billing.</p>
              </div>
              <button
                type="button"
                onClick={() => alert("Google Play Billing purchase flow triggered for TWEB Yearly (₹5,000/yr). Server verification pending.")}
                className="w-full py-3.5 bg-purple-600 hover:bg-purple-700 text-white font-black rounded-xl text-xs text-center transition shadow-md shadow-purple-600/20 cursor-pointer"
              >
                Buy Yearly
              </button>
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
