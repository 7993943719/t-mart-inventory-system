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
  Calendar,
  Filter,
  DollarSign,
  Clock,
  CheckCircle,
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

const getAsiaKolkataBounds = (period: string, customStart?: string, customEnd?: string) => {
  const now = new Date();
  const todayStr = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(now);
  const [year, month, day] = todayStr.split("-").map(Number);

  const istStartOfDay = new Date(Date.UTC(year, month - 1, day, 0, 0, 0) - (5 * 60 + 30) * 60 * 1000);

  if (period === "TODAY") {
    const istEndOfDay = new Date(istStartOfDay.getTime() + 24 * 60 * 60 * 1000 - 1);
    return { start: istStartOfDay, end: istEndOfDay };
  }
  if (period === "YESTERDAY") {
    const yesterdayStart = new Date(istStartOfDay.getTime() - 24 * 60 * 60 * 1000);
    const yesterdayEnd = new Date(istStartOfDay.getTime() - 1);
    return { start: yesterdayStart, end: yesterdayEnd };
  }
  if (period === "THIS_MONTH") {
    const monthStart = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0) - (5 * 60 + 30) * 60 * 1000);
    const nextMonthStart = new Date(Date.UTC(year, month, 1, 0, 0, 0) - (5 * 60 + 30) * 60 * 1000 - 1);
    return { start: monthStart, end: nextMonthStart };
  }
  if (period === "THIS_YEAR") {
    const yearStart = new Date(Date.UTC(year, 0, 1, 0, 0, 0) - (5 * 60 + 30) * 60 * 1000);
    const yearEnd = new Date(Date.UTC(year + 1, 0, 1, 0, 0, 0) - (5 * 60 + 30) * 60 * 1000 - 1);
    return { start: yearStart, end: yearEnd };
  }
  if (period === "CUSTOM" && customStart && customEnd) {
    const [sY, sM, sD] = customStart.split("-").map(Number);
    const [eY, eM, eD] = customEnd.split("-").map(Number);
    const start = new Date(Date.UTC(sY, sM - 1, sD, 0, 0, 0) - (5 * 60 + 30) * 60 * 1000);
    const end = new Date(Date.UTC(eY, eM - 1, eD, 23, 59, 59, 999) - (5 * 60 + 30) * 60 * 1000);
    return { start, end };
  }
  return { start: null, end: null };
};

