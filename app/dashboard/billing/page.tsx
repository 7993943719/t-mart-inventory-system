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
} from "lucide-react";

interface CartItem {
  product: Product;
  quantity: number;
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
  const [sales, setSales] = useState<any[]>([]);
  const [customersList, setCustomersList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

      if (memberships && memberships.length > 0) {
        const biz = memberships[0].businesses;
        setBusiness(biz);
        setRole(memberships[0].role || "OWNER");
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

      const [prodsRes, salesRes, custRes] = await Promise.all([
        supabase.from("products").select("*").order("name", { ascending: true }),
        supabase.from("sales").select("*").order("created_at", { ascending: false }).limit(20),
        supabase.from("customers").select("*").order("name", { ascending: true }),
      ]);

      setProducts(prodsRes.data || []);
      setSales(salesRes.data || []);
      setCustomersList(custRes.data || []);

      const nextInv = await getNextInvoiceNumber(supabase);
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

  // Categories list
  const categoriesList = ["ALL", ...Array.from(new Set(products.map((p) => p.category || "General")))];

  // Filtered Customers List (Searching by Name or Phone)
  const filteredCustomers = customersList.filter((c) => {
    if (!customerSearchQuery.trim()) return true;
    const q = customerSearchQuery.toLowerCase().trim();
    return (
      (c.name || "").toLowerCase().includes(q) ||
      (c.phone || "").includes(q)
    );
  });

  // Handle Customer Selection
  const handleSelectCustomer = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === "WALK_IN") {
      setSelectedCustomerId(null);
      setCustomerName("Walk-in Customer");
    } else {
      const found = customersList.find((c) => c.id === val);
      if (found) {
        setSelectedCustomerId(found.id);
        setCustomerName(found.name);
      }
    }
  };

