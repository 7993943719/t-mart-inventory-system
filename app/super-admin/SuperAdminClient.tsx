"use client";

import React, { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  ShieldCheck,
  Building,
  CreditCard,
  CheckCircle2,
  XCircle,
  Clock,
  LogOut,
  RefreshCw,
  Search,
  Sliders,
  Check,
  X,
  Sparkles,
  Zap,
} from "lucide-react";
import { superAdminLogout } from "./actions";

interface Props {
  adminEmail: string;
  initialBusinesses: any[];
  initialSubscriptions: any[];
}

export default function SuperAdminClient({ adminEmail, initialBusinesses, initialSubscriptions }: Props) {
  const [supabase] = useState(() => createClient());
  const [businesses, setBusinesses] = useState<any[]>(initialBusinesses || []);
  const [subscriptions, setSubscriptions] = useState<any[]>(initialSubscriptions || []);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Feature Toggles Modal State
  const [featureModalSub, setFeatureModalSub] = useState<any | null>(null);
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>(["pos", "inventory", "reports", "staff", "delivery"]);

  // Manual Activation Modal State
  const [activateModalSub, setActivateModalSub] = useState<any | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<"basic" | "pro" | "plus">("basic");
  const [adminPaymentNote, setAdminPaymentNote] = useState("");
  const [confirmPaymentReceived, setConfirmPaymentReceived] = useState(false);

  const allAvailableFeatures = [
    { id: "pos", label: "POS & Billing" },
    { id: "inventory", label: "Inventory & Stock" },
    { id: "reports", label: "Sales & Profit Reports" },
    { id: "staff", label: "Staff Management" },
    { id: "delivery", label: "Delivery Fulfillment" },
  ];

  const plansList = [
    { id: "basic", label: "Basic Plan", amount: "₹99/mo", desc: "Essential POS billing & stock management" },
    { id: "pro", label: "Pro Plan", amount: "₹250/mo", desc: "Advanced multi-counter inventory & staff management" },
    { id: "plus", label: "Plus Plan", amount: "₹450/mo", desc: "Full enterprise automation & VIP support" },
  ];

  const handleRefresh = async () => {
    window.location.reload();
  };

  const handleReviewPayment = async (subId: string, action: "approve" | "reject", features?: string[]) => {
    setLoadingId(subId);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const { data, error } = await supabase.rpc("admin_review_subscription_payment", {
        p_subscription_id: subId,
        p_action: action,
        p_enabled_features: features ? JSON.stringify(features) : null,
      });

      if (error) throw error;
      if (data && data.success === false) throw new Error(data.error || "Action failed");

      setSuccessMsg(`Subscription payment successfully ${action}d!`);
      setFeatureModalSub(null);
      setTimeout(() => setSuccessMsg(""), 4000);

      // Refresh data
      const [bizRes, subRes] = await Promise.all([
        supabase.from("businesses").select("*").order("created_at", { ascending: false }),
        supabase.from("subscriptions").select("*"),
      ]);
      setBusinesses(bizRes.data || []);
      setSubscriptions(subRes.data || []);
    } catch (err: any) {
      console.error("Admin review error:", err);
      setErrorMsg(err.message || "Failed to process review action.");
    } finally {
      setLoadingId(null);
    }
  };

  const handleManualActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activateModalSub?.id || !confirmPaymentReceived) return;

    setLoadingId(activateModalSub.id);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const { data, error } = await supabase.rpc("admin_manual_activate_subscription", {
        p_subscription_id: activateModalSub.id,
        p_plan: selectedPlanId,
        p_payment_note: adminPaymentNote.trim() || null,
      });

      if (error) throw error;
      if (data && data.success === false) throw new Error(data.error || "Activation failed");

      setSuccessMsg(`Plan successfully activated! Expiry extended to: ${new Date(data.current_period_end).toLocaleDateString()}`);
      setActivateModalSub(null);
      setAdminPaymentNote("");
      setConfirmPaymentReceived(false);
      setTimeout(() => setSuccessMsg(""), 5000);

      // Refresh data
      const [bizRes, subRes] = await Promise.all([
        supabase.from("businesses").select("*").order("created_at", { ascending: false }),
        supabase.from("subscriptions").select("*"),
      ]);
      setBusinesses(bizRes.data || []);
      setSubscriptions(subRes.data || []);
    } catch (err: any) {
      console.error("Manual activation error:", err);
      setErrorMsg(err.message || "Failed to activate subscription.");
    } finally {
      setLoadingId(null);
    }
  };

  // Map subscriptions by business_id
  const subMap = new Map(subscriptions.map((s) => [s.business_id, s]));

  const filteredBusinesses = businesses.filter((b) => {
    const sub = subMap.get(b.id);
    const status = sub?.payment_status || "none";
    const matchesStatus = statusFilter === "ALL" || status.toUpperCase() === statusFilter.toUpperCase();
    const matchesSearch = b.name.toLowerCase().includes(searchQuery.toLowerCase()) || (b.city || "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased">
      {/* TOP HEADER */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex justify-between items-center sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl text-white shadow-lg">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-wider text-white">TWEB Super Owner Panel</h1>
            <p className="text-[11px] text-indigo-400 font-bold uppercase tracking-widest">Global Platform Administration</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:block text-right">
            <p className="text-xs font-bold text-slate-300">{adminEmail}</p>
            <p className="text-[10px] text-emerald-400 font-black uppercase">Super Owner</p>
          </div>

          <button
            onClick={handleRefresh}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>

          <form action={superAdminLogout}>
            <button
              type="submit"
              className="px-3.5 py-2 bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" /> Logout
            </button>
          </form>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="max-w-7xl mx-auto p-4 sm:p-8 space-y-6">
        {successMsg && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-2xl text-xs font-bold">
            {successMsg}
          </div>
        )}

        {errorMsg && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-2xl text-xs font-bold">
            {errorMsg}
          </div>
        )}

        {/* METRICS OVERVIEW */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Businesses</span>
            <h3 className="text-2xl font-black text-white">{businesses.length}</h3>
          </div>
          <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800 space-y-1">
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">Pending Verifications</span>
            <h3 className="text-2xl font-black text-amber-400">
              {subscriptions.filter((s) => s.payment_status === "pending").length}
            </h3>
          </div>
          <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800 space-y-1">
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Active Subscriptions</span>
            <h3 className="text-2xl font-black text-emerald-400">
              {subscriptions.filter((s) => s.status === "active").length}
            </h3>
          </div>
          <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800 space-y-1">
            <span className="text-[10px] font-bold text-purple-400 uppercase tracking-widest">Monthly Active Revenue</span>
            <h3 className="text-2xl font-black text-purple-400">
              ₹{subscriptions.filter((s) => s.status === "active").reduce((sum, s) => sum + Number(s.amount || 99), 0).toLocaleString("en-IN")}
            </h3>
          </div>
        </div>

        {/* SEARCH & FILTERS */}
        <div className="bg-slate-900 p-4 rounded-3xl border border-slate-800 flex flex-col sm:flex-row gap-3 justify-between items-center">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search businesses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-slate-200 outline-none focus:border-indigo-500 h-11"
            />
          </div>

          <div className="flex gap-1.5 overflow-x-auto w-full sm:w-auto">
            {["ALL", "PENDING", "APPROVED", "REJECTED", "NONE"].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-2 rounded-xl font-black text-[11px] uppercase transition cursor-pointer ${
                  statusFilter === st ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* BUSINESSES & SUBSCRIPTIONS TABLE */}
        <div className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden shadow-xl">
          <div className="p-5 border-b border-slate-800 flex justify-between items-center">
            <h3 className="text-sm font-black text-white uppercase tracking-wider">Client Businesses & Subscriptions</h3>
            <span className="text-xs text-slate-400 font-bold">{filteredBusinesses.length} records</span>
          </div>

          {filteredBusinesses.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400">No client businesses found matching filter.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/60 text-[11px] text-slate-400 uppercase border-b border-slate-800">
                  <tr>
                    <th className="p-4">Business Name</th>
                    <th className="p-4">Owner Mobile</th>
                    <th className="p-4">Plan & Amount</th>
                    <th className="p-4">Payment Status</th>
                    <th className="p-4">Payment Reference (UTR)</th>
                    <th className="p-4">Expiry Date</th>
                    <th className="p-4 text-center">Actions / Approvals</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {filteredBusinesses.map((biz) => {
                    const sub = subMap.get(biz.id);
                    const payStatus = sub?.payment_status || "none";
                    const isPending = payStatus === "pending";
                    const isApproved = payStatus === "approved";
                    const isRejected = payStatus === "rejected";

                    return (
                      <tr key={biz.id} className="hover:bg-slate-800/50">
                        <td className="p-4 font-black text-white">
                          {biz.name}
                          <span className="block text-[10px] text-slate-400 font-normal">{biz.city || biz.business_type || "Store"}</span>
                        </td>
                        <td className="p-4 font-mono font-bold text-amber-400">
                          {biz.phone ? biz.phone : <span className="text-slate-500 italic">Not provided</span>}
                        </td>
                        <td className="p-4">
                          <span className="font-extrabold text-indigo-400">₹{sub?.amount || 99}/mo</span>
                          <span className="block text-[10px] text-slate-400 capitalize">{sub?.plan || "basic"} ({sub?.status || "trial"})</span>
                        </td>
                        <td className="p-4">
                          <span className={`px-2.5 py-1 font-black text-[10px] uppercase rounded-full border ${
                            isApproved ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" :
                            isPending ? "bg-amber-500/10 text-amber-400 border-amber-500/30" :
                            isRejected ? "bg-rose-500/10 text-rose-400 border-rose-500/30" :
                            "bg-slate-800 text-slate-400 border-slate-700"
                          }`}>
                            {payStatus}
                          </span>
                        </td>
                        <td className="p-4 font-mono text-slate-300 font-bold">
                          {sub?.payment_reference ? (
                            <span className="px-2 py-1 bg-slate-800 rounded-lg border border-slate-700">{sub.payment_reference}</span>
                          ) : (
                            <span className="text-slate-500 italic">No reference submitted</span>
                          )}
                        </td>
                        <td className="p-4 text-slate-300 font-bold">
                          {sub?.current_period_end ? new Date(sub.current_period_end).toLocaleDateString() : "N/A"}
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {sub ? (
                              <>
                                <button
                                  type="button"
                                  disabled={loadingId === sub.id}
                                  onClick={() => setActivateModalSub({ ...sub, business_name: biz.name })}
                                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-xl text-[11px] transition cursor-pointer flex items-center gap-1 shadow-sm"
                                  title="Activate / Renew Subscription"
                                >
                                  <Zap className="w-3.5 h-3.5" /> Activate / Renew
                                </button>

                                <button
                                  type="button"
                                  disabled={true}
                                  className="px-3 py-1.5 bg-slate-800/50 text-slate-500 font-bold rounded-xl text-[11px] cursor-not-allowed flex items-center gap-1 opacity-60"
                                  title="Feature permissions setup pending database verification"
                                >
                                  <Sliders className="w-3.5 h-3.5" /> Features (Pending)
                                </button>
                              </>
                            ) : (
                              <span className="text-slate-500 text-[11px]">No subscription record</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* MANUAL SUBSCRIPTION ACTIVATION MODAL */}
      {activateModalSub && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-800 space-y-5 text-xs text-slate-100">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-black text-white">Manual Subscription Activation</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">{activateModalSub.business_name}</p>
              </div>
              <button onClick={() => setActivateModalSub(null)} className="text-slate-400 hover:text-white cursor-pointer p-1"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleManualActivate} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase mb-2">Select Canonical Plan *</label>
                <div className="space-y-2">
                  {plansList.map((p) => {
                    const isSelected = selectedPlanId === p.id;
                    return (
                      <div
                        key={p.id}
                        onClick={() => setSelectedPlanId(p.id as any)}
                        className={`p-3.5 rounded-2xl border cursor-pointer flex items-center justify-between transition ${
                          isSelected ? "bg-indigo-600/20 border-indigo-500 text-white font-bold" : "bg-slate-800/50 border-slate-700 text-slate-400"
                        }`}
                      >
                        <div>
                          <p className="text-xs font-black text-white">{p.label} <span className="text-indigo-400 font-bold ml-1">({p.amount})</span></p>
                          <p className="text-[10px] text-slate-400">{p.desc}</p>
                        </div>
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${isSelected ? "bg-indigo-600 border-indigo-500" : "border-slate-600"}`}>
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Offline Payment Note / Reference</label>
                <input
                  type="text"
                  value={adminPaymentNote}
                  onChange={(e) => setAdminPaymentNote(e.target.value)}
                  placeholder="e.g. Received Cash ₹250 / Bank Transfer Ref #12345"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs font-semibold text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl space-y-2 text-amber-300 text-[11px]">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    required
                    checked={confirmPaymentReceived}
                    onChange={(e) => setConfirmPaymentReceived(e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-indigo-600 cursor-pointer"
                  />
                  <span>I confirm that offline payment was collected and verified outside TWEB for this client.</span>
                </label>
              </div>

              <div className="flex gap-3 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setActivateModalSub(null)}
                  className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loadingId === activateModalSub.id || !confirmPaymentReceived}
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-black rounded-xl shadow-lg cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {loadingId === activateModalSub.id ? "Activating..." : "Confirm & Activate"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FEATURE PERMISSIONS MODAL */}
      {featureModalSub && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-800 space-y-5 text-xs text-slate-100">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base font-black text-white">Configure Feature Permissions</h3>
              <button onClick={() => setFeatureModalSub(null)} className="text-slate-400 hover:text-white cursor-pointer p-1"><X className="w-5 h-5" /></button>
            </div>

            <p className="text-xs text-slate-400">
              Select which modules are enabled for this business workspace.
            </p>

            <div className="space-y-2.5">
              {allAvailableFeatures.map((feat) => {
                const isChecked = selectedFeatures.includes(feat.id);
                return (
                  <div
                    key={feat.id}
                    onClick={() => {
                      if (isChecked) {
                        setSelectedFeatures(selectedFeatures.filter((f) => f !== feat.id));
                      } else {
                        setSelectedFeatures([...selectedFeatures, feat.id]);
                      }
                    }}
                    className={`p-3.5 rounded-2xl border cursor-pointer flex items-center justify-between transition ${
                      isChecked ? "bg-indigo-600/20 border-indigo-500/50 text-white font-bold" : "bg-slate-800/50 border-slate-700 text-slate-400"
                    }`}
                  >
                    <span>{feat.label}</span>
                    <div className={`w-5 h-5 rounded-lg flex items-center justify-center border ${isChecked ? "bg-indigo-600 border-indigo-500 text-white" : "border-slate-600"}`}>
                      {isChecked && <Check className="w-3.5 h-3.5" />}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setFeatureModalSub(null)}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={loadingId === featureModalSub.id}
                onClick={() => handleReviewPayment(featureModalSub.id, "approve", selectedFeatures)}
                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-xl shadow-lg cursor-pointer flex items-center justify-center gap-1.5"
              >
                {loadingId === featureModalSub.id ? "Saving..." : "Save & Approve"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