export default function BillingPage() {
  const [supabase] = useState(() => createClient());
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<any[]>([]);
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

  // Filters State
  const [dateFilterPeriod, setDateFilterPeriod] = useState("TODAY");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [statusFilterTab, setStatusFilterTab] = useState("ALL"); // ALL, UNPAID, PARTIALLY PAID, PAID

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
        supabase.from("sales").select("*").order("created_at", { ascending: false }).limit(300),
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

  // Add Product to Cart (Negative stock supported)
  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
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

  // Update Quantity in Cart (Negative stock supported)
  const updateQuantity = (productId: string, newQty: number) => {
    if (newQty <= 0) {
      removeFromCart(productId);
      return;
    }

    const item = cart.find((i) => i.product.id === productId);
    if (!item) return;

    setErrorMsg("");
    setCart((prev) =>
      prev.map((i) => (i.product.id === productId ? { ...i, quantity: newQty } : i))
    );
  };

  const getItemPrice = (item: CartItem) => {
    return item.customPrice !== undefined ? item.customPrice : Number(item.product.selling_price || 0);
  };

  const updatePrice = (productId: string, newPrice: number) => {
    if (isNaN(newPrice) || newPrice < 0) {
      setErrorMsg("Selling price cannot be negative.");
      return;
    }
    setErrorMsg("");
    setCart((prev) =>
      prev.map((i) => (i.product.id === productId ? { ...i, customPrice: newPrice } : i))
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
    setBillingStep("SELECT_PRODUCTS");

    const nextInv = await getNextInvoiceNumber(supabase);
    setCurrentBillNo(nextInv);

    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  // Bill Calculations & GST Tax
  const subtotal = cart.reduce((sum, item) => sum + getItemPrice(item) * item.quantity, 0);
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
        selling_price: getItemPrice(item),
      }));

      // Call database RPC complete_sale_transaction with 10 parameters matching production exactly
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
        console.error("RPC Error Details:", { code: rpcError.code, message: rpcError.message, hint: rpcError.hint });
        if (rpcError.message?.includes("does not exist") || rpcError.code === "PGRST202" || rpcError.code === "42883") {
          throw new Error("Checkout could not resolve the database function. Please refresh the database schema cache or contact the administrator.");
        }
        throw new Error(rpcError.message || "Failed to complete sale transaction.");
      }

      if (rpcResult && rpcResult.error) {
        throw new Error(rpcResult.error);
      }

      const finalInvoiceNumber = rpcResult?.invoice_number || rpcResult?.bill_no || currentBillNo;

      const saleItemsList = consolidatedCart.map((item) => ({
        product_name: item.product.name,
        unit: item.product.unit,
        price: getItemPrice(item),
        quantity: item.quantity,
        total: Number((getItemPrice(item) * item.quantity).toFixed(2)),
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

      setCart([]);
      setDiscount(0);
      setAmountPaid("");
      setSelectedCustomerId(null);
      setCustomerName("Walk-in Customer");
      setPaymentMethod("CASH");
      setBillingStep("SELECT_PRODUCTS");
    } catch (err: any) {
      console.error("Sale completion failed:", err);
      setErrorMsg(err.message || "Failed to complete sale transaction.");
      // Cart is preserved on error as required
    } finally {
      setSubmitting(false);
    }

    // Refresh catalog and inventory in background without blocking sale completion UI
    loadData().catch((err) => console.error("Background data refresh failed:", err));
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

  // Calculate metrics for summary cards based on date filter
  const { start: dateStart, end: dateEnd } = getAsiaKolkataBounds(dateFilterPeriod, customStartDate, customEndDate);

  const dateFilteredSales = sales.filter((s) => {
    const createdAt = new Date(s.created_at);
    if (dateStart && createdAt < dateStart) return false;
    if (dateEnd && createdAt > dateEnd) return false;
    return true;
  });

  let unpaidCount = 0;
  let unpaidAmount = 0;
  let paidCount = 0;
  let paidAmount = 0;
  let partialCount = 0;
  let partialAmount = 0;

  dateFilteredSales.forEach((s) => {
    const pStatus = (s.payment_status || "").toUpperCase();
    const pMethod = (s.payment_method || "").toUpperCase();
    const total = Number(s.total_amount || s.total || 0);
    const balance = Number(s.balance_due !== undefined && s.balance_due !== null ? s.balance_due : (pMethod.includes("CREDIT") || pMethod.includes("DUE") ? total : 0));
    const paid = Number(s.amount_paid !== undefined && s.amount_paid !== null ? s.amount_paid : (pMethod.includes("CREDIT") || pMethod.includes("DUE") ? 0 : total));

    let eff = pStatus;
    if (!eff) {
      eff = (pMethod.includes("CREDIT") || pMethod.includes("DUE")) ? "UNPAID" : "PAID";
    }

    if (eff === "UNPAID") {
      unpaidCount++;
      unpaidAmount += balance > 0 ? balance : total;
    } else if (eff === "PARTIALLY PAID") {
      partialCount++;
      partialAmount += balance > 0 ? balance : total / 2;
    } else {
      paidCount++;
      paidAmount += paid > 0 ? paid : total;
    }
  });

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
          {/* SUPERMARKET POS DASHBOARD SUMMARY CARDS & FILTERS */}
          <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs mb-2.5 space-y-3">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              {/* Date Period Filter */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold text-slate-700">Period:</span>
                {["TODAY", "YESTERDAY", "THIS_MONTH", "THIS_YEAR", "CUSTOM"].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setDateFilterPeriod(p)}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-black transition cursor-pointer ${
                      dateFilterPeriod === p ? "bg-blue-600 text-white shadow-xs" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {p === "TODAY" ? "Today" : p === "YESTERDAY" ? "Yesterday" : p === "THIS_MONTH" ? "This Month" : p === "THIS_YEAR" ? "This Year" : "Custom"}
                  </button>
                ))}
              </div>

              {/* Payment Status Filter Tabs */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <Filter className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold text-slate-700">Status:</span>
                {["ALL", "UNPAID", "PARTIALLY PAID", "PAID"].map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatusFilterTab(st)}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-black uppercase transition cursor-pointer ${
                      statusFilterTab === st ? "bg-slate-900 text-white shadow-xs" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {st === "ALL" ? "All Bills" : st}
                  </button>
                ))}
              </div>
            </div>

            {dateFilterPeriod === "CUSTOM" && (
              <div className="flex items-center gap-2 pt-2 border-t border-slate-100 text-xs">
                <span className="font-bold text-slate-600">From:</span>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold outline-none"
                />
                <span className="font-bold text-slate-600">To:</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold outline-none"
                />
              </div>
            )}

            {/* 3 COMPACT SUMMARY CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
              <div className="p-3 bg-rose-50/60 border border-rose-100 rounded-xl space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-rose-700 uppercase tracking-wider flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> Pending / Unpaid
                  </span>
                  <span className="px-2 py-0.5 bg-rose-100 text-rose-800 font-black text-[10px] rounded-full">{unpaidCount} Bills</span>
                </div>
                <p className="text-base font-black text-rose-900">₹{unpaidAmount.toFixed(2)}</p>
                <p className="text-[10px] text-rose-600 font-medium">Total Outstanding Balance Due</p>
              </div>

              <div className="p-3 bg-emerald-50/60 border border-emerald-100 rounded-xl space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-emerald-700 uppercase tracking-wider flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" /> Paid Bills
                  </span>
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-black text-[10px] rounded-full">{paidCount} Bills</span>
                </div>
                <p className="text-base font-black text-emerald-900">₹{paidAmount.toFixed(2)}</p>
                <p className="text-[10px] text-emerald-600 font-medium">Total Collected Revenue</p>
              </div>

              <div className="p-3 bg-amber-50/60 border border-amber-100 rounded-xl space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-amber-700 uppercase tracking-wider flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5" /> Partially Paid
                  </span>
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-800 font-black text-[10px] rounded-full">{partialCount} Bills</span>
                </div>
                <p className="text-base font-black text-amber-900">₹{partialAmount.toFixed(2)}</p>
                <p className="text-[10px] text-amber-600 font-medium">Remaining Balance Due</p>
              </div>
            </div>
          </div>

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
                  onKeyDown={handleSearchKeyDown}
                  className="w-full pl-9 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-blue-600 focus:bg-white transition h-9"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  if (searchInputRef.current) searchInputRef.current.focus();
                }}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer flex items-center justify-center gap-1 shrink-0 h-9"
                title="Scan Barcode"
              >
                <Scan className="w-4 h-4 text-blue-600" /> Scan
              </button>
            </div>

            {/* CATEGORY FILTER PILLS HORIZONTALLY */}
            {categoriesList.length > 1 && (
              <div className="flex gap-1 overflow-x-auto pb-0.5 max-w-full">
                {categoriesList.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2.5 py-1 rounded-lg font-bold text-[10px] transition shrink-0 cursor-pointer ${
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

            {/* ALL AVAILABLE PRODUCTS DISPLAYED AS RESPONSIVE PRODUCT CARDS BY DEFAULT */}
            <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1">
              {loading ? (
                <div className="p-4 text-center text-xs text-slate-400">Loading catalog...</div>
              ) : filteredProducts.length === 0 ? (
                <div className="p-4 bg-slate-50 rounded-xl border border-dashed text-center text-xs text-slate-400 space-y-1">
                  <Package className="w-5 h-5 text-slate-300 mx-auto" />
                  <p className="font-bold text-slate-600 text-xs">No products found</p>
                </div>
              ) : (
                filteredProducts.map((p) => {
                  const stockQty = Number(p.stock_quantity || 0);
                  const isOut = stockQty <= 0;
                  const formattedPrice = Number(p.selling_price || 0).toFixed(2);
                  const unitStr = p.unit || "pcs";

                  return (
                    <div
                      key={p.id}
                      className="p-3 bg-slate-50 hover:bg-blue-50/50 rounded-xl border border-slate-100 flex items-center justify-between text-xs transition group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                        {p.image_url ? (
                          <img src={p.image_url} alt={p.name} className="w-9 h-9 rounded-lg object-cover shrink-0 border border-slate-200" />
                        ) : (
                          <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-bold shrink-0 text-xs">
                            📦
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <h4 className="font-extrabold text-slate-900 group-hover:text-blue-600 transition truncate text-xs sm:text-sm">{p.name}</h4>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{p.category || "General"}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 px-1 text-right">
                        <div>
                          <span className="block font-black text-emerald-600 text-xs sm:text-sm">₹{formattedPrice}</span>
                          <span className={`block font-bold text-[10px] ${isOut ? "text-rose-600" : stockQty <= Number(p.minimum_stock || 10) ? "text-amber-600" : "text-slate-500"}`}>
                            Stock: {stockQty} {unitStr}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => addToCart(p)}
                          disabled={isOut}
                          className={`px-3.5 py-2 text-xs font-black rounded-xl transition cursor-pointer flex items-center gap-1 min-h-[36px] ${
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

          {/* VIEW CART BUTTON IN STEP 1 */}
          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={() => {
                if (cart.length === 0) {
                  setErrorMsg("Please add at least one product to the cart before viewing cart.");
                  setTimeout(() => setErrorMsg(""), 3000);
                  return;
                }
                setBillingStep("CART_CHECKOUT");
              }}
              className="w-full sm:w-auto px-6 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl shadow-lg transition cursor-pointer flex items-center justify-center gap-2 min-h-[44px]"
            >
              <ShoppingCart className="w-4 h-4" /> Proceed to Cart & Payment ({cart.length} Items • ₹{grandTotal.toFixed(2)}) <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: CART & PAYMENT WORKFLOW PAGE */}
      {billingStep === "CART_CHECKOUT" && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap justify-between items-center gap-3">
            <div>
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <ReceiptText className="w-4 h-4 text-blue-600" /> Review Bill & Complete Payment
              </h3>
              <p className="text-xs text-slate-500 font-semibold mt-0.5">
                Customer: <strong className="text-slate-900">{customerName}</strong> • Invoice: <strong className="text-blue-600 font-mono">{currentBillNo}</strong>
              </p>
            </div>

            <button
              type="button"
              onClick={() => setBillingStep("SELECT_PRODUCTS")}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl transition cursor-pointer flex items-center gap-1.5 min-h-[38px]"
            >
              <ArrowLeft className="w-4 h-4 text-blue-600" /> Back to Products
            </button>
          </div>

          {/* CART ITEMS LIST & PAYMENT DETAILS */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-7 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
              <div className="pb-2 border-b border-slate-100 flex justify-between items-center">
                <h4 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <ShoppingCart className="w-4 h-4 text-blue-600" /> Cart Items ({cart.length})
                </h4>
              </div>

              {cart.length === 0 ? (
                <div className="p-8 text-center space-y-2 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                  <ShoppingCart className="w-8 h-8 text-slate-300 mx-auto" />
                  <h4 className="text-xs font-bold text-slate-700">Cart is empty</h4>
                  <button
                    type="button"
                    onClick={() => setBillingStep("SELECT_PRODUCTS")}
                    className="px-4 py-2 bg-blue-600 text-white font-extrabold text-xs rounded-xl shadow-xs cursor-pointer inline-flex items-center gap-1"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Back to Products
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-slate-200/80 max-h-96 overflow-y-auto pr-1">
                  {cart.map((item) => {
                    const unitPrice = getItemPrice(item);
                    const itemTotal = (unitPrice * item.quantity).toFixed(2);
                    return (
                      <div key={item.product.id} className="py-3 px-1 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 text-xs">
                        {/* Left: Product Name */}
                        <div className="min-w-0 flex-1 pr-1">
                          <p className="font-extrabold text-slate-900 truncate text-xs sm:text-sm">{item.product.name}</p>
                          <p className="text-[10px] text-slate-400 font-semibold">{item.product.category || "General"}</p>
                        </div>

                        {/* Controls & Amounts in aligned horizontal layout */}
                        <div className="flex items-center gap-3 shrink-0 flex-wrap sm:flex-nowrap">
                          {/* Quantity Control */}
                          <div className="flex items-center gap-0.5 bg-slate-100 border border-slate-200/80 rounded-lg p-0.5">
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                              className="p-1.5 hover:bg-slate-200 rounded cursor-pointer transition"
                            >
                              <Minus className="w-3.5 h-3.5 text-slate-700" />
                            </button>
                            <span className="px-2 font-black text-slate-900 text-xs">{item.quantity}</span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                              className="p-1.5 hover:bg-slate-200 rounded cursor-pointer transition"
                            >
                              <Plus className="w-3.5 h-3.5 text-slate-700" />
                            </button>
                          </div>

                          {/* Unit Selling Price (Editable by billing staff) */}
                          <div className="text-right min-w-[75px]">
                            <span className="text-[9px] font-bold text-slate-400 block uppercase mb-0.5">Price (₹)</span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={getItemPrice(item)}
                              onChange={(e) => updatePrice(item.product.id, Number(e.target.value))}
                              className="w-16 h-8 bg-slate-50 border border-slate-200 rounded-lg px-1.5 font-bold text-slate-900 text-xs text-right outline-none focus:border-blue-600"
                            />
                          </div>

                          {/* Line Amount */}
                          <div className="text-right min-w-[70px]">
                            <span className="text-[9px] font-bold text-slate-400 block uppercase">Amount</span>
                            <span className="font-black text-emerald-600 text-xs sm:text-sm">₹{itemTotal}</span>
                          </div>

                          {/* Remove Button */}
                          <button
                            type="button"
                            onClick={() => removeFromCart(item.product.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                            title="Remove Item"
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

            {/* PAYMENT SUMMARY COLUMN */}
            <div className="lg:col-span-5 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
              <h4 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-emerald-600" /> Payment Summary
              </h4>

              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Payment Method</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold outline-none h-10 cursor-pointer"
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
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold outline-none h-10 focus:border-blue-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Discount (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={discount || ""}
                    onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                    placeholder="0.00"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold outline-none h-10 focus:border-blue-600"
                  />
                </div>

                <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-1.5">
                  <div className="flex justify-between text-slate-300 text-xs"><span>Subtotal:</span> <span>₹{subtotal.toFixed(2)}</span></div>
                  {gstEnabled && <div className="flex justify-between text-slate-300 text-xs"><span>GST ({taxRate}%):</span> <span>₹{tax.toFixed(2)}</span></div>}
                  {discount > 0 && <div className="flex justify-between text-slate-300 text-xs"><span>Discount:</span> <span>₹{Number(discount || 0).toFixed(2)}</span></div>}
                  <div className="border-t border-slate-700 pt-2 flex justify-between text-sm sm:text-base font-black text-emerald-400">
                    <span>Grand Total:</span> <span>₹{grandTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-300 text-xs pt-1 border-t border-slate-800"><span>Amount Paid:</span> <span>₹{numericAmountPaid.toFixed(2)}</span></div>
                  <div className="flex justify-between text-slate-300 text-xs"><span>Balance Due:</span> <span className={balanceDue > 0 ? "text-amber-400 font-bold" : "text-slate-300"}>₹{balanceDue.toFixed(2)}</span></div>
                  <div className="flex justify-between items-center text-xs pt-1.5 border-t border-slate-800">
                    <span>Payment Status:</span>
                    <span className={`px-2.5 py-0.5 font-black text-[10px] uppercase rounded-full ${
                      paymentStatus === "PAID" ? "bg-emerald-500/20 text-emerald-400" :
                      paymentStatus === "PARTIALLY PAID" ? "bg-amber-500/20 text-amber-400" :
                      "bg-rose-500/20 text-rose-400"
                    }`}>
                      {paymentStatus}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setBillingStep("SELECT_PRODUCTS")}
                    className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer min-h-[44px] flex items-center justify-center gap-1.5"
                  >
                    <ArrowLeft className="w-4 h-4" /> Back
                  </button>

                  <button
                    type="button"
                    onClick={handleCompleteSale}
                    disabled={submitting || cart.length === 0}
                    className="flex-2 py-3.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-black rounded-xl text-xs shadow-lg shadow-emerald-600/20 transition flex items-center justify-center gap-2 cursor-pointer min-h-[44px]"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Generating Bill...
                      </>
                    ) : (
                      <>
                        <ReceiptText className="w-4 h-4" /> Complete Payment (₹{grandTotal.toFixed(2)})
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* COMPLETED INVOICE RECEIPT MODAL */}
      {saleCompletedModal && lastSaleReceipt && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-[calc(100%-24px)] p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-5 max-h-[90vh] overflow-y-auto text-xs">
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

            <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-1.5 font-bold">
              <div className="flex justify-between text-slate-300 text-[11px]"><span>Payment Method:</span> <span className="uppercase">{lastSaleReceipt.payment_method}</span></div>
              <div className="flex justify-between text-slate-300 text-[11px]"><span>Subtotal:</span> <span>₹{lastSaleReceipt.subtotal}</span></div>
              {Number(lastSaleReceipt.tax) > 0 && <div className="flex justify-between text-slate-300 text-[11px]"><span>GST:</span> <span>₹{lastSaleReceipt.tax}</span></div>}
              {Number(lastSaleReceipt.discount) > 0 && <div className="flex justify-between text-slate-300 text-[11px]"><span>Discount:</span> <span>₹{lastSaleReceipt.discount}</span></div>}
              <div className="border-t border-slate-700 pt-1.5 flex justify-between text-sm font-black text-emerald-400"><span>Grand Total:</span> <span>₹{lastSaleReceipt.grand_total}</span></div>
              <div className="flex justify-between text-slate-300 text-[11px] pt-1 border-t border-slate-800"><span>Amount Paid:</span> <span>₹{lastSaleReceipt.amount_paid}</span></div>
              <div className="flex justify-between text-slate-300 text-[11px]"><span>Balance Due:</span> <span className={Number(lastSaleReceipt.balance_due) > 0 ? "text-amber-400 font-bold" : "text-slate-300"}>₹{lastSaleReceipt.balance_due}</span></div>
            </div>

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