  // Add Inline New Customer
  const handleSaveNewCustomerInline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim() || !newCustPhone.trim()) {
      setErrorMsg("Customer Name and Phone are required.");
      return;
    }

    setSavingNewCustomer(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const bizId = business?.id || user?.id;

      const { data: newCust, error: custErr } = await supabase
        .from("customers")
        .insert([
          {
            business_id: bizId,
            name: newCustName.trim(),
            phone: newCustPhone.trim(),
            address: newCustAddress.trim() || null,
            city: newCustCity.trim() || null,
            email: newCustEmail.trim() || null,
            gstin: newCustGstin.trim() || null,
            customer_type: "Regular Customer",
            created_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (custErr) throw custErr;

      setCustomersList((prev) => [...prev, newCust]);
      setSelectedCustomerId(newCust.id);
      setCustomerName(newCust.name);
      setAddCustomerModalOpen(false);
      setNewCustName("");
      setNewCustPhone("");
      setNewCustAddress("");
      setNewCustCity("");
      setNewCustEmail("");
      setNewCustGstin("");
      setSuccessMsg("New customer added & selected!");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err: any) {
      console.error("Error creating customer inline:", err);
      setErrorMsg(err.message || "Failed to create customer.");
    } finally {
      setSavingNewCustomer(false);
    }
  };

  // Product Search & Category Filter
  const filteredProducts = products.filter((p) => {
    const matchesCat = selectedCategory === "ALL" || (p.category || "General").toLowerCase() === selectedCategory.toLowerCase();
    if (!searchQuery.trim()) return matchesCat;

    const query = searchQuery.toLowerCase().trim();
    const nameMatch = p.name.toLowerCase().includes(query);
    const barcodeMatch = p.barcode ? p.barcode.toLowerCase().includes(query) : false;
    const catMatch = p.category ? p.category.toLowerCase().includes(query) : false;

    return matchesCat && (nameMatch || barcodeMatch || catMatch);
  });

  // Display initial compact list (10 items) when search query is empty, full catalog when searching
  const displayedProducts = searchQuery.trim() ? filteredProducts : filteredProducts.slice(0, 10);

  // Handle Barcode Scan / Enter Key Press
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && searchQuery.trim()) {
      const exactMatch = products.find(
        (p) => p.barcode && p.barcode.trim().toLowerCase() === searchQuery.trim().toLowerCase()
      ) || filteredProducts[0];

      if (exactMatch) {
        addToCart(exactMatch);
        setSearchQuery("");
      }
    }
  };

  // Add Product to Cart
  const addToCart = (product: Product) => {
    const availStock = Number(product.stock_quantity || 0);

    if (availStock <= 0) {
      setErrorMsg(`"${product.name}" is out of stock!`);
      setTimeout(() => setErrorMsg(""), 3000);
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        if (existing.quantity + 1 > availStock) {
          setErrorMsg(`Cannot add more "${product.name}". Maximum available stock is ${availStock}.`);
          setTimeout(() => setErrorMsg(""), 3000);
          return prev;
        }
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });

    setErrorMsg("");
  };

  // Update Quantity in Cart with Stock Validation
  const updateQuantity = (productId: string, newQty: number) => {
    if (newQty <= 0) {
      removeFromCart(productId);
      return;
    }

    const item = cart.find((i) => i.product.id === productId);
    if (!item) return;

    const availStock = Number(item.product.stock_quantity || 0);
    if (newQty > availStock) {
      setErrorMsg(`Cannot set quantity to ${newQty}. Maximum available stock for "${item.product.name}" is ${availStock}.`);
      setTimeout(() => setErrorMsg(""), 3500);
      setCart((prev) =>
        prev.map((i) => (i.product.id === productId ? { ...i, quantity: availStock } : i))
      );
      return;
    }

    setErrorMsg("");
    setCart((prev) =>
      prev.map((i) => (i.product.id === productId ? { ...i, quantity: newQty } : i))
    );
  };

  // Remove Product from Cart
  const removeFromCart = async (productId: string) => {
    setCart((prev) => {
      const nextCart = prev.filter((item) => item.product.id !== productId);
      if (nextCart.length === 0) {
        setSuccessMsg("Bill is empty");
        setTimeout(() => setSuccessMsg(""), 3000);
        getNextInvoiceNumber(supabase).then((inv) => setCurrentBillNo(inv));
      }
      return nextCart;
    });
  };

  // Clear Cart / New Bill
  const handleNewBill = async () => {
    setCart([]);
    setDiscount(0);
    setAmountPaid("");
    setSelectedCustomerId(null);
    setCustomerName("Walk-in Customer");
    setCustomerSearchQuery("");
    setPaymentMethod("CASH");
    setErrorMsg("");
    setSuccessMsg("");
    setSaleCompletedModal(false);

    const nextInv = await getNextInvoiceNumber(supabase);
    setCurrentBillNo(nextInv);

    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  // Bill Calculations & GST Tax
  const subtotal = cart.reduce((sum, item) => sum + Number(item.product.selling_price || 0) * item.quantity, 0);
  const tax = gstEnabled ? Math.max(0, (subtotal - Number(discount || 0)) * (taxRate / 100)) : 0;
  const grandTotal = Math.max(0, subtotal - Number(discount || 0) + tax);

  const numericAmountPaid = amountPaid !== ""
    ? Number(amountPaid)
    : paymentMethod === "CREDIT" ? 0 : grandTotal;

  const balanceDue = Math.max(0, Number((grandTotal - numericAmountPaid).toFixed(2)));

  let paymentStatus: "PAID" | "PARTIALLY PAID" | "UNPAID" = "PAID";
  if (grandTotal === 0 || numericAmountPaid >= grandTotal) {
    paymentStatus = "PAID";
  } else if (numericAmountPaid > 0) {
    paymentStatus = "PARTIALLY PAID";
  } else {
    paymentStatus = "UNPAID";
  }

  // Complete Sale & Update Supabase via RPC
  const handleCompleteSale = async () => {
    if (cart.length === 0) {
      setErrorMsg("Please add at least one product to the bill.");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated.");

      const businessId = business?.id || user.id;

      // Deduplicate cart items if duplicate product rows exist in cart state
      const consolidatedCartMap = new Map<string, CartItem>();
      cart.forEach((item) => {
        if (consolidatedCartMap.has(item.product.id)) {
          const existing = consolidatedCartMap.get(item.product.id)!;
          existing.quantity += item.quantity;
        } else {
          consolidatedCartMap.set(item.product.id, { ...item });
        }
      });
      const consolidatedCart = Array.from(consolidatedCartMap.values());

      // Prepare items payload
      const itemsPayload = consolidatedCart.map((item) => ({
        product_id: item.product.id,
        quantity: item.quantity,
        selling_price: item.product.selling_price,
      }));

      // Call database RPC complete_sale_transaction strictly for atomic sale completion
      const { data: rpcResult, error: rpcError } = await supabase.rpc("complete_sale_transaction", {
        p_business_id: businessId,
        p_user_id: user.id,
        p_customer_id: selectedCustomerId || null,
        p_customer_name: customerName || "Walk-in Customer",
        p_payment_method: paymentMethod,
        p_subtotal: Number(subtotal.toFixed(2)),
        p_discount: Number(discount || 0),
        p_total_amount: Number(grandTotal.toFixed(2)),
        p_items: itemsPayload,
        p_amount_paid: numericAmountPaid,
      });

      if (rpcError) {
        throw new Error(rpcError.message || "Failed to complete sale transaction.");
      }

      if (rpcResult && rpcResult.error) {
        throw new Error(rpcResult.error);
      }

      const finalInvoiceNumber = rpcResult?.invoice_number || rpcResult?.bill_no || currentBillNo;

      const saleItemsList = consolidatedCart.map((item) => ({
        product_name: item.product.name,
        unit: item.product.unit,
        price: item.product.selling_price,
        quantity: item.quantity,
        total: Number((item.product.selling_price * item.quantity).toFixed(2)),
      }));

      const receiptData = {
        invoice_number: finalInvoiceNumber,
        date: new Date().toLocaleString(),
        customer_name: customerName,
        payment_method: paymentMethod,
        subtotal: subtotal.toFixed(2),
        discount: Number(discount || 0).toFixed(2),
        tax: tax.toFixed(2),
        grand_total: grandTotal.toFixed(2),
        amount_paid: numericAmountPaid.toFixed(2),
        balance_due: balanceDue.toFixed(2),
        payment_status: paymentStatus,
        items: saleItemsList,
        business_name: business?.name || "TWEB",
        business_gstin: business?.gst_number || "",
      };

      setLastSaleReceipt(receiptData);
      setSaleCompletedModal(true);
      setSuccessMsg(`Sale completed! Invoice: ${finalInvoiceNumber}`);

      await loadData();
      setCart([]);
      setDiscount(0);
      setAmountPaid("");
      setSelectedCustomerId(null);
      setCustomerName("Walk-in Customer");
      setPaymentMethod("CASH");
    } catch (err: any) {
      console.error("Sale completion failed:", err);
      setErrorMsg(err.message || "Failed to complete sale transaction.");
    } finally {
      setSubmitting(false);
    }
  };

  // Print Invoice Function
  const handlePrintInvoice = () => {
    if (!lastSaleReceipt) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

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
              <tr><th>Item</th><th class="right">Qty</th><th class="right">Price</th><th class="right">Total</th></tr>
            </thead>
            <tbody>
              ${(lastSaleReceipt.items || []).map((i: any) => `
                <tr>
                  <td>${i.product_name}</td>
                  <td class="right">${i.quantity}</td>
                  <td class="right">₹${i.price}</td>
                  <td class="right">₹${i.total}</td>
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
      {/* POS HEADER BAR */}
      <div className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs mb-5 flex-wrap gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900">New Bill</h1>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">
            Bill No: <strong className="text-blue-600 font-mono text-sm">{currentBillNo}</strong> • Date: <strong className="text-slate-800">{new Date().toLocaleDateString()}</strong>
          </p>
        </div>

        <button
          onClick={handleNewBill}
          type="button"
          className="rounded-xl bg-blue-600 px-5 py-2.5 font-extrabold text-white hover:bg-blue-700 shadow-md transition cursor-pointer text-xs flex items-center gap-2 min-h-[44px]"
        >
          <RefreshCw className="w-4 h-4" /> Reset Bill
        </button>
      </div>

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-bold mb-4 flex items-center justify-between">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg("")}><X className="w-4 h-4" /></button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-2xl text-xs font-bold mb-4 flex items-center justify-between">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg("")}><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* CUSTOMER DETAILS SECTION (Placed FIRST on Mobile/Android, Top Banner) */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs mb-5 space-y-3">
        <div className="flex justify-between items-center flex-wrap gap-2">
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <User className="w-4 h-4 text-blue-600" /> Customer Details
          </h3>
          <button
            type="button"
            onClick={() => setAddCustomerModalOpen(true)}
            className="text-xs font-extrabold text-blue-600 hover:text-blue-700 cursor-pointer flex items-center gap-1 bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-100"
          >
            <UserPlus className="w-3.5 h-3.5" /> + Add New Customer
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Customer Search Filter */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search customer by name or phone..."
              value={customerSearchQuery}
              onChange={(e) => setCustomerSearchQuery(e.target.value)}
              className="w-full pl-10 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-blue-600 h-11"
            />
            {customerSearchQuery && (
              <button
                type="button"
                onClick={() => setCustomerSearchQuery("")}
                className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Customer Dropdown Selector */}
          <select
            value={selectedCustomerId || "WALK_IN"}
            onChange={handleSelectCustomer}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-blue-600 h-11 cursor-pointer"
          >
            <option value="WALK_IN">Walk-in Customer (Default)</option>
            {filteredCustomers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.phone || "No phone"})
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100 flex-wrap gap-2">
          <span>Selected: <strong className="text-slate-900 font-extrabold">{customerName}</strong></span>
          {/* GST Billing Toggle */}
          <div className="flex items-center gap-2">
            <Building className="w-3.5 h-3.5 text-blue-600" />
            <span className="text-xs font-bold text-slate-700">GST Billing</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={gstEnabled}
                onChange={(e) => setGstEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-8 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </div>

      {/* POS LAYOUT: PRODUCTS & CART */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* PRODUCTS SECTION (Below Customer Details on Mobile) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Package className="w-4 h-4 text-blue-600" /> Product Catalogue
              </h3>
              <span className="text-[11px] font-bold text-slate-400">{filteredProducts.length} items available</span>
            </div>

            {/* SEARCH INPUT & BARCODE */}
            <div className="relative w-full">
              <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search product name or scan barcode..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:border-blue-600 focus:bg-white transition h-11"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* CATEGORY FILTER PILLS */}
            {categoriesList.length > 1 && (
              <div className="flex gap-1.5 overflow-x-auto pb-1 max-w-full">
                {categoriesList.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-xl font-bold text-[11px] transition shrink-0 cursor-pointer ${
                      selectedCategory === cat
                        ? "bg-slate-900 text-white shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}

            {/* COMPACT PRODUCT LIST (Initially ~10 items, full list when searching) */}
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {loading ? (
                <div className="p-12 text-center text-xs text-slate-400">Loading product catalog...</div>
              ) : displayedProducts.length === 0 ? (
                <div className="p-12 bg-slate-50 rounded-2xl border border-dashed text-center text-xs text-slate-400 space-y-2">
                  <Package className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="font-bold text-slate-600">No matching products found</p>
                </div>
              ) : (
                displayedProducts.map((p) => {
                  const stockQty = Number(p.stock_quantity || 0);
                  const isOut = stockQty <= 0;
                  const formattedPrice = Number(p.selling_price || 0).toFixed(2);
                  const unitStr = p.unit || "pcs";

                  return (
                    <div
                      key={p.id}
                      className="p-3 bg-slate-50 hover:bg-blue-50/50 rounded-2xl border border-slate-100/80 flex items-center justify-between text-xs transition group"
                    >
                      {/* Left: Product Name & Category */}
                      <div className="flex items-center gap-3 min-w-0 flex-1 pr-3">
                        {p.image_url ? (
                          <img src={p.image_url} alt={p.name} className="w-10 h-10 rounded-xl object-cover shrink-0 border border-slate-200" />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold shrink-0">
                            📦
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <h4 className="font-extrabold text-slate-900 group-hover:text-blue-600 transition truncate text-xs sm:text-sm">{p.name}</h4>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{p.category || "General"}</span>
                        </div>
                      </div>

                      {/* Middle: Price & Stock Columns */}
                      <div className="flex items-center gap-4 shrink-0 px-2 text-right sm:text-left">
                        <div className="text-right">
                          <span className="block font-black text-emerald-600 text-xs sm:text-sm">₹{formattedPrice}</span>
                          <span className={`block font-bold text-[10px] ${isOut ? "text-rose-600" : stockQty <= Number(p.minimum_stock || 10) ? "text-amber-600" : "text-slate-500"}`}>
                            Stock: {stockQty} {unitStr}
                          </span>
                        </div>

                        {/* Right: Add Button */}
                        <button
                          type="button"
                          onClick={() => addToCart(p)}
                          disabled={isOut}
                          className={`px-3.5 py-2 text-xs font-black rounded-xl transition cursor-pointer flex items-center gap-1 min-h-[38px] ${
                            isOut ? "bg-slate-200 text-slate-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
                          }`}
                        >
                          <Plus className="w-3.5 h-3.5" /> ADD
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: CURRENT BILL / CART */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-md space-y-4">
            <div className="pb-3 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <ReceiptText className="w-5 h-5 text-blue-600" /> Current Bill
              </h3>
              <span className="px-2.5 py-1 bg-blue-50 text-blue-700 font-extrabold text-[10px] rounded-full uppercase">
                {cart.length} Item(s)
              </span>
            </div>

            {/* CART ITEMS LIST */}
            {cart.length === 0 ? (
              <div className="p-8 text-center space-y-2 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                <ShoppingCart className="w-8 h-8 text-slate-300 mx-auto" />
                <h4 className="text-xs font-bold text-slate-700">Cart is empty</h4>
                <p className="text-[11px] text-slate-400">Click + ADD on any product to build the bill.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {cart.map((item) => {
                    const itemTotal = (item.product.selling_price * item.quantity).toFixed(2);
                    return (
                      <div key={item.product.id} className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center text-xs">
                        <div className="min-w-0 flex-1 pr-2">
                          <p className="font-extrabold text-slate-900 truncate">{item.product.name}</p>
                          <p className="text-[11px] text-emerald-600 font-bold">₹{Number(item.product.selling_price || 0).toFixed(2)}</p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1">
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                              className="p-1 hover:bg-slate-100 rounded-lg cursor-pointer"
                            >
                              <Minus className="w-3 h-3 text-slate-600" />
                            </button>
                            <span className="px-2 font-black text-slate-900 text-xs">{item.quantity}</span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                              className="p-1 hover:bg-slate-100 rounded-lg cursor-pointer"
                            >
                              <Plus className="w-3 h-3 text-slate-600" />
                            </button>
                          </div>

                          <span className="font-black text-slate-900 text-xs w-16 text-right">₹{itemTotal}</span>

                          <button
                            type="button"
                            onClick={() => removeFromCart(item.product.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* PAYMENT METHOD, AMOUNT PAID & STATUS SUMMARY */}
                <div className="space-y-3 pt-3 border-t border-slate-100 text-xs">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Payment Method</label>
                      <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold outline-none h-11 cursor-pointer"
                      >
                        <option value="CASH">CASH</option>
                        <option value="UPI">UPI / QR</option>
                        <option value="CARD">CARD</option>
                        <option value="CREDIT">CREDIT / DUE</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Amount Paid (₹)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={amountPaid}
                        onChange={(e) => setAmountPaid(e.target.value)}
                        placeholder={`e.g. ${grandTotal.toFixed(2)}`}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold outline-none h-11 focus:border-blue-600"
                      />
                    </div>
                  </div>

                  <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-2">
                    <div className="flex justify-between text-slate-300 text-xs"><span>Subtotal:</span> <span>₹{subtotal.toFixed(2)}</span></div>
                    {gstEnabled && <div className="flex justify-between text-slate-300 text-xs"><span>GST ({taxRate}%):</span> <span>₹{tax.toFixed(2)}</span></div>}
                    {discount > 0 && <div className="flex justify-between text-slate-300 text-xs"><span>Discount:</span> <span>₹{Number(discount || 0).toFixed(2)}</span></div>}
                    <div className="border-t border-slate-700 pt-2 flex justify-between text-base font-black text-emerald-400">
                      <span>Total Amount:</span> <span>₹{grandTotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-slate-300 text-xs pt-1"><span>Amount Paid:</span> <span>₹{numericAmountPaid.toFixed(2)}</span></div>
                    <div className="flex justify-between text-slate-300 text-xs"><span>Balance Due:</span> <span className={balanceDue > 0 ? "text-amber-400 font-bold" : "text-slate-300"}>₹{balanceDue.toFixed(2)}</span></div>
                    <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-800">
                      <span>Status:</span>
                      <span className={`px-2.5 py-0.5 font-black text-[10px] uppercase rounded-full ${
                        paymentStatus === "PAID" ? "bg-emerald-500/20 text-emerald-400" :
                        paymentStatus === "PARTIALLY PAID" ? "bg-amber-500/20 text-amber-400" :
                        "bg-rose-500/20 text-rose-400"
                      }`}>
                        {paymentStatus}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleCompleteSale}
                    disabled={submitting || cart.length === 0}
                    className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-black rounded-2xl text-xs shadow-lg shadow-emerald-600/20 transition flex items-center justify-center gap-2 cursor-pointer min-h-[48px]"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Generating Bill...
                      </>
                    ) : (
                      <>
                        <ReceiptText className="w-4 h-4" /> Complete Sale (₹{grandTotal.toFixed(2)})
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* COMPLETED INVOICE RECEIPT MODAL */}
      {saleCompletedModal && lastSaleReceipt && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-[calc(100%-24px)] p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-5 max-h-[90vh] overflow-y-auto text-xs">
            {/* TOP CUSTOMER DETAILS */}
            <div className="flex justify-between items-start border-b pb-4">
              <div>
                <div className="flex items-center gap-2 text-emerald-600">
                  <CheckCircle2 className="w-5 h-5" />
                  <h3 className="text-base font-black text-slate-900">Sale Completed</h3>
                </div>
                <p className="text-[11px] font-mono text-blue-600 font-bold mt-1">Invoice: #{lastSaleReceipt.invoice_number}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Customer: <strong className="text-slate-900">{lastSaleReceipt.customer_name}</strong></p>
                <p className="text-[10px] text-slate-400">{lastSaleReceipt.date}</p>
              </div>

              <span className={`px-3 py-1 font-black text-[10px] uppercase rounded-full border ${
                lastSaleReceipt.payment_status === "PAID" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                lastSaleReceipt.payment_status === "PARTIALLY PAID" ? "bg-amber-50 text-amber-700 border-amber-200" :
                "bg-rose-50 text-rose-700 border-rose-200"
              }`}>
                {lastSaleReceipt.payment_status}
              </span>
            </div>

            {/* PRODUCT ROWS TABLE */}
            <div className="space-y-2">
              <h4 className="font-extrabold text-slate-900 uppercase text-[10px] tracking-wider">Purchased Items</h4>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {(lastSaleReceipt.items || []).map((item: any, idx: number) => (
                  <div key={idx} className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center text-xs">
                    <div>
                      <p className="font-extrabold text-slate-900">{item.product_name}</p>
                      <p className="text-[10px] text-slate-400">{item.quantity} {item.unit || "pcs"} × ₹{item.price}</p>
                    </div>
                    <span className="font-black text-slate-900">₹{item.total}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* PAYMENT SUMMARY */}
            <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-1.5 font-bold">
              <div className="flex justify-between text-slate-300 text-[11px]"><span>Payment Method:</span> <span className="uppercase">{lastSaleReceipt.payment_method}</span></div>
              <div className="flex justify-between text-slate-300 text-[11px]"><span>Subtotal:</span> <span>₹{lastSaleReceipt.subtotal}</span></div>
              {Number(lastSaleReceipt.tax) > 0 && <div className="flex justify-between text-slate-300 text-[11px]"><span>GST:</span> <span>₹{lastSaleReceipt.tax}</span></div>}
              {Number(lastSaleReceipt.discount) > 0 && <div className="flex justify-between text-slate-300 text-[11px]"><span>Discount:</span> <span>₹{lastSaleReceipt.discount}</span></div>}
              <div className="border-t border-slate-700 pt-1.5 flex justify-between text-sm font-black text-emerald-400"><span>Grand Total:</span> <span>₹{lastSaleReceipt.grand_total}</span></div>
              <div className="flex justify-between text-slate-300 text-[11px] pt-1 border-t border-slate-800"><span>Amount Paid:</span> <span>₹{lastSaleReceipt.amount_paid}</span></div>
              <div className="flex justify-between text-slate-300 text-[11px]"><span>Balance Due:</span> <span className={Number(lastSaleReceipt.balance_due) > 0 ? "text-amber-400 font-bold" : "text-slate-300"}>₹{lastSaleReceipt.balance_due}</span></div>
            </div>

            {/* ACTION BUTTONS */}
            <div className="flex gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={handlePrintInvoice}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs transition cursor-pointer min-h-[44px] flex items-center justify-center gap-1.5"
              >
                <Printer className="w-4 h-4" /> Print Invoice
              </button>

              <button
                type="button"
                onClick={handleNewBill}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl text-xs transition shadow-md cursor-pointer min-h-[44px] flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="w-4 h-4" /> New Bill
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INLINE ADD NEW CUSTOMER MODAL */}
      {addCustomerModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-5 text-xs text-slate-900">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-base font-black text-slate-900">+ Add New Customer</h3>
              <button onClick={() => setAddCustomerModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleSaveNewCustomerInline} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Customer Name *</label>
                <input
                  type="text"
                  required
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold outline-none focus:border-blue-600 h-11"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Mobile Phone *</label>
                <input
                  type="tel"
                  required
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  placeholder="e.g. 9876543210"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold outline-none focus:border-blue-600 h-11 font-mono"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">City</label>
                  <input
                    type="text"
                    value={newCustCity}
                    onChange={(e) => setNewCustCity(e.target.value)}
                    placeholder="e.g. Mumbai"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold outline-none focus:border-blue-600 h-11"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={newCustEmail}
                    onChange={(e) => setNewCustEmail(e.target.value)}
                    placeholder="e.g. rahul@gmail.com"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold outline-none focus:border-blue-600 h-11"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Street Address</label>
                <input
                  type="text"
                  value={newCustAddress}
                  onChange={(e) => setNewCustAddress(e.target.value)}
                  placeholder="e.g. Shop #12, Main Market"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold outline-none focus:border-blue-600 h-11"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">GSTIN (Optional)</label>
                <input
                  type="text"
                  value={newCustGstin}
                  onChange={(e) => setNewCustGstin(e.target.value)}
                  placeholder="e.g. 27AAAAA0000A1Z5"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold outline-none focus:border-blue-600 h-11 font-mono"
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
    </SharedDashboardLayout>
  );
}
