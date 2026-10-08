"use client";

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
  Check,
  Eye,
  Printer,
  Barcode,
  X,
  RefreshCw,
  CreditCard,
  DollarSign,
  User,
  AlertCircle,
  Package,
  Loader2,
  FileText,
  UserCheck,
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

  // Search & Cart State
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState("Walk-in Customer");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [discount, setDiscount] = useState<number>(0);
  const [taxRate, setTaxRate] = useState<number>(0);
  const [amountPaid, setAmountPaid] = useState<string>("");

  // Inline Add Customer Modal State
  const [addCustomerModalOpen, setAddCustomerModalOpen] = useState(false);
  const [newCustName, setNewCustName] = useState("");
  const [newCustPhone, setNewCustPhone] = useState("");
  const [newCustAddress, setNewCustAddress] = useState("");
  const [savingNewCustomer, setSavingNewCustomer] = useState(false);

  // Bill & Print State
  const [currentBillNo, setCurrentBillNo] = useState("BILL-0001");
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [lastSaleReceipt, setLastSaleReceipt] = useState<any>(null);
  const [saleCompletedModal, setSaleCompletedModal] = useState(false);

  // View Saved Bill Details Modal State
  const [viewBillModalOpen, setViewBillModalOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<any>(null);
  const [saleItems, setSaleItems] = useState<any[]>([]);
  const [loadingBillItems, setLoadingBillItems] = useState(false);
  const [billDetailsError, setBillDetailsError] = useState("");

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
        setBusiness(memberships[0].businesses);
        setRole(memberships[0].role || "OWNER");
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
      setSuccessMsg("New customer added & selected!");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err: any) {
      console.error("Error creating customer inline:", err);
      setErrorMsg(err.message || "Failed to create customer.");
    } finally {
      setSavingNewCustomer(false);
    }
  };

  // View Bill Details & Fetch Sale Items from Supabase
  const handleViewBill = async (sale: any) => {
    setSelectedSale(sale);
    setViewBillModalOpen(true);
    setLoadingBillItems(true);
    setBillDetailsError("");
    setSaleItems([]);

    try {
      const { data: items, error: itemsError } = await supabase
        .from("sale_items")
        .select("*")
        .eq("sale_id", sale.id)
        .order("created_at", { ascending: true });

      if (itemsError) throw itemsError;

      if (!items || items.length === 0) {
        setSaleItems([]);
        return;
      }

      const enrichedItems = await Promise.all(
        items.map(async (item: any) => {
          let pName = item.product_name;
          let unit = "pcs";

          if (item.product_id) {
            const { data: prod } = await supabase
              .from("products")
              .select("name, unit")
              .eq("id", item.product_id)
              .single();

            if (prod) {
              if (!pName) pName = prod.name;
              if (prod.unit) unit = prod.unit;
            }
          }

          return {
            ...item,
            product_name: pName || "Product",
            unit: unit,
            price: Number(item.price || item.unit_price || 0),
            quantity: Number(item.quantity || 1),
            total: Number(item.total || item.total_price || (item.price * item.quantity)),
          };
        })
      );

      setSaleItems(enrichedItems);
    } catch (err: any) {
      console.error("Error fetching bill details:", err);
      setBillDetailsError(err.message || "Failed to load bill items from Supabase.");
    } finally {
      setLoadingBillItems(false);
    }
  };

  // Product Search Filter
  const filteredProducts = products.filter((p) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase().trim();
    const nameMatch = p.name.toLowerCase().includes(query);
    const barcodeMatch = p.barcode ? p.barcode.toLowerCase().includes(query) : false;
    const catMatch = p.category ? p.category.toLowerCase().includes(query) : false;
    return nameMatch || barcodeMatch || catMatch;
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

  // Bill Calculations
  const subtotal = cart.reduce((sum, item) => sum + Number(item.product.selling_price || 0) * item.quantity, 0);
  const tax = Math.max(0, (subtotal - Number(discount || 0)) * (taxRate / 100));
  const grandTotal = Math.max(0, subtotal - Number(discount || 0) + tax);

  const numericAmountPaid = amountPaid !== "" ? Number(amountPaid) : grandTotal;
  const changeDue = Math.max(0, numericAmountPaid - grandTotal);

  // Complete Sale & Update Supabase
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
      const invoiceNumber = await getNextInvoiceNumber(supabase);

      // Re-verify stock levels from Supabase
      for (const item of cart) {
        const { data: currentProd } = await supabase
          .from("products")
          .select("stock_quantity, name")
          .eq("id", item.product.id)
          .single();

        const currentQty = Number(currentProd?.stock_quantity || 0);
        if (currentQty < item.quantity) {
          throw new Error(`Insufficient stock for "${item.product.name}". Available: ${currentQty}, Requested: ${item.quantity}`);
        }
      }

      // 1. Insert Sale record into Supabase with customer_id and customer_name
      const { data: sale, error: saleError } = await supabase
        .from("sales")
        .insert({
          business_id: businessId,
          user_id: user.id,
          invoice_number: invoiceNumber,
          customer_name: customerName || "Walk-in Customer",
          customer_id: selectedCustomerId || null,
          subtotal: Number(subtotal.toFixed(2)),
          discount: Number(discount || 0),
          total_amount: Number(grandTotal.toFixed(2)),
          payment_method: paymentMethod,
        })
        .select()
        .single();

      if (saleError) throw new Error(saleError.message);

      // 2. Insert Sale Items
      const saleItemsList = [];
      for (const item of cart) {
        const itemTotal = Number((item.product.selling_price * item.quantity).toFixed(2));

        const { error: itemErr } = await supabase.from("sale_items").insert({
          sale_id: sale.id,
          product_id: item.product.id,
          quantity: item.quantity,
          selling_price: item.product.selling_price,
          total_amount: itemTotal,
        });

        if (itemErr) {
          throw new Error(`Sale items insert failed: ${itemErr.message}`);
        }

        saleItemsList.push({
          product_name: item.product.name,
          unit: item.product.unit,
          price: item.product.selling_price,
          quantity: item.quantity,
          total: itemTotal,
        });

        // Update Product stock
        const newStock = Math.max(0, Number(item.product.stock_quantity || 0) - item.quantity);
        await supabase
          .from("products")
          .update({ stock_quantity: newStock, updated_at: new Date().toISOString() })
          .eq("id", item.product.id);

        // Record stock_movement
        await supabase.from("stock_movements").insert([
          {
            tenant_id: businessId,
            product_id: item.product.id,
            product_name: item.product.name,
            type: "Sale",
            quantity: item.quantity,
            reference: `Invoice: ${invoiceNumber}`,
            user_name: userName,
            created_at: new Date().toISOString(),
          },
        ]);
      }

      const receiptData = {
        invoice_number: invoiceNumber,
        date: new Date().toLocaleString(),
        customer_name: customerName,
        payment_method: paymentMethod,
        subtotal: subtotal.toFixed(2),
        discount: Number(discount || 0).toFixed(2),
        grand_total: grandTotal.toFixed(2),
        amount_paid: numericAmountPaid.toFixed(2),
        change_due: changeDue.toFixed(2),
        items: saleItemsList,
        business_name: business?.name || "TWEB",
      };

      setLastSaleReceipt(receiptData);
      setSaleCompletedModal(true);
      setSuccessMsg(`Sale completed! Invoice: ${invoiceNumber}`);

      await loadData();
      setCart([]);
      setDiscount(0);
      setAmountPaid("");
      setSelectedCustomerId(null);
      setCustomerName("Walk-in Customer");
      setPaymentMethod("CASH");
    } catch (err: any) {
      console.error("Sale completion failed:", err);
      setErrorMsg(err.message || "Failed to complete sale.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SharedDashboardLayout
      businessName={business?.name || "TWEB"}
      userName={userName}
      role={role}
      pageTitle="New Bill"
    >
      {/* POS HEADER BAR */}
      <div className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900">New Bill</h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Bill No: <strong className="text-blue-600 font-mono text-sm">{currentBillNo}</strong> • Date: <strong className="text-slate-800">{new Date().toLocaleDateString()}</strong>
          </p>
        </div>

        <button
          onClick={handleNewBill}
          type="button"
          className="rounded-xl bg-blue-600 px-5 py-3 font-extrabold text-white hover:bg-blue-700 shadow-md transition cursor-pointer text-xs flex items-center gap-2 min-h-[44px]"
        >
          <RefreshCw className="w-4 h-4" /> Reset Bill
        </button>
      </div>

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-bold mb-6 flex items-center justify-between">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg("")}><X className="w-4 h-4" /></button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-2xl text-xs font-bold mb-6 flex items-center justify-between">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg("")}><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* TWO COLUMN POS LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* LEFT COLUMN: SEARCH & PRODUCTS */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">Product Search</h3>
              <span className="text-[11px] font-bold text-slate-400">{filteredProducts.length} products available</span>
            </div>

            {/* SEARCH INPUT */}
            <div className="relative w-full">
              <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="🔍 Search product name / barcode"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:border-blue-600 focus:bg-white transition h-11"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* PRODUCT CARDS LIST */}
            <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
              {loading ? (
                <div className="p-12 text-center text-xs text-slate-400">Loading products...</div>
              ) : filteredProducts.length === 0 ? (
                <div className="p-12 bg-slate-50 rounded-2xl border border-dashed text-center text-xs text-slate-400 space-y-2">
                  <Package className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="font-bold text-slate-600">No matching products found</p>
                </div>
              ) : (
                filteredProducts.map((p) => {
                  const stockQty = Number(p.stock_quantity || 0);
                  const isOut = stockQty <= 0;

                  return (
                    <div
                      key={p.id}
                      className="p-3.5 bg-slate-50 hover:bg-blue-50/50 rounded-2xl border border-slate-100 flex justify-between items-center text-xs transition group"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1 pr-3">
                        {p.image_url ? (
                          <img src={p.image_url} alt={p.name} className="w-10 h-10 rounded-xl object-cover shrink-0 border" />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold shrink-0">
                            📦
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <h4 className="font-extrabold text-slate-900 group-hover:text-blue-600 transition truncate">{p.name}</h4>
                          <div className="flex items-center gap-3 mt-0.5 text-[11px]">
                            <span className="font-black text-emerald-600">₹{p.selling_price}</span>
                            <span className={`font-bold ${isOut ? "text-rose-600" : stockQty <= Number(p.minimum_stock || 10) ? "text-amber-600" : "text-slate-500"}`}>
                              Stock: {stockQty} {p.unit}
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => addToCart(p)}
                        disabled={isOut}
                        className={`px-4 py-2 text-xs font-black rounded-xl transition cursor-pointer flex items-center gap-1 min-h-[38px] ${
                          isOut ? "bg-slate-200 text-slate-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
                        }`}
                      >
                        <Plus className="w-3.5 h-3.5" /> ADD
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: CURRENT BILL CART & SUMMARY */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-5">
            <div className="pb-3 border-b border-slate-100 space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-base font-black text-slate-900">Current Bill</h3>
                <span className="px-2.5 py-1 bg-blue-50 text-blue-700 font-extrabold text-[10px] rounded-full uppercase">
                  {cart.length} Item(s)
                </span>
              </div>

              {/* CUSTOMER SELECTOR */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase">Customer</label>
                  <button
                    type="button"
                    onClick={() => setAddCustomerModalOpen(true)}
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-700 cursor-pointer flex items-center gap-1"
                  >
                    + Add New Customer
                  </button>
                </div>
                <select
                  value={selectedCustomerId || "WALK_IN"}
                  onChange={handleSelectCustomer}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-blue-600 h-11"
                >
                  <option value="WALK_IN">Walk-in Customer</option>
                  {customersList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.phone})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* CART ITEMS LIST */}
            {cart.length === 0 ? (
              <div className="p-10 text-center space-y-2 border border-dashed border-slate-200 rounded-2xl">
                <ShoppingCart className="w-8 h-8 text-slate-300 mx-auto" />
                <h4 className="text-xs font-bold text-slate-800">Cart is empty</h4>
                <p className="text-[11px] text-slate-400">Search products or scan barcode to add items.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                  {cart.map((item) => {
                    const itemTotal = (item.product.selling_price * item.quantity).toFixed(2);
                    return (
                      <div key={item.product.id} className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center text-xs">
                        <div className="min-w-0 flex-1 pr-2">
                          <p className="font-extrabold text-slate-900 truncate">{item.product.name}</p>
                          <p className="text-[11px] text-emerald-600 font-bold">₹{item.product.selling_price}</p>
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

                {/* PAYMENT METHOD & TOTALS */}
                <div className="space-y-3 pt-3 border-t border-slate-100 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Payment Method</label>
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

                  <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-2">
                    <div className="flex justify-between text-slate-300 text-xs"><span>Subtotal:</span> <span>₹{subtotal.toFixed(2)}</span></div>
                    <div className="flex justify-between text-slate-300 text-xs"><span>Discount:</span> <span>₹{Number(discount || 0).toFixed(2)}</span></div>
                    <div className="border-t border-slate-700 pt-2 flex justify-between text-base font-black text-emerald-400">
                      <span>Total Amount:</span> <span>₹{grandTotal.toFixed(2)}</span>
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
                        <Loader2 className="w-4 h-4 animate-spin" /> Saving Bill...
                      </>
                    ) : (
                      <>
                        <ReceiptText className="w-4 h-4" /> Generate Bill (₹{grandTotal.toFixed(2)})
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* INLINE ADD CUSTOMER MODAL */}
      {addCustomerModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4 text-xs">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-base font-black text-slate-900">Add Customer Profile</h3>
              <button onClick={() => setAddCustomerModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleSaveNewCustomerInline} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Customer Name *</label>
                <input
                  type="text"
                  required
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold outline-none focus:border-blue-600 h-11"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Mobile Number *</label>
                <input
                  type="tel"
                  required
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  placeholder="e.g. 9876543210"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold outline-none focus:border-blue-600 h-11"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Address / City</label>
                <input
                  type="text"
                  value={newCustAddress}
                  onChange={(e) => setNewCustAddress(e.target.value)}
                  placeholder="Optional"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold outline-none focus:border-blue-600 h-11"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setAddCustomerModalOpen(false)}
                  className="flex-1 py-2.5 border rounded-xl font-bold text-slate-600 hover:bg-slate-50 cursor-pointer min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingNewCustomer}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black shadow-md cursor-pointer min-h-[44px]"
                >
                  {savingNewCustomer ? "Saving..." : "Save Customer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </SharedDashboardLayout>
  );
}
