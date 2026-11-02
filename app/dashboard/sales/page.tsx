"use client";

import React, { useEffect, useState } from "react";
import { SharedDashboardLayout } from "@/components/layout/SharedDashboardLayout";
import { createClient } from "@/lib/supabase/client";
import {
  ShoppingCart,
  Printer,
  Eye,
  Receipt,
  Trash2,
  Calendar,
  User,
  DollarSign,
  X,
  AlertCircle,
  CheckCircle2,
  Search,
  Filter,
  Clock,
  CheckCircle,
} from "lucide-react";

const getAsiaKolkataBounds = (period: string, customStart?: string, customEnd?: string) => {
  const now = new Date();
  const todayStr = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(now);
  const [year, month, day] = todayStr.split("-").map(Number);
  const istOffsetMs = (5 * 60 + 30) * 60 * 1000;

  // Construct IST midnight as a UTC instant. End bounds are exclusive.
  const istStartOfDay = new Date(Date.UTC(year, month - 1, day, 0, 0, 0) - istOffsetMs);

  if (period === "TODAY") {
    return { start: istStartOfDay, end: new Date(istStartOfDay.getTime() + 24 * 60 * 60 * 1000) };
  }
  if (period === "YESTERDAY") {
    return {
      start: new Date(istStartOfDay.getTime() - 24 * 60 * 60 * 1000),
      end: istStartOfDay,
    };
  }
  if (period === "THIS_MONTH") {
    return {
      start: new Date(Date.UTC(year, month - 1, 1, 0, 0, 0) - istOffsetMs),
      end: new Date(Date.UTC(year, month, 1, 0, 0, 0) - istOffsetMs),
    };
  }
  if (period === "THIS_YEAR") {
    return {
      start: new Date(Date.UTC(year, 0, 1, 0, 0, 0) - istOffsetMs),
      end: new Date(Date.UTC(year + 1, 0, 1, 0, 0, 0) - istOffsetMs),
    };
  }
  if (period === "CUSTOM" && customStart && customEnd) {
    const [sY, sM, sD] = customStart.split("-").map(Number);
    const [eY, eM, eD] = customEnd.split("-").map(Number);
    return {
      start: new Date(Date.UTC(sY, sM - 1, sD, 0, 0, 0) - istOffsetMs),
      end: new Date(Date.UTC(eY, eM - 1, eD + 1, 0, 0, 0) - istOffsetMs),
    };
  }
  return { start: null, end: null }; // ALL, or CUSTOM while awaiting both dates
};

const getSalePaymentState = (sale: any) => {
  const total = Math.max(0, Number(sale.total_amount ?? sale.total ?? 0) || 0);
  const paymentMethod = String(sale.payment_method ?? "").trim().toUpperCase();
  const isCreditOrDue = paymentMethod.includes("CREDIT") || paymentMethod.includes("DUE");

  const rawStatus = String(sale.payment_status ?? "")
    .trim()
    .toUpperCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");

  let status = "";
  if (rawStatus.includes("PARTIAL")) status = "PARTIALLY PAID";
  else if (rawStatus === "UNPAID" || rawStatus === "PENDING" || rawStatus === "DUE") status = "UNPAID";
  else if (rawStatus === "PAID" || rawStatus === "COMPLETED" || rawStatus === "SUCCESS") status = "PAID";

  const hasPaidValue = sale.amount_paid !== null && sale.amount_paid !== undefined && sale.amount_paid !== "";
  const hasBalanceValue = sale.balance_due !== null && sale.balance_due !== undefined && sale.balance_due !== "";
  const storedPaid = hasPaidValue ? Math.max(0, Number(sale.amount_paid) || 0) : null;
  const storedBalance = hasBalanceValue ? Math.max(0, Number(sale.balance_due) || 0) : null;

  let amountPaid: number;
  let balanceDue: number;

  if (storedPaid !== null) {
    amountPaid = storedPaid;
    balanceDue = storedBalance !== null ? storedBalance : Math.max(0, total - amountPaid);
  } else if (storedBalance !== null) {
    balanceDue = storedBalance;
    amountPaid = Math.max(0, total - balanceDue);
  } else if (status === "UNPAID" || (!status && isCreditOrDue)) {
    amountPaid = 0;
    balanceDue = total;
  } else {
    // Default to fully paid for legacy/cash sales without explicit payment_status or balance_due
    amountPaid = total;
    balanceDue = 0;
  }

  if (!status) {
    if (balanceDue <= 0 || amountPaid >= total) {
      status = "PAID";
    } else if (amountPaid > 0 && balanceDue > 0) {
      status = "PARTIALLY PAID";
    } else {
      status = "UNPAID";
    }
  }

  return { total, amountPaid, balanceDue, status };
};

