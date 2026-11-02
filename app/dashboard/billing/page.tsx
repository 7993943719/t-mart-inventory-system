"use client";

export const dynamic = "force-dynamic";

import React, { useEffect, useState, useRef } from "react";
import { SharedDashboardLayout } from "@/components/layout/SharedDashboardLayout";
import { createClient } from "@/lib/supabase/client";
import { Product } from "@/lib/types";
import {
  ReceiptText,
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  X,
  RefreshCw,
  Package,
  Loader2,
  Printer,
  CheckCircle2,
  Building,
  User,
  Phone,
  UserPlus,
  ChevronUp,
  ChevronDown,
  Barcode,
  Scan,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";

interface CartItem {
  product: Product;
  quantity: number;
  customPrice?: number;
}

async function getNextInvoiceNumber(supabase: any) {
  const { data, error } = await supabase
    .from("sales")
    .select("invoice_number")
    .order("created_at", { ascending: false })
    .limit(1000);

  if (error) {
    console.error("Error fetching sales invoice numbers:", error);
    return `BILL-0001`;
  }

  let maxNumber = 0;

  for (const row of data ?? []) {
    const match = String(row.invoice_number ?? "").match(/^BILL-(\d+)$/);

    if (match) {
      const number = Number(match[1]);
      if (number > maxNumber) {
        maxNumber = number;
      }
    }
  }

  const nextNumber = maxNumber + 1;

  return `BILL-${String(nextNumber).padStart(4, "0")}`;
}

export default function BillingPage() {
  const [supabase] = useState(() => createClient());
  const [products, setProducts] = useState<Product[]>([]);
  const [customersList, setCustomersList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Two-Step Billing Workflow State
  const [billingStep, setBillingStep] = useState<"SELECT_PRODUCTS" | "CART_CHECKOUT">("SELECT_PRODUCTS");

  // Search, Category & Cart State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState("Walk-in Customer");
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [discount, setDiscount] = useState<number>(0);
  const [amountPaid, setAmountPaid] = useState<string>("");

  // GST Billing Settings State (Based on business settings)
  const [gstEnabled, setGstEnabled] = useState(false);
  const [taxRate, setTaxRate] = useState<number>(5); // default 5% GST when enabled

  // Inline Add Customer Modal State (Name, Phone, Address, City, Email, GSTIN)
  const [addCustomerModalOpen, setAddCustomerModalOpen] = useState(false);
  const [newCustName, setNewCustName] = useState("");
  const [newCustPhone, setNewCustPhone] = useState("");
  const [newCustAddress, setNewCustAddress] = useState("");
  const [newCustCity, setNewCustCity] = useState("");
  const [newCustEmail, setNewCustEmail] = useState("");
  const [newCustGstin, setNewCustGstin] = useState("");
  const [savingNewCustomer, setSavingNewCustomer] = useState(false);

  // Bill & Print State
  const [currentBillNo, setCurrentBillNo] = useState("BILL-0001");
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [lastSaleReceipt, setLastSaleReceipt] = useState<any>(null);
  const [saleCompletedModal, setSaleCompletedModal] = useState(false);

  // User & Business State
  const [business, setBusiness] = useState<any>(null);
  const [userName, setUserName] = useState("Admin");
  const [role, setRole] = useState("OWNER");

  const searchInputRef = useRef<HTMLInputElement>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: memberships } = await supabase
        .from("business_members")
        .select("*, businesses(*)")
        .eq("user_id", user.id);

      let activeBizId = user.id;
      if (memberships && memberships.length > 0) {
        const biz = memberships[0].businesses;
        setBusiness(biz);
        setRole(memberships[0].role || "OWNER");
        activeBizId = biz?.id || user.id;
        if (biz?.gst_number) {
          setGstEnabled(true);
        }
      }

      const { data: prof } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      if (prof?.full_name) {
        setUserName(prof.full_name);
      }

      const [prodsRes, custRes, nextInv] = await Promise.all([
        supabase.rpc("get_business_products", { p_business_id: activeBizId }),
        supabase.from("customers").select("*").eq("business_id", activeBizId).order("name"),
        getNextInvoiceNumber(supabase),
      ]);

      if (prodsRes.data) {
        setProducts(prodsRes.data);
      } else {
        const { data: fallbackProds } = await supabase.from("products").select("*").eq("business_id", activeBizId);
        setProducts(fallbackProds || []);
      }

      if (custRes.data) {
        setCustomersList(custRes.data);
      }

      setCurrentBillNo(nextInv);
    } catch (err) {
      console.error("Failed to load billing data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [supabase]);

  // Calculations
  const subtotal = cart.reduce((acc, item) => {
    const price = item.customPrice !== undefined ? item.customPrice : Number(item.product.selling_price || 0);
    return acc + price * item.quantity;
  }, 0);

  const taxAmount = gstEnabled ? (subtotal * taxRate) / 100 : 0;
  const grandTotal = Math.max(0, subtotal + taxAmount - discount);
  const balanceDue = Math.max(0, grandTotal - (amountPaid ? Number(amountPaid) : grandTotal));

  const categories = ["ALL", ...Array.from(new Set(products.map((p) => p.category || "General")))];

  const filteredProducts = products.filter((p) => {
    const matchesCat = selectedCategory === "ALL" || (p.category || "General") === selectedCategory;
    const matchesQuery =
      !searchQuery.trim() ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.barcode && p.barcode.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCat && matchesQuery;
  });

  const filteredCustomers = customersList.filter((c) => {
    const q = customerSearchQuery.toLowerCase();
    return !q || c.name.toLowerCase().includes(q) || (c.phone && c.phone.includes(q));
  });

  const handleAddToCart = (product: Product) => {
    if (Number(product.stock_quantity || 0) <= 0) {
      setErrorMsg(`Product "${product.name}" is out of stock!`);
      setTimeout(() => setErrorMsg(""), 3000);
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        if (existing.quantity + 1 > Number(product.stock_quantity || 0)) {
          setErrorMsg(`Cannot add more. Stock limit reached for "${product.name}".`);
          setTimeout(() => setErrorMsg(""), 3000);
          return prev;
        }
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const handleUpdateQuantity = (productId: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            if (newQty > Number(item.product.stock_quantity || 0)) {
              setErrorMsg(`Stock limit reached for "${item.product.name}".`);
              setTimeout(() => setErrorMsg(""), 3000);
              return item;
            }
            return { ...item, quantity: newQty };
          }
          return item;
        })
        .filter((item) => item.quantity > 0);
    });
  };

  const handleRemoveItem = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const handleSelectCustomer = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === "WALK_IN") {
      setSelectedCustomerId(null);
      setCustomerName("Walk-in Customer");
    } else {
      setSelectedCustomerId(val);
      const found = customersList.find((c) => c.id === val);
      if (found) {
        setCustomerName(found.name);
      }
    }
  };

  const handleSaveNewCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim()) {
      setErrorMsg("Customer name is required.");
      return;
    }

    setSavingNewCustomer(true);
    setErrorMsg("");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Please log in again.");

      const activeBizId = business?.id || user.id;

      const { data: insCust, error: insErr } = await supabase
        .from("customers")
        .insert([
          {
            business_id: activeBizId,
            name: newCustName.trim(),
            phone: newCustPhone.trim() || null,
            address: newCustAddress.trim() || null,
            city: newCustCity.trim() || null,
            email: newCustEmail.trim() || null,
            gstin: newCustGstin.trim() || null,
          },
        ])
        .select()
        .single();

      if (insErr) throw new Error(insErr.message);

      if (insCust) {
        setCustomersList((prev) => [...prev, insCust]);
        setSelectedCustomerId(insCust.id);
        setCustomerName(insCust.name);
        setAddCustomerModalOpen(false);
        setNewCustName("");
        setNewCustPhone("");
        setNewCustAddress("");
        setNewCustCity("");
        setNewCustEmail("");
        setNewCustGstin("");
        setSuccessMsg("Customer added successfully!");
        setTimeout(() => setSuccessMsg(""), 3000);
      }
    } catch (err: any) {
      console.error("Error saving customer:", err);
      setErrorMsg(err.message || "Failed to add customer.");
    } finally {
      setSavingNewCustomer(false);
    }
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      setErrorMsg("Cart is empty.");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Please log in again.");

      const activeBizId = business?.id || user.id;
      const paidNum = amountPaid ? Number(amountPaid) : grandTotal;
      const balanceNum = Math.max(0, grandTotal - paidNum);
      const paymentStatus = balanceNum <= 0 ? "PAID" : paidNum > 0 ? "PARTIALLY PAID" : "UNPAID";

      const itemsPayload = cart.map((item) => ({
        product_id: item.product.id,
        product_name: item.product.name,
        quantity: item.quantity,
        selling_price: item.customPrice !== undefined ? item.customPrice : Number(item.product.selling_price || 0),
        total_amount: (item.customPrice !== undefined ? item.customPrice : Number(item.product.selling_price || 0)) * item.quantity,
      }));

      // Call complete_sale_transaction RPC
      const { data: rpcData, error: rpcErr } = await supabase.rpc("complete_sale_transaction", {
        p_business_id: activeBizId,
        p_user_id: user.id,
        p_customer_id: selectedCustomerId,
        p_customer_name: customerName,
        p_payment_method: paymentMethod,
        p_subtotal: subtotal,
        p_discount: discount,
        p_total_amount: grandTotal,
        p_items: itemsPayload,
        p_amount_paid: paidNum,
      });

      if (rpcErr) {
        throw new Error(rpcErr.message || "Checkout failed.");
      }

      const receiptData = {
        business_name: business?.name || "TWEB",
        business_gstin: business?.gst_number || "",
        invoice_number: currentBillNo,
        date: new Date().toLocaleString(),
        customer_name: customerName,
        payment_method: paymentMethod,
        subtotal: subtotal.toFixed(2),
        tax: taxAmount.toFixed(2),
        discount: discount.toFixed(2),
        grand_total: grandTotal.toFixed(2),
        amount_paid: paidNum.toFixed(2),
        balance_due: balanceNum.toFixed(2),
        payment_status: paymentStatus,
        items: itemsPayload,
      };

      setLastSaleReceipt(receiptData);
      setSaleCompletedModal(true);
      setSuccessMsg("Sale completed successfully!");

      // Reset cart
      setCart([]);
      setDiscount(0);
      setAmountPaid("");
      setBillingStep("SELECT_PRODUCTS");
      const nextInv = await getNextInvoiceNumber(supabase);
      setCurrentBillNo(nextInv);
      loadData();
    } catch (err: any) {
      console.error("Checkout error:", err);
      setErrorMsg(err.message || "Checkout failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleNewBill = async () => {
    setCart([]);
    setDiscount(0);
    setAmountPaid("");
    setSelectedCustomerId(null);
    setCustomerName("Walk-in Customer");
    setBillingStep("SELECT_PRODUCTS");
    const nextInv = await getNextInvoiceNumber(supabase);
    setCurrentBillNo(nextInv);
  };

  const handlePrintReceipt = () => {
    if (!lastSaleReceipt) return;
    const printWindow = window.open("", "_blank", "width=400,height=600");
    if (!printWindow) {
      alert("Please allow popups to print receipt.");
      return;
    }

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice - ${lastSaleReceipt.invoice_number}</title>
          <style>
            body { font-family: 'Courier New', monospace; font-size: 12px; padding: 20px; max-width: 320px; margin: 0 auto; }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .divider { border-top: 1px dashed #000; margin: 10px 0; }
            table { width: 100%; border-collapse: collapse; margin: 10px 0; }
            th, td { text-align: left; padding: 3px 0; font-size: 11px; }
            .right { text-align: right; }
            .flex { display: flex; justify-content: space-between; margin: 2px 0; }
          </style>
        </head>
        <body>
          <div class="center">
            <h2 style="margin:0;">${lastSaleReceipt.business_name}</h2>
            ${lastSaleReceipt.business_gstin ? `<p style="margin:2px 0;">GSTIN: ${lastSaleReceipt.business_gstin}</p>` : ""}
            <p style="margin:2px 0;">Official POS Invoice</p>
          </div>
          <div class="divider"></div>
          <div class="flex"><span>Invoice No:</span> <span class="bold">${lastSaleReceipt.invoice_number}</span></div>
          <div class="flex"><span>Date:</span> <span>${lastSaleReceipt.date}</span></div>
          <div class="flex"><span>Customer:</span> <span>${lastSaleReceipt.customer_name}</span></div>
          <div class="flex"><span>Payment:</span> <span>${lastSaleReceipt.payment_method}</span></div>
          <div class="divider"></div>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Item</th>
                <th class="right">Qty</th>
                <th class="right">Price</th>
                <th class="right">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${(lastSaleReceipt.items || []).map((i: any, index: number) => `
                <tr>
                  <td>${index + 1}</td>
                  <td>${i.product_name}</td>
                  <td class="right">${i.quantity}</td>
                  <td class="right">₹${Number(i.price || i.selling_price || 0).toFixed(2)}</td>
                  <td class="right">₹${Number(i.total || i.total_amount || 0).toFixed(2)}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
          <div class="divider"></div>
          <div class="flex"><span>Subtotal:</span> <span>₹${lastSaleReceipt.subtotal}</span></div>
          ${Number(lastSaleReceipt.tax) > 0 ? `<div class="flex"><span>GST (${taxRate}%):</span> <span>₹${lastSaleReceipt.tax}</span></div>` : ""}
          <div class="flex"><span>Discount:</span> <span>₹${lastSaleReceipt.discount}</span></div>
          <div class="flex bold" style="font-size:14px;"><span>GRAND TOTAL:</span> <span>₹${lastSaleReceipt.grand_total}</span></div>
          <div class="divider"></div>
          <div class="flex"><span>Amount Paid:</span> <span>₹${lastSaleReceipt.amount_paid}</span></div>
          <div class="flex"><span>Balance Due:</span> <span>₹${lastSaleReceipt.balance_due}</span></div>
          <div class="flex"><span>Payment Status:</span> <span class="bold">${lastSaleReceipt.payment_status}</span></div>
          <div class="divider"></div>
          <div class="center" style="margin-top:15px;">
            <p style="margin:0;">Thank you for shopping with us!</p>
            <p style="margin:2px 0;">Visit Again</p>
          </div>
          <script>window.onload = function() { window.print(); window.close(); }</script>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <SharedDashboardLayout
      businessName={business?.name || "TWEB"}
      userName={userName}
      role={role}
      pageTitle="New Bill"
    >
      {/* COMPACT POS HEADER BAR WITH WORKFLOW STEP SWITCHER */}
      <div className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-white px-3.5 py-2.5 shadow-xs mb-2.5 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          {billingStep === "CART_CHECKOUT" && (
            <button
              type="button"
              onClick={() => setBillingStep("SELECT_PRODUCTS")}
              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-lg transition cursor-pointer flex items-center gap-1 min-h-[36px]"
            >
              <ArrowLeft className="w-4 h-4 text-blue-600" /> Products
            </button>
          )}

          <div>
            <h1 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
              <span>New Bill</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-extrabold bg-blue-50 text-blue-700 border border-blue-100 uppercase">
                {billingStep === "SELECT_PRODUCTS" ? "Step 1: Select Products" : "Step 2: Cart & Payment"}
              </span>
            </h1>
            <p className="text-[11px] font-semibold text-slate-500">
              Bill No: <strong className="text-blue-600 font-mono text-xs">{currentBillNo}</strong> • Date: <strong className="text-slate-800">{new Date().toLocaleDateString()}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {billingStep === "SELECT_PRODUCTS" && cart.length > 0 && (
            <button
              type="button"
              onClick={() => setBillingStep("CART_CHECKOUT")}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl shadow-md transition cursor-pointer flex items-center gap-1.5 min-h-[38px]"
            >
              <ShoppingCart className="w-4 h-4" /> View Cart ({cart.length} Items • ₹{grandTotal.toFixed(2)}) <ArrowRight className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={handleNewBill}
            type="button"
            className="rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2 font-extrabold shadow-xs transition cursor-pointer text-xs flex items-center gap-1.5 min-h-[38px]"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Reset Bill
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold mb-2.5 flex items-center justify-between">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg("")}><X className="w-4 h-4" /></button>
        </div>
      )}

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-bold mb-2.5 flex items-center justify-between">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg("")}><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* STEP 1: PRODUCT SELECTION WORKFLOW */}
      {billingStep === "SELECT_PRODUCTS" && (
        <div className="space-y-2.5">
          {/* 1. CUSTOMER DETAILS SECTION (Placed FIRST at the top) */}
          <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs mb-2.5 space-y-2">
            <div className="flex justify-between items-center flex-wrap gap-1.5">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-blue-600" /> Customer Details
              </h3>
              <button
                type="button"
                onClick={() => setAddCustomerModalOpen(true)}
                className="text-[11px] font-extrabold text-blue-600 hover:text-blue-700 cursor-pointer flex items-center gap-1 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100"
              >
                <UserPlus className="w-3 h-3" /> + Add New
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {/* Customer Search Filter */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search customer by name or phone..."
                  value={customerSearchQuery}
                  onChange={(e) => setCustomerSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-7 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-blue-600 h-9"
                />
                {customerSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setCustomerSearchQuery("")}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Customer Dropdown Selector */}
              <select
                value={selectedCustomerId || "WALK_IN"}
                onChange={handleSelectCustomer}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-blue-600 h-9 cursor-pointer"
              >
                <option value="WALK_IN">Walk-in Customer (Default)</option>
                {filteredCustomers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.phone || "No phone"})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100 flex-wrap gap-2">
              <span>Selected: <strong className="text-slate-900 font-extrabold">{customerName}</strong></span>
              {/* GST Billing Toggle */}
              <div className="flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-blue-600" />
                <span className="text-[11px] font-bold text-slate-700">GST Billing</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={gstEnabled}
                    onChange={(e) => setGstEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-7 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </div>

          {/* 2. IMMEDIATELY BELOW CUSTOMER DETAILS: ADD PRODUCT & SEARCH AREA */}
          <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs mb-2.5 space-y-2.5">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Package className="w-4 h-4 text-blue-600" /> Add Product
              </h3>
              <span className="text-[10px] font-bold text-slate-400">{filteredProducts.length} items available</span>
            </div>

            {/* SEARCH INPUT, SCAN BUTTON, AND CATEGORIES ARRANGED HORIZONTALLY ON DESKTOP */}
            <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Type product name or scan barcode..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-7 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-blue-600 h-9"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Categories Selector */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-blue-600 h-9 cursor-pointer bg-white min-w-[140px]"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 3. PRODUCT CATALOG GRID */}
          <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs">
            {loading ? (
              <div className="p-12 text-center text-xs text-slate-400">Loading catalog...</div>
            ) : filteredProducts.length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <Package className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-xs font-bold text-slate-700">No products found</p>
                <p className="text-[11px] text-slate-400">Try adjusting search or category filter.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 max-h-[60vh] overflow-y-auto pr-1">
                {filteredProducts.map((p) => {
                  const stock = Number(p.stock_quantity || 0);
                  const isOut = stock <= 0;
                  return (
                    <div
                      key={p.id}
                      onClick={() => !isOut && handleAddToCart(p)}
                      className={`p-3.5 rounded-2xl border transition flex flex-col justify-between gap-2 cursor-pointer ${
                        isOut
                          ? "bg-slate-100 border-slate-200 opacity-60 cursor-not-allowed"
                          : "bg-white hover:border-blue-500 hover:shadow-md border-slate-200/80"
                      }`}
                    >
                      <div>
                        <div className="flex justify-between items-start gap-1">
                          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider truncate">{p.category || "General"}</span>
                          <span className={`px-1.5 py-0.5 text-[9px] font-black rounded-md ${isOut ? "bg-rose-100 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}>
                            {isOut ? "Out" : `${stock} ${p.unit || "pcs"}`}
                          </span>
                        </div>
                        <h4 className="font-extrabold text-slate-900 text-xs mt-1 line-clamp-2">{p.name}</h4>
                      </div>

                      <div className="flex justify-between items-end pt-2 border-t border-slate-100">
                        <span className="font-black text-blue-600 text-xs">₹{Number(p.selling_price || 0).toFixed(2)}</span>
                        <div className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs ${isOut ? "bg-slate-200 text-slate-400" : "bg-blue-600 text-white shadow-sm"}`}>
                          +
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* STEP 2: CART & CHECKOUT WORKFLOW */}
      {billingStep === "CART_CHECKOUT" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* CART ITEMS LIST (7 cols) */}
          <div className="lg:col-span-7 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-blue-600" /> Cart Items ({cart.length})
              </h3>
              <button
                type="button"
                onClick={() => setCart([])}
                className="text-xs font-extrabold text-rose-600 hover:text-rose-700 cursor-pointer"
              >
                Clear Cart
              </button>
            </div>

            {cart.length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <ShoppingCart className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-xs font-bold text-slate-700">Your cart is empty</p>
                <p className="text-[11px] text-slate-400">Select products from Step 1 to add items.</p>
                <button
                  type="button"
                  onClick={() => setBillingStep("SELECT_PRODUCTS")}
                  className="mt-2 px-4 py-2 bg-blue-600 text-white font-bold rounded-xl text-xs cursor-pointer"
                >
                  Select Products
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-[50vh] overflow-y-auto pr-1">
                {cart.map((item) => {
                  const price = item.customPrice !== undefined ? item.customPrice : Number(item.product.selling_price || 0);
                  const lineTotal = price * item.quantity;
                  return (
                    <div key={item.product.id} className="py-3 flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-extrabold text-slate-900 text-xs truncate">{item.product.name}</h4>
                        <p className="text-[11px] text-slate-400 font-medium">₹{price.toFixed(2)} / {item.product.unit || "pc"}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
                          <button
                            type="button"
                            onClick={() => handleUpdateQuantity(item.product.id, -1)}
                            className="w-8 h-8 flex items-center justify-center hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-8 text-center font-extrabold text-xs text-slate-800">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => handleUpdateQuantity(item.product.id, 1)}
                            className="w-8 h-8 flex items-center justify-center hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        <span className="font-black text-slate-900 text-xs w-20 text-right">₹{lineTotal.toFixed(2)}</span>

                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.product.id)}
                          className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* CHECKOUT SUMMARY & PAYMENT (5 cols) */}
          <div className="lg:col-span-5 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-sm font-black text-slate-900 border-b pb-3">Payment & Checkout</h3>

            <div className="space-y-2.5 text-xs font-semibold text-slate-700">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="font-bold text-slate-900">₹{subtotal.toFixed(2)}</span>
              </div>
              {gstEnabled && (
                <div className="flex justify-between">
                  <span>GST ({taxRate}%):</span>
                  <span className="font-bold text-slate-900">₹{taxAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span>Discount (₹):</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={discount}
                  onChange={(e) => setDiscount(Math.max(0, Number(e.target.value)))}
                  className="w-28 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-right outline-none focus:border-blue-600 h-9"
                />
              </div>
              <div className="border-t pt-2 flex justify-between text-sm font-black text-slate-900">
                <span>Grand Total:</span>
                <span className="text-blue-600">₹{grandTotal.toFixed(2)}</span>
              </div>
            </div>

            <div className="space-y-3 pt-2 border-t">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-800 outline-none focus:border-blue-600 h-11 cursor-pointer bg-white"
                >
                  <option value="CASH">Cash</option>
                  <option value="UPI">UPI / QR Code</option>
                  <option value="CARD">Debit / Credit Card</option>
                  <option value="CREDIT">Store Credit / Due</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Amount Paid (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder={grandTotal.toFixed(2)}
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold outline-none focus:border-blue-600 h-11"
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl flex justify-between items-center text-xs font-extrabold">
                <span className="text-slate-500">Balance Due:</span>
                <span className={balanceDue > 0 ? "text-rose-600" : "text-emerald-600"}>₹{balanceDue.toFixed(2)}</span>
              </div>
            </div>

            <button
              type="button"
              disabled={submitting || cart.length === 0}
              onClick={handleCheckout}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-black rounded-2xl shadow-lg cursor-pointer flex items-center justify-center gap-2 text-sm min-h-[48px]"
            >
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><CheckCircle2 className="w-5 h-5" /> Complete Sale (₹{grandTotal.toFixed(2)})</>}
            </button>
          </div>
        </div>
      )}

      {/* ADD CUSTOMER MODAL */}
      {addCustomerModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-[calc(100%-24px)] p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-5 max-h-[90vh] overflow-y-auto text-xs text-slate-900">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-base font-black text-slate-900">Add New Customer</h3>
              <button onClick={() => setAddCustomerModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleSaveNewCustomer} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Customer Name *</label>
                <input
                  type="text"
                  required
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold outline-none focus:border-blue-600 h-11"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold outline-none focus:border-blue-600 h-11"
                  placeholder="9876543210"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Address</label>
                <input
                  type="text"
                  value={newCustAddress}
                  onChange={(e) => setNewCustAddress(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold outline-none focus:border-blue-600 h-11"
                  placeholder="Street / Area"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">GSTIN (Optional)</label>
                <input
                  type="text"
                  value={newCustGstin}
                  onChange={(e) => setNewCustGstin(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold outline-none focus:border-blue-600 h-11 uppercase"
                  placeholder="29AAAAA0000A1Z5"
                />
              </div>

              <div className="flex gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setAddCustomerModalOpen(false)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingNewCustomer}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-black rounded-xl shadow-md cursor-pointer min-h-[44px] flex items-center justify-center gap-1.5"
                >
                  {savingNewCustomer ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Customer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SALE COMPLETED / RECEIPT MODAL */}
      {saleCompletedModal && lastSaleReceipt && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-5 text-xs text-slate-900 text-center">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-black text-slate-900">Sale Completed Successfully!</h3>
              <p className="text-xs text-slate-500 font-medium">Invoice No: <strong className="text-slate-800 font-mono">{lastSaleReceipt.invoice_number}</strong></p>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl text-left space-y-1.5 font-semibold text-slate-700">
              <div className="flex justify-between"><span>Customer:</span> <span className="font-bold text-slate-900">{lastSaleReceipt.customer_name}</span></div>
              <div className="flex justify-between"><span>Total Amount:</span> <span className="font-extrabold text-blue-600">₹{lastSaleReceipt.grand_total}</span></div>
              <div className="flex justify-between"><span>Amount Paid:</span> <span className="font-bold text-emerald-600">₹{lastSaleReceipt.amount_paid}</span></div>
              <div className="flex justify-between"><span>Balance Due:</span> <span className="font-bold text-rose-600">₹{lastSaleReceipt.balance_due}</span></div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setSaleCompletedModal(false);
                  handleNewBill();
                }}
                className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl cursor-pointer min-h-[48px]"
              >
                New Bill
              </button>
              <button
                type="button"
                onClick={handlePrintReceipt}
                className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl shadow-md cursor-pointer inline-flex items-center justify-center gap-2 min-h-[48px]"
              >
                <Printer className="w-4 h-4" /> Print Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </SharedDashboardLayout>
  );
}
