"use client";

import React, { useEffect, useState } from "react";
import { SharedDashboardLayout } from "@/components/layout/SharedDashboardLayout";
import { createClient } from "@/lib/supabase/client";
import { ShoppingCart, Printer, Eye, Receipt, Trash2, Calendar, User, DollarSign, X, AlertCircle, CheckCircle2 } from "lucide-react";

export default function SalesPage() {
  const [supabase] = useState(() => createClient());
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [businessName, setBusinessName] = useState("TWEB");
  const [userName, setUserName] = useState("Admin");
  const [role, setRole] = useState("OWNER");

  // Selected Bill Modal for View/Print
  const [selectedBill, setSelectedBill] = useState<any | null>(null);
  const [billItems, setBillItems] = useState<any[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [loadingBillItems, setLoadingBillItems] = useState(false);

  // Delete Bill Confirmation Modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [saleToDelete, setSaleToDelete] = useState<any | null>(null);
  const [submittingDelete, setSubmittingDelete] = useState(false);

  // Toast messages
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const loadSalesData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: memberships } = await supabase
        .from("business_members")
        .select("*, businesses(*)")
        .eq("user_id", user.id);

      if (memberships && memberships.length > 0) {
        setBusinessName(memberships[0].businesses?.name || "TWEB");
        setRole(memberships[0].role || "OWNER");
      }

      const { data: prof } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      if (prof?.full_name) setUserName(prof.full_name);

      const { data: salesData, error } = await supabase
        .from("sales")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching sales:", error);
      } else {
        setSales(salesData || []);
      }
    } catch (err) {
      console.error("Failed to load bills", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSalesData();
  }, [supabase]);

  const handleViewBill = async (sale: any) => {
    setSelectedBill(sale);
    setModalOpen(true);
    setLoadingBillItems(true);
    setBillItems([]);

    try {
      const { data: items, error: itemsErr } = await supabase
        .from("sale_items")
        .select("*")
        .eq("sale_id", sale.id);

      if (itemsErr) throw itemsErr;

      if (!items || items.length === 0) {
        setBillItems([]);
        return;
      }

      // Enrich with product names
      const enriched = await Promise.all(
        items.map(async (item: any) => {
          let pName = item.product_name;
          if (!pName && item.product_id) {
            const { data: prod } = await supabase
              .from("products")
              .select("name")
              .eq("id", item.product_id)
              .single();
            if (prod?.name) pName = prod.name;
          }
          return {
            ...item,
            product_name: pName || "Product",
            quantity: Number(item.quantity || 1),
            selling_price: Number(item.selling_price || item.price || 0),
            total_amount: Number(item.total_amount || item.total || (Number(item.selling_price || item.price || 0) * Number(item.quantity || 1))),
          };
        })
      );

      setBillItems(enriched);
    } catch (err) {
      console.error("Failed to load bill items", err);
      setBillItems([]);
    } finally {
      setLoadingBillItems(false);
    }
  };

  const confirmDeleteBill = (sale: any) => {
    setSaleToDelete(sale);
    setDeleteModalOpen(true);
  };

  const handleConfirmDeleteBill = async () => {
    if (!saleToDelete) return;
    setSubmittingDelete(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const { error: itemsErr } = await supabase
        .from("sale_items")
        .delete()
        .eq("sale_id", saleToDelete.id);

      if (itemsErr) throw new Error(itemsErr.message);

      const { error: salesErr } = await supabase
        .from("sales")
        .delete()
        .eq("id", saleToDelete.id);

      if (salesErr) throw new Error(salesErr.message);

      setSuccessMsg("Bill deleted successfully.");
      setDeleteModalOpen(false);
      setSaleToDelete(null);
      loadSalesData();
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: any) {
      console.error("Error deleting bill:", err);
      setErrorMsg(err.message || "Failed to delete bill.");
      setTimeout(() => setErrorMsg(""), 4000);
    } finally {
      setSubmittingDelete(false);
    }
  };

  const handlePrint = async (sale: any, items: any[]) => {
    let printItems = items;
    if (!printItems || printItems.length === 0) {
      try {
        const { data: fetchedItems } = await supabase
          .from("sale_items")
          .select("*")
          .eq("sale_id", sale.id);

        if (fetchedItems) {
          printItems = await Promise.all(
            fetchedItems.map(async (item: any) => {
              let pName = item.product_name;
              if (!pName && item.product_id) {
                const { data: prod } = await supabase
                  .from("products")
                  .select("name")
                  .eq("id", item.product_id)
                  .single();
                if (prod?.name) pName = prod.name;
              }
              return {
                ...item,
                product_name: pName || "Product",
                quantity: Number(item.quantity || 1),
                selling_price: Number(item.selling_price || item.price || 0),
                total_amount: Number(item.total_amount || item.total || (Number(item.selling_price || item.price || 0) * Number(item.quantity || 1))),
              };
            })
          );
        }
      } catch (e) {
        console.error("Error fetching items for print:", e);
      }
    }

    const printWindow = window.open("", "_blank", "width=400,height=600");
    if (!printWindow) {
      alert("Please allow popups to print receipt.");
      return;
    }

    const billNo = sale.invoice_number || sale.bill_no || "BILL-0000";
    const dateStr = new Date(sale.created_at).toLocaleDateString();
    const customer = sale.customer_name || "Walk-in Customer";
    const subtotal = Number(sale.subtotal || sale.total_amount || 0);
    const discount = Number(sale.discount || 0);
    const total = Number(sale.total_amount || sale.total || 0);
    const payment = sale.payment_method || "Cash";

    let itemsHtml = "";
    (printItems || []).forEach((item) => {
      const name = item.product_name || item.name || "Product";
      const qty = item.quantity || 1;
      const price = Number(item.total_amount || item.total || (Number(item.selling_price || item.price || 0) * qty)).toFixed(2);
      itemsHtml += `
        <tr>
          <td style="padding: 4px 0; font-size: 12px; font-weight: bold;">${name}</td>
          <td style="padding: 4px 0; font-size: 12px; text-align: center;">${qty}</td>
          <td style="padding: 4px 0; font-size: 12px; text-align: right;">₹${price}</td>
        </tr>
      `;
    });

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt - ${billNo}</title>
          <style>
            body { font-family: 'Courier New', Courier, monospace; padding: 16px; color: #000; width: 280px; margin: 0 auto; background: #fff; }
            h2, p { text-align: center; margin: 2px 0; }
            h2 { font-size: 16px; font-weight: 900; }
            .meta { font-size: 11px; margin-bottom: 8px; }
            table { width: 100%; border-collapse: collapse; margin-top: 8px; margin-bottom: 8px; }
            th { text-align: left; border-bottom: 1px dashed #000; font-size: 11px; padding-bottom: 4px; }
            .line { border-top: 1px dashed #000; margin: 6px 0; }
            .totals { font-size: 12px; margin-top: 8px; }
            .row { display: flex; justify-content: space-between; margin: 3px 0; }
            .total-row { font-size: 14px; font-weight: bold; margin-top: 6px; }
          </style>
        </head>
        <body>
          <h2>TWEB</h2>
          <p style="font-size: 12px; font-weight: bold;">${businessName}</p>
          <p class="meta" style="margin-top: 6px;">Bill No: ${billNo}</p>
          <p class="meta">Date: ${dateStr}</p>
          <p class="meta">Customer: ${customer}</p>
          <div class="line"></div>
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th style="text-align: center;">Qty</th>
                <th style="text-align: right;">Price</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
          <div class="line"></div>
          <div class="totals">
            <div class="row"><span>Subtotal:</span> <span>₹${subtotal.toFixed(2)}</span></div>
            <div class="row"><span>Discount:</span> <span>₹${discount.toFixed(2)}</span></div>
            <div class="line"></div>
            <div class="row total-row"><span>TOTAL:</span> <span>₹${total.toFixed(2)}</span></div>
            <p style="font-size: 11px; margin-top: 8px;">Payment: ${payment}</p>
          </div>
          <p style="text-align: center; font-size: 11px; margin-top: 16px;">Thank you for shopping!</p>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayBills = sales.filter((s) => new Date(s.created_at) >= todayStart);
  const todaySalesTotal = todayBills.reduce((sum, s) => sum + Number(s.total_amount || s.total || 0), 0);

  return (
    <SharedDashboardLayout
      businessName={businessName}
      userName={userName}
      role={role}
      pageTitle="Bills"
    >
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-2xl text-xs font-bold mb-6 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-bold mb-6 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* SUMMARY BANNER */}
      <div className="bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 text-white p-6 sm:p-8 rounded-3xl shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest border border-white/20">
            Sales & Invoices
          </span>
          <h2 className="text-2xl sm:text-3xl font-black mt-2">Today's Revenue: ₹{todaySalesTotal.toFixed(2)}</h2>
          <p className="text-xs text-indigo-100 font-medium mt-1">{todayBills.length} bills generated today</p>
        </div>
        <div className="p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 text-white">
          <ShoppingCart className="w-8 h-8 text-cyan-300" />
        </div>
      </div>

      {/* BILLS TABLE CARD */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex justify-between items-center">
          <div>
            <h3 className="font-black text-slate-900 text-base">All Bills & Invoices</h3>
            <p className="text-xs text-slate-400">View, print and manage customer receipts.</p>
          </div>
          <span className="px-3 py-1 bg-slate-100 text-slate-700 font-extrabold text-xs rounded-full">
            {sales.length} Total Bills
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading bills...</div>
        ) : sales.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <Receipt className="w-12 h-12 text-slate-300 mx-auto" />
            <h4 className="text-sm font-bold text-slate-800">No bills generated yet</h4>
            <p className="text-xs text-slate-400">Create your first bill from the New Bill page.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] text-slate-500 uppercase border-b border-slate-200">
                <tr>
                  <th className="p-4">Bill Number</th>
                  <th className="p-4">Date & Time</th>
                  <th className="p-4">Customer</th>
                  <th className="p-4">Amount</th>
                  <th className="p-4">Payment</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sales.map((sale) => {
                  const billNo = sale.invoice_number || sale.bill_no || "BILL-0000";
                  const dateStr = new Date(sale.created_at).toLocaleDateString();
                  const timeStr = new Date(sale.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                  const customer = sale.customer_name || "Walk-in Customer";
                  const amount = Number(sale.total_amount || sale.total || 0).toFixed(2);
                  const payment = sale.payment_method || "CASH";

                  return (
                    <tr key={sale.id} className="hover:bg-slate-50 transition">
                      <td className="p-4 font-mono font-extrabold text-blue-600">{billNo}</td>
                      <td className="p-4 text-slate-500">{dateStr} {timeStr}</td>
                      <td className="p-4 font-bold text-slate-900">{customer}</td>
                      <td className="p-4 font-black text-emerald-600 text-sm">₹{amount}</td>
                      <td className="p-4">
                        <span className="px-2.5 py-1 bg-slate-100 text-slate-700 font-bold text-[10px] rounded-full uppercase">
                          {payment}
                        </span>
                      </td>
                      <td className="p-4 text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => handleViewBill(sale)}
                          className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-extrabold rounded-xl text-xs transition cursor-pointer inline-flex items-center gap-1 min-h-[36px]"
                        >
                          <Eye className="w-3.5 h-3.5" /> View
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePrint(sale, [])}
                          className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-extrabold rounded-xl text-xs transition cursor-pointer inline-flex items-center gap-1 min-h-[36px]"
                        >
                          <Printer className="w-3.5 h-3.5" /> Print
                        </button>
                        <button
                          type="button"
                          onClick={() => confirmDeleteBill(sale)}
                          className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-extrabold rounded-xl text-xs transition cursor-pointer inline-flex items-center gap-1 min-h-[36px]"
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

      {/* VIEW / PRINT BILL MODAL */}
      {modalOpen && selectedBill && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-[calc(100%-24px)] p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-5 max-h-[90vh] overflow-y-auto text-xs">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">Bill Details</h3>
                <p className="text-[11px] font-mono text-slate-400">{selectedBill.invoice_number || selectedBill.bill_no}</p>
              </div>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer p-1.5"><X className="w-5 h-5" /></button>
            </div>

            <div className="space-y-2 text-slate-700 bg-slate-50 p-4 rounded-2xl">
              <div className="flex justify-between"><span>Date:</span> <span className="font-bold">{new Date(selectedBill.created_at).toLocaleString()}</span></div>
              <div className="flex justify-between"><span>Customer:</span> <span className="font-bold">{selectedBill.customer_name || "Walk-in Customer"}</span></div>
              <div className="flex justify-between"><span>Payment Method:</span> <span className="font-bold uppercase">{selectedBill.payment_method || "CASH"}</span></div>
            </div>

            <div className="space-y-2">
              <h4 className="font-black text-slate-800 uppercase text-[11px]">Purchased Items</h4>
              {loadingBillItems ? (
                <div className="p-6 text-center text-slate-400">Loading items...</div>
              ) : billItems.length === 0 ? (
                <div className="p-4 text-center text-slate-400 bg-slate-50 rounded-2xl">No items found for this bill.</div>
              ) : (
                <div className="divide-y divide-slate-100 border rounded-2xl overflow-hidden">
                  {billItems.map((item, i) => (
                    <div key={i} className="p-3 flex justify-between items-center bg-white">
                      <div>
                        <p className="font-bold text-slate-900">{item.product_name || "Product"}</p>
                        <p className="text-[10px] text-slate-400">Qty: {item.quantity} × ₹{Number(item.selling_price || item.price || 0).toFixed(2)}</p>
                      </div>
                      <span className="font-black text-slate-900">₹{Number(item.total_amount || item.total || 0).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-slate-900 text-white p-4 rounded-2xl space-y-1.5 font-bold">
              <div className="flex justify-between text-slate-300 text-[11px]"><span>Subtotal:</span> <span>₹{Number(selectedBill.subtotal || selectedBill.total_amount || 0).toFixed(2)}</span></div>
              <div className="flex justify-between text-slate-300 text-[11px]"><span>Discount:</span> <span>₹{Number(selectedBill.discount || 0).toFixed(2)}</span></div>
              <div className="border-t border-slate-700 pt-1.5 flex justify-between text-sm font-black"><span>Total:</span> <span>₹{Number(selectedBill.total_amount || selectedBill.total || 0).toFixed(2)}</span></div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="flex-1 py-3 border rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer min-h-[44px]"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => handlePrint(selectedBill, billItems)}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-md cursor-pointer inline-flex items-center justify-center gap-1.5 min-h-[44px]"
              >
                <Printer className="w-4 h-4" /> Print Receipt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE BILL CONFIRMATION MODAL */}
      {deleteModalOpen && saleToDelete && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-5 text-center text-xs">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-black text-slate-900">Delete this bill?</h3>
              <p className="text-xs text-slate-500">
                This will remove the bill <strong className="text-slate-800">{saleToDelete.invoice_number || saleToDelete.bill_no}</strong> and its items.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                className="flex-1 py-3 border rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer min-h-[44px]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteBill}
                disabled={submittingDelete}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black shadow-md cursor-pointer min-h-[44px]"
              >
                {submittingDelete ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </SharedDashboardLayout>
  );
}
