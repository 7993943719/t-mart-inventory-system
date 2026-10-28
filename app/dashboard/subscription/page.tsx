"use client";

import React, { useEffect, useState } from "react";
import { SharedDashboardLayout } from "@/components/layout/SharedDashboardLayout";
import { createClient } from "@/lib/supabase/client";
import {
  CreditCard,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Loader2,
  Send,
  Clock,
  XCircle,
  Hourglass,
} from "lucide-react";

export default function SubscriptionPage() {
  const [supabase] = useState(() => createClient());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [copied, setCopied] = useState(false);

  const [business, setBusiness] = useState<any>(null);
  const [userName, setUserName] = useState("Admin");
  const [role, setRole] = useState("OWNER");
  const [subscription, setSubscription] = useState<any>(null);
  const [paymentRefInput, setPaymentRefInput] = useState("");

  const upiId = "pavankumar72141@ybl";

  const loadSubscriptionData = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const { data: { user }, error: authErr } = await supabase.auth.getUser();
      if (authErr || !user) {
        throw new Error("Authentication required. Please log in again.");
      }

      const { data: memberships, error: memErr } = await supabase
        .from("business_members")
        .select("*, businesses(*)")
        .eq("user_id", user.id);

      if (memErr) throw memErr;

      if (!memberships || memberships.length === 0) {
        throw new Error("No business membership found for this account.");
      }

      const biz = memberships[0].businesses;
      setBusiness(biz);
      setRole(memberships[0].role || "OWNER");

      const { data: sub, error: subErr } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("business_id", biz.id)
        .maybeSingle();

      if (subErr) {
        console.error("Subscription query error:", subErr);
      }

      if (sub) {
        setSubscription(sub);
        if (sub?.payment_reference) {
          setPaymentRefInput(sub.payment_reference);
        }
      } else {
        // Fallback default subscription object if none exists yet
        setSubscription({
          plan: "TWEB Business Monthly (₹99)",
          status: "trial",
          amount: 99.00,
          payment_status: "none",
          trial_starts_at: new Date().toISOString(),
          trial_ends_at: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
        });
      }

      const { data: prof } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      if (prof?.full_name) setUserName(prof.full_name);
    } catch (err: any) {
      console.error("Failed to load subscription data", err);
      setErrorMsg(err.message || "Failed to load subscription information.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubscriptionData();
  }, [supabase]);

  const handleCopyUpi = async () => {
    try {
      await navigator.clipboard.writeText(upiId);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      alert(`UPI ID: ${upiId}`);
    }
  };

  const handleSubmitPaymentRef = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentRefInput.trim() || !subscription?.id) return;

    setSubmitting(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const { data, error } = await supabase.rpc("submit_subscription_payment", {
        p_subscription_id: subscription.id,
        p_payment_reference: paymentRefInput.trim(),
      });

      if (error) throw error;
      if (data && data.success === false) throw new Error(data.error || "Submission failed");

      setSuccessMsg("Payment reference submitted successfully! Verification is in progress by Super Owner.");
      await loadSubscriptionData();
      setTimeout(() => setSuccessMsg(""), 5000);
    } catch (err: any) {
      console.error("Payment ref submission error:", err);
      setErrorMsg(err.message || "Failed to submit payment reference.");
    } finally {
      setSubmitting(false);
    }
  };

  const plan = subscription?.plan || "TWEB Business Monthly (₹99)";
  const status = subscription?.status || "trial";
  const paymentStatus = subscription?.payment_status || "none";
  const amount = subscription?.amount || 99.00;
  const trialEndsAt = subscription?.trial_ends_at ? new Date(subscription.trial_ends_at) : new Date();
  const currentPeriodEnd = subscription?.current_period_end ? new Date(subscription.current_period_end) : new Date();

  const now = new Date();
  const isExpired =
    status === "expired" ||
    (status === "trial" && trialEndsAt < now) ||
    (status === "active" && currentPeriodEnd < now);

  return (
    <SharedDashboardLayout
      businessName={business?.name || "TWEB"}
      userName={userName}
      role={role}
      pageTitle="Subscription"
    >
      {/* PAGE HEADER */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs mb-6">
        <h2 className="text-xl sm:text-2xl font-black text-slate-900">Subscription & Renewal</h2>
        <p className="text-xs text-slate-500 font-medium mt-0.5">Manage your TWEB subscription, verify payments, and check renewal status.</p>
      </div>

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-bold mb-6">
          {errorMsg}
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-2xl text-xs font-bold mb-6">
          {successMsg}
        </div>
      )}

      {loading ? (
        <div className="bg-white p-16 rounded-3xl border border-slate-200 text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
          <p className="text-xs font-bold text-slate-500">Loading subscription details...</p>
        </div>
      ) : (
        <div className="max-w-2xl space-y-6">
          {/* EXPIRY NOTICE BANNER */}
          {isExpired && (
            <div className="p-6 bg-rose-50 border border-rose-200 rounded-3xl space-y-2 shadow-xs">
              <div className="flex items-center gap-2.5 text-rose-700">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <h3 className="text-base font-black">Your subscription has expired.</h3>
              </div>
              <p className="text-xs text-rose-600 font-medium leading-relaxed">
                Please complete your ₹99 renewal payment via UPI below and submit your transaction reference to restore active access.
              </p>
            </div>
          )}

          {/* PENDING VERIFICATION NOTICE BANNER */}
          {paymentStatus === "pending" && (
            <div className="p-6 bg-amber-50 border border-amber-200 rounded-3xl space-y-2 shadow-xs">
              <div className="flex items-center gap-2.5 text-amber-700">
                <Hourglass className="w-5 h-5 shrink-0 animate-pulse" />
                <h3 className="text-base font-black">Payment Verification in Progress</h3>
              </div>
              <p className="text-xs text-amber-800 font-medium leading-relaxed">
                Your payment reference (<strong className="font-mono">{paymentRefInput}</strong>) has been submitted and is currently pending verification by the Super Owner. Please allow up to 24 hours for review.
              </p>
            </div>
          )}

          {/* SUBSCRIPTION DETAILS CARD */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b border-slate-100 gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 font-extrabold text-[10px] uppercase tracking-widest rounded-full border ${
                    status === "active" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                    status === "trial" ? "bg-blue-50 text-blue-700 border-blue-200" :
                    "bg-rose-50 text-rose-700 border-rose-200"
                  }`}>
                    {status}
                  </span>
                  <span className="text-xs font-bold text-slate-400">• {business?.name || "TWEB Business"}</span>
                </div>
                <h2 className="text-2xl font-black text-slate-900 mt-2">
                  {plan}
                </h2>
              </div>
              <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                <CreditCard className="w-6 h-6" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
                <span className="text-slate-400 uppercase text-[10px] font-bold">Monthly Rate</span>
                <p className="text-slate-900 font-black text-sm">₹{amount} / month</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
                <span className="text-slate-400 uppercase text-[10px] font-bold">Payment Verification</span>
                <p className={`font-black uppercase ${
                  paymentStatus === "approved" ? "text-emerald-600" :
                  paymentStatus === "pending" ? "text-amber-600" :
                  paymentStatus === "rejected" ? "text-rose-600" : "text-slate-600"
                }`}>
                  {paymentStatus}
                </p>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
                <span className="text-slate-400 uppercase text-[10px] font-bold">Current Period Start</span>
                <p className="text-slate-900 font-extrabold">{subscription?.current_period_start ? new Date(subscription.current_period_start).toLocaleDateString() : "N/A"}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
                <span className="text-slate-400 uppercase text-[10px] font-bold">Expiry / Renewal Date</span>
                <p className="text-slate-900 font-extrabold">{currentPeriodEnd.toLocaleDateString()}</p>
              </div>
            </div>

            {/* UPI PAYMENT & REFERENCE SUBMISSION */}
            <div className="p-6 rounded-2xl border border-indigo-100 bg-indigo-50/50 space-y-4">
              <div className="space-y-1">
                <h3 className="font-black text-slate-900 text-sm">Pay via UPI (₹99)</h3>
                <p className="text-xs text-slate-500">Scan or copy the official UPI ID below, make payment in your UPI app, and submit your UTR / transaction reference.</p>
              </div>

              <div className="p-4 bg-white rounded-2xl border border-indigo-200 flex items-center justify-between shadow-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Official UPI ID</span>
                  <p className="text-sm font-black text-slate-900 font-mono mt-0.5">{upiId}</p>
                </div>
                <button
                  type="button"
                  onClick={handleCopyUpi}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition flex items-center gap-1.5 cursor-pointer min-h-[40px]"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                  {copied ? "Copied!" : "Copy UPI ID"}
                </button>
              </div>

              <form onSubmit={handleSubmitPaymentRef} className="space-y-3 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Payment Reference / UTR Number</label>
                  <input
                    type="text"
                    required
                    value={paymentRefInput}
                    onChange={(e) => setPaymentRefInput(e.target.value)}
                    placeholder="e.g. UTR 428193849201"
                    className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-semibold outline-none focus:border-indigo-600 h-11 font-mono"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-black rounded-xl text-xs shadow-md shadow-indigo-600/20 transition cursor-pointer flex items-center justify-center gap-2 min-h-[44px]"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Submitting Reference...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" /> {paymentStatus === "pending" ? "Update Payment Reference" : "Submit Payment Reference for Verification"}
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </SharedDashboardLayout>
  );
}
