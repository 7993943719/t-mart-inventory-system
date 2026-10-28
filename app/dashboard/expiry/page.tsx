"use client";

import React, { useEffect, useMemo, useState } from "react";
import { SharedDashboardLayout } from "@/components/layout/SharedDashboardLayout";
import { createClient } from "@/lib/supabase/client";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Loader2,
  Package,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";

type Product = {
  id: string;
  business_id: string;
  name: string;
  barcode?: string | null;
  category?: string | null;
  unit?: string | null;
  stock_quantity: number;
  track_expiry: boolean;
};

type ProductBatch = {
  id: string;
  business_id: string;
  product_id: string;
  batch_number?: string | null;
  manufacture_date?: string | null;
  expiry_date: string;
  received_quantity: number;
  remaining_quantity: number;
  source_type: string;
  purchase_bill_id?: string | null;
  received_at: string;
};

type ExpiryFilter = "ALL" | "EXPIRED" | "TODAY" | "7" | "30" | "60" | "90" | "LATER";

function daysUntil(dateOnly: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(`${dateOnly}T00:00:00`);
  expiry.setHours(0, 0, 0, 0);
  return Math.round((expiry.getTime() - today.getTime()) / 86_400_000);
}

function expiryLabel(days: number): string {
  if (days < 0) return `Expired ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} ago`;
  if (days === 0) return "Expires today";
  return `In ${days} day${days === 1 ? "" : "s"}`;
}

function expiryTone(days: number): string {
  if (days < 0) return "bg-rose-100 text-rose-800 border-rose-200";
  if (days === 0) return "bg-orange-100 text-orange-800 border-orange-200";
  if (days <= 7) return "bg-amber-100 text-amber-800 border-amber-200";
  if (days <= 30) return "bg-yellow-50 text-yellow-800 border-yellow-200";
  return "bg-emerald-50 text-emerald-800 border-emerald-200";
}

function inFilter(days: number, filter: ExpiryFilter): boolean {
  switch (filter) {
    case "EXPIRED": return days < 0;
    case "TODAY": return days === 0;
    case "7": return days >= 1 && days <= 7;
    case "30": return days >= 8 && days <= 30;
    case "60": return days >= 31 && days <= 60;
    case "90": return days >= 61 && days <= 90;
    case "LATER": return days > 90;
    default: return true;
  }
}

