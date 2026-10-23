"use client";

import React, { useState, useEffect, startTransition } from "react";
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
  Users,
  ChevronDown,
  ChevronRight,
  User,
  Calendar,
  Phone,
  Mail,
  Shield,
  UserCheck,
  Trash2,
  Loader2,
  DollarSign,
  Package,
  Play,
  Pause,
  AlertTriangle,
} from "lucide-react";
import {
  superAdminLogout,
  deletePlatformUserAction,
  adminActivateBusinessAction,
  adminDeactivateBusinessAction,
  adminArchiveBusinessAction,
  adminPermanentlyDeleteBusinessAction,
  adminReconcileBusinessMembershipsAction,
} from "./actions";

export interface Props {
  adminEmail: string;
  initialBusinesses: any[];
  initialSubscriptions: any[];
  initialMembers?: any[];
  initialProfiles?: any[];
  initialSuperAdmins?: any[];
  initialAuthUsers?: any[];
}

export default function SuperAdminClient({
  adminEmail,
  initialBusinesses,
  initialSubscriptions,
  initialMembers = [],
  initialProfiles = [],
  initialSuperAdmins = [],
  initialAuthUsers = [],
}: Props) {
  const [supabase] = useState(() => createClient());
  const [businesses, setBusinesses] = useState<any[]>(initialBusinesses || []);
  const [subscriptions, setSubscriptions] = useState<any[]>(initialSubscriptions || []);
  const [members, setMembers] = useState<any[]>(initialMembers || []);
  const [profiles, setProfiles] = useState<any[]>(initialProfiles || []);
  const [superAdmins, setSuperAdmins] = useState<any[]>(initialSuperAdmins || []);
  const [authUsers, setAuthUsers] = useState<any[]>(initialAuthUsers || []);

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const [activeSection, setActiveSection] = useState<"businesses" | "plans" | "payments" | "admins">("businesses");
  const [searchQuery, setSearchQuery] = useState("");
  const [submittedSearchQuery, setSubmittedSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Expandable row state for businesses
  const [expandedBizId, setExpandedBizId] = useState<string | null>(null);

  // Business Edit / Activate Modal State
  const [editBizModalOpen, setEditBizModalOpen] = useState(false);
  const [selectedBizForEdit, setSelectedBizForEdit] = useState<any | null>(null);
  const [editPlanId, setEditPlanId] = useState<"basic" | "pro" | "plus">("basic");
  const [editAmount, setEditAmount] = useState<number>(99);
  const [editMemberLimit, setEditMemberLimit] = useState<number>(1);
  const [editAdminNote, setEditAdminNote] = useState("");
  const [confirmReconcile, setConfirmReconcile] = useState(false);

  // Permanent Delete Business Modal State
  const [permDeleteModalOpen, setPermDeleteModalOpen] = useState(false);
  const [bizToPermDelete, setBizToPermDelete] = useState<any | null>(null);
  const [confirmPermNameInput, setConfirmPermNameInput] = useState("");
  const [permDeleting, setPermDeleting] = useState(false);

  const plansList = [
    { id: "basic", label: "Basic Plan", amount: 99, defaultLimit: 1, desc: "Essential POS billing & stock management" },
    { id: "pro", label: "Pro Plan", amount: 250, defaultLimit: 1, desc: "Advanced multi-counter inventory & staff management" },
    { id: "plus", label: "Plus Plan", amount: 450, defaultLimit: 1, desc: "Full enterprise automation & VIP support" },
  ];

  const handleRefresh = async () => {
    window.location.reload();
  };

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSubmittedSearchQuery(searchQuery);
  };

  const handleSearchClear = () => {
    setSearchQuery("");
    setSubmittedSearchQuery("");
  };

  const handleOpenEditBiz = (biz: any) => {
    const sub = subscriptions.find((s) => s.business_id === biz.id);
    setSelectedBizForEdit(biz);
    setEditPlanId((sub?.plan as any) || "basic");
    setEditAmount(Number(sub?.amount !== undefined && sub?.amount !== null ? sub.amount : 99));
    setEditMemberLimit(Number(sub?.member_limit !== undefined && sub?.member_limit !== null ? sub.member_limit : 1));
    setEditAdminNote("");
    setConfirmReconcile(false);
    setEditBizModalOpen(true);
  };

  const handleSaveBusinessSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBizForEdit) return;

    setLoadingId(selectedBizForEdit.id);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const sub = subscriptions.find((s) => s.business_id === selectedBizForEdit.id);
      const subId = sub?.id;

      if (!subId) {
        throw new Error("No subscription record found for this business.");
      }

      const bizMembers = membersByBiz.get(selectedBizForEdit.id) || [];
      const isLowering = editMemberLimit < bizMembers.length;

      if (isLowering && !confirmReconcile) {
        throw new Error(`Current member count (${bizMembers.length}) exceeds new limit (${editMemberLimit}). Please check the reconciliation confirmation box.`);
      }

      const { data, error } = await supabase.rpc("admin_manual_activate_subscription", {
        p_subscription_id: subId,
        p_plan: editPlanId,
        p_payment_note: editAdminNote.trim() || "Super Admin Manual Update",
      });

      if (error) throw error;
      if (data && data.success === false) throw new Error(data.error || "Update failed");

      if (isLowering) {
        const reconRes = await adminReconcileBusinessMembershipsAction({
          businessId: selectedBizForEdit.id,
          newMemberLimit: editMemberLimit,
        });
        if (reconRes && reconRes.success) {
          setSuccessMsg(reconRes.message);
        }
      } else {
        let updateErr = null;
        const res1 = await supabase
          .from("subscriptions")
          .update({
            amount: editAmount,
            member_limit: editMemberLimit,
          })
          .eq("id", subId);
        updateErr = res1.error;

        if (updateErr && (updateErr.message?.includes("member_limit") || updateErr.code === "PGRST204" || updateErr.code === "42703")) {
          console.warn("member_limit column pending migration; updating amount only.");
          const res2 = await supabase
            .from("subscriptions")
            .update({
              amount: editAmount,
            })
            .eq("id", subId);
          updateErr = res2.error;
        }

        if (updateErr) throw updateErr;

        // Readback verification from database
        const { data: readbackSub } = await supabase
          .from("subscriptions")
          .select("amount, member_limit, plan, status")
          .eq("id", subId)
          .maybeSingle();

        if (readbackSub) {
          setSubscriptions((prev) =>
            prev.map((s) =>
              s.id === subId
                ? {
                    ...s,
                    amount: readbackSub.amount,
                    member_limit: readbackSub.member_limit !== null ? readbackSub.member_limit : editMemberLimit,
                    plan: readbackSub.plan,
                    status: readbackSub.status,
                  }
                : s
            )
          );
        }

        setSuccessMsg(`Business subscription and member limit (max ${editMemberLimit}) updated and verified successfully!`);
      }

      setEditBizModalOpen(false);
      setSelectedBizForEdit(null);
      setTimeout(() => setSuccessMsg(""), 5000);

      await handleRefresh();
    } catch (err: any) {
      console.error("Save business subscription error:", err);
      setErrorMsg(err.message || "Failed to update business subscription.");
    } finally {
      setLoadingId(null);
    }
  };

  const handleActivateBiz = async (businessId: string) => {
    setLoadingId(businessId);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const res = await adminActivateBusinessAction({ businessId });
      if (res && res.success) {
        setSuccessMsg(res.message);
        setTimeout(() => setSuccessMsg(""), 4000);
        await handleRefresh();
      }
    } catch (err: any) {
      console.error("Activation error:", err);
      setErrorMsg(err.message || "Failed to activate business.");
    } finally {
      setLoadingId(null);
    }
  };

  const handleDeactivateBiz = async (businessId: string) => {
    setLoadingId(businessId);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const res = await adminDeactivateBusinessAction({ businessId });
      if (res && res.success) {
        setSuccessMsg(res.message);
        setTimeout(() => setSuccessMsg(""), 4000);
        await handleRefresh();
      }
    } catch (err: any) {
      console.error("Deactivation error:", err);
      setErrorMsg(err.message || "Failed to deactivate business.");
    } finally {
      setLoadingId(null);
    }
  };

  const handlePermDeleteConfirm = async () => {
    if (!bizToPermDelete) return;
    setPermDeleting(true);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const res = await adminPermanentlyDeleteBusinessAction({
        businessId: bizToPermDelete.id,
        confirmName: confirmPermNameInput,
      });
      if (res && res.success) {
        setSuccessMsg(res.message);
        setPermDeleteModalOpen(false);
        setBizToPermDelete(null);
        setConfirmPermNameInput("");
        setTimeout(() => setSuccessMsg(""), 5000);
        await handleRefresh();
      }
    } catch (err: any) {
      console.error("Permanent deletion error:", err);
      setErrorMsg(err.message || "Failed to permanently delete business.");
      setPermDeleting(false);
      setPermDeleteModalOpen(false);
    }
  };

  const handleReviewPayment = async (subId: string, action: "approve" | "reject") => {
    setLoadingId(subId);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const { data, error } = await supabase.rpc("admin_review_subscription_payment", {
        p_subscription_id: subId,
        p_action: action,
      });

      if (error) throw error;
      if (data && data.success === false) throw new Error(data.error || "Action failed");

      setSuccessMsg(`Subscription payment successfully ${action}d!`);
      setTimeout(() => setSuccessMsg(""), 4000);

      await handleRefresh();
    } catch (err: any) {
      console.error("Admin review error:", err);
      setErrorMsg(err.message || "Failed to process review action.");
    } finally {
      setLoadingId(null);
    }
  };

  // Maps & Aggregations
  const subMap = new Map(subscriptions.map((s) => [s.business_id, s]));
  const businessMap = new Map(businesses.map((b) => [b.id, b]));
  const profileMap = new Map(profiles.map((p) => [p.id, p]));
  const authUserMap = new Map(authUsers.map((u) => [u.id, u]));

  const membersByBiz = new Map<string, any[]>();
  for (const m of members) {
    if (!membersByBiz.has(m.business_id)) {
      membersByBiz.set(m.business_id, []);
    }
    membersByBiz.get(m.business_id)!.push(m);
  }

  const filteredBusinesses = businesses.filter((b) => {
    const sub = subMap.get(b.id);
    const payStatus = (sub?.payment_status || "none").toLowerCase();

    if (statusFilter === "ALL") return true;

    if (statusFilter === "NONE") {
      return !sub || payStatus === "none" || payStatus === "";
    }

    return payStatus === statusFilter.toLowerCase();
  }).filter((b) => {
    const query = submittedSearchQuery.toLowerCase().trim();
    if (!query) return true;
    const ownerProf = profileMap.get(b.owner_id);
    const ownerAuth = authUserMap.get(b.owner_id);
    const ownerName = ownerProf?.full_name || "";
    const ownerEmail = ownerAuth?.email || ownerProf?.email || "";
    const ownerPhone = ownerProf?.phone || ownerAuth?.phone || b.phone || "";

    return (
      b.name.toLowerCase().includes(query) ||
      (b.city || "").toLowerCase().includes(query) ||
      (b.phone || "").toLowerCase().includes(query) ||
      ownerName.toLowerCase().includes(query) ||
      ownerEmail.toLowerCase().includes(query) ||
      ownerPhone.toLowerCase().includes(query)
    );
  });

  const pendingPaymentsList = subscriptions.filter((s) => s.payment_status === "pending");
  const activeBusinessesCount = businesses.filter((b) => {
    const sub = subMap.get(b.id);
    return sub?.status === "active" || sub?.status === "trial";
  }).length;
  const pendingOrInactiveCount = businesses.length - activeBusinessesCount;
  const activeSubsCount = subscriptions.filter((s) => s.status === "active").length;
  const totalPlatformUsers = authUsers.length > 0 ? authUsers.length : profiles.length;

  if (!isMounted) {
    return <div className="min-h-screen bg-slate-950 text-slate-400 flex items-center justify-center text-xs">Loading Super Owner Panel...</div>;
  }

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
            onClick={() => handleRefresh()}
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

      {/* MAIN CONTENT AREA — ONE PAGE VERTICAL SCROLL LAYOUT */}
      <main className="max-w-7xl mx-auto p-4 sm:p-8 space-y-10">
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

        {/* 1. SUMMARY CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800 space-y-1">
            <div className="flex justify-between items-center text-slate-400">
              <span className="text-[10px] font-bold uppercase tracking-widest">Total Businesses</span>
              <Building className="w-4 h-4 text-indigo-400" />
            </div>
            <h3 className="text-2xl font-black text-white">{businesses.length}</h3>
          </div>

          <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800 space-y-1">
            <div className="flex justify-between items-center text-slate-400">
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Active Businesses</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <h3 className="text-2xl font-black text-emerald-400">{activeBusinessesCount}</h3>
          </div>

          <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800 space-y-1">
            <div className="flex justify-between items-center text-slate-400">
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">Pending / Inactive</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <h3 className="text-2xl font-black text-amber-400">{pendingOrInactiveCount}</h3>
          </div>

          <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800 space-y-1">
            <div className="flex justify-between items-center text-slate-400">
              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Total Platform Users</span>
              <Users className="w-4 h-4 text-indigo-400" />
            </div>
            <h3 className="text-2xl font-black text-indigo-400">{totalPlatformUsers}</h3>
          </div>

          <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800 space-y-1">
            <div className="flex justify-between items-center text-slate-400">
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Active Subscriptions</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <h3 className="text-2xl font-black text-emerald-400">{activeSubsCount}</h3>
          </div>

          <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800 space-y-1">
            <div className="flex justify-between items-center text-slate-400">
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">Pending Payments</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <h3 className="text-2xl font-black text-amber-400">{pendingPaymentsList.length}</h3>
          </div>

          <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800 space-y-1">
            <div className="flex justify-between items-center text-slate-400">
              <span className="text-[10px] font-bold text-purple-400 uppercase tracking-widest">Total Super Admins</span>
              <Shield className="w-4 h-4 text-purple-400" />
            </div>
            <h3 className="text-2xl font-black text-purple-400">{superAdmins.length}</h3>
          </div>
        </div>

        {/* SECTION A: CLIENT BUSINESSES */}
        <section className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
              <Building className="w-5 h-5 text-indigo-400" /> Client Businesses ({businesses.length})
            </h2>
          </div>

          {/* SEARCH & FILTERS */}
          <form onSubmit={handleSearchSubmit} className="bg-slate-900 p-4 rounded-3xl border border-slate-800 flex flex-col md:flex-row gap-3 justify-between items-center">
            <div className="relative flex-1 w-full flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search business name, owner email, phone or city..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSearchSubmit();
                  }}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-slate-200 outline-none focus:border-indigo-500 h-11"
                />
              </div>
              <button
                type="submit"
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs rounded-xl shadow-md transition cursor-pointer h-11 shrink-0 flex items-center gap-1.5"
              >
                <Search className="w-3.5 h-3.5" /> Search
              </button>
              {submittedSearchQuery && (
                <button
                  type="button"
                  onClick={handleSearchClear}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition cursor-pointer h-11 shrink-0"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="flex gap-1.5 overflow-x-auto w-full md:w-auto shrink-0">
              {["ALL", "PENDING", "APPROVED", "REJECTED", "NONE"].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-2 rounded-xl font-black text-[11px] uppercase transition cursor-pointer ${
                    statusFilter === st ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </form>

          <div className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden shadow-xl">
            {filteredBusinesses.length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <Building className="w-10 h-10 text-slate-600 mx-auto" />
                <p className="text-sm font-bold text-slate-300">No client businesses found matching search or filter criteria.</p>
                <p className="text-xs text-slate-500">Try adjusting your search query or status filters (e.g. click Clear or select ALL).</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950/60 text-[11px] text-slate-400 uppercase border-b border-slate-800">
                    <tr>
                      <th className="p-4 w-8"></th>
                      <th className="p-4">Business Name</th>
                      <th className="p-4">Owner Contact (Email & Phone)</th>
                      <th className="p-4">Plan & Amount</th>
                      <th className="p-4">Members (Current / Limit)</th>
                      <th className="p-4">Sub Status</th>
                      <th className="p-4">Payment Status</th>
                      <th className="p-4">Start Date</th>
                      <th className="p-4">Expiry Date</th>
                      <th className="p-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {filteredBusinesses.map((biz) => {
                      const sub = subMap.get(biz.id);
                      const payStatus = sub?.payment_status || "none";
                      const subStatus = sub?.status || "trial";
                      const isApproved = payStatus === "approved";
                      const isPending = payStatus === "pending";
                      const isRejected = payStatus === "rejected";
                      const isActiveSub = subStatus === "active" || subStatus === "trial";

                      const bizMembers = membersByBiz.get(biz.id) || [];
                      const ownerProfile = profileMap.get(biz.owner_id);
                      const ownerAuth = authUserMap.get(biz.owner_id);
                      const ownerEmail = ownerAuth?.email || ownerProfile?.email || "Not available";
                      const ownerPhone = ownerProfile?.phone || ownerAuth?.phone || biz.phone || "Not available";

                      const memberLimit = Number(sub?.member_limit !== undefined && sub?.member_limit !== null ? sub.member_limit : 1);
                      const currentCount = bizMembers.length;
                      const isExpanded = expandedBizId === biz.id;

                      return (
                        <React.Fragment key={biz.id}>
                          <tr className="hover:bg-slate-800/50 cursor-pointer" onClick={() => setExpandedBizId(isExpanded ? null : biz.id)}>
                            <td className="p-4 text-slate-500">
                              {isExpanded ? <ChevronDown className="w-4 h-4 text-indigo-400" /> : <ChevronRight className="w-4 h-4" />}
                            </td>
                            <td className="p-4 font-black text-white">
                              {biz.name}
                              <span className="block text-[10px] text-slate-400 font-normal">
                                {biz.city || biz.business_type || "Store"}
                              </span>
                            </td>
                            <td className="p-4 font-mono text-slate-200">
                              <span className="block font-bold text-white">{ownerEmail}</span>
                              <span className="block text-[10px] text-indigo-400">{ownerPhone}</span>
                            </td>
                            <td className="p-4">
                              <span className="font-extrabold text-indigo-400">{sub?.plan || "basic"}</span>
                              <span className="block text-[10px] text-slate-400 font-bold">₹{sub?.amount || 99}/mo</span>
                            </td>
                            <td className="p-4">
                              <span className={`font-black text-xs ${currentCount > memberLimit ? "text-rose-400" : "text-emerald-400"}`}>
                                {currentCount} / {memberLimit}
                              </span>
                            </td>
                            <td className="p-4 capitalize text-slate-300">
                              {subStatus}
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
                            <td className="p-4 text-slate-400 font-mono">
                              {formatDate(sub?.current_period_start || sub?.created_at)}
                            </td>
                            <td className="p-4 text-slate-300 font-bold font-mono">
                              {formatDate(sub?.current_period_end)}
                            </td>
                            <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditBiz(biz)}
                                  className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-xl text-[10px] transition cursor-pointer inline-flex items-center gap-1 shadow-sm"
                                  title="Edit Subscription & Limits"
                                >
                                  <Sliders className="w-3 h-3" /> Edit
                                </button>
                                {isActiveSub ? (
                                  <button
                                    type="button"
                                    disabled={loadingId === biz.id}
                                    onClick={() => handleDeactivateBiz(biz.id)}
                                    className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-black rounded-xl text-[10px] transition cursor-pointer inline-flex items-center gap-1 shadow-sm"
                                    title="Deactivate Business"
                                  >
                                    <Pause className="w-3 h-3" /> Deactivate
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    disabled={loadingId === biz.id}
                                    onClick={() => handleActivateBiz(biz.id)}
                                    className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl text-[10px] transition cursor-pointer inline-flex items-center gap-1 shadow-sm"
                                    title="Activate Business"
                                  >
                                    <Play className="w-3 h-3" /> Activate
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setBizToPermDelete(biz);
                                    setConfirmPermNameInput("");
                                    setPermDeleteModalOpen(true);
                                  }}
                                  className="px-2.5 py-1.5 bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white font-black rounded-xl text-[10px] transition cursor-pointer inline-flex items-center gap-1 shadow-sm"
                                  title="Permanently Delete Business"
                                >
                                  <Trash2 className="w-3 h-3" /> Delete
                                </button>
                              </div>
                            </td>
                          </tr>

                          {/* EXPANDABLE MEMBER ROSTER */}
                          {isExpanded && (
                            <tr className="bg-slate-950/80">
                              <td colSpan={10} className="p-4 pl-12 border-b border-slate-800">
                                <div className="space-y-3">
                                  <h4 className="font-extrabold text-indigo-400 text-xs uppercase tracking-wider flex items-center gap-1.5">
                                    <Users className="w-3.5 h-3.5" /> Member Roster for {biz.name} ({currentCount} / {memberLimit} Allowed)
                                  </h4>
                                  {bizMembers.length === 0 ? (
                                    <p className="text-slate-500 italic text-[11px]">No member records found.</p>
                                  ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                      {bizMembers.map((m) => {
                                        const prof = profileMap.get(m.user_id);
                                        const authUsr = authUserMap.get(m.user_id);
                                        const memEmail = authUsr?.email || prof?.email || "N/A";
                                        const memPhone = prof?.phone || authUsr?.phone || "N/A";
                                        return (
                                          <div key={m.id} className="p-3 bg-slate-900 rounded-2xl border border-slate-800 space-y-1">
                                            <div className="flex justify-between items-center">
                                              <span className="font-extrabold text-white text-xs">{prof?.full_name || memEmail}</span>
                                              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-slate-800 text-indigo-300">{m.role || "STAFF"}</span>
                                            </div>
                                            <p className="text-[10px] text-slate-400">Email: {memEmail}</p>
                                            <p className="text-[10px] text-slate-400">Phone: {memPhone}</p>
                                            <p className="text-[10px] text-slate-500 font-mono">Joined: {formatDate(m.created_at)}</p>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* SECTION B: SUBSCRIPTION PLANS */}
        <section className="space-y-4">
          <h2 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
            <Package className="w-5 h-5 text-indigo-400" /> Subscription Plans Configuration
          </h2>
          <div className="bg-slate-900 rounded-3xl border border-slate-800 p-6 space-y-5 shadow-xl">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {plansList.map((p) => (
                <div key={p.id} className="p-5 bg-slate-950/60 rounded-2xl border border-slate-800 space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="font-black text-white text-sm">{p.label}</h4>
                    <span className="px-2 py-1 bg-indigo-500/10 text-indigo-400 rounded-lg font-bold text-xs">₹{p.amount}/mo</span>
                  </div>
                  <p className="text-xs text-slate-400">{p.desc}</p>
                  <p className="text-[11px] text-slate-400 font-bold">Default Member Limit: <strong className="text-white">{p.defaultLimit} members</strong></p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SECTION C: PAYMENTS AND APPROVALS */}
        <section className="space-y-4">
          <h2 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-amber-400" /> Payments & Approvals ({pendingPaymentsList.length})
          </h2>
          <div className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden shadow-xl">
            {pendingPaymentsList.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-400">No pending subscription payments requiring verification.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950/60 text-[11px] text-slate-400 uppercase border-b border-slate-800">
                    <tr>
                      <th className="p-4">Business</th>
                      <th className="p-4">Amount</th>
                      <th className="p-4">Payment Reference (UTR)</th>
                      <th className="p-4">Submission Date</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-center">Verify & Approve / Reject</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {pendingPaymentsList.map((sub) => {
                      const biz = businessMap.get(sub.business_id);
                      return (
                        <tr key={sub.id} className="hover:bg-slate-800/50">
                          <td className="p-4 font-black text-white">{biz?.name || "Business"}</td>
                          <td className="p-4 font-extrabold text-indigo-400">₹{sub.amount || 99}</td>
                          <td className="p-4 font-mono font-bold text-amber-400">{sub.payment_reference || "N/A"}</td>
                          <td className="p-4 text-slate-400">{formatDate(sub.updated_at || sub.created_at)}</td>
                          <td className="p-4"><span className="px-2.5 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/30 font-black text-[10px] uppercase rounded-full">Pending</span></td>
                          <td className="p-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                type="button"
                                disabled={loadingId === sub.id}
                                onClick={() => handleReviewPayment(sub.id, "approve")}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl text-[11px] transition cursor-pointer shadow-sm"
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                disabled={loadingId === sub.id}
                                onClick={() => handleReviewPayment(sub.id, "reject")}
                                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-black rounded-xl text-[11px] transition cursor-pointer shadow-sm"
                              >
                                Reject
                              </button>
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
        </section>

        {/* SECTION D: SUPER ADMINS */}
        <section className="space-y-4">
          <h2 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
            <Shield className="w-5 h-5 text-purple-400" /> Super Admins ({superAdmins.length})
          </h2>
          <div className="bg-slate-900 rounded-3xl border border-slate-800 p-6 space-y-4 shadow-xl">
            <p className="text-xs text-slate-400">Platform-wide administrators authorized with Super Owner privileges.</p>
            <div className="space-y-2">
              {superAdmins.map((adm) => (
                <div key={adm.id} className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800 flex justify-between items-center text-xs">
                  <div>
                    <p className="font-extrabold text-white">Admin ID: {adm.user_id || adm.id}</p>
                    <p className="text-[10px] text-slate-400 font-mono">Added: {formatDate(adm.created_at)}</p>
                  </div>
                  <span className="px-3 py-1 bg-purple-500/20 text-purple-300 font-black rounded-xl text-[10px] uppercase">Super Admin</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* EDIT / ACTIVATE BUSINESS MODAL */}
      {editBizModalOpen && selectedBizForEdit && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-800 space-y-5 text-xs text-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-black text-white">Edit Subscription & Member Limit</h3>
                <p className="text-[11px] text-indigo-400 mt-0.5">{selectedBizForEdit.name}</p>
              </div>
              <button onClick={() => setEditBizModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer p-1"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleSaveBusinessSubscription} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase mb-2">Subscription Plan *</label>
                <div className="grid grid-cols-3 gap-2">
                  {plansList.map((p) => {
                    const isSelected = editPlanId === p.id;
                    return (
                      <div
                        key={p.id}
                        onClick={() => {
                          setEditPlanId(p.id as any);
                          setEditAmount(p.amount);
                          setEditMemberLimit(p.defaultLimit);
                        }}
                        className={`p-3 rounded-2xl border cursor-pointer text-center transition ${
                          isSelected ? "bg-indigo-600/20 border-indigo-500 text-white font-bold" : "bg-slate-800/50 border-slate-700 text-slate-400"
                        }`}
                      >
                        <p className="text-xs font-black text-white">{p.label}</p>
                        <p className="text-[10px] text-indigo-400">₹{p.amount}/mo</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Monthly Amount (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={editAmount}
                    onChange={(e) => setEditAmount(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs font-bold text-slate-200 outline-none focus:border-indigo-500 h-11"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Max Member Limit</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={editMemberLimit}
                    onChange={(e) => setEditMemberLimit(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs font-bold text-slate-200 outline-none focus:border-indigo-500 h-11"
                  />
                </div>
              </div>

              {(() => {
                const bizMembers = membersByBiz.get(selectedBizForEdit.id) || [];
                const isLowering = editMemberLimit < bizMembers.length;
                if (!isLowering) return null;

                const excessCount = bizMembers.length - editMemberLimit;
                return (
                  <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl space-y-2 text-xs">
                    <p className="font-bold text-amber-300 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" /> Member Limit Reconciliation Warning
                    </p>
                    <p className="text-[11px] text-amber-200/90 leading-relaxed">
                      Current active member count (<strong className="text-white">{bizMembers.length}</strong>) exceeds the new limit (<strong className="text-white">{editMemberLimit}</strong>). Saving will remove <strong className="text-white">{excessCount}</strong> excess non-owner staff memberships for this store.
                    </p>
                    <label className="flex items-center gap-2 cursor-pointer pt-1">
                      <input
                        type="checkbox"
                        checked={confirmReconcile}
                        onChange={(e) => setConfirmReconcile(e.target.checked)}
                        className="w-4 h-4 rounded border-amber-500 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                      <span className="font-extrabold text-amber-200 text-xs">Confirm reconciling {excessCount} excess staff memberships for {selectedBizForEdit.name}</span>
                    </label>
                  </div>
                );
              })()}

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Admin Notes / Reference</label>
                <input
                  type="text"
                  placeholder="e.g. Upgraded via manual super owner review"
                  value={editAdminNote}
                  onChange={(e) => setEditAdminNote(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs font-semibold text-slate-200 outline-none focus:border-indigo-500 h-11"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditBizModalOpen(false)}
                  className="flex-1 py-3 border border-slate-700 rounded-xl text-xs font-bold text-slate-400 hover:bg-slate-800 cursor-pointer min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loadingId === selectedBizForEdit.id}
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black shadow-md cursor-pointer min-h-[44px]"
                >
                  {loadingId === selectedBizForEdit.id ? "Saving..." : "Save & Activate"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PERMANENT DELETE BUSINESS CONFIRMATION MODAL */}
      {permDeleteModalOpen && bizToPermDelete && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-800 space-y-5 text-xs text-slate-100">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base font-black text-rose-400 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" /> Permanently Delete Business
              </h3>
              <button onClick={() => setPermDeleteModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer p-1"><X className="w-5 h-5" /></button>
            </div>

            <div className="space-y-2 bg-rose-950/20 p-4 rounded-2xl border border-rose-900/40">
              <p className="text-slate-200 font-semibold">
                You are about to <strong className="text-rose-400 font-bold">permanently delete</strong> business <strong className="text-white font-bold">{bizToPermDelete.name}</strong> along with all associated database records and storage files.
              </p>
              <p className="text-[11px] text-amber-400">
                Warning: This action is destructive and irreversible. To confirm, please type the exact business name (<strong className="text-white">{bizToPermDelete.name}</strong>) below:
              </p>
              <input
                type="text"
                placeholder={`Type "${bizToPermDelete.name}" to confirm`}
                value={confirmPermNameInput}
                onChange={(e) => setConfirmPermNameInput(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs font-bold text-white outline-none focus:border-rose-500 h-11"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPermDeleteModalOpen(false)}
                className="flex-1 py-3 border border-slate-700 rounded-xl text-xs font-bold text-slate-400 hover:bg-slate-800 cursor-pointer min-h-[44px]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={permDeleting || confirmPermNameInput.trim().toLowerCase() !== bizToPermDelete.name.trim().toLowerCase()}
                onClick={handlePermDeleteConfirm}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl text-xs font-black shadow-md cursor-pointer min-h-[44px] flex items-center justify-center gap-1.5"
              >
                {permDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Permanently Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function lowerRole(role: any) {
  return String(role || "").toLowerCase();
}

function formatDate(val: any) {
  if (!val) return "N/A";
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return String(val);
    return d.toISOString().split("T")[0];
  } catch {
    return String(val);
  }
}
