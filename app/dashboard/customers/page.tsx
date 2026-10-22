"use client";

import React, { useEffect, useState } from "react";
import { SharedDashboardLayout } from "@/components/layout/SharedDashboardLayout";
import { createClient } from "@/lib/supabase/client";
import { saveCustomerAction, deleteCustomerAction } from "./actions";
import { UserCheck, Plus, Search, Filter, X, Edit, Trash2, Phone, MapPin, Mail, CheckCircle2, AlertCircle, ShoppingBag, ReceiptText, Printer, Eye, Loader2 } from "lucide-react";

export default function CustomersPage() {
  const [supabase] = useState(() => createClient());
  const [customers, setCustomers] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");

  // Modals
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<any | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<any | null>(null);

  // Customer Bills & Details Modal State
  const [customerBillsModalOpen, setCustomerBillsModalOpen] = useState(false);
  const [selectedCustomerForBills, setSelectedCustomerForBills] = useState<any | null>(null);
  const [customerBills, setCustomerBills] = useState<any[]>([]);
  const [loadingCustomerBills, setLoadingCustomerBills] = useState(false);

  const [billDetailModalOpen, setBillDetailModalOpen] = useState(false);
  const [selectedBill, setSelectedBill] = useState<any | null>(null);
  const [billItems, setBillItems] = useState<any[]>([]);
  const [loadingBillItems, setLoadingBillItems] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [altPhone, setAltPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [email, setEmail] = useState("");
  const [gstin, setGstin] = useState("");
  const [customerType, setCustomerType] = useState("Regular Customer");
  const [notes, setNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const [business, setBusiness] = useState<any>(null);
  const [userName, setUserName] = useState("Admin");
  const [role, setRole] = useState("OWNER");

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: memberships } = await supabase
        .from("business_members")
        .select("*, businesses(*)")
        .eq("user_id", user.id);

      let bizId = "";
      if (memberships && memberships.length > 0) {
        setBusiness(memberships[0].businesses);
        setRole(memberships[0].role || "OWNER");
        bizId = memberships[0].businesses?.id || "";
      }

      const { data: prof } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      if (prof?.full_name) setUserName(prof.full_name);

      const [custRes, salesRes] = await Promise.all([
        supabase.from("customers").select("*").order("created_at", { ascending: false }),
        supabase.from("sales").select("*").order("created_at", { ascending: false }),
      ]);

      setCustomers(custRes.data || []);
      setSales(salesRes.data || []);
    } catch (err: any) {
      console.error("Failed to load customer data", err);
      setErrorMsg(err.message || "Failed to load customers.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [supabase]);

  const handleOpenAddModal = () => {
    setEditingCustomer(null);
    setName("");
    setPhone("");
    setAltPhone("");
    setAddress("");
    setCity("");
    setEmail("");
    setGstin("");
    setCustomerType("Regular Customer");
    setNotes("");
    setErrorMsg("");
    setAddModalOpen(true);
  };

  const handleOpenEditModal = (customer: any) => {
    setEditingCustomer(customer);
    setName(customer.name || "");
    setPhone(customer.phone || "");
    setAltPhone(customer.alt_phone || "");
    setAddress(customer.address || "");
    setCity(customer.city || "");
    setEmail(customer.email || "");
    setGstin(customer.gstin || "");
    setCustomerType(customer.customer_type || "Regular Customer");
    setNotes(customer.notes || "");
    setErrorMsg("");
    setAddModalOpen(true);
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      setErrorMsg("Customer Name and Phone Number are required.");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const bizId = business?.id || user?.id;

      const res = await saveCustomerAction({
        id: editingCustomer?.id,
        businessId: bizId,
        name: name.trim(),
        phone: phone.trim(),
        altPhone: altPhone.trim() || undefined,
        address: address.trim() || undefined,
        city: city.trim() || undefined,
        email: email.trim() || undefined,
        gstin: gstin.trim() || undefined,
        customerType: customerType,
        notes: notes.trim() || undefined,
      });

      if (res && res.success) {
        setSuccessMsg(res.message || "Customer saved successfully!");
        setAddModalOpen(false);
        await loadData();
        setTimeout(() => setSuccessMsg(""), 4000);
      }
    } catch (err: any) {
      console.error("Error saving customer:", err);
      setErrorMsg(err.message || "Failed to save customer.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!customerToDelete) return;
    setSubmitting(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const bizId = business?.id || user?.id;

      const res = await deleteCustomerAction({
        businessId: bizId,
        customerId: customerToDelete.id,
      });

      if (res && res.success) {
        setSuccessMsg(res.message || "Customer deleted successfully.");
        setDeleteModalOpen(false);
        setCustomerToDelete(null);
        await loadData();
        setTimeout(() => setSuccessMsg(""), 4000);
      }
    } catch (err: any) {
      console.error("Error deleting customer:", err);
      setErrorMsg(err.message || "Failed to delete customer.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenCustomerBills = async (customer: any) => {
    setSelectedCustomerForBills(customer);
    setCustomerBillsModalOpen(true);
    setLoadingCustomerBills(true);
    try {
      const bizId = business?.id;
      const { data: salesData, error: salesErr } = await supabase
        .from("sales")
        .select("*")
        .or(`customer_id.eq.${customer.id},customer_name.ilike.${customer.name}`)
        .order("created_at", { ascending: false });

      if (salesErr) throw salesErr;
      const filtered = (salesData || []).filter((s: any) => !bizId || !s.business_id || s.business_id === bizId);
      setCustomerBills(filtered);
    } catch (err: any) {
      console.error("Error fetching customer bills:", err);
    } finally {
      setLoadingCustomerBills(false);
    }
  };

  const handleViewBillDetails = async (sale: any) => {
    setSelectedBill(sale);
    setBillDetailModalOpen(true);
    setLoadingBillItems(true);
    try {
      const { data: itemsData, error: itemsErr } = await supabase
        .from("sale_items")
        .select("*")
        .eq("sale_id", sale.id);

      if (itemsErr) throw itemsErr;
      setBillItems(itemsData || []);
    } catch (err: any) {
      console.error("Error fetching bill items:", err);
    } finally {
      setLoadingBillItems(false);
    }
  };

  const handlePrintReceipt = (sale: any, items: any[]) => {
    const printWindow = window.open("", "_blank", "width=400,height=600");
    if (!printWindow) {
      alert("Please allow popups to print receipt.");
      return;
    }

    const billNo = sale.invoice_number || sale.bill_no || "BILL-0000";
    const dateStr = new Date(sale.created_at).toLocaleString();
    const custName = sale.customer_name || selectedCustomerForBills?.name || "Walk-in Customer";
    const subtotal = Number(sale.subtotal || sale.total_amount || 0);
    const discount = Number(sale.discount || 0);
    const tax = Number(sale.tax || 0);
    const total = Number(sale.total_amount || sale.total || 0);
    const paid = Number(sale.amount_paid || total);
    const balance = Math.max(0, total - paid);
    const payment = sale.payment_method || "CASH";

    let itemsHtml = "";
    (items || []).forEach((item, index) => {
      const pName = item.product_name || item.name || "Product";
      const qty = Number(item.quantity || 1);
      const price = Number(item.selling_price || item.price || 0);
      const lineTotal = Number(item.total_amount || item.total || (qty * price));
      itemsHtml += `
        <tr>
          <td style="padding: 4px 0; border-bottom: 1px dashed #eee;">${index + 1}. ${pName}</td>
          <td style="padding: 4px 0; border-bottom: 1px dashed #eee; text-align: center;">${qty}</td>
          <td style="padding: 4px 0; border-bottom: 1px dashed #eee; text-align: right;">₹${price.toFixed(2)}</td>
          <td style="padding: 4px 0; border-bottom: 1px dashed #eee; text-align: right; font-weight: bold;">₹${lineTotal.toFixed(2)}</td>
        </tr>
      `;
    });

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice #${billNo}</title>
          <style>
            body { font-family: 'Courier New', monospace; width: 280px; margin: 0 auto; padding: 10px; font-size: 12px; }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .bold { font-weight: bold; }
            .divider { border-top: 1px dashed #000; margin: 8px 0; }
            .flex { display: flex; justify-content: space-between; margin: 2px 0; }
            table { width: 100%; border-collapse: collapse; margin: 8px 0; }
          </style>
        </head>
        <body>
          <div class="text-center">
            <h2 style="margin: 0;">${business?.name || "TWEB SUPERMARKET"}</h2>
            <p style="margin: 2px 0;">Official Sales Invoice</p>
          </div>
          <div class="divider"></div>
          <div class="flex"><span>Invoice No:</span> <span class="bold">#${billNo}</span></div>
          <div class="flex"><span>Date:</span> <span>${dateStr}</span></div>
          <div class="flex"><span>Customer:</span> <span class="bold">${custName}</span></div>
          <div class="flex"><span>Payment Method:</span> <span class="bold">${payment}</span></div>
          <div class="divider"></div>
          <table>
            <thead>
              <tr style="border-bottom: 1px solid #000;">
                <th style="text-align: left;">Item</th>
                <th style="text-align: center;">Qty</th>
                <th style="text-align: right;">Price</th>
                <th style="text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
          <div class="divider"></div>
          <div class="flex"><span>Subtotal:</span> <span>₹${subtotal.toFixed(2)}</span></div>
          ${discount > 0 ? `<div class="flex"><span>Discount:</span> <span>-₹${discount.toFixed(2)}</span></div>` : ""}
          ${tax > 0 ? `<div class="flex"><span>GST Tax:</span> <span>₹${tax.toFixed(2)}</span></div>` : ""}
          <div class="flex bold" style="font-size: 14px; margin-top: 4px;"><span>Grand Total:</span> <span>₹${total.toFixed(2)}</span></div>
          <div class="flex"><span>Amount Paid:</span> <span>₹${paid.toFixed(2)}</span></div>
          <div class="flex"><span>Balance Due:</span> <span>₹${balance.toFixed(2)}</span></div>
          <div class="divider"></div>
          <div class="text-center" style="margin-top: 10px;">
            <p style="margin: 0; font-weight: bold;">Thank You For Shopping!</p>
            <p style="margin: 2px 0; font-size: 10px;">Please Visit Again</p>
          </div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Filter Customers
  const filteredCustomers = customers.filter((c) => {
    const matchesSearch =
      !searchQuery.trim() ||
      c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone?.includes(searchQuery) ||
      (c.city || "").toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType =
      typeFilter === "ALL" || (c.customer_type || "").toLowerCase() === typeFilter.toLowerCase();

    return matchesSearch && matchesType;
  });

  return (
    <SharedDashboardLayout
      businessName={business?.name || "TWEB"}
      userName={userName}
      role={role}
      pageTitle="Customers"
    >
      {/* HEADER */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white p-6 sm:p-8 rounded-3xl shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest border border-white/20">
            Customer Directory
          </span>
          <h2 className="text-2xl sm:text-3xl font-black mt-2">Manage Customers</h2>
          <p className="text-xs text-indigo-100 font-medium mt-1">
            Store customer profiles, contact info and purchase history.
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="px-5 py-3.5 bg-white text-blue-700 hover:bg-blue-50 font-black rounded-2xl text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer min-h-[44px]"
        >
          <Plus className="w-4 h-4" /> + Add Customer
        </button>
      </div>

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

      {/* SEARCH AND FILTER */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between mb-6">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search customer by name, phone or city..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:border-blue-600 h-11"
          />
        </div>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-semibold text-slate-700 outline-none cursor-pointer h-11 w-full md:w-auto"
        >
          <option value="ALL">Type: All</option>
          <option value="Regular Customer">Regular Customer</option>
          <option value="Retail Customer">Retail Customer</option>
          <option value="Wholesale Customer">Wholesale Customer</option>
        </select>
      </div>

      {/* CUSTOMER CARDS GRID */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400">Loading customer directory...</div>
      ) : filteredCustomers.length === 0 ? (
        <div className="bg-white rounded-3xl border border-dashed border-slate-200 p-12 text-center space-y-3 shadow-xs">
          <UserCheck className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">No customers found</h3>
          <p className="text-xs text-slate-400">Add customer profiles to link them with POS billing.</p>
          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-sm cursor-pointer min-h-[44px]"
          >
            + Add Customer
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCustomers.map((c) => {
            const custSales = sales.filter((s) => s.customer_name?.toLowerCase() === c.name?.toLowerCase());
            const totalSpent = custSales.reduce((sum, s) => sum + Number(s.total_amount || s.total || 0), 0);

            return (
              <div key={c.id} className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4 hover:shadow-md transition">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-blue-600/10 text-blue-600 flex items-center justify-center font-black text-base border border-blue-500/20 shadow-xs">
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-extrabold text-slate-900 text-sm">{c.name}</h4>
                      <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 font-extrabold text-[9px] uppercase rounded-full border border-indigo-200">
                        {c.customer_type || "Regular"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{c.phone}</span>
                    {c.alt_phone && <span className="text-slate-400">({c.alt_phone})</span>}
                  </div>

                  {(c.address || c.city) && (
                    <div className="flex items-center gap-2 text-slate-500">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{[c.address, c.city].filter(Boolean).join(", ")}</span>
                    </div>
                  )}

                  {c.email && (
                    <div className="flex items-center gap-2 text-slate-500">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{c.email}</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100 text-xs">
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-bold block">Total Bills</span>
                    <span className="font-black text-slate-900">{custSales.length}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-bold block">Total Spent</span>
                    <span className="font-black text-emerald-600">₹{totalSpent.toFixed(2)}</span>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => handleOpenCustomerBills(c)}
                    className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-extrabold rounded-xl text-xs transition cursor-pointer min-h-[38px] inline-flex items-center gap-1"
                  >
                    <ReceiptText className="w-3.5 h-3.5" /> View Bills
                  </button>
                  <button
                    onClick={() => handleOpenEditModal(c)}
                    className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-extrabold rounded-xl text-xs transition cursor-pointer min-h-[38px] inline-flex items-center gap-1"
                  >
                    <Edit className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button
                    onClick={() => {
                      setCustomerToDelete(c);
                      setDeleteModalOpen(true);
                    }}
                    className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-extrabold rounded-xl text-xs transition cursor-pointer min-h-[38px] inline-flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ADD / EDIT CUSTOMER MODAL */}
      {addModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-[calc(100%-24px)] p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-5 max-h-[90vh] overflow-y-auto text-xs">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-base font-black text-slate-900">{editingCustomer ? "Edit Customer" : "Add Customer Profile"}</h3>
              <button onClick={() => setAddModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer p-1"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleSaveCustomer} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Customer Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold outline-none focus:border-blue-600 h-11"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Mobile Number *</label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 9876543210"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold outline-none focus:border-blue-600 h-11"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Alt Phone</label>
                  <input
                    type="tel"
                    value={altPhone}
                    onChange={(e) => setAltPhone(e.target.value)}
                    placeholder="Optional"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold outline-none focus:border-blue-600 h-11"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">City / Village</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Hyderabad"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold outline-none focus:border-blue-600 h-11"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Customer Type</label>
                <select
                  value={customerType}
                  onChange={(e) => setCustomerType(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold outline-none bg-white cursor-pointer h-11"
                >
                  <option value="Regular Customer">Regular Customer</option>
                  <option value="Retail Customer">Retail Customer</option>
                  <option value="Wholesale Customer">Wholesale Customer</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Address</label>
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Street address..."
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold outline-none focus:border-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Optional"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold outline-none focus:border-blue-600 h-11"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">GSTIN</label>
                  <input
                    type="text"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value)}
                    placeholder="Optional"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold outline-none focus:border-blue-600 h-11 font-mono"
                  />
                </div>
              </div>

              {errorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold">
                  {errorMsg}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="flex-1 py-3 border rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-md cursor-pointer min-h-[44px]"
                >
                  {submitting ? "Saving..." : "Save Customer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteModalOpen && customerToDelete && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-5 text-center text-xs">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-black text-slate-900">Delete this customer?</h3>
              <p className="text-xs text-slate-500">
                Are you sure you want to delete <strong className="text-slate-800">{customerToDelete.name}</strong>?
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
                onClick={handleDeleteConfirm}
                disabled={submitting}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black shadow-md cursor-pointer min-h-[44px]"
              >
                {submitting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOMER BILLS HISTORY MODAL */}
      {customerBillsModalOpen && selectedCustomerForBills && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-[calc(100%-24px)] p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto text-xs">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">{selectedCustomerForBills.name} — Saved Invoices</h3>
                <p className="text-[11px] text-slate-400 font-mono">Customer Purchase History</p>
              </div>
              <button onClick={() => setCustomerBillsModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingCustomerBills ? (
              <div className="p-8 text-center text-slate-400">Loading customer sales bills...</div>
            ) : customerBills.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <ReceiptText className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="font-bold text-slate-700">No saved invoices found for this customer.</p>
                <p className="text-slate-400 text-[11px]">Completed sales bills in POS Billing will appear here.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* FINANCIAL SUMMARY CARDS */}
                {(() => {
                  const totalSpent = customerBills.reduce((sum, s) => sum + Number(s.total_amount || s.total || 0), 0);
                  const totalPaid = customerBills.reduce((sum, s) => sum + Number(s.amount_paid || (s.total_amount || s.total || 0)), 0);
                  const totalDue = Math.max(0, totalSpent - totalPaid);
                  return (
                    <div className="grid grid-cols-3 gap-3 bg-slate-900 text-white p-4 rounded-2xl text-[11px] font-bold">
                      <div>
                        <span className="text-slate-400 block uppercase text-[10px]">Total Billed</span>
                        <span className="text-sm font-black text-white">₹{totalSpent.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block uppercase text-[10px]">Total Paid</span>
                        <span className="text-sm font-black text-emerald-400">₹{totalPaid.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block uppercase text-[10px]">Outstanding</span>
                        <span className={`text-sm font-black ${totalDue > 0 ? "text-amber-400" : "text-emerald-400"}`}>₹{totalDue.toFixed(2)}</span>
                      </div>
                    </div>
                  );
                })()}

                <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                  {customerBills.map((s) => {
                    const billNo = s.invoice_number || s.bill_no || "BILL-0000";
                    const totalAmt = Number(s.total_amount || s.total || 0);
                    const paidAmt = Number(s.amount_paid || totalAmt);
                    const balDue = Math.max(0, totalAmt - paidAmt);
                    const status = balDue === 0 ? "PAID" : paidAmt > 0 ? "PARTIALLY PAID" : "UNPAID";

                    return (
                      <div key={s.id} className="p-4 bg-slate-50 rounded-2xl border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-slate-900 text-xs">Invoice #{billNo}</span>
                            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                              status === "PAID" ? "bg-emerald-100 text-emerald-800" :
                              status === "PARTIALLY PAID" ? "bg-amber-100 text-amber-800" :
                              "bg-rose-100 text-rose-800"
                            }`}>
                              {status}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            Date: {new Date(s.created_at).toLocaleDateString()} • Method: {s.payment_method || "CASH"}
                          </p>
                          <p className="text-[10px] text-slate-500 font-medium">
                            Paid: ₹{paidAmt.toFixed(2)} • Due: ₹{balDue.toFixed(2)}
                          </p>
                        </div>

                        <div className="text-right flex items-center justify-between sm:justify-end w-full sm:w-auto gap-3 pt-2 sm:pt-0 border-t sm:border-t-0">
                          <div>
                            <span className="block font-black text-slate-900 text-xs">₹{totalAmt.toFixed(2)}</span>
                          </div>
                          <button
                            onClick={() => handleViewBillDetails(s)}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-[11px] transition inline-flex items-center gap-1 cursor-pointer min-h-[36px]"
                          >
                            <Eye className="w-3.5 h-3.5" /> View Details
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="pt-2 border-t flex justify-end">
              <button
                type="button"
                onClick={() => setCustomerBillsModalOpen(false)}
                className="px-4 py-2 bg-slate-900 text-white font-bold rounded-xl text-xs cursor-pointer min-h-[38px]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INDIVIDUAL BILL DETAIL & RECEIPT MODAL */}
      {billDetailModalOpen && selectedBill && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto text-xs">
            <div className="flex justify-between items-start border-b pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">Invoice #{selectedBill.invoice_number || selectedBill.bill_no}</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Customer: <strong className="text-slate-900">{selectedBill.customer_name || selectedCustomerForBills?.name || "Walk-in Customer"}</strong></p>
                <p className="text-[10px] text-slate-400">{new Date(selectedBill.created_at).toLocaleString()}</p>
              </div>
              <button onClick={() => setBillDetailModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <h4 className="font-extrabold text-slate-900 uppercase text-[10px] tracking-wider">Purchased Items</h4>
              {loadingBillItems ? (
                <div className="p-6 text-center text-slate-400">Loading line items...</div>
              ) : billItems.length === 0 ? (
                <div className="p-4 bg-slate-50 rounded-xl border text-center text-slate-400">No line item details found for this bill.</div>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {billItems.map((item: any, idx: number) => {
                    const qty = Number(item.quantity || 1);
                    const price = Number(item.selling_price || item.price || 0);
                    const total = Number(item.total_amount || item.total || (qty * price));
                    return (
                      <div key={idx} className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center text-xs">
                        <div>
                          <p className="font-extrabold text-slate-900">{item.product_name || "Product"}</p>
                          <p className="text-[10px] text-slate-400">{qty} {item.unit || "pcs"} × ₹{price.toFixed(2)}</p>
                        </div>
                        <span className="font-black text-slate-900">₹{total.toFixed(2)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-1.5 font-bold">
              <div className="flex justify-between text-slate-300 text-[11px]"><span>Payment Method:</span> <span className="uppercase">{selectedBill.payment_method || "CASH"}</span></div>
              <div className="flex justify-between text-slate-300 text-[11px]"><span>Subtotal:</span> <span>₹{Number(selectedBill.subtotal || selectedBill.total_amount || 0).toFixed(2)}</span></div>
              {Number(selectedBill.discount || 0) > 0 && <div className="flex justify-between text-slate-300 text-[11px]"><span>Discount:</span> <span>-₹{Number(selectedBill.discount).toFixed(2)}</span></div>}
              {Number(selectedBill.tax || 0) > 0 && <div className="flex justify-between text-slate-300 text-[11px]"><span>GST Tax:</span> <span>₹{Number(selectedBill.tax).toFixed(2)}</span></div>}
              <div className="border-t border-slate-700 pt-1.5 flex justify-between text-sm font-black text-emerald-400">
                <span>Grand Total:</span> <span>₹{Number(selectedBill.total_amount || selectedBill.total || 0).toFixed(2)}</span>
              </div>
            </div>

            <div className="pt-2 border-t flex justify-between items-center">
              <button
                type="button"
                onClick={() => handlePrintReceipt(selectedBill, billItems)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs cursor-pointer flex items-center gap-1.5 min-h-[38px]"
              >
                <Printer className="w-4 h-4" /> Print Receipt
              </button>
              <button
                type="button"
                onClick={() => setBillDetailModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer min-h-[38px]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </SharedDashboardLayout>
  );
}
