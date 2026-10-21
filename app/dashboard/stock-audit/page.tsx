"use client";

import React, { useEffect, useState } from "react";
import { SharedDashboardLayout } from "@/components/layout/SharedDashboardLayout";
import { createClient } from "@/lib/supabase/client";
import {
  ClipboardCheck,
  Search,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  TrendingDown,
  TrendingUp,
  MinusCircle,
  Filter,
  Calendar,
  UserCheck,
  Edit,
  ShieldAlert,
  Save,
  RotateCcw,
  Clock,
  History,
  Info
} from "lucide-react";

export default function StockAuditPage() {
  const [supabase] = useState(() => createClient());
  const [business, setBusiness] = useState<any>(null);
  const [userName, setUserName] = useState("Staff Member");
  const [role, setRole] = useState("STAFF");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Tab State: 'staff' | 'admin'
  const [activeTab, setActiveTab] = useState<"staff" | "admin">("staff");

  // Cycle State
  const [activeCycle, setActiveCycle] = useState<any>(null);

  // IST Date Helpers for current calendar month in Asia/Kolkata
  const getISTToday = () => {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return formatter.format(new Date()); // e.g. "2025-02-23"
  };

  const getISTMonthStart = () => {
    const todayIST = getISTToday();
    const [year, month] = todayIST.split("-");
    return `${year}-${month}-01`;
  };

  // Staff View State
  const [staffProducts, setStaffProducts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [qtyInputs, setQtyInputs] = useState<{ [productId: string]: string }>({});
  const [savingProductId, setSavingProductId] = useState<string | null>(null);

  // Admin View State with Date Range Filters restricted to current calendar month in Asia/Kolkata
  const [adminReport, setAdminReport] = useState<any>(null);
  const [fromDate, setFromDate] = useState<string>(() => getISTMonthStart());
  const [toDate, setToDate] = useState<string>(() => getISTToday());
  const [discrepancyFilter, setDiscrepancyFilter] = useState<"ALL" | "SHORTAGE" | "EXCESS" | "MATCHED">("ALL");

  // Correction Modal State
  const [correctionModalOpen, setCorrectionModalOpen] = useState(false);
  const [selectedAuditItem, setSelectedAuditItem] = useState<any>(null);
  const [correctedQty, setCorrectedQty] = useState("");
  const [correctionReason, setCorrectionReason] = useState("");

  const initializeAudit = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User authentication required.");

      const { data: memberships } = await supabase
        .from("business_members")
        .select("*, businesses(*)")
        .eq("user_id", user.id);

      let currentBiz = null;
      let userRole = "STAFF";

      if (memberships && memberships.length > 0) {
        currentBiz = memberships[0].businesses;
        userRole = (memberships[0].role || "STAFF").toUpperCase();
        setBusiness(currentBiz);
        setRole(userRole);
      }

      const { data: prof } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      if (prof?.full_name) setUserName(prof.full_name);

      const bizId = currentBiz?.id || user.id;

      // 1. Get or create today's 24-hour audit cycle in Asia/Kolkata time
      const { data: cycleRes, error: cycleErr } = await supabase.rpc("get_or_create_stock_audit_cycle", {
        p_business_id: bizId,
      });

      if (cycleErr) throw new Error(cycleErr.message);
      if (cycleRes && cycleRes.error) throw new Error(cycleRes.error);

      setActiveCycle(cycleRes);
      const cycleId = cycleRes.cycle_id;

      // 2. Fetch staff-safe products list (NO expected stock or discrepancies returned)
      const { data: prodRes, error: prodErr } = await supabase.rpc("get_staff_stock_audit_products", {
        p_business_id: bizId,
        p_cycle_id: cycleId,
      });

      if (prodErr) throw new Error(prodErr.message);

      const prods = prodRes?.products || [];
      setStaffProducts(prods);

      // Initialize physical quantity input state
      const initialInputs: { [key: string]: string } = {};
      for (const p of prods) {
        initialInputs[p.product_id] = p.is_checked ? String(p.physical_quantity) : "";
      }
      setQtyInputs(initialInputs);

      // If user is owner/admin, fetch admin report
      if (userRole === "OWNER" || userRole === "ADMIN") {
        fetchAdminReport(bizId, cycleId);
      }
    } catch (err: any) {
      console.error("Audit initialization failed:", err);
      setErrorMsg(err.message || "Failed to initialize stock audit.");
    } finally {
      setLoading(false);
    }
  };

  const fetchAdminReport = async (
    bizId?: string,
    cycleId?: string,
    staffId?: string,
    overrideFromDate?: string,
    overrideToDate?: string
  ) => {
    const bId = bizId || business?.id;
    const cId = cycleId || activeCycle?.cycle_id;
    if (!bId) return;

    const fDate = overrideFromDate !== undefined ? overrideFromDate : fromDate;
    const tDate = overrideToDate !== undefined ? overrideToDate : toDate;

    try {
      const { data: rpcResult, error: rpcErr } = await supabase.rpc("get_admin_stock_audit_report", {
        p_business_id: bId,
        p_cycle_id: cId || null,
        p_staff_id: staffId || null,
        p_from_date: fDate || null,
        p_to_date: tDate || null,
      });

      if (rpcErr) throw new Error(rpcErr.message);
      setAdminReport(rpcResult);
    } catch (err: any) {
      console.error("Failed to load admin audit report:", err);
      setErrorMsg(err.message || "Failed to load admin audit report.");
    }
  };

  useEffect(() => {
    initializeAudit();
  }, [supabase]);

  // Handle staff physical count submission
  const handleSaveProductAudit = async (productId: string) => {
    if (!business?.id || !activeCycle?.cycle_id) return;

    const rawVal = qtyInputs[productId];
    const numVal = Number(rawVal);

    if (rawVal === "" || isNaN(numVal) || numVal < 0 || !isFinite(numVal)) {
      setErrorMsg("Please enter a valid non-negative physical quantity.");
      return;
    }

    setSavingProductId(productId);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const { data: rpcResult, error: rpcErr } = await supabase.rpc("submit_stock_audit_item", {
        p_business_id: business.id,
        p_cycle_id: activeCycle.cycle_id,
        p_product_id: productId,
        p_physical_quantity: numVal,
        p_submitted_by_name: userName,
      });

      if (rpcErr) throw new Error(rpcErr.message);
      if (rpcResult && rpcResult.error) throw new Error(rpcResult.error);

      // Update local state smoothly
      setStaffProducts((prev) =>
        prev.map((p) =>
          p.product_id === productId
            ? {
                ...p,
                is_checked: true,
                physical_quantity: numVal,
                submitted_by_name: userName,
                submitted_at: new Date().toISOString(),
              }
            : p
        )
      );

      setSuccessMsg("Item count saved!");
      setTimeout(() => setSuccessMsg(""), 3000);

      // Refresh admin report if admin/owner
      if (role === "OWNER" || role === "ADMIN") {
        fetchAdminReport();
      }
    } catch (err: any) {
      console.error("Failed to save audit count:", err);
      setErrorMsg(err.message || "Failed to save item count.");
    } finally {
      setSavingProductId(null);
    }
  };

  // Handle Admin Correction
  const handleCorrectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAuditItem || !business?.id) return;

    const numVal = Number(correctedQty);
    if (isNaN(numVal) || numVal < 0 || !isFinite(numVal)) {
      setErrorMsg("Please enter a valid non-negative corrected quantity.");
      return;
    }

    if (!correctionReason.trim()) {
      setErrorMsg("Correction reason is required.");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");

    try {
      const { data: rpcResult, error: rpcErr } = await supabase.rpc("correct_stock_audit_item", {
        p_business_id: business.id,
        p_audit_entry_id: selectedAuditItem.audit_entry_id,
        p_corrected_quantity: numVal,
        p_reason: correctionReason.trim(),
      });

      if (rpcErr) throw new Error(rpcErr.message);
      if (rpcResult && rpcResult.error) throw new Error(rpcResult.error);

      setSuccessMsg("Audit entry corrected successfully!");
      setCorrectionModalOpen(false);
      setSelectedAuditItem(null);
      setCorrectionReason("");
      setCorrectedQty("");

      // Refresh data
      await initializeAudit();
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: any) {
      console.error("Correction failed:", err);
      setErrorMsg(err.message || "Failed to correct audit entry.");
    } finally {
      setSubmitting(false);
    }
  };

  // Derived Staff Metrics
  const categories = Array.from(new Set(staffProducts.map((p) => p.category || "General")));
  const filteredStaffProducts = staffProducts.filter((p) => {
    const matchesSearch =
      p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.barcode?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "ALL" || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const checkedCount = staffProducts.filter((p) => p.is_checked).length;
  const totalCount = staffProducts.length;
  const progressPct = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;

  return (
    <SharedDashboardLayout
      businessName={business?.name || "TWEB"}
      userName={userName}
      role={role}
      pageTitle="Daily Stock Audit"
    >
      <div className="max-w-6xl mx-auto space-y-6 pb-20 text-xs">
        {/* HEADER & TAB SWITCHER */}
        <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 text-white p-6 sm:p-8 rounded-3xl shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest border border-white/20">
                Daily IST Cycle (Midnight Reset)
              </span>
              {activeCycle?.cycle_date && (
                <span className="px-3 py-1 bg-black/20 rounded-full text-[10px] font-mono font-bold text-amber-200">
                  <Calendar className="w-3 h-3 inline mr-1" /> {activeCycle.cycle_date}
                </span>
              )}
            </div>
            <h2 className="text-2xl sm:text-3xl font-black mt-2">Physical Stock Audit</h2>
            <p className="text-xs text-amber-100 font-medium mt-1">
              Verify physical inventory counts daily in IST time without modifying system stock levels.
            </p>
          </div>

          {/* TAB BUTTONS */}
          <div className="flex bg-black/20 p-1.5 rounded-2xl border border-white/20 text-xs font-black">
            <button
              onClick={() => setActiveTab("staff")}
              className={`px-4 py-2.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === "staff" ? "bg-white text-slate-900 shadow-md" : "text-amber-100 hover:text-white"
              }`}
            >
              <ClipboardCheck className="w-4 h-4" /> Staff Count
            </button>
            {(role === "OWNER" || role === "ADMIN") && (
              <button
                onClick={() => {
                  setActiveTab("admin");
                  fetchAdminReport();
                }}
                className={`px-4 py-2.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
                  activeTab === "admin" ? "bg-white text-slate-900 shadow-md" : "text-amber-100 hover:text-white"
                }`}
              >
                <ShieldAlert className="w-4 h-4" /> Admin Discrepancy Report
              </button>
            )}
          </div>
        </div>

        {/* NOTIFICATIONS */}
        {successMsg && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-2xl text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-bold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 1: STAFF PHYSICAL COUNT (NO EXPECTED STOCK OR DISCREPANCIES SHOWN)  */}
        {/* ========================================================================= */}
        {activeTab === "staff" && (
          <div className="space-y-6">
            {/* PROGRESS BAR & SUMMARY */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
              <div className="flex justify-between items-center text-xs font-black">
                <span className="text-slate-800">Daily Audit Cycle Progress (12:00 AM Midnight IST Reset)</span>
                <span className="text-amber-600">{checkedCount} / {totalCount} Checked ({progressPct}%)</span>
              </div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-400 font-medium">
                Enter physical shelf quantities. Saved items remain recorded for today's active cycle.
              </p>
            </div>

            {/* SEARCH & FILTERS */}
            <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search product by name or barcode..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:border-amber-600 h-11"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Filter className="w-4 h-4 text-slate-400 shrink-0" />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold outline-none h-11 w-full sm:w-48"
                >
                  <option value="ALL">All Categories</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* PRODUCTS CARDS LIST */}
            {loading ? (
              <div className="p-16 text-center text-xs text-slate-400">Loading audit product items...</div>
            ) : filteredStaffProducts.length === 0 ? (
              <div className="bg-white p-12 rounded-3xl border border-dashed text-center space-y-2">
                <ClipboardCheck className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="font-bold text-slate-700">No products match your filter.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredStaffProducts.map((p) => {
                  const isSaved = p.is_checked;
                  const isSaving = savingProductId === p.product_id;

                  return (
                    <div
                      key={p.product_id}
                      className={`p-5 rounded-3xl border transition space-y-4 ${
                        isSaved ? "bg-emerald-50/50 border-emerald-200" : "bg-white border-slate-200/80 shadow-xs"
                      }`}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-black text-slate-900 text-sm">{p.name}</h4>
                            {isSaved && (
                              <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> Checked
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                            Barcode: {p.barcode || "N/A"} • Category: {p.category}
                          </p>
                        </div>
                        <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-[10px] font-extrabold uppercase">
                          {p.unit}
                        </span>
                      </div>

                      {/* PHYSICAL QUANTITY INPUT */}
                      <div className="flex items-end gap-3 pt-2 border-t border-slate-100">
                        <div className="flex-1">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                            Physical Count ({p.unit})
                          </label>
                          <input
                            type="number"
                            step="any"
                            min="0"
                            placeholder="Enter physical count"
                            value={qtyInputs[p.product_id] ?? ""}
                            onChange={(e) =>
                              setQtyInputs((prev) => ({
                                ...prev,
                                [p.product_id]: e.target.value,
                              }))
                            }
                            className="w-full h-11 bg-white border border-slate-200 rounded-xl px-3 font-bold text-slate-900 text-sm outline-none focus:border-amber-600"
                          />
                        </div>

                        <button
                          type="button"
                          disabled={isSaving}
                          onClick={() => handleSaveProductAudit(p.product_id)}
                          className="px-5 h-11 bg-amber-600 hover:bg-amber-700 text-white font-black rounded-xl shadow-sm transition cursor-pointer min-h-[44px] flex items-center gap-1.5 shrink-0"
                        >
                          {isSaving ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <Save className="w-4 h-4" /> Save
                            </>
                          )}
                        </button>
                      </div>

                      {isSaved && p.submitted_by_name && (
                        <p className="text-[10px] text-slate-400 italic">
                          Checked by {p.submitted_by_name} at {p.submitted_at ? new Date(p.submitted_at).toLocaleTimeString() : "today"}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: ADMIN DISCREPANCY REPORT & CORRECTIONS (OWNER / ADMIN ONLY)        */}
        {/* ========================================================================= */}
        {activeTab === "admin" && (
          <div className="space-y-6">
            {role !== "OWNER" && role !== "ADMIN" ? (
              <div className="p-12 bg-white rounded-3xl border border-rose-200 text-center space-y-3">
                <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto" />
                <h3 className="text-base font-black text-slate-900">Access Denied</h3>
                <p className="text-xs text-slate-500">
                  Admin or Owner permissions are required to view discrepancy reports and correction logs.
                </p>
              </div>
            ) : !adminReport ? (
              <div className="p-12 text-center text-slate-400">Loading Admin Discrepancy Report...</div>
            ) : (
              <>
                {/* ADMIN DATE RANGE FILTERS (Restricted strictly to current calendar month in Asia/Kolkata) */}
                <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-amber-600 shrink-0" />
                    <span className="font-extrabold text-slate-800 text-xs">Report Date Range (Current Month IST)</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">From:</span>
                      <input
                        type="date"
                        min={getISTMonthStart()}
                        max={getISTToday()}
                        value={fromDate}
                        onChange={(e) => {
                          const val = e.target.value;
                          const minD = getISTMonthStart();
                          const maxD = getISTToday();
                          if (val < minD || val > maxD) {
                            setErrorMsg(`From Date must be within the current calendar month (${minD} to ${maxD}).`);
                            return;
                          }
                          if (val > toDate) {
                            setErrorMsg("From Date cannot be after To Date.");
                            return;
                          }
                          setErrorMsg("");
                          setFromDate(val);
                          fetchAdminReport(undefined, undefined, undefined, val, undefined);
                        }}
                        className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold outline-none focus:border-amber-600 h-9"
                      />
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">To:</span>
                      <input
                        type="date"
                        min={getISTMonthStart()}
                        max={getISTToday()}
                        value={toDate}
                        onChange={(e) => {
                          const val = e.target.value;
                          const minD = getISTMonthStart();
                          const maxD = getISTToday();
                          if (val < minD || val > maxD) {
                            setErrorMsg(`To Date must be within the current calendar month (${minD} to ${maxD}).`);
                            return;
                          }
                          if (val < fromDate) {
                            setErrorMsg("To Date cannot be before From Date.");
                            return;
                          }
                          setErrorMsg("");
                          setToDate(val);
                          fetchAdminReport(undefined, undefined, undefined, undefined, val);
                        }}
                        className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold outline-none focus:border-amber-600 h-9"
                      />
                    </div>
                  </div>
                </div>

                {/* ADMIN SUMMARY DISCREPANCY CARDS */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  {/* SHORTAGE CARD */}
                  <div
                    onClick={() => setDiscrepancyFilter("SHORTAGE")}
                    className={`p-6 rounded-3xl border shadow-xs cursor-pointer transition space-y-2 ${
                      discrepancyFilter === "SHORTAGE" ? "bg-rose-50 border-rose-300 ring-2 ring-rose-500" : "bg-white border-slate-200 hover:border-rose-300"
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black uppercase text-rose-700 tracking-wider">Shortage</span>
                      <TrendingDown className="w-5 h-5 text-rose-600" />
                    </div>
                    <p className="text-3xl font-black text-rose-700">{adminReport.shortage_count || 0}</p>
                    <p className="text-[10px] text-slate-400 font-medium">Physical count is LESS than system stock</p>
                  </div>

                  {/* EXCESS CARD */}
                  <div
                    onClick={() => setDiscrepancyFilter("EXCESS")}
                    className={`p-6 rounded-3xl border shadow-xs cursor-pointer transition space-y-2 ${
                      discrepancyFilter === "EXCESS" ? "bg-blue-50 border-blue-300 ring-2 ring-blue-500" : "bg-white border-slate-200 hover:border-blue-300"
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black uppercase text-blue-700 tracking-wider">Excess</span>
                      <TrendingUp className="w-5 h-5 text-blue-600" />
                    </div>
                    <p className="text-3xl font-black text-blue-700">{adminReport.excess_count || 0}</p>
                    <p className="text-[10px] text-slate-400 font-medium">Physical count is MORE than system stock</p>
                  </div>

                  {/* MATCHED CARD */}
                  <div
                    onClick={() => setDiscrepancyFilter("MATCHED")}
                    className={`p-6 rounded-3xl border shadow-xs cursor-pointer transition space-y-2 ${
                      discrepancyFilter === "MATCHED" ? "bg-emerald-50 border-emerald-300 ring-2 ring-emerald-500" : "bg-white border-slate-200 hover:border-emerald-300"
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black uppercase text-emerald-700 tracking-wider">Matched</span>
                      <MinusCircle className="w-5 h-5 text-emerald-600" />
                    </div>
                    <p className="text-3xl font-black text-emerald-700">{adminReport.matched_count || 0}</p>
                    <p className="text-[10px] text-slate-400 font-medium">Physical count equals system stock</p>
                  </div>
                </div>

                {/* DISCREPANCY TABLE */}
                <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden space-y-4 p-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                      <h3 className="font-black text-slate-900 text-sm">Discrepancy Breakdown & Audit Logs</h3>
                      <p className="text-[11px] text-slate-400">
                        Filter: <strong className="text-slate-700">{discrepancyFilter}</strong> • Difference = Physical Qty - Expected Qty
                      </p>
                    </div>

                    <button
                      onClick={() => setDiscrepancyFilter("ALL")}
                      className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition cursor-pointer"
                    >
                      Clear Filter
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold uppercase text-[10px]">
                          <th className="p-3">Product Name</th>
                          <th className="p-3">Staff Member</th>
                          <th className="p-3 text-right">Physical Qty</th>
                          <th className="p-3 text-right">Expected Qty</th>
                          <th className="p-3 text-right">Difference</th>
                          <th className="p-3 text-center">Status</th>
                          <th className="p-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(adminReport.items || [])
                          .filter((item: any) => {
                            if (discrepancyFilter === "ALL") return true;
                            return item.discrepancy_type === discrepancyFilter;
                          })
                          .map((item: any, idx: number) => {
                            const diff = Number(item.difference || 0);
                            return (
                              <tr key={idx} className="hover:bg-slate-50/80">
                                <td className="p-3 font-extrabold text-slate-900">{item.name}</td>
                                <td className="p-3 text-slate-600 font-medium">{item.submitted_by_name || "Unchecked"}</td>
                                <td className="p-3 text-right font-mono font-bold text-slate-900">{item.physical_quantity} {item.unit}</td>
                                <td className="p-3 text-right font-mono text-slate-500">{item.expected_quantity} {item.unit}</td>
                                <td className={`p-3 text-right font-mono font-black ${diff < 0 ? "text-rose-600" : diff > 0 ? "text-blue-600" : "text-emerald-600"}`}>
                                  {diff > 0 ? `+${diff}` : diff} {item.unit}
                                </td>
                                <td className="p-3 text-center">
                                  <span
                                    className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                                      item.discrepancy_type === "SHORTAGE"
                                        ? "bg-rose-100 text-rose-800"
                                        : item.discrepancy_type === "EXCESS"
                                        ? "bg-blue-100 text-blue-800"
                                        : item.discrepancy_type === "MATCHED"
                                        ? "bg-emerald-100 text-emerald-800"
                                        : "bg-slate-100 text-slate-600"
                                    }`}
                                  >
                                    {item.discrepancy_type}
                                  </span>
                                </td>
                                <td className="p-3 text-right">
                                  {item.audit_entry_id ? (
                                    <button
                                      onClick={() => {
                                        setSelectedAuditItem(item);
                                        setCorrectedQty(String(item.physical_quantity));
                                        setCorrectionReason("");
                                        setCorrectionModalOpen(true);
                                      }}
                                      className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-extrabold rounded-xl text-xs transition cursor-pointer inline-flex items-center gap-1"
                                    >
                                      <Edit className="w-3.5 h-3.5" /> Correct
                                    </button>
                                  ) : (
                                    <span className="text-[10px] text-slate-400 italic">Unchecked</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ADMIN CORRECTION MODAL */}
        {correctionModalOpen && selectedAuditItem && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-5 text-xs">
              <div className="flex justify-between items-center border-b pb-3">
                <div>
                  <h3 className="text-base font-black text-slate-900">Correct Staff Count</h3>
                  <p className="text-[10px] text-slate-400 font-mono">Product: {selectedAuditItem.name}</p>
                </div>
                <button onClick={() => setCorrectionModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                  ×
                </button>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border space-y-2">
                <div className="flex justify-between"><span>Original Staff Count:</span> <strong className="text-slate-900">{selectedAuditItem.physical_quantity} {selectedAuditItem.unit}</strong></div>
                <div className="flex justify-between"><span>Checked By:</span> <strong className="text-slate-900">{selectedAuditItem.submitted_by_name}</strong></div>
                <div className="flex justify-between"><span>Expected Stock (System):</span> <strong className="text-slate-600">{selectedAuditItem.expected_quantity} {selectedAuditItem.unit}</strong></div>
              </div>

              <form onSubmit={handleCorrectSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">Corrected Physical Quantity *</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    required
                    value={correctedQty}
                    onChange={(e) => setCorrectedQty(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold outline-none focus:border-blue-600 h-11"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">Reason for Correction *</label>
                  <textarea
                    required
                    rows={2}
                    placeholder="Enter audit correction reason..."
                    value={correctionReason}
                    onChange={(e) => setCorrectionReason(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold outline-none focus:border-blue-600"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setCorrectionModalOpen(false)}
                    className="flex-1 py-3 border rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer min-h-[44px]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-md cursor-pointer min-h-[44px]"
                  >
                    {submitting ? "Saving..." : "Save Correction"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </SharedDashboardLayout>
  );
}
