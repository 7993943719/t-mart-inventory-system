"use client";

import React, { useEffect, useState } from "react";
import { SharedDashboardLayout } from "@/components/layout/SharedDashboardLayout";
import { createClient } from "@/lib/supabase/client";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Save, Plus, Trash2, Loader2, CheckCircle2, AlertTriangle, Calculator, FileText, Search } from "lucide-react";

export default function EditPurchaseBillPage() {
  const [supabase] = useState(() => createClient());
  const params = useParams();
  const router = useRouter();
  const billId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const [business, setBusiness] = useState<any>(null);
  const [userName, setUserName] = useState("Admin");
  const [role, setRole] = useState("OWNER");
  const [bill, setBill] = useState<any>(null);

  // Form State
  const [supplierName, setSupplierName] = useState("");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [allocationMethod, setAllocationMethod] = useState("equal");
  const [totalExpenses, setTotalExpenses] = useState<number>(0);
  const [items, setItems] = useState<any[]>([]);
  const [expensesList, setExpensesList] = useState<any[]>([]);

  // Product Catalog Modal
  const [catalogModalOpen, setCatalogModalOpen] = useState(false);
  const [catalogProducts, setCatalogProducts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const loadBillAndCatalog = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Please log in again.");

      const { data: memberships } = await supabase
        .from("business_members")
        .select("*, businesses(*)")
        .eq("user_id", user.id);

      let currentBiz = null;
      if (memberships && memberships.length > 0) {
        currentBiz = memberships[0].businesses;
        setBusiness(currentBiz);
        setRole(memberships[0].role || "OWNER");
      }

      const bizId = currentBiz?.id || user.id;

      const [billRes, prodRes] = await Promise.all([
        supabase.from("purchase_bills").select("*").eq("id", billId).single(),
        supabase.from("products").select("*").eq("business_id", bizId).order("name", { ascending: true })
      ]);

      if (billRes.error) throw billRes.error;
      const bData = billRes.data;
      setBill(bData);
      setSupplierName(bData.supplier_name || "");
      setInvoiceNo(bData.invoice_no || "");
      setInvoiceDate(bData.invoice_date || "");
      setAllocationMethod(bData.allocation_method || "equal");
      setTotalExpenses(Number(bData.total_expenses || 0));
      setItems(Array.isArray(bData.items) ? bData.items : []);
      setExpensesList(Array.isArray(bData.expenses) ? bData.expenses : []);

      setCatalogProducts(prodRes.data || []);
    } catch (err: any) {
      console.error("Failed to load bill for editing:", err);
      setErrorMsg(err.message || "Failed to load purchase bill.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (billId) {
      loadBillAndCatalog();
    }
  }, [billId, supabase]);

  // Add product from catalog
  const handleAddProductFromCatalog = (prod: any) => {
    const existingIdx = items.findIndex((i) => i.product_id === prod.id);
    if (existingIdx >= 0) {
      const updated = [...items];
      updated[existingIdx].quantity = Number(updated[existingIdx].quantity || 0) + 1;
      setItems(updated);
    } else {
      setItems([
        ...items,
        {
          product_id: prod.id,
          name: prod.name,
          quantity: 1,
          purchase_price: Number(prod.purchase_price || 100),
          weight: Number(prod.weight || prod.net_weight || 0),
        },
      ]);
    }
    setCatalogModalOpen(false);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: string, val: any) => {
    const updated = [...items];
    updated[index][field] = val;
    setItems(updated);
  };

  // Calculations
  const totalProductValue = items.reduce((sum, item) => sum + (Number(item.quantity || 0) * Number(item.purchase_price || 0)), 0);
  const totalQty = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const totalWeight = items.reduce((sum, item) => sum + Number(item.weight || 0), 0);

  // Calculate landed costs with exact rounding reconciliation
  const numItems = items.length;
  let runningExpSum = 0;

  const calculatedItems = items.map((item, idx) => {
    const qty = Number(item.quantity || 0);
    const price = Number(item.purchase_price || 0);
    const itemVal = qty * price;
    const w = Number(item.weight || 0);

    let allocatedExp = 0;
    if (numItems > 0) {
      if (idx === numItems - 1) {
        allocatedExp = Number((totalExpenses - runningExpSum).toFixed(4));
      } else {
        if (allocationMethod === "quantity" && totalQty > 0) {
          allocatedExp = Number((totalExpenses * (qty / totalQty)).toFixed(4));
        } else if (allocationMethod === "weight" && totalWeight > 0) {
          allocatedExp = Number((totalExpenses * (w / totalWeight)).toFixed(4));
        } else if (allocationMethod === "value" && totalProductValue > 0) {
          allocatedExp = Number((totalExpenses * (itemVal / totalProductValue)).toFixed(4));
        } else {
          allocatedExp = Number((totalExpenses / numItems).toFixed(4));
        }
        runningExpSum += allocatedExp;
      }
    }

    const landedCostPerUnit = qty > 0 ? Number((price + (allocatedExp / qty)).toFixed(4)) : price;

    return {
      ...item,
      allocatedExpense: allocatedExp,
      landedCostPerUnit,
      productValue: Number((qty * price).toFixed(2)),
    };
  });

  const finalBillTotal = Number((totalProductValue).toFixed(2));

  const handleSaveBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    if (items.length === 0) {
      setErrorMsg("Purchase bill must contain at least one item.");
      return;
    }

    if (items.some((i) => Number(i.quantity || 0) <= 0 || Number(i.purchase_price || 0) < 0)) {
      setErrorMsg("All items must have a positive quantity and non-negative purchase price.");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const bizId = business?.id;
      if (!bizId) throw new Error("Business context not found.");

      const payloadJson = {
        supplier_name: supplierName.trim() || "General Supplier",
        invoice_no: invoiceNo.trim() || "INV-001",
        invoice_date: invoiceDate || new Date().toISOString().split("T")[0],
        allocation_method: allocationMethod,
        total_expenses: Number(totalExpenses.toFixed(2)),
        total_amount: finalBillTotal,
        items: calculatedItems,
        expenses: expensesList,
      };

      const payloadHash = JSON.stringify(payloadJson); // simple hash or stringified for update

      const { error: updateErr } = await supabase
        .from("purchase_bills")
        .update({
          supplier_name: payloadJson.supplier_name,
          invoice_no: payloadJson.invoice_no,
          invoice_date: payloadJson.invoice_date,
          allocation_method: payloadJson.allocation_method,
          total_expenses: payloadJson.total_expenses,
          total_amount: payloadJson.total_amount,
          items: calculatedItems,
          expenses: expensesList,
          updated_at: new Date().toISOString(),
        })
        .eq("id", billId)
        .eq("business_id", bizId);

      if (updateErr) throw updateErr;

      setSuccessMsg("Purchase bill updated successfully!");
      setTimeout(() => {
        router.push(`/dashboard/stock/bills/${billId}`);
      }, 1200);
    } catch (err: any) {
      console.error("Failed to update purchase bill:", err);
      setErrorMsg(err.message || "Failed to update purchase bill.");
      setSubmitting(false);
    }
  };

  const filteredCatalog = catalogProducts.filter((p) =>
    p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.barcode?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SharedDashboardLayout
      businessName={business?.name || "TWEB"}
      userName={userName}
      role={role}
      pageTitle="Edit Purchase Bill"
    >
      <div className="max-w-4xl mx-auto space-y-6 pb-20 text-xs">
        {/* HEADER */}
        <div className="flex justify-between items-center bg-white p-4 rounded-2xl border shadow-xs">
          <button
            onClick={() => router.push(`/dashboard/stock/bills/${billId}`)}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-blue-600" /> Cancel & Back
          </button>
          <h2 className="text-base font-black text-slate-900">Edit Purchase Bill #{invoiceNo}</h2>
        </div>

        {successMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-bold">
            {successMsg}
          </div>
        )}

        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold">
            {errorMsg}
          </div>
        )}

        {loading ? (
          <div className="p-16 text-center text-xs text-slate-400">Loading purchase bill...</div>
        ) : (
          <form onSubmit={handleSaveBill} className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xl space-y-6">
            {/* INVOICE META */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Vendor / Supplier Name *</label>
                <input
                  type="text"
                  required
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3 font-semibold text-slate-900 outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Invoice Number *</label>
                <input
                  type="text"
                  required
                  value={invoiceNo}
                  onChange={(e) => setInvoiceNo(e.target.value)}
                  className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3 font-semibold text-slate-900 outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Invoice Date</label>
                <input
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3 font-semibold text-slate-900 outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Expense Allocation Method</label>
                <select
                  value={allocationMethod}
                  onChange={(e) => setAllocationMethod(e.target.value)}
                  className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3 font-semibold text-slate-900 outline-none focus:border-blue-600"
                >
                  <option value="equal">Equal Split</option>
                  <option value="quantity">By Quantity</option>
                  <option value="weight">By Weight</option>
                  <option value="value">By Product Value</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Total Operating Expenses (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={totalExpenses}
                  onChange={(e) => setTotalExpenses(Number(e.target.value))}
                  className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3 font-semibold text-slate-900 outline-none focus:border-blue-600"
                />
              </div>
            </div>

            {/* PRODUCT ITEMS SECTION */}
            <div className="space-y-4 pt-4 border-t">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-black text-slate-900 text-sm">Purchase Items</h3>
                  <p className="text-[11px] text-slate-400">Add, remove, or edit quantities and purchase prices.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setCatalogModalOpen(true)}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl text-xs transition cursor-pointer flex items-center gap-1.5 min-h-[40px]"
                >
                  <Plus className="w-4 h-4" /> Add Product
                </button>
              </div>

              {items.length === 0 ? (
                <div className="p-12 bg-slate-50 border border-dashed rounded-2xl text-center space-y-2">
                  <FileText className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="font-bold text-slate-700">No products in this purchase bill.</p>
                  <p className="text-slate-400 text-[11px]">Click "Add Product" above to include items from your catalog.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {calculatedItems.map((item, index) => (
                    <div key={index} className="p-4 bg-slate-50 rounded-2xl border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <div className="space-y-1 flex-1">
                        <span className="font-black text-slate-900 text-xs">{item.name}</span>
                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                          <span>Landed Cost: <strong className="text-emerald-600">₹{item.landedCostPerUnit}</strong></span>
                          <span>Alloc. Exp: <strong>₹{item.allocatedExpense}</strong></span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase">Qty</label>
                          <input
                            type="number"
                            step="any"
                            min="0.001"
                            required
                            value={item.quantity}
                            onChange={(e) => handleItemChange(index, "quantity", Number(e.target.value))}
                            className="w-20 h-9 bg-white border border-slate-200 rounded-lg px-2 font-bold text-xs"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase">Price (₹)</label>
                          <input
                            type="number"
                            step="any"
                            min="0"
                            required
                            value={item.purchase_price}
                            onChange={(e) => handleItemChange(index, "purchase_price", Number(e.target.value))}
                            className="w-24 h-9 bg-white border border-slate-200 rounded-lg px-2 font-bold text-xs"
                          />
                        </div>

                        {allocationMethod === "weight" && (
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase">Weight</label>
                            <input
                              type="number"
                              step="any"
                              min="0"
                              value={item.weight || 0}
                              onChange={(e) => handleItemChange(index, "weight", Number(e.target.value))}
                              className="w-20 h-9 bg-white border border-slate-200 rounded-lg px-2 font-bold text-xs"
                            />
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition cursor-pointer mt-4"
                          title="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* BILL TOTAL SUMMARY */}
            <div className="bg-slate-900 text-white p-5 rounded-2xl space-y-2 text-xs font-bold">
              <div className="flex justify-between"><span>Total Products Value:</span> <span>₹{totalProductValue.toFixed(2)}</span></div>
              <div className="flex justify-between"><span>Operating Expenses:</span> <span>₹{Number(totalExpenses).toFixed(2)}</span></div>
              <div className="border-t border-slate-700 pt-2 flex justify-between font-black text-emerald-400 text-sm">
                <span>Revised Bill Total:</span> <span>₹{(totalProductValue + Number(totalExpenses)).toFixed(2)}</span>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t">
              <button
                type="button"
                onClick={() => router.push(`/dashboard/stock/bills/${billId}`)}
                className="px-5 py-3 border rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-md cursor-pointer flex items-center gap-1.5"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Changes
              </button>
            </div>
          </form>
        )}

        {/* CATALOG MODAL */}
        {catalogModalOpen && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-4 text-xs max-h-[85vh] overflow-y-auto">
              <div className="flex justify-between items-center border-b pb-3">
                <h3 className="text-base font-black text-slate-900">Select Product from Catalog</h3>
                <button onClick={() => setCatalogModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                  ✕
                </button>
              </div>

              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none"
                />
              </div>

              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {filteredCatalog.map((prod) => (
                  <div key={prod.id} className="p-3 bg-slate-50 hover:bg-blue-50 rounded-2xl border flex justify-between items-center transition cursor-pointer" onClick={() => handleAddProductFromCatalog(prod)}>
                    <div>
                      <p className="font-extrabold text-slate-900 text-xs">{prod.name}</p>
                      <p className="text-[10px] text-slate-400">Barcode: {prod.barcode || "N/A"} • Stock: {prod.stock_quantity} {prod.unit}</p>
                    </div>
                    <span className="px-3 py-1.5 bg-blue-600 text-white font-bold rounded-xl text-[11px]">Select</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </SharedDashboardLayout>
  );
}
