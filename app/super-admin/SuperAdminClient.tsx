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
} from "lucide-react";
import { superAdminLogout, deletePlatformUserAction } from "./actions";

interface Props {
  adminEmail: string;
  initialBusinesses: any[];
  initialSubscriptions: any[];
  initialMembers?: any[];
  initialProfiles?: any[];
  initialUsers?: any[];
}

export default function SuperAdminClient({
  adminEmail,
  initialBusinesses,
  initialSubscriptions,
  initialMembers = [],
  initialProfiles = [],
  initialUsers = [],
}: Props) {
  const [supabase] = useState(() => createClient());
  const [businesses, setBusinesses] = useState<any[]>(initialBusinesses || []);
  const [subscriptions, setSubscriptions] = useState<any[]>(initialSubscriptions || []);
  const [members, setMembers] = useState<any[]>(initialMembers || []);
  const [profiles, setProfiles] = useState<any[]>(initialProfiles || []);
  const [users, setUsers] = useState<any[]>(initialUsers || []);

  const [activeTab, setActiveTab] = useState<"businesses" | "users">("businesses");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Expandable row state for businesses
  const [expandedBizId, setExpandedBizId] = useState<string | null>(null);

  // Manual Activation Modal State
  const [activateModalSub, setActivateModalSub] = useState<any | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<"basic" | "pro" | "plus">("basic");
  const [adminPaymentNote, setAdminPaymentNote] = useState("");
  const [confirmPaymentReceived, setConfirmPaymentReceived] = useState(false);

  // Delete User Modal State
  const [deleteUserModalOpen, setDeleteUserModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<any | null>(null);
  const [deletingUser, setDeletingUser] = useState(false);

  const plansList = [
    { id: "basic", label: "Basic Plan", amount: "₹99/mo", desc: "Essential POS billing & stock management" },
    { id: "pro", label: "Pro Plan", amount: "₹250/mo", desc: "Advanced multi-counter inventory & staff management" },
    { id: "plus", label: "Plus Plan", amount: "₹450/mo", desc: "Full enterprise automation & VIP support" },
  ];

  const handleRefresh = async () => {
    window.location.reload();
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

      await handleRefresh();
    } catch (err: any) {
      console.error("Manual activation error:", err);
      setErrorMsg(err.message || "Failed to activate subscription.");
    } finally {
      setLoadingId(null);
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

  const handleDeleteUserConfirm = async () => {
    if (!userToDelete) return;
    setDeletingUser(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const res = await deletePlatformUserAction({ userId: userToDelete.id });
      if (res && res.success) {
        setSuccessMsg(res.message || "User deleted successfully.");
        setDeleteUserModalOpen(false);
        setUserToDelete(null);
        await handleRefresh();
      }
    } catch (err: any) {
      console.error("Failed to delete user:", err);
      setErrorMsg(err.message || "Failed to delete user account.");
      setDeleteUserModalOpen(false);
      setDeletingUser(false);
    }
  };

  // Maps & Aggregations
  const subMap = new Map(subscriptions.map((s) => [s.business_id, s]));
  const businessMap = new Map(businesses.map((b) => [b.id, b]));

  // Map members by business_id
  const membersByBiz = new Map<string, any[]>();
  for (const m of members) {
    if (!membersByBiz.has(m.business_id)) {
      membersByBiz.set(m.business_id, []);
    }
    membersByBiz.get(m.business_id)!.push(m);
  }

  const filteredBusinesses = businesses.filter((b) => {
    const sub = subMap.get(b.id);
    const status = sub?.payment_status || "none";
    const matchesStatus = statusFilter === "ALL" || status.toUpperCase() === statusFilter.toUpperCase();
    const query = searchQuery.toLowerCase().trim();

    const matchesSearch =
      !query ||
      b.name.toLowerCase().includes(query) ||
      (b.city || "").toLowerCase().includes(query) ||
      (b.phone || "").toLowerCase().includes(query);

    return matchesStatus && matchesSearch;
  });

  const filteredUsers = users.filter((u) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      (u.full_name || "").toLowerCase().includes(query) ||
      (u.email || "").toLowerCase().includes(query) ||
      (u.phone || "").toLowerCase().includes(query) ||
      u.id.toLowerCase().includes(query)
    );
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

        {/* METRICS OVERVIEW (4 REVISED CARDS) */}
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
              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Total Platform Users</span>
              <Users className="w-4 h-4 text-indigo-400" />
            </div>
            <h3 className="text-2xl font-black text-indigo-400">{users.length}</h3>
          </div>

          <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800 space-y-1">
            <div className="flex justify-between items-center text-slate-400">
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Active Subscriptions</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <h3 className="text-2xl font-black text-emerald-400">
              {subscriptions.filter((s) => s.status === "active").length}
            </h3>
          </div>

          <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800 space-y-1">
            <div className="flex justify-between items-center text-slate-400">
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">Pending Payments</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <h3 className="text-2xl font-black text-amber-400">
              {subscriptions.filter((s) => s.payment_status === "pending").length}
            </h3>
          </div>
        </div>

        {/* NAVIGATION TABS */}
        <div className="flex border-b border-slate-800 gap-4">
          <button
            onClick={() => setActiveTab("businesses")}
            className={`pb-3 font-black text-xs uppercase tracking-wider border-b-2 transition cursor-pointer flex items-center gap-2 ${
              activeTab === "businesses" ? "border-indigo-500 text-white" : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Building className="w-4 h-4" /> Client Businesses ({businesses.length})
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={`pb-3 font-black text-xs uppercase tracking-wider border-b-2 transition cursor-pointer flex items-center gap-2 ${
              activeTab === "users" ? "border-indigo-500 text-white" : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <UserCheck className="w-4 h-4" /> Platform Users & Admins ({users.length})
          </button>
        </div>

        {/* SEARCH & FILTERS */}
        <div className="bg-slate-900 p-4 rounded-3xl border border-slate-800 flex flex-col sm:flex-row gap-3 justify-between items-center">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder={activeTab === "businesses" ? "Search business or city..." : "Search user name, email or phone..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-slate-200 outline-none focus:border-indigo-500 h-11"
            />
          </div>

          {activeTab === "businesses" && (
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
          )}
        </div>

        {/* TAB 1: BUSINESSES & SUBSCRIPTIONS TABLE */}
        {activeTab === "businesses" && (
          <div className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden shadow-xl">
            <div className="p-5 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-sm font-black text-white uppercase tracking-wider">Registered Client Businesses & Admins</h3>
              <span className="text-xs text-slate-400 font-bold">{filteredBusinesses.length} records</span>
            </div>

            {filteredBusinesses.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-400">No client businesses found matching filter.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950/60 text-[11px] text-slate-400 uppercase border-b border-slate-800">
                    <tr>
                      <th className="p-4 w-8"></th>
                      <th className="p-4">Business Name & Reg. Date</th>
                      <th className="p-4">Owner / Admin Identity</th>
                      <th className="p-4">Total Users & Staff</th>
                      <th className="p-4">Plan & Amount</th>
                      <th className="p-4">Payment Status</th>
                      <th className="p-4">Expiry Date</th>
                      <th className="p-4 text-center">Actions / Approvals</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {filteredBusinesses.map((biz) => {
                      const sub = subMap.get(biz.id);
                      const payStatus = sub?.payment_status || "none";
                      const isApproved = payStatus === "approved";
                      const isPending = payStatus === "pending";
                      const isRejected = payStatus === "rejected";

                      const bizMembers = membersByBiz.get(biz.id) || [];
                      const ownerMember = bizMembers.find((m) => lowerRole(m.role) === "owner" || m.user_id === biz.owner_id);
                      const ownerProfile = profiles.find((p) => p.id === biz.owner_id);
                      const ownerName = ownerProfile?.full_name || (ownerMember ? `Admin (${biz.owner_id.substring(0, 8)})` : "Owner");

                      const staffCount = Math.max(0, bizMembers.length - 1);
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
                                Type: {biz.business_type || "Store"} • Reg: {new Date(biz.created_at).toLocaleDateString()}
                              </span>
                            </td>
                            <td className="p-4">
                              <span className="font-extrabold text-slate-200 block flex items-center gap-1">
                                <Shield className="w-3 h-3 text-amber-400 inline" /> {ownerName}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                Phone: {biz.phone || ownerProfile?.phone || "N/A"}
                              </span>
                            </td>
                            <td className="p-4">
                              <span className="font-black text-indigo-400 text-xs">{bizMembers.length} Users</span>
                              <span className="block text-[10px] text-slate-400">1 Owner + {staffCount} Staff</span>
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
                            <td className="p-4 text-slate-300 font-bold">
                              {sub?.current_period_end ? new Date(sub.current_period_end).toLocaleDateString() : "N/A"}
                            </td>
                            <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-center gap-2">
                                {sub ? (
                                  <>
                                    <button
                                      type="button"
                                      disabled={loadingId === sub.id}
                                      onClick={() => setActivateModalSub({ ...sub, business_name: biz.name })}
                                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-xl text-[11px] transition cursor-pointer inline-flex items-center gap-1 shadow-sm"
                                      title="Activate / Renew Subscription"
                                    >
                                      <Zap className="w-3.5 h-3.5" /> Activate / Renew
                                    </button>

                                    {isPending && (
                                      <>
                                        <button
                                          type="button"
                                          disabled={loadingId === sub.id}
                                          onClick={() => handleReviewPayment(sub.id, "approve")}
                                          className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl text-[10px] transition cursor-pointer shadow-sm"
                                          title="Approve UTR Payment"
                                        >
                                          Approve
                                        </button>
                                        <button
                                          type="button"
                                          disabled={loadingId === sub.id}
                                          onClick={() => handleReviewPayment(sub.id, "reject")}
                                          className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-black rounded-xl text-[10px] transition cursor-pointer shadow-sm"
                                          title="Reject Payment"
                                        >
                                          Reject
                                        </button>
                                      </>
                                    )}
                                  </>
                                ) : (
                                  <span className="text-slate-500 text-[11px]">No subscription</span>
                                )}
                              </div>
                            </td>
                          </tr>

                          {/* EXPANDABLE MEMBER DETAILS ROW */}
                          {isExpanded && (
                            <tr className="bg-slate-950/80">
                              <td colSpan={8} className="p-4 pl-12 border-b border-slate-800">
                                <div className="space-y-3">
                                  <h4 className="font-extrabold text-indigo-400 text-xs uppercase tracking-wider flex items-center gap-1.5">
                                    <Users className="w-3.5 h-3.5" /> Member Roster for {biz.name} ({bizMembers.length} Members)
                                  </h4>

                                  {bizMembers.length === 0 ? (
                                    <p className="text-slate-500 italic text-[11px]">No member records found.</p>
                                  ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                      {bizMembers.map((m) => {
                                        const prof = profiles.find((p) => p.id === m.user_id);
                                        const isOwner = lowerRole(m.role) === "owner" || m.user_id === biz.owner_id;

                                        return (
                                          <div key={m.id} className="p-3 bg-slate-900 rounded-2xl border border-slate-800 space-y-1">
                                            <div className="flex justify-between items-center">
                                              <span className="font-extrabold text-white text-xs flex items-center gap-1">
                                                <User className="w-3 h-3 text-slate-400" />
                                                {prof?.full_name || `User (${m.user_id.substring(0, 8)})`}
                                              </span>
                                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                                                isOwner ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "bg-slate-800 text-indigo-300"
                                              }`}>
                                                {m.role || "STAFF"}
                                              </span>
                                            </div>

                                            {prof?.phone && (
                                              <p className="text-[10px] text-slate-400">Phone: {prof.phone}</p>
                                            )}
                                            <p className="text-[10px] text-slate-500 font-mono">
                                              Joined: {m.created_at ? new Date(m.created_at).toLocaleDateString() : "N/A"}
                                            </p>
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
        )}

        {/* TAB 2: PLATFORM USERS & ADMINS DIRECTORY */}
        {activeTab === "users" && (
          <div className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden shadow-xl">
            <div className="p-5 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-sm font-black text-white uppercase tracking-wider">All Registered Platform Users & Admins (Auth & Profiles)</h3>
              <span className="text-xs text-slate-400 font-bold">{filteredUsers.length} records</span>
            </div>

            {filteredUsers.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-400">No registered platform users found matching filter.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950/60 text-[11px] text-slate-400 uppercase border-b border-slate-800">
                    <tr>
                      <th className="p-4">User Name / Email</th>
                      <th className="p-4">Mobile Phone</th>
                      <th className="p-4">Account Status & Associations</th>
                      <th className="p-4">Associated Businesses & Roles</th>
                      <th className="p-4">Registration Date</th>
                      <th className="p-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {filteredUsers.map((u) => {
                      const memberships = u.memberships || [];
                      const isOwnerAnywhere = u.is_owner;
                      const isMemberAnywhere = memberships.length > 0;

                      return (
                        <tr key={u.id} className="hover:bg-slate-800/50">
                          <td className="p-4 font-black text-white">
                            {u.full_name}
                            <span className="block text-[11px] text-indigo-400 font-mono font-bold">{u.email}</span>
                            <span className="block text-[9px] text-slate-500 font-mono">ID: {u.id}</span>
                          </td>
                          <td className="p-4 font-mono font-bold text-amber-400">
                            {u.phone || <span className="text-slate-500 italic">Not provided</span>}
                          </td>
                          <td className="p-4">
                            {isOwnerAnywhere ? (
                              <span className="px-2.5 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/30 font-black text-[10px] uppercase rounded-full">
                                Business Owner
                              </span>
                            ) : isMemberAnywhere ? (
                              <span className="px-2.5 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 font-black text-[10px] uppercase rounded-full">
                                Business Staff / Member
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 bg-slate-800 text-slate-400 border border-slate-700 font-black text-[10px] uppercase rounded-full">
                                Registered (No Business yet)
                              </span>
                            )}
                          </td>
                          <td className="p-4">
                            {memberships.length === 0 ? (
                              <span className="text-slate-500 italic">None (Unassigned)</span>
                            ) : (
                              <div className="space-y-1">
                                {memberships.map((m: any, idx: number) => (
                                  <div key={idx} className="flex items-center gap-2">
                                    <span className="font-extrabold text-white">{m.business?.name || "Store"}</span>
                                    <span className="px-2 py-0.5 bg-slate-800 text-indigo-300 rounded text-[9px] font-black uppercase">
                                      {m.role}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="p-4 text-slate-300 font-bold">
                            {u.created_at ? new Date(u.created_at).toLocaleDateString() : "N/A"}
                          </td>
                          <td className="p-4 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                setUserToDelete(u);
                                setDeleteUserModalOpen(true);
                              }}
                              className="px-3 py-1.5 bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white font-black rounded-xl text-[11px] transition cursor-pointer inline-flex items-center gap-1 shadow-sm"
                              title="Delete User Account"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Delete
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>

      {/* DELETE USER CONFIRMATION MODAL */}
      {deleteUserModalOpen && userToDelete && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-800 space-y-5 text-xs text-slate-100">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base font-black text-white">Delete Platform User Account</h3>
              <button onClick={() => setDeleteUserModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer"><X className="w-5 h-5" /></button>
            </div>

            <div className="space-y-2 bg-slate-800/50 p-4 rounded-2xl border border-slate-700">
              <p className="text-slate-300 font-semibold">
                You are about to permanently delete user account <strong className="text-white font-bold">{userToDelete.email}</strong> ({userToDelete.full_name}).
              </p>
              <p className="text-[11px] text-amber-400">
                Warning: This action will delete the Supabase Auth account and is irreversible. Users who own active businesses cannot be deleted until their businesses are reassigned or deleted.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteUserModalOpen(false)}
                className="flex-1 py-3 border border-slate-700 rounded-xl text-xs font-bold text-slate-400 hover:bg-slate-800 cursor-pointer min-h-[44px]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletingUser}
                onClick={handleDeleteUserConfirm}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black shadow-md cursor-pointer min-h-[44px] flex items-center justify-center gap-1.5"
              >
                {deletingUser ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

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
                  placeholder="e.g. Received ₹99 via UPI Cash / Bank Ref #12345"
                  value={adminPaymentNote}
                  onChange={(e) => setAdminPaymentNote(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs font-semibold text-slate-200 outline-none focus:border-indigo-500 h-11"
                />
              </div>

              <div className="p-3.5 bg-slate-800/50 rounded-2xl border border-slate-700 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={confirmPaymentReceived}
                    onChange={(e) => setConfirmPaymentReceived(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <span className="font-bold text-slate-200 text-xs">Confirm offline payment verification</span>
                </label>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setActivateModalSub(null)}
                  className="flex-1 py-3 border border-slate-700 rounded-xl text-xs font-bold text-slate-400 hover:bg-slate-800 cursor-pointer min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!confirmPaymentReceived || loadingId === activateModalSub.id}
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-black shadow-md cursor-pointer min-h-[44px]"
                >
                  {loadingId === activateModalSub.id ? "Activating..." : "Confirm Activation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function lowerRole(role: any) {
  return String(role || "").toLowerCase();
}
