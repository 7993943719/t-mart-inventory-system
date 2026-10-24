"use client";

import React, { useEffect, useState } from "react";
import { SharedDashboardLayout } from "@/components/layout/SharedDashboardLayout";
import { createClient } from "@/lib/supabase/client";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Loader2, AlertTriangle, Package, DollarSign, ShieldCheck } from "lucide-react";

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

      // Initialize selling prices state from bill items or product catalog
      if (billData && billData.items) {
        const initialPrices: { [key: string]: string } = {};
        for (const item of billData.items) {
          const prodId = item.product_id;
          // Fetch current product selling price if available
          const { data: prodData } = await supabase
            .from("products")
            .select("selling_price")
            .eq("id", prodId)
            .single();

          initialPrices[prodId] = prodData?.selling_price ? String(prodData.selling_price) : String(Number(item.landedCostPerUnit || item.purchase_price || 0) * 1.25);
        }
        setSellingPrices(initialPrices);
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

  const handleFinalizeAddStock = async () => {
    if (!business?.id || !bill) return;

    setSubmitting(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      // Validate selling prices
      const productUpdates = bill.items.map((item: any) => {
        const prodId = item.product_id;
        const rawPrice = sellingPrices[prodId];
        const newPrice = Number(rawPrice);

        if (isNaN(newPrice) || newPrice < 0 || !isFinite(newPrice)) {
          throw new Error(`Invalid selling price for "${item.name}". Must be a valid non-negative number.`);
        }

        return {
          product_id: prodId,
          selling_price: newPrice,
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

      setSuccessMsg("Stock added and prices updated successfully!");
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
          <h3 className="font-extrabold text-slate-900 text-sm">Review Products & Set Selling Prices</h3>

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

              return (
                <div key={idx} className="p-4 bg-slate-50 rounded-2xl border space-y-3">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <h4 className="font-black text-slate-900 text-sm">{item.name}</h4>
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
                        className="w-full h-11 bg-white border border-slate-200 rounded-xl px-3 font-bold text-slate-900 outline-none focus:border-blue-600 disabled:opacity-60"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Est. Profit / Unit</span>
                      <span className={`block py-2.5 font-black text-xs ${profitPerUnit >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                        ₹{profitPerUnit.toFixed(2)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Est. Margin</span>
                      <span className={`block py-2.5 font-black text-xs ${margin >= 0 ? "text-blue-600" : "text-rose-600"}`}>
                        {margin.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {!isAlreadyAdded && (
            <div className="pt-4 border-t flex gap-3">
              <button
                type="button"
                onClick={() => router.push(`/dashboard/stock/bills/${billId}`)}
                disabled={submitting}
                className="flex-1 py-3.5 border rounded-2xl font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                View Bill Details
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleFinalizeAddStock}
                className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl shadow-md transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm & Add Stock"}
              </button>
            </div>
          )}
        </div>
      </div>
    </SharedDashboardLayout>
  );
}