export default function ExpiryPage() {
  const [supabase] = useState(() => createClient());
  const [business, setBusiness] = useState<any>(null);
  const [businessId, setBusinessId] = useState("");
  const [userName, setUserName] = useState("Staff");
  const [role, setRole] = useState("STAFF");
  const [products, setProducts] = useState<Product[]>([]);
  const [batches, setBatches] = useState<ProductBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ExpiryFilter>("ALL");
  const [view, setView] = useState<"batches" | "products">("batches");

  const [trackingProduct, setTrackingProduct] = useState<Product | null>(null);
  const [openingBatchNumber, setOpeningBatchNumber] = useState("");
  const [openingManufactureDate, setOpeningManufactureDate] = useState("");
  const [openingExpiryDate, setOpeningExpiryDate] = useState("");
  const [savingTracking, setSavingTracking] = useState(false);

  const [disposeBatch, setDisposeBatch] = useState<ProductBatch | null>(null);
  const [disposeQuantity, setDisposeQuantity] = useState("");
  const [disposeReason, setDisposeReason] = useState("Expired stock");
  const [disposing, setDisposing] = useState(false);

  const isOwnerOrAdmin = ["OWNER", "ADMIN"].includes((role || "").toUpperCase().trim());
  const isDemoMode = process.env.NEXT_PUBLIC_TWEB_DEMO_MODE === "true";

  const loadData = async (quiet = false) => {
    if (quiet) setRefreshing(true);
    else setLoading(true);
    setErrorMsg("");

    try {
      if (isDemoMode) {
        setBusiness({ id: "demo-biz-1", name: "TWEB Demo Supermarket", owner_id: "demo-user" });
        setBusinessId("demo-biz-1");
        setUserName("Demo Admin");
        setRole("OWNER");

        const today = new Date();
        const fmt = (d: Date) => d.toISOString().split("T")[0];
        const past2 = new Date(today); past2.setDate(today.getDate() - 2);
        const todayPlus3 = new Date(today); todayPlus3.setDate(today.getDate() + 3);
        const todayPlus15 = new Date(today); todayPlus15.setDate(today.getDate() + 15);

        setProducts([
          { id: "p1", business_id: "demo-biz-1", name: "Organic Whole Milk 1L", category: "Dairy", unit: "Bottle", stock_quantity: 45, track_expiry: true },
          { id: "p2", business_id: "demo-biz-1", name: "Fresh Whole Wheat Bread", category: "Bakery", unit: "Loaf", stock_quantity: 12, track_expiry: true },
          { id: "p3", business_id: "demo-biz-1", name: "Basmati Rice 5kg", category: "Grains", unit: "Bag", stock_quantity: 100, track_expiry: false },
          { id: "p4", business_id: "demo-biz-1", name: "Greek Yogurt 400g", category: "Dairy", unit: "Cup", stock_quantity: 8, track_expiry: true },
        ]);
        setBatches([
          { id: "b1", business_id: "demo-biz-1", product_id: "p1", batch_number: "MILK-EXPIRED", expiry_date: fmt(past2), received_quantity: 20, remaining_quantity: 15, source_type: "purchase", received_at: new Date().toISOString() },
          { id: "b2", business_id: "demo-biz-1", product_id: "p1", batch_number: "MILK-FRESH", expiry_date: fmt(todayPlus3), received_quantity: 30, remaining_quantity: 30, source_type: "purchase", received_at: new Date().toISOString() },
          { id: "b3", business_id: "demo-biz-1", product_id: "p2", batch_number: "BREAD-SOON", expiry_date: fmt(todayPlus3), received_quantity: 12, remaining_quantity: 12, source_type: "purchase", received_at: new Date().toISOString() },
          { id: "b4", business_id: "demo-biz-1", product_id: "p4", batch_number: "YOGURT-MID", expiry_date: fmt(todayPlus15), received_quantity: 15, remaining_quantity: 8, source_type: "purchase", received_at: new Date().toISOString() },
        ]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const { data: authData, error: authError } = await supabase.auth.getUser();
      const user = authData?.user;
      if (authError || !user) throw new Error("Please log in again.");

      setUserName(user.user_metadata?.full_name || user.email || "Staff");

      const { data: memberships, error: membershipError } = await supabase
        .from("business_members")
        .select("business_id, role, status, businesses(id, name, owner_id)")
        .eq("user_id", user.id);
      if (membershipError) throw new Error(`Could not load business membership: ${membershipError.message}`);

      const activeMembership = (memberships || []).find((member: any) =>
        !member.status || String(member.status).toLowerCase() === "active"
      );

      let activeBusiness: any = activeMembership?.businesses || null;
      let activeBusinessId: string = activeMembership?.business_id || "";
      let activeRole = String(activeMembership?.role || "").toUpperCase();

      if (!activeBusiness) {
        const { data: ownedBusiness, error: ownedError } = await supabase
          .from("businesses")
          .select("id, name, owner_id")
          .eq("owner_id", user.id)
          .limit(1)
          .maybeSingle();
        if (ownedError) throw new Error(`Could not load owned business: ${ownedError.message}`);
        activeBusiness = ownedBusiness;
        activeBusinessId = ownedBusiness?.id || "";
        if (ownedBusiness) activeRole = "OWNER";
      } else if (activeBusiness.owner_id === user.id) {
        activeRole = "OWNER";
      }

      if (!activeBusinessId) throw new Error("No business is selected for this account.");
      setBusiness(activeBusiness);
      setBusinessId(activeBusinessId);
      setRole(activeRole || "STAFF");

      const [productResponse, flagResponse, batchResponse] = await Promise.all([
        supabase.rpc("get_business_products", { p_business_id: activeBusinessId }),
        supabase.from("products").select("id, business_id, name, category, unit, track_expiry").eq("business_id", activeBusinessId).order("name", { ascending: true }),
        supabase.from("product_batches")
          .select("id, business_id, product_id, batch_number, manufacture_date, expiry_date, received_quantity, remaining_quantity, source_type, purchase_bill_id, received_at")
          .eq("business_id", activeBusinessId)
          .gt("remaining_quantity", 0)
          .order("expiry_date", { ascending: true }),
      ]);

      if (productResponse.error) throw new Error(`Product list failed: ${productResponse.error.message}`);
      if (flagResponse.error) throw new Error(`Expiry settings failed: ${flagResponse.error.message}`);
      if (batchResponse.error) throw new Error(`Batch list failed: ${batchResponse.error.message}`);

      const flags = new Map((flagResponse.data || []).map((item: any) => [item.id, item]));
      const mergedProducts = ((productResponse.data || []) as any[]).map((product) => {
        const flag = flags.get(product.id) as any;
        return {
          ...product,
          track_expiry: Boolean(flag?.track_expiry),
          category: flag?.category ?? product.category,
          unit: flag?.unit ?? product.unit,
        } as Product;
      });
      setProducts(mergedProducts);
      setBatches((batchResponse.data || []) as ProductBatch[]);
    } catch (error: any) {
      setErrorMsg(error?.message || "Unable to load expiry information.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const productById = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);
  const trackedProducts = useMemo(() => products.filter((product) => product.track_expiry), [products]);
  const expiredBatches = useMemo(() => batches.filter((batch) => daysUntil(batch.expiry_date) < 0), [batches]);
  const dueSevenDays = useMemo(() => batches.filter((batch) => daysUntil(batch.expiry_date) >= 0 && daysUntil(batch.expiry_date) <= 7), [batches]);
  const dueThirtyDays = useMemo(() => batches.filter((batch) => daysUntil(batch.expiry_date) >= 0 && daysUntil(batch.expiry_date) <= 30), [batches]);

  const visibleBatches = useMemo(() => {
    const q = search.trim().toLowerCase();
    return batches.filter((batch) => {
      const product = productById.get(batch.product_id);
      const haystack = `${product?.name || ""} ${product?.category || ""} ${batch.batch_number || ""} ${batch.purchase_bill_id || ""}`.toLowerCase();
      return haystack.includes(q) && inFilter(daysUntil(batch.expiry_date), filter);
    });
  }, [batches, productById, search, filter]);

  const visibleProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((product) => `${product.name} ${product.category || ""} ${product.barcode || ""}`.toLowerCase().includes(q));
  }, [products, search]);

  const beginTracking = async (product: Product) => {
    setErrorMsg("");
    setSuccessMsg("");
    if (isDemoMode) {
      setProducts(products.map(p => p.id === product.id ? { ...p, track_expiry: !p.track_expiry } : p));
      setSuccessMsg(`Expiry tracking ${!product.track_expiry ? "enabled" : "disabled"} for ${product.name} (Demo Mode).`);
      return;
    }

    if (product.track_expiry) {
      try {
        setSavingTracking(true);
        const { error } = await supabase.rpc("set_product_expiry_tracking", {
          p_business_id: businessId,
          p_product_id: product.id,
          p_enabled: false,
          p_batch_number: null,
          p_expiry_date: null,
          p_manufacture_date: null,
        });
        if (error) throw error;
        setSuccessMsg(`Expiry tracking disabled for ${product.name}.`);
        await loadData(true);
      } catch (error: any) {
        setErrorMsg(error?.message || "Could not disable expiry tracking.");
      } finally {
        setSavingTracking(false);
      }
      return;
    }

    if (Number(product.stock_quantity || 0) > 0) {
      setTrackingProduct(product);
      setOpeningBatchNumber("");
      setOpeningManufactureDate("");
      setOpeningExpiryDate("");
      return;
    }

    try {
      setSavingTracking(true);
      const { error } = await supabase.rpc("set_product_expiry_tracking", {
        p_business_id: businessId,
        p_product_id: product.id,
        p_enabled: true,
        p_batch_number: null,
        p_expiry_date: null,
        p_manufacture_date: null,
      });
      if (error) throw error;
      setSuccessMsg(`Expiry tracking enabled for ${product.name}.`);
      await loadData(true);
    } catch (error: any) {
      setErrorMsg(error?.message || "Could not enable expiry tracking.");
    } finally {
      setSavingTracking(false);
    }
  };

  const saveOpeningBatch = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!trackingProduct) return;
    if (isDemoMode) {
      setProducts(products.map(p => p.id === trackingProduct.id ? { ...p, track_expiry: true } : p));
      setBatches([...batches, {
        id: `b-open-${Date.now()}`,
        business_id: businessId,
        product_id: trackingProduct.id,
        batch_number: openingBatchNumber || "DEMO-OPENING",
        expiry_date: openingExpiryDate || new Date().toISOString().split("T")[0],
        received_quantity: trackingProduct.stock_quantity,
        remaining_quantity: trackingProduct.stock_quantity,
        source_type: "opening_balance",
        received_at: new Date().toISOString(),
      }]);
      setTrackingProduct(null);
      setSuccessMsg(`Expiry tracking enabled for ${trackingProduct.name} with opening batch (Demo Mode).`);
      return;
    }

    if (Number(trackingProduct.stock_quantity || 0) > 0 && !openingExpiryDate) {
      setErrorMsg("Enter the expiry date for the existing stock before enabling tracking.");
      return;
    }
    if (openingManufactureDate && openingExpiryDate && openingManufactureDate > openingExpiryDate) {
      setErrorMsg("Manufacture date cannot be after expiry date.");
      return;
    }

    try {
      setSavingTracking(true);
      setErrorMsg("");
      const { error } = await supabase.rpc("set_product_expiry_tracking", {
        p_business_id: businessId,
        p_product_id: trackingProduct.id,
        p_enabled: true,
        p_batch_number: openingBatchNumber || null,
        p_expiry_date: openingExpiryDate || null,
        p_manufacture_date: openingManufactureDate || null,
      });
      if (error) throw error;
      setTrackingProduct(null);
      setSuccessMsg(`Expiry tracking enabled for ${trackingProduct.name}; existing stock was assigned to an opening batch.`);
      await loadData(true);
    } catch (error: any) {
      setErrorMsg(error?.message || "Could not enable expiry tracking.");
    } finally {
      setSavingTracking(false);
    }
  };

  const submitDisposal = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!disposeBatch) return;
    const quantity = Number(disposeQuantity);
    if (!Number.isFinite(quantity) || quantity <= 0 || quantity > Number(disposeBatch.remaining_quantity)) {
      setErrorMsg("Enter a positive disposal quantity no greater than this batch's remaining quantity.");
      return;
    }
    if (!disposeReason.trim()) {
      setErrorMsg("Enter a disposal reason.");
      return;
    }

    if (isDemoMode) {
      setBatches(batches.map(b => b.id === disposeBatch.id ? { ...b, remaining_quantity: b.remaining_quantity - quantity } : b).filter(b => b.remaining_quantity > 0));
      setSuccessMsg(`Disposed ${quantity} units from batch (Demo Mode).`);
      setDisposeBatch(null);
      return;
    }

    try {
      setDisposing(true);
      setErrorMsg("");
      const { error } = await supabase.rpc("dispose_product_batch", {
        p_business_id: businessId,
        p_batch_id: disposeBatch.id,
        p_quantity: quantity,
        p_reason: disposeReason.trim(),
      });
      if (error) throw error;
      setSuccessMsg(`Disposed ${quantity} ${productById.get(disposeBatch.product_id)?.unit || "units"} from the selected batch. The stock movement was recorded.`);
      setDisposeBatch(null);
      setDisposeQuantity("");
      setDisposeReason("Expired stock");
      await loadData(true);
    } catch (error: any) {
      setErrorMsg(error?.message || "Could not dispose batch stock.");
    } finally {
      setDisposing(false);
    }
  };

  const openDisposal = (batch: ProductBatch) => {
    setDisposeBatch(batch);
    setDisposeQuantity(String(batch.remaining_quantity));
    setDisposeReason(daysUntil(batch.expiry_date) < 0 ? "Expired stock" : "Expiry-risk stock disposal");
    setErrorMsg("");
    setSuccessMsg("");
  };

  return (
    <SharedDashboardLayout
      businessName={business?.name || "TWEB"}
      userName={userName}
      role={role}
      pageTitle="Expiry & Batch Stock"
    >
      <div className="mx-auto max-w-7xl space-y-5 pb-20">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-emerald-700">
              <CalendarClock className="h-5 w-5" />
              <span className="text-[10px] font-black uppercase tracking-widest">Inventory control</span>
            </div>
            <h2 className="mt-1 text-2xl font-black text-slate-900">Expiry & Batch Management</h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-500">Track batches separately, sell eligible stock by earliest expiry, and record expired-stock disposal with an audit trail.</p>
          </div>
          <button type="button" onClick={() => void loadData(true)} disabled={refreshing || loading} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60">
            {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh
          </button>
        </div>

        {errorMsg && <div role="alert" className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-800"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><span>{errorMsg}</span><button type="button" className="ml-auto" onClick={() => setErrorMsg("")} aria-label="Dismiss error"><X className="h-4 w-4" /></button></div>}
        {successMsg && <div role="status" className="flex items-start gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /><span>{successMsg}</span><button type="button" className="ml-auto" onClick={() => setSuccessMsg("")} aria-label="Dismiss success"><X className="h-4 w-4" /></button></div>}

        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center justify-between text-xs font-bold text-slate-500">Expired stock<AlertTriangle className="h-4 w-4 text-rose-600" /></div><div className="mt-2 text-3xl font-black text-rose-700">{loading ? "—" : expiredBatches.length}</div><div className="mt-1 text-xs text-slate-500">Batches past expiry</div></div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center justify-between text-xs font-bold text-slate-500">Expires in 7 days<Clock3 className="h-4 w-4 text-amber-600" /></div><div className="mt-2 text-3xl font-black text-amber-700">{loading ? "—" : dueSevenDays.length}</div><div className="mt-1 text-xs text-slate-500">Includes today</div></div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center justify-between text-xs font-bold text-slate-500">Expires in 30 days<CalendarClock className="h-4 w-4 text-yellow-600" /></div><div className="mt-2 text-3xl font-black text-yellow-700">{loading ? "—" : dueThirtyDays.length}</div><div className="mt-1 text-xs text-slate-500">Review soon</div></div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center justify-between text-xs font-bold text-slate-500">Tracked products<Package className="h-4 w-4 text-emerald-700" /></div><div className="mt-2 text-3xl font-black text-emerald-700">{loading ? "—" : trackedProducts.length}</div><div className="mt-1 text-xs text-slate-500">With expiry controls enabled</div></div>
        </div>

        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setView("batches")} className={`rounded-xl px-4 py-2.5 text-sm font-bold ${view === "batches" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>Expiry report</button>
            <button type="button" onClick={() => setView("products")} className={`rounded-xl px-4 py-2.5 text-sm font-bold ${view === "products" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>Product tracking</button>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative min-w-48 flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search product or batch..." className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-emerald-500" /></div>
            {view === "batches" && <select value={filter} onChange={(event) => setFilter(event.target.value as ExpiryFilter)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-emerald-500"><option value="ALL">All expiry dates</option><option value="EXPIRED">Expired</option><option value="TODAY">Expires today</option><option value="7">In 1–7 days</option><option value="30">In 8–30 days</option><option value="60">In 31–60 days</option><option value="90">In 61–90 days</option><option value="LATER">Over 90 days</option></select>}
          </div>
        </div>

        {loading ? <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm font-semibold text-slate-500"><Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin" />Loading expiry data...</div> : view === "batches" ? (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {visibleBatches.length === 0 ? <div className="p-12 text-center"><Package className="mx-auto mb-3 h-8 w-8 text-slate-300" /><h3 className="font-bold text-slate-800">No batches match this view</h3><p className="mt-1 text-sm text-slate-500">Enable expiry tracking and record batches when receiving stock.</p></div> : <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500"><tr><th className="px-4 py-3">Product / Batch</th><th className="px-4 py-3">Expiry</th><th className="px-4 py-3">Remaining</th><th className="px-4 py-3">Source</th><th className="px-4 py-3">Action</th></tr></thead><tbody className="divide-y divide-slate-100">{visibleBatches.map((batch) => { const product = productById.get(batch.product_id); const days = daysUntil(batch.expiry_date); return <tr key={batch.id} className="align-top"><td className="px-4 py-4"><div className="font-bold text-slate-900">{product?.name || "Unknown product"}</div><div className="mt-1 text-xs text-slate-500">{batch.batch_number ? `Batch: ${batch.batch_number}` : "No batch number"} · {product?.category || "Uncategorized"}</div></td><td className="px-4 py-4"><div className="font-semibold text-slate-800">{batch.expiry_date}</div><span className={`mt-1 inline-flex rounded-full border px-2 py-1 text-[10px] font-bold ${expiryTone(days)}`}>{expiryLabel(days)}</span></td><td className="px-4 py-4"><div className="font-black text-slate-900">{Number(batch.remaining_quantity).toLocaleString("en-IN")} <span className="font-semibold text-slate-500">{product?.unit || "units"}</span></div><div className="mt-1 text-xs text-slate-500">Received: {Number(batch.received_quantity).toLocaleString("en-IN")}</div></td><td className="px-4 py-4"><div className="text-xs font-bold text-slate-700">{batch.source_type.replaceAll("_", " ")}</div><div className="mt-1 text-[11px] text-slate-500">{batch.purchase_bill_id ? `Bill ${batch.purchase_bill_id.slice(0, 8)}` : `Received ${new Date(batch.received_at).toLocaleDateString()}`}</div></td><td className="px-4 py-4">{isOwnerOrAdmin ? <button type="button" onClick={() => openDisposal(batch)} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 text-xs font-bold text-rose-700 hover:bg-rose-100"><Trash2 className="h-3.5 w-3.5" />Dispose</button> : <span className="text-xs text-slate-400">Admin action</span>}</td></tr>; })}</tbody></table></div>}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">{visibleProducts.map((product) => <div key={product.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="font-black text-slate-900">{product.name}</div><div className="mt-1 text-xs text-slate-500">{product.category || "Uncategorized"} · Stock: {Number(product.stock_quantity || 0).toLocaleString("en-IN")} {product.unit || "units"}</div></div><span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-black ${product.track_expiry ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-100 text-slate-600"}`}>{product.track_expiry ? "EXPIRY ON" : "EXPIRY OFF"}</span></div><div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-100 pt-3"><div className="text-xs text-slate-500">{product.track_expiry ? `${batches.filter((batch) => batch.product_id === product.id).length} active batch(es)` : "Uses the existing stock flow until enabled."}</div>{isOwnerOrAdmin ? <button type="button" onClick={() => void beginTracking(product)} disabled={savingTracking} className={`min-h-10 rounded-xl px-3 text-xs font-bold disabled:opacity-60 ${product.track_expiry ? "border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100" : "bg-emerald-600 text-white hover:bg-emerald-700"}`}>{savingTracking ? "Saving..." : product.track_expiry ? "Disable tracking" : "Enable tracking"}</button> : <span className="inline-flex items-center gap-1 text-xs text-slate-400"><ShieldCheck className="h-3.5 w-3.5" />Owner/Admin only</span>}</div></div>)}</div>
        )}

        {!loading && <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-xs leading-relaxed text-blue-900"><div className="flex items-center gap-2 font-black"><ShieldCheck className="h-4 w-4" />How expiry tracking works</div><p className="mt-1">Each receipt creates a separate batch. Checkout uses FEFO (earliest expiry first) for tracked products and rejects expired or insufficient eligible batches. If a product already has stock when tracking is enabled, assign an opening batch date instead of guessing. Stock-count adjustments for tracked items require batch reconciliation so totals remain consistent.</p></div>}
      </div>

      {trackingProduct && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4" role="dialog" aria-modal="true" aria-labelledby="opening-batch-title"><form onSubmit={saveOpeningBatch} className="w-full max-w-lg space-y-4 rounded-3xl bg-white p-5 shadow-2xl sm:p-6"><div className="flex items-start justify-between gap-3"><div><h3 id="opening-batch-title" className="text-lg font-black text-slate-900">Enable expiry tracking</h3><p className="mt-1 text-sm text-slate-500">{trackingProduct.name} has {Number(trackingProduct.stock_quantity || 0)} existing units. Assign them to a real batch.</p></div><button type="button" onClick={() => setTrackingProduct(null)} className="rounded-lg p-1 text-slate-500 hover:bg-slate-100" aria-label="Close"><X className="h-5 w-5" /></button></div><div><label className="mb-1 block text-xs font-bold text-slate-600">Batch / lot number (optional)</label><input value={openingBatchNumber} onChange={(event) => setOpeningBatchNumber(event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-emerald-500" placeholder="e.g. LOT-2026-08" /></div><div><label className="mb-1 block text-xs font-bold text-slate-600">Manufacture date (optional)</label><input type="date" value={openingManufactureDate} onChange={(event) => setOpeningManufactureDate(event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-emerald-500" /></div><div><label className="mb-1 block text-xs font-bold text-slate-600">Expiry date <span className="text-rose-600">*</span></label><input type="date" required={Number(trackingProduct.stock_quantity || 0) > 0} value={openingExpiryDate} onChange={(event) => setOpeningExpiryDate(event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-emerald-500" /></div><p className="rounded-xl bg-amber-50 p-3 text-xs leading-relaxed text-amber-800">TWEB will create an opening batch equal to the current stock count. The aggregate product quantity will not change. Verify the expiry date from the product packaging first.</p><div className="flex justify-end gap-2"><button type="button" onClick={() => setTrackingProduct(null)} className="min-h-11 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-600">Cancel</button><button type="submit" disabled={savingTracking} className="min-h-11 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white disabled:opacity-60">{savingTracking ? "Saving..." : "Enable tracking"}</button></div></form></div>}

      {disposeBatch && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4" role="dialog" aria-modal="true" aria-labelledby="dispose-batch-title"><form onSubmit={submitDisposal} className="w-full max-w-lg space-y-4 rounded-3xl bg-white p-5 shadow-2xl sm:p-6"><div className="flex items-start justify-between gap-3"><div><h3 id="dispose-batch-title" className="text-lg font-black text-slate-900">Record batch disposal</h3><p className="mt-1 text-sm text-slate-500">{productById.get(disposeBatch.product_id)?.name || "Product"} · expiry {disposeBatch.expiry_date}</p></div><button type="button" onClick={() => setDisposeBatch(null)} className="rounded-lg p-1 text-slate-500 hover:bg-slate-100" aria-label="Close"><X className="h-5 w-5" /></button></div><div><label className="mb-1 block text-xs font-bold text-slate-600">Quantity to dispose</label><input type="number" min="0.001" step="0.001" max={disposeBatch.remaining_quantity} required value={disposeQuantity} onChange={(event) => setDisposeQuantity(event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-rose-500" /></div><div><label className="mb-1 block text-xs font-bold text-slate-600">Reason</label><textarea required value={disposeReason} onChange={(event) => setDisposeReason(event.target.value)} rows={3} className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-rose-500" /></div><p className="rounded-xl bg-rose-50 p-3 text-xs leading-relaxed text-rose-800">This records an audited stock movement and reduces both batch remaining quantity and aggregate stock in one transaction. It cannot be undone by deleting the history row.</p><div className="flex justify-end gap-2"><button type="button" onClick={() => setDisposeBatch(null)} className="min-h-11 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-600">Cancel</button><button type="submit" disabled={disposing} className="min-h-11 rounded-xl bg-rose-600 px-4 text-sm font-bold text-white disabled:opacity-60">{disposing ? "Recording..." : "Record disposal"}</button></div></form></div>}
    </SharedDashboardLayout>
  );
}