export default function SalesPage() {
  const [supabase] = useState(() => createClient());
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [businessName, setBusinessName] = useState("TWEB");
  const [userName, setUserName] = useState("Admin");
  const [role, setRole] = useState("OWNER");
  const [activeBizId, setActiveBizId] = useState<string>("");

  // Period and Status Filter State
  const [dateFilterPeriod, setDateFilterPeriod] = useState("TODAY");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [statusFilterTab, setStatusFilterTab] = useState("ALL"); // ALL, UNPAID, PARTIALLY PAID, PAID
  const [searchQuery, setSearchQuery] = useState("");

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
    setErrorMsg("");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: memberships } = await supabase
        .from("business_members")
        .select("*, businesses(*)")
        .eq("user_id", user.id);

      let bizId = user.id;
      let userRole = "OWNER";

      if (memberships && memberships.length > 0) {
        const mem = memberships[0];
        setBusinessName(mem.businesses?.name || "TWEB");
        userRole = mem.role || "OWNER";
        setRole(userRole);
        bizId = mem.businesses?.id || user.id;
      }
      setActiveBizId(bizId);

      const { data: prof } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      if (prof?.full_name) setUserName(prof.full_name);

      let query = supabase.from("sales").select("*").order("created_at", { ascending: false });

      if (userRole.toLowerCase() === "billing") {
        query = query.eq("business_id", bizId).eq("user_id", user.id);
      } else {
        query = query.eq("business_id", bizId);
      }

      const { data: salesData, error } = await query;

      if (error) {
        console.error("Error fetching sales:", error);
        setErrorMsg(`Error fetching sales: ${error.message}`);
      } else {
        setSales(salesData || []);
      }
    } catch (err: any) {
      console.error("Failed to load bills", err);
      setErrorMsg(err.message || "Failed to load bills.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSalesData();
  }, [supabase]);

  // Validate custom date range
  const isCustomRangeInvalid =
    dateFilterPeriod === "CUSTOM" &&
    Boolean(customStartDate && customEndDate && new Date(customStartDate) > new Date(customEndDate));

  const { start: dateStart, end: dateEnd } = getAsiaKolkataBounds(
    dateFilterPeriod,
    customStartDate,
    customEndDate
  );

  // Filter sales by date range and search query
  const periodFilteredSales = sales.filter((s) => {
    const createdAt = new Date(s.created_at);
    if (dateStart && createdAt < dateStart) return false;
    if (dateEnd && createdAt >= dateEnd) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const invoiceNo = (s.invoice_number || s.bill_no || "").toLowerCase();
      const custName = (s.customer_name || "").toLowerCase();
      if (!invoiceNo.includes(q) && !custName.includes(q)) return false;
    }

    return true;
  });

  // Calculate summary metrics for the active period filter
  let unpaidCount = 0;
  let unpaidAmount = 0;
  let paidCount = 0;
  let paidAmount = 0;
  let partialCount = 0;
  let partialAmount = 0;

  periodFilteredSales.forEach((s) => {
    const { total, amountPaid, balanceDue, status } = getSalePaymentState(s);

    if (status === "UNPAID") {
      unpaidCount++;
      unpaidAmount += balanceDue > 0 ? balanceDue : total;
    } else if (status === "PARTIALLY PAID") {
      partialCount++;
      partialAmount += balanceDue;
    } else {
      paidCount++;
      paidAmount += amountPaid;
    }
  });

  // Filter by payment status tab
  const finalFilteredSales = periodFilteredSales.filter((s) => {
    if (statusFilterTab === "ALL") return true;
    const { status } = getSalePaymentState(s);
    return status === statusFilterTab;
  });

  const isAdminOrOwner =
    ["owner", "admin", "second_admin"].includes(role.toLowerCase()) ||
    role.toUpperCase() === "OWNER";

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
            total_amount: Number(
              item.total_amount ||
                item.total ||
                Number(item.selling_price || item.price || 0) * Number(item.quantity || 1)
            ),
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
    if (!isAdminOrOwner) {
      setErrorMsg("Unauthorized: Only Owner or Admin can delete bills.");
      return;
    }
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
                total_amount: Number(
                  item.total_amount ||
                    item.total ||
                    Number(item.selling_price || item.price || 0) * Number(item.quantity || 1)
                ),
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
    (printItems || []).forEach((item, index) => {
      const name = item.product_name || item.name || "Product";
      const qty = Number(item.quantity || 1);
      const unitPrice = Number(item.selling_price || item.price || 0);
      const lineTotal = Number(item.total_amount || item.total || unitPrice * qty);
      itemsHtml += `
        <tr>
          <td style="padding: 4px 0; font-size: 11px;">${index + 1}</td>
          <td style="padding: 4px 0; font-size: 11px; font-weight: bold;">${name}</td>
          <td style="padding: 4px 0; font-size: 11px; text-align: center;">${qty}</td>
          <td style="padding: 4px 0; font-size: 11px; text-align: right;">₹${unitPrice.toFixed(2)}</td>
          <td style="padding: 4px 0; font-size: 11px; text-align: right;">₹${lineTotal.toFixed(2)}</td>
        </tr>
      `;
    });

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt - ${billNo}</title>
          <style>
            body { font-family: 'Courier New', Courier, monospace; padding: 16px; color: #000; width: 300px; margin: 0 auto; background: #fff; }
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
                <th style="font-size: 11px; border-bottom: 1px dashed #000; padding-bottom: 4px;">#</th>
                <th style="font-size: 11px; border-bottom: 1px dashed #000; padding-bottom: 4px;">Item</th>
                <th style="font-size: 11px; border-bottom: 1px dashed #000; padding-bottom: 4px; text-align: center;">Qty</th>
                <th style="font-size: 11px; border-bottom: 1px dashed #000; padding-bottom: 4px; text-align: right;">Price</th>
                <th style="font-size: 11px; border-bottom: 1px dashed #000; padding-bottom: 4px; text-align: right;">Amount</th>
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

      {/* DATE & STATUS FILTERS BAR */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs mb-6 space-y-4">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          {/* Date Period Filter */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <Calendar className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-bold text-slate-700">Date Period:</span>
            {["TODAY", "YESTERDAY", "THIS_MONTH", "THIS_YEAR", "CUSTOM", "ALL"].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setDateFilterPeriod(p)}
                className={`px-3 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
                  dateFilterPeriod === p
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {p === "TODAY"
                  ? "Today"
                  : p === "YESTERDAY"
                  ? "Yesterday"
                  : p === "THIS_MONTH"
                  ? "This Month"
                  : p === "THIS_YEAR"
                  ? "This Year"
                  : p === "CUSTOM"
                  ? "Custom"
                  : "All Dates"}
              </button>
            ))}
          </div>

          {/* Payment Status Filter Tabs */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <Filter className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-bold text-slate-700">Payment:</span>
            {["ALL", "UNPAID", "PARTIALLY PAID", "PAID"].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilterTab(st)}
                className={`px-3 py-2 rounded-xl text-xs font-black uppercase transition cursor-pointer ${
                  statusFilterTab === st
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {st === "ALL" ? "All Bills" : st}
              </button>
            ))}
          </div>
        </div>

        {dateFilterPeriod === "CUSTOM" && (
          <div className="flex items-center gap-3 pt-3 border-t border-slate-100 text-xs flex-wrap">
            <span className="font-bold text-slate-600">From:</span>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none"
            />
            <span className="font-bold text-slate-600">To:</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none"
            />
            {isCustomRangeInvalid && (
              <span className="text-rose-600 font-bold">Start date cannot be later than end date.</span>
            )}
          </div>
        )}

        {/* SEARCH BAR */}
        <div className="relative pt-2">
          <Search className="w-4 h-4 absolute left-3.5 top-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by bill number or customer name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold outline-none focus:border-blue-600 h-11"
          />
        </div>
      </div>

      {/* 3 SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-black text-rose-700 uppercase tracking-wider flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> Outstanding / Unpaid
            </span>
            <span className="px-2.5 py-0.5 bg-rose-100 text-rose-800 font-black text-[10px] rounded-full">
              {unpaidCount} Bills
            </span>
          </div>
          <h3 className="text-xl font-black text-rose-900">₹{unpaidAmount.toFixed(2)}</h3>
          <p className="text-[10px] text-slate-400 font-medium">Total balance due</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-black text-emerald-700 uppercase tracking-wider flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" /> Paid / Collected
            </span>
            <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 font-black text-[10px] rounded-full">
              {paidCount} Bills
            </span>
          </div>
          <h3 className="text-xl font-black text-emerald-900">₹{paidAmount.toFixed(2)}</h3>
          <p className="text-[10px] text-slate-400 font-medium">Total collected revenue</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-black text-amber-700 uppercase tracking-wider flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5" /> Partially Paid
            </span>
            <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 font-black text-[10px] rounded-full">
              {partialCount} Bills
            </span>
          </div>
          <h3 className="text-xl font-black text-amber-900">₹{partialAmount.toFixed(2)}</h3>
          <p className="text-[10px] text-slate-400 font-medium">Partial payment balance</p>
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
            {finalFilteredSales.length} Invoices Found
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading bills...</div>
        ) : finalFilteredSales.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <Receipt className="w-12 h-12 text-slate-300 mx-auto" />
            <h4 className="text-sm font-bold text-slate-800">No bills found matching filters</h4>
            <p className="text-xs text-slate-400">Try adjusting your date range or payment filter.</p>
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
                {finalFilteredSales.map((sale) => {
                  const billNo = sale.invoice_number || sale.bill_no || "BILL-0000";
                  const dateStr = new Date(sale.created_at).toLocaleDateString();
                  const timeStr = new Date(sale.created_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                  const customer = sale.customer_name || "Walk-in Customer";
                  const amount = Number(sale.total_amount || sale.total || 0).toFixed(2);
                  const payment = sale.payment_method || "CASH";

                  return (
                    <tr key={sale.id} className="hover:bg-slate-50 transition">
                      <td className="p-4 font-mono font-extrabold text-blue-600">{billNo}</td>
                      <td className="p-4 text-slate-500">
                        {dateStr} {timeStr}
                      </td>
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
                        {isAdminOrOwner && (
                          <button
                            type="button"
                            onClick={() => confirmDeleteBill(sale)}
                            className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-extrabold rounded-xl text-xs transition cursor-pointer inline-flex items-center gap-1 min-h-[36px]"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Delete
                          </button>
                        )}
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
                <p className="text-[11px] font-mono text-slate-400">
                  {selectedBill.invoice_number || selectedBill.bill_no}
                </p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer p-1.5"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-slate-700 bg-slate-50 p-4 rounded-2xl">
              <div className="flex justify-between">
                <span>Date:</span>{" "}
                <span className="font-bold">
                  {new Date(selectedBill.created_at).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Customer:</span>{" "}
                <span className="font-bold">
                  {selectedBill.customer_name || "Walk-in Customer"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Payment Method:</span>{" "}
                <span className="font-bold uppercase">
                  {selectedBill.payment_method || "CASH"}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-black text-slate-800 uppercase text-[11px]">Purchased Items</h4>
              {loadingBillItems ? (
                <div className="p-6 text-center text-slate-400">Loading items...</div>
              ) : billItems.length === 0 ? (
                <div className="p-4 text-center text-slate-400 bg-slate-50 rounded-2xl">
                  No items found for this bill.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 border rounded-2xl overflow-hidden">
                  {billItems.map((item, i) => (
                    <div key={i} className="p-3 flex justify-between items-center bg-white">
                      <div>
                        <p className="font-bold text-slate-900">{item.product_name || "Product"}</p>
                        <p className="text-[10px] text-slate-400">
                          Qty: {item.quantity} × ₹
                          {Number(item.selling_price || item.price || 0).toFixed(2)}
                        </p>
                      </div>
                      <span className="font-black text-slate-900">
                        ₹{Number(item.total_amount || item.total || 0).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-slate-900 text-white p-4 rounded-2xl space-y-1.5 font-bold">
              <div className="flex justify-between text-slate-300 text-[11px]">
                <span>Subtotal:</span>{" "}
                <span>
                  ₹{Number(selectedBill.subtotal || selectedBill.total_amount || 0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-slate-300 text-[11px]">
                <span>Discount:</span>{" "}
                <span>₹{Number(selectedBill.discount || 0).toFixed(2)}</span>
              </div>
              <div className="border-t border-slate-700 pt-1.5 flex justify-between text-sm font-black">
                <span>Total:</span>{" "}
                <span>₹{Number(selectedBill.total_amount || selectedBill.total || 0).toFixed(2)}</span>
              </div>
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
                This will remove the bill{" "}
                <strong className="text-slate-800">
                  {saleToDelete.invoice_number || saleToDelete.bill_no}
                </strong>{" "}
                and its items.
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
