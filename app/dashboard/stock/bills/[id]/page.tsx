"use client";

import React, { useEffect, useState, useRef } from "react";
import { SharedDashboardLayout } from "@/components/layout/SharedDashboardLayout";
import { createClient } from "@/lib/supabase/client";
import { useParams, useRouter } from "next/navigation";
import { ReceiptText, ArrowLeft, Printer, Building, Calendar, CheckCircle2, Loader2, Plus, DollarSign, X, Edit } from "lucide-react";

export default function BillDetailPage() {
  const params = useParams();
  const router = useRouter();
  const billId = params.id as string;
  const [supabase] = useState(() => createClient());

  const [bill, setBill] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [business, setBusiness] = useState<any>(null);
  const [userName, setUserName] = useState("Admin");
  const [role, setRole] = useState("OWNER");

  // Record Payment Modal State
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [payAmount, setPayAmount] = useState<string>("");
  const [payMethod, setPayMethod] = useState("CASH");
  const [payDate, setPayDate] = useState(new Date().toISOString().split("T")[0]);
  const [payRef, setPayRef] = useState("");
  const [payNotes, setPayNotes] = useState("");
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const isSubmittingRef = useRef(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const fetchBillAndPayments = async () => {
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

      const [billRes, payRes] = await Promise.all([
        supabase.from("purchase_bills").select("*").eq("id", billId).single(),
        supabase.from("purchase_payments").select("*").eq("purchase_bill_id", billId).order("payment_date", { ascending: false }),
      ]);

      if (billRes.error) throw billRes.error;
      setBill(billRes.data);
      setPayments(payRes.data || []);
    } catch (err: any) {
      console.error("Error fetching purchase bill details:", err);
      setErrorMsg(err.message || "Failed to load bill details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (billId) {
      fetchBillAndPayments();
    }
  }, [billId, supabase]);

  const handleRecordPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingRef.current || submittingPayment) return;
    isSubmittingRef.current = true;
    setSubmittingPayment(true);

    setErrorMsg("");
    setSuccessMsg("");

    try {
      const amt = Number(payAmount);
      if (isNaN(amt) || amt <= 0) {
        throw new Error("Please enter a valid positive payment amount.");
      }

      const bizId = business?.id;
      if (!bizId) throw new Error("Business context not found.");

      if (typeof window === "undefined" || !window.crypto || !window.crypto.randomUUID) {
        throw new Error("Secure cryptographic randomUUID is required for payment processing.");
      }

      const attemptStorageKey = `tweb_pay_attempt_${bizId}_${billId}`;
      let activeAttempt: { key: string; payload: string } | null = null;

      try {
        const raw = sessionStorage.getItem(attemptStorageKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed.key === "string" && typeof parsed.payload === "string" && parsed.key.trim() && parsed.payload.trim()) {
            activeAttempt = parsed;
          } else {
            throw new Error("Corrupted or malformed payment attempt record in session storage.");
          }
        }
      } catch (storageErr: any) {
        throw new Error(storageErr.message || "Failed to read payment session storage. Cannot process payment safely.");
      }

      const currentPayload = JSON.stringify({
        bizId,
        billId,
        amount: amt,
        paymentMethod: payMethod,
        paymentDate: payDate,
        reference: payRef.trim() || null,
        notes: payNotes.trim() || null,
      });

      let currentKey = activeAttempt?.key || "";
      if (!currentKey) {
        currentKey = window.crypto.randomUUID();
        activeAttempt = { key: currentKey, payload: currentPayload };
        try {
          sessionStorage.setItem(attemptStorageKey, JSON.stringify(activeAttempt));
        } catch (e) {
          throw new Error("Failed to persist payment attempt record.");
        }
      } else if (activeAttempt && activeAttempt.payload !== currentPayload) {
        throw new Error("Payment details were modified while a previous payment attempt was pending. Please verify the payment history ledger before resetting or starting a new attempt.");
      }

      const { data: rpcResult, error: rpcError } = await supabase.rpc("record_purchase_payment", {
        p_business_id: bizId,
        p_purchase_bill_id: billId,
        p_amount: amt,
        p_payment_method: payMethod,
        p_payment_date: payDate,
        p_reference: payRef.trim() || null,
        p_notes: payNotes.trim() || null,
        p_idempotency_key: currentKey,
      });

      if (rpcError) throw new Error(rpcError.message);
      if (rpcResult && rpcResult.error) throw new Error(rpcResult.error);

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!rpcResult || rpcResult.success !== true || !rpcResult.payment_id || !uuidRegex.test(rpcResult.payment_id)) {
        throw new Error("Invalid or incomplete response from payment server.");
      }

      setSuccessMsg(rpcResult?.duplicate_prevented ? "Payment already recorded (duplicate prevented)." : "Payment recorded successfully!");
      setPaymentModalOpen(false);
      setPayAmount("");
      setPayRef("");
      setPayNotes("");
      try {
        sessionStorage.removeItem(attemptStorageKey);
      } catch (e) {}

      try {
        await fetchBillAndPayments();
      } catch (refreshErr) {
        console.error("Post-payment fetch warning:", refreshErr);
      }

      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: any) {
      console.error("Failed to record payment:", err);
      setErrorMsg(err.message || "Failed to record payment.");
    } finally {
      isSubmittingRef.current = false;
      setSubmittingPayment(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Calculate Payment Totals & Status
  const totalBillAmount = Number(bill?.total_amount || 0);
  const ledgerPaid = payments.reduce(
    (sum, p) => sum + Number(p.amount || 0),
    0
  );

  const initialPaymentMeta = (bill?.expenses || []).find(
    (e: any) => e.name === "_payment_metadata"
  );
  const initialPaid = initialPaymentMeta
    ? Number(initialPaymentMeta.amount || 0)
    : 0;

  const hasLedgerInitialPayment = payments.some(
    (p) => p.reference === "Initial Checkout Payment"
  );

  const totalPaid = hasLedgerInitialPayment
    ? ledgerPaid
    : ledgerPaid + initialPaid;

  const balanceDue = Math.max(
    0,
    Number((totalBillAmount - totalPaid).toFixed(2))
  );

  // Extract promised date & initial payment method if stored in metadata
  let initialMethod = "CASH";
  let promisedDate = "";
  if (initialPaymentMeta?.note) {
    const parts = initialPaymentMeta.note.split("|");
    if (parts.length >= 1) initialMethod = parts[0];
    if (parts.length >= 4) promisedDate = parts[3];
  }

  // Determine Payment Status & Overdue
  let baseStatus: "PAID" | "UNPAID" | "PARTIALLY PAID" = "PAID";
  if (totalBillAmount === 0 || totalPaid >= totalBillAmount) {
    baseStatus = "PAID";
  } else if (totalPaid > 0) {
    baseStatus = "PARTIALLY PAID";
  } else {
    baseStatus = "UNPAID";
  }

  const isOverdue = balanceDue > 0 && promisedDate && new Date(promisedDate) < new Date(new Date().toDateString());
  const displayStatus = isOverdue ? `${baseStatus} (OVERDUE)` : baseStatus;

  return (
    <SharedDashboardLayout
      businessName={business?.name || "TWEB"}
      userName={userName}
      role={role}
      pageTitle="Purchase Bill Details"
    >
      <div className="max-w-4xl mx-auto space-y-6 pb-20">
        <div className="flex justify-between items-center bg-white p-4 rounded-2xl border shadow-xs print:hidden">
          <button
            onClick={() => router.push("/dashboard/stock")}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-blue-600" /> Back to Stock
          </button>

          <div className="flex items-center gap-2">
            {balanceDue > 0 && (
              <button
                onClick={() => setPaymentModalOpen(true)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl flex items-center gap-1.5 shadow-md cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Record Payment
              </button>
            )}
            <button
              onClick={() => router.push(`/dashboard/stock/bills/${billId}/edit`)}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-black text-xs rounded-xl flex items-center gap-1.5 shadow-md cursor-pointer"
            >
              <Edit className="w-4 h-4" /> Edit Bill
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl flex items-center gap-1.5 shadow-md cursor-pointer"
            >
              <Printer className="w-4 h-4" /> Print Bill
            </button>
          </div>
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
          <div className="p-16 text-center text-xs text-slate-400">Loading purchase bill details...</div>
        ) : !bill ? (
          <div className="p-16 bg-white rounded-2xl border text-center space-y-2">
            <h3 className="text-sm font-bold text-slate-800">Bill not found</h3>
            <p className="text-xs text-slate-400">The requested purchase bill could not be located.</p>
          </div>
        ) : (
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xl space-y-6">
            <div className="flex justify-between items-start border-b pb-4 flex-wrap gap-3">
              <div>
                <div className="flex items-center gap-2 text-emerald-600">
                  <CheckCircle2 className="w-5 h-5" />
                  <h2 className="text-lg font-black text-slate-900">Purchase Bill Confirmed</h2>
                </div>
                <p className="text-xs font-mono text-blue-600 font-bold mt-1">Invoice: #{bill.invoice_no}</p>
                <p className="text-xs text-slate-500 mt-0.5">Vendor: <strong className="text-slate-900">{bill.supplier_name}</strong></p>
                <p className="text-[11px] text-slate-400">Date: {bill.invoice_date || new Date(bill.created_at).toLocaleDateString()}</p>
              </div>

              <div className="text-right space-y-1">
                <div className="flex items-center gap-2 justify-end">
                  <span className="px-3 py-1 bg-purple-50 text-purple-700 border border-purple-200 rounded-full text-[11px] font-black uppercase">
                    Allocation: {bill.allocation_method}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-[11px] font-black uppercase ${
                    isOverdue ? "bg-rose-100 text-rose-700 border border-rose-200" :
                    baseStatus === "PAID" ? "bg-emerald-100 text-emerald-700 border border-emerald-200" :
                    baseStatus === "PARTIALLY PAID" ? "bg-amber-100 text-amber-700 border border-amber-200" :
                    "bg-rose-50 text-rose-700 border border-rose-200"
                  }`}>
                    {displayStatus}
                  </span>
                </div>
                <p className="text-sm font-black text-slate-900 mt-1">Bill Total: ₹{totalBillAmount.toFixed(2)}</p>
                <p className="text-xs font-bold text-emerald-600">Paid: ₹{totalPaid.toFixed(2)} • Due: <span className={balanceDue > 0 ? "text-rose-600 font-black" : "text-slate-700"}>₹{balanceDue.toFixed(2)}</span></p>
                {promisedDate && balanceDue > 0 && (
                  <p className={`text-[11px] font-bold ${isOverdue ? "text-rose-600" : "text-slate-500"}`}>
                    Promised Date: {promisedDate} {isOverdue ? "(Overdue)" : ""}
                  </p>
                )}
              </div>
            </div>

            {/* PURCHASED PRODUCTS TABLE */}
            <div className="space-y-3">
              <h4 className="font-extrabold text-slate-900 uppercase text-xs tracking-wider">Purchased Products & Landed Cost</h4>
              <div className="border rounded-2xl overflow-hidden">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-slate-50 border-b text-slate-600 uppercase text-[10px]">
                    <tr>
                      <th className="p-3">Product Name</th>
                      <th className="p-3 text-center">Qty</th>
                      <th className="p-3 text-right">Purchase Price</th>
                      <th className="p-3 text-right">Allocated Exp</th>
                      <th className="p-3 text-right">Actual Cost / Unit</th>
                      <th className="p-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(bill.items || []).map((item: any, idx: number) => {
                      const qty = Number(item.quantity || 1);
                      const unitPrice = Number(item.purchase_price || 0);
                      const landedCost = Number(item.landedCostPerUnit || unitPrice);
                      const lineTotal = Number(item.productValue || (qty * landedCost));

                      return (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="p-3 font-extrabold text-slate-900">{item.name}</td>
                          <td className="p-3 text-center font-bold">{qty}</td>
                          <td className="p-3 text-right">₹{unitPrice.toFixed(2)}</td>
                          <td className="p-3 text-right text-purple-700 font-bold">₹{Number(item.allocatedExpense || 0).toFixed(2)}</td>
                          <td className="p-3 text-right font-black text-emerald-600">₹{landedCost.toFixed(2)}</td>
                          <td className="p-3 text-right font-black text-slate-900">₹{lineTotal.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* PAYMENT HISTORY */}
            <div className="space-y-3 pt-2">
              <div className="flex justify-between items-center">
                <h4 className="font-extrabold text-slate-900 uppercase text-xs tracking-wider">Payment History</h4>
                {balanceDue > 0 && (
                  <button
                    onClick={() => setPaymentModalOpen(true)}
                    className="text-xs font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
                  >
                    + Record Payment
                  </button>
                )}
              </div>
              <div className="border rounded-2xl overflow-hidden bg-slate-50/50">
                {payments.length === 0 && initialPaid === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400">No payments recorded yet.</div>
                ) : (
                  <table className="w-full text-xs text-left border-collapse">
                    <thead className="bg-slate-100 border-b text-slate-600 uppercase text-[10px]">
                      <tr>
                        <th className="p-3">Date</th>
                        <th className="p-3">Method</th>
                        <th className="p-3">Reference</th>
                        <th className="p-3">Notes</th>
                        <th className="p-3 text-right">Amount Paid</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {initialPaid > 0 && payments.length === 0 && (
                        <tr>
                          <td className="p-3 text-slate-500 font-mono">{bill.invoice_date || new Date(bill.created_at).toLocaleDateString()}</td>
                          <td className="p-3 font-bold uppercase text-slate-800">{initialMethod}</td>
                          <td className="p-3 text-slate-500">Initial Checkout Payment</td>
                          <td className="p-3 text-slate-400">N/A</td>
                          <td className="p-3 text-right font-black text-emerald-600">₹{initialPaid.toFixed(2)}</td>
                        </tr>
                      )}
                      {payments.map((p: any) => (
                        <tr key={p.id} className="hover:bg-slate-50">
                          <td className="p-3 text-slate-500 font-mono">{p.payment_date || new Date(p.created_at).toLocaleDateString()}</td>
                          <td className="p-3 font-bold uppercase text-slate-800">{p.payment_method}</td>
                          <td className="p-3 font-mono text-slate-600">{p.reference || "N/A"}</td>
                          <td className="p-3 text-slate-500">{p.notes || "N/A"}</td>
                          <td className="p-3 text-right font-black text-emerald-600">₹{Number(p.amount || 0).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2 print:hidden">
              <button
                onClick={() => router.push(`/dashboard/stock/bills/${billId}/edit`)}
                className="px-5 py-3 bg-amber-600 hover:bg-amber-700 text-white font-black text-xs rounded-2xl shadow-md transition flex items-center gap-1.5 cursor-pointer min-h-[44px]"
              >
                <Edit className="w-4 h-4" /> Edit Products & Expenses
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="p-4 bg-slate-50 rounded-2xl border space-y-2">
                <h4 className="text-xs font-black text-slate-800 uppercase">Purchase Expenses</h4>
                <div className="space-y-1 text-xs">
                  {(bill.expenses || []).filter((e: any) => e.name !== "_payment_metadata").map((exp: any, idx: number) => (
                    <div key={idx} className="flex justify-between text-slate-600">
                      <span>{exp.name} {exp.note ? `(${exp.note})` : ""}:</span>
                      <span className="font-bold text-slate-900">₹{Number(exp.amount || 0).toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="border-t pt-1 flex justify-between font-black text-slate-900 text-xs">
                    <span>Total Expenses:</span>
                    <span className="text-purple-700">₹{Number(bill.total_expenses || 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-2">
                <h4 className="text-xs font-black text-emerald-400 uppercase">Bill Summary</h4>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between text-slate-300"><span>Total Products:</span> <span>₹{(Number(bill.total_amount || 0) - Number(bill.total_expenses || 0)).toFixed(2)}</span></div>
                  <div className="flex justify-between text-slate-300"><span>Total Expenses:</span> <span>₹{Number(bill.total_expenses || 0).toFixed(2)}</span></div>
                  <div className="border-t border-slate-700 pt-2 flex justify-between text-sm font-black text-emerald-400">
                    <span>Final Bill Total:</span> <span>₹{totalBillAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-300 pt-1 border-t border-slate-800"><span>Total Paid:</span> <span>₹{totalPaid.toFixed(2)}</span></div>
                  <div className="flex justify-between text-slate-300"><span>Balance Due:</span> <span className={balanceDue > 0 ? "text-rose-400 font-black" : "text-emerald-400 font-bold"}>₹{balanceDue.toFixed(2)}</span></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* RECORD PAYMENT MODAL */}
      {paymentModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-5 text-xs">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-emerald-600" /> Record Supplier Payment
              </h3>
              <button onClick={() => setPaymentModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleRecordPaymentSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Payment Amount (₹) [Max: ₹{balanceDue.toFixed(2)}] *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={balanceDue}
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  placeholder={`e.g. ${balanceDue.toFixed(2)}`}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold outline-none focus:border-blue-600 h-11"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Payment Method</label>
                  <select
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none h-11 cursor-pointer"
                  >
                    <option value="CASH">CASH</option>
                    <option value="UPI">UPI</option>
                    <option value="BANK TRANSFER">BANK TRANSFER</option>
                    <option value="CREDIT">CREDIT</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Payment Date</label>
                  <input
                    type="date"
                    required
                    value={payDate}
                    onChange={(e) => setPayDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none h-11"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Reference No. (Optional)</label>
                <input
                  type="text"
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  placeholder="e.g. UTR12345678"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold outline-none focus:border-blue-600 h-11 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Notes (Optional)</label>
                <input
                  type="text"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  placeholder="e.g. Paid via manager"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold outline-none focus:border-blue-600 h-11"
                />
              </div>

              <div className="flex gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setPaymentModalOpen(false)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPayment}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-black rounded-xl shadow-md cursor-pointer min-h-[44px] flex items-center justify-center gap-1.5"
                >
                  {submittingPayment ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </SharedDashboardLayout>
  );
}
