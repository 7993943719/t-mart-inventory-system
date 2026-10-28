"use client";

import React, { useEffect, useState } from "react";
import { SharedDashboardLayout } from "@/components/layout/SharedDashboardLayout";
import { createClient } from "@/lib/supabase/client";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Loader2, AlertTriangle, Package, DollarSign, ShieldCheck, CalendarClock } from "lucide-react";

export default function BillReviewPage() {
  const params = useParams();
  const router = useRouter();
  const billId = params.id as string;
  const [supabase] = useState(() => createClient());

  const [bill, setBill] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [business, setBusiness] = useState<any>(null);
  const [userName, setUserName] = useState("Admin");
  const [role, setRole] = useState("OWNER");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Map of product_id -> new selling price string
  const [sellingPrices, setSellingPrices] = useState<{ [productId: string]: string }>({});

  // Expiry & Batch tracking states per product ID
  const [productFlags, setProductFlags] = useState<{ [productId: string]: { track_expiry: boolean; name: string } }>({});
  const [batchNumbers, setBatchNumbers] = useState<{ [productId: string]: string }>({});
  const [manufactureDates, setManufactureDates] = useState<{ [productId: string]: string }>({});
  const [expiryDates, setExpiryDates] = useState<{ [productId: string]: string }>({});

  const fetchBillData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: memberships } = await supabase
        .from("business_members")
        .select("*, businesses(*)")
        .eq("user_id", user.id);

      if (memberships && memberships.length > 0) {
        setBusiness(memberships[0].businesses);
        setRole(memberships[0].role || "OWNER");
      }

      const { data: billData, error: billErr } = await supabase
        .from("purchase_bills")
        .select("*")
        .eq("id", billId)
        .single();

      if (billErr) throw billErr;
      setBill(billData);

      // Initialize selling prices and expiry flags state from bill items
      if (billData && billData.items) {
        const initialPrices: { [key: string]: string } = {};
        const initialFlags: { [key: string]: { track_expiry: boolean; name: string } } = {};

        for (const item of billData.items) {
          const prodId = item.product_id;
          const { data: prodData } = await supabase
            .from("products")
            .select("selling_price, track_expiry, name")
            .eq("id", prodId)
            .single();

          initialPrices[prodId] = prodData?.selling_price ? String(prodData.selling_price) : String(Number(item.landedCostPerUnit || item.purchase_price || 0) * 1.25);
          initialFlags[prodId] = {
            track_expiry: Boolean(prodData?.track_expiry),
            name: prodData?.name || item.name,
          };
        }
        setSellingPrices(initialPrices);
        setProductFlags(initialFlags);
      }
    } catch (err: any) {
      console.error("Error loading purchase bill review:", err);
      setErrorMsg(err.message || "Failed to load purchase bill review.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (billId) {
      fetchBillData();
    }
  }, [billId, supabase]);

  const handlePriceChange = (productId: string, val: string) => {
    setSellingPrices((prev) => ({ ...prev, [productId]: val }));
  };

  const handleBatchChange = (productId: string, field: "batch_number" | "manufacture_date" | "expiry_date", val: string) => {
    if (field === "batch_number") setBatchNumbers((prev) => ({ ...prev, [productId]: val }));
    if (field === "manufacture_date") setManufactureDates((prev) => ({ ...prev, [productId]: val }));
    if (field === "expiry_date") setExpiryDates((prev) => ({ ...prev, [productId]: val }));
  };

  const handleFinalizeAddStock = async () => {
    if (!business?.id || !bill) return;

    setSubmitting(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      // Validate selling prices and expiry details for tracked products
      const productUpdates = bill.items.map((item: any) => {
        const prodId = item.product_id;
        const rawPrice = sellingPrices[prodId];
        const newPrice = Number(rawPrice);
        const flag = productFlags[prodId];

        if (isNaN(newPrice) || newPrice < 0 || !isFinite(newPrice)) {
          throw new Error(`Invalid selling price for "${item.name}". Must be a valid non-negative number.`);
        }

        if (flag?.track_expiry) {
          const expDate = expiryDates[prodId];
          if (!expDate) {
            throw new Error(`Expiry date is required for tracked product "${item.name}". Please enter batch details.`);
          }
          const mfgDate = manufactureDates[prodId];
          if (mfgDate && mfgDate > expDate) {
            throw new Error(`Manufacture date cannot be after expiry date for "${item.name}".`);
          }
        }

        return {
          product_id: prodId,
          selling_price: newPrice,
          batch_number: batchNumbers[prodId] || null,
          manufacture_date: manufactureDates[prodId] || null,
          expiry_date: expiryDates[prodId] || null,
        };
      });

      const idempotencyKey = typeof window !== "undefined" && window.crypto && window.crypto.randomUUID
        ? window.crypto.randomUUID()
        : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = (Math.random() * 16) | 0;
            const v = c === 'x' ? r : (r & 0x3) | 0x8;
            return v.toString(16);
          });

      const { data: rpcResult, error: rpcError } = await supabase.rpc("finalize_purchase_bill_stock", {
        p_business_id: business.id,
        p_bill_id: billId,
        p_product_updates: productUpdates,
        p_idempotency_key: idempotencyKey,
      });

      if (rpcError) throw new Error(rpcError.message);
      if (rpcResult && rpcResult.error) throw new Error(rpcResult.error);

      setSuccessMsg("Stock added, batches created, and prices updated successfully!");
      setTimeout(() => {
        router.push(`/dashboard/stock/bills/${billId}`);
      }, 1500);
    } catch (err: any) {
      console.error("Failed to finalize stock:", err);
      setErrorMsg(err.message || "Failed to finalize stock.");
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SharedDashboardLayout businessName={business?.name || "TWEB"} userName={userName} role={role} pageTitle="Purchase Bill Review">
        <div className="p-16 text-center text-xs text-slate-400">Loading purchase bill review...</div>
      </SharedDashboardLayout>
    );
  }

  if (!bill) {
    return (
      <SharedDashboardLayout businessName={business?.name || "TWEB"} userName={userName} role={role} pageTitle="Purchase Bill Review">
        <div className="p-16 text-center space-y-3">
          <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">Purchase bill not found</h3>
          <button onClick={() => router.push("/dashboard/stock")} className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold">
            Back to Stock
          </button>
        </div>
      </SharedDashboardLayout>
    );
  }

  const isAlreadyAdded = bill.status === "stock_added";

  return (
    <SharedDashboardLayout
      businessName={business?.name || "TWEB"}
      userName={userName}
      role={role}
      pageTitle="Purchase Bill Review & Selling Prices"
    >
      <div className="max-w-4xl mx-auto space-y-6 pb-20 text-xs">
        {/* HEADER */}
        <div className="flex justify-between items-center bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push(`/dashboard/stock/bills/${billId}`)}
              className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <span className="text-[10px] font-black uppercase px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full">
                {isAlreadyAdded ? "Stock Added" : "Pending Stock Addition"}
              </span>
              <h2 className="text-xl font-black text-slate-900 mt-1">Invoice #{bill.invoice_no}</h2>
              <p className="text-[11px] text-slate-400">Supplier: {bill.supplier_name || "Unknown Vendor"} • Date: {bill.invoice_date || "N/A"}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-slate-400 font-bold uppercase">Product Purchase Total</p>
            <p className="text-lg font-black text-slate-900">₹{Number(bill.total_amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
          </div>
        </div>

        {isAlreadyAdded && (
          <div className="p-4 bg-blue-50 border border-blue-200 text-blue-800 rounded-2xl text-xs font-bold flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0" />
            <span>Stock has already been added for this purchase bill. You are viewing the final record.</span>
          </div>
        )}

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

        {/* PRODUCTS TABLE / CARDS */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden space-y-4 p-6">
          <h3 className="font-extrabold text-slate-900 text-sm">Review Products, Batch Details & Set Selling Prices</h3>

          <div className="space-y-4">
            {(bill.items || []).map((item: any, idx: number) => {
              const qty = Number(item.quantity || 0);
              const purPrice = Number(item.purchase_price || 0);
              const landedCost = Number(item.landedCostPerUnit || purPrice);
              const allocExp = Number(item.allocatedExpense || 0);
              const sellPriceStr = sellingPrices[item.product_id] ?? "";
              const sellPrice = Number(sellPriceStr) || 0;
              const profitPerUnit = sellPrice - landedCost;
              const margin = sellPrice > 0 ? (profitPerUnit / sellPrice) * 100 : 0;
              const isTracked = Boolean(productFlags[item.product_id]?.track_expiry);

              return (
                <div key={idx} className="p-4 bg-slate-50 rounded-2xl border space-y-3">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-black text-slate-900 text-sm">{item.name}</h4>
                        {isTracked && (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-black rounded-md flex items-center gap-1 border border-amber-300">
                            <CalendarClock className="w-3 h-3" /> Expiry Tracked
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] font-mono text-slate-400">Qty: {qty} • Purchase Price: ₹{purPrice.toFixed(2)}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] font-bold text-purple-700">Allocated Exp: ₹{allocExp.toFixed(2)}</span>
                      <span className="block font-black text-emerald-600 text-xs">Landed Cost: ₹{landedCost.toFixed(4)}/unit</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">New Selling Price (₹)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        disabled={isAlreadyAdded || submitting}
                        value={sellPriceStr}
                        onChange={(e) => handlePriceChange(item.product_id, e.target.value)}
                        className="w-full h-10 px-3 border border-slate-300 rounded-xl bg-white font-black text-slate-900 outline-none focus:border-blue-600 disabled:bg-slate-100"
                        placeholder="0.00"
                      />
                    </div>

                    <div className="p-2.5 bg-white rounded-xl border border-slate-200 flex flex-col justify-center">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Profit / Unit</span>
                      <span className={`font-black text-xs ${profitPerUnit >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                        ₹{profitPerUnit.toFixed(2)}
                      </span>
                    </div>

                    <div className="p-2.5 bg-white rounded-xl border border-slate-200 flex flex-col justify-center">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Profit Margin</span>
                      <span className={`font-black text-xs ${margin >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                        {margin.toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  {/* BATCH & EXPIRY INPUTS IF TRACKED */}
                  {isTracked && !isAlreadyAdded && (
                    <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl space-y-2 mt-2">
                      <div className="text-[10px] font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1">
                        <CalendarClock className="w-3.5 h-3.5" /> Batch & Expiry Entry Required
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-amber-900 mb-1">Batch Number</label>
                          <input
                            type="text"
                            placeholder="e.g. LOT-2026-A"
                            value={batchNumbers[item.product_id] || ""}
                            onChange={(e) => handleBatchChange(item.product_id, "batch_number", e.target.value)}
                            className="w-full h-9 px-2.5 border border-amber-300 rounded-lg bg-white text-xs outline-none focus:border-amber-600"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-amber-900 mb-1">Mfg Date (Opt)</label>
                          <input
                            type="date"
                            value={manufactureDates[item.product_id] || ""}
                            onChange={(e) => handleBatchChange(item.product_id, "manufacture_date", e.target.value)}
                            className="w-full h-9 px-2.5 border border-amber-300 rounded-lg bg-white text-xs outline-none focus:border-amber-600"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-amber-900 mb-1">Expiry Date *</label>
                          <input
                            type="date"
                            required
                            min={new Date().toISOString().split("T")[0]}
                            value={expiryDates[item.product_id] || ""}
                            onChange={(e) => handleBatchChange(item.product_id, "expiry_date", e.target.value)}
                            className="w-full h-9 px-2.5 border border-amber-300 rounded-lg bg-white text-xs outline-none focus:border-amber-600 font-bold text-amber-900"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {!isAlreadyAdded && (
            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={handleFinalizeAddStock}
                disabled={submitting}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md transition cursor-pointer flex items-center gap-2 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Adding Stock & Creating Batches...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirm & Add Stock To Inventory</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </SharedDashboardLayout>
  );
}
