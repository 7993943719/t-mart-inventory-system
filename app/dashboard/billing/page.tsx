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
  const [loading, setLoading] = useState(true);

  // Search & Cart State
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState("Walk-in Customer");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [discount, setDiscount] = useState<number>(0);
  const [taxRate, setTaxRate] = useState<number>(0);
  const [amountPaid, setAmountPaid] = useState<string>("");

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

      const [prodsRes, salesRes] = await Promise.all([
        supabase.from("products").select("*").order("name", { ascending: true }),
        supabase.from("sales").select("*").order("created_at", { ascending: false }).limit(20),
      ]);

      setProducts(prodsRes.data || []);
      setSales(salesRes.data || []);

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

  // View Bill Details & Fetch Sale Items from Supabase
  const handleViewBill = async (sale: any) => {
    setSelectedSale(sale);
    setViewBillModalOpen(true);
    setLoadingBillItems(true);
    setBillDetailsError("");
    setSaleItems([]);

    try {
      // 1. Fetch matching sale_items for selected sale.id
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

      // 2. Enrich items with product details if needed
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

      // 1. Fetch exact latest sequential invoice number
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

      // 2. Insert Sale record into Supabase using exact schema columns
      const { data: sale, error: saleError } = await supabase
        .from("sales")
        .insert({
          business_id: businessId,
          user_id: user.id,
          invoice_number: invoiceNumber,
          subtotal: Number(subtotal.toFixed(2)),
          discount: Number(discount || 0),
          total_amount: Number(grandTotal.toFixed(2)),
          payment_method: paymentMethod,
        })
        .select()
        .single();

      if (saleError) {
        throw new Error(saleError.message);
      }

      console.log("SALE CREATED:");
      console.log("sale_id:", sale.id);

      // 3. Insert Sale Items with strict debugging and verification
      console.log("SALE ITEMS TO INSERT:");
      console.log("count:", cart.length);

      const saleItemsList = [];
      for (const item of cart) {
        const itemTotal = Number((item.product.selling_price * item.quantity).toFixed(2));

        // Insert sale_item using exact required schema columns: sale_id, product_id, quantity, selling_price, total_amount
        const { error: itemErr } = await supabase.from("sale_items").insert({
          sale_id: sale.id,
          product_id: item.product.id,
          quantity: item.quantity,
          selling_price: item.product.selling_price,
          total_amount: itemTotal,
        });

        if (itemErr) {
          console.error("SALE ITEMS INSERT RESULT: error");
          console.error("SALE ITEMS ERROR");
          console.error("code:", itemErr.code);
          console.error("message:", itemErr.message);
          console.error("details:", itemErr.details);
          console.error("hint:", itemErr.hint);
          throw new Error(`Sale items insert failed: ${itemErr.message}`);
        } else {
          console.log("SALE ITEMS INSERT RESULT: success");
        }

        saleItemsList.push({
          product_name: item.product.name,
          unit: item.product.unit,
          price: item.product.selling_price,
          quantity: item.quantity,
          total: itemTotal,
        });

        // 4. Update Product stock in products table (only after sale_items succeed)
        const newStock = Math.max(0, Number(item.product.stock_quantity || 0) - item.quantity);
        await supabase
          .from("products")
          .update({ stock_quantity: newStock, updated_at: new Date().toISOString() })
          .eq("id", item.product.id);

        // 5. Record stock_movement
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

      // Receipt payload
      const receiptData = {
        invoice_number: invoiceNumber,
        date: new Date().toLocaleString(),
        customer_name: customerName,
        payment_method: paymentMethod,
        business_name: business?.name || "T MART Supermarket",
        items: saleItemsList,
        subtotal: subtotal.toFixed(2),
        discount: Number(discount || 0).toFixed(2),
        tax: tax.toFixed(2),
        grand_total: grandTotal.toFixed(2),
        amount_paid: numericAmountPaid.toFixed(2),
        change_due: changeDue.toFixed(2),
      };

      setLastSaleReceipt(receiptData);
      setSuccessMsg(`Sale Completed! ${invoiceNumber} Total: ₹${grandTotal.toFixed(2)}`);
      setSaleCompletedModal(true);

      // Reset cart
      setCart([]);
      setDiscount(0);
      setAmountPaid("");

      // Fetch next bill number for next transaction
      const nextInv = await getNextInvoiceNumber(supabase);
      setCurrentBillNo(nextInv);

      // Reload products & sales list
      loadData();
    } catch (err: any) {
      console.error("Sale completion error:", err);
      setErrorMsg(err.message || "Failed to complete bill. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Open Printable Receipt Window
  const handlePrintReceipt = (receipt: any) => {
    if (!receipt) return;

    const printWindow = window.open("", "_blank", "width=400,height=600");
    if (!printWindow) {
      alert("Please allow popups to print receipt.");
      return;
    }

    const receiptNo = receipt.invoice_number || receipt.bill_no || "";

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt - ${receiptNo}</title>
          <style>
            body { font-family: 'Courier New', monospace; font-size: 12px; padding: 15px; margin: 0; }
            .text-center { text-align: center; }
            .bold { font-weight: bold; }
            .divider { border-top: 1px dashed #000; margin: 8px 0; }
            table { width: 100%; border-collapse: collapse; margin: 8px 0; }
            th, td { text-align: left; padding: 2px 0; font-size: 11px; }
            .text-right { text-align: right; }
            .flex-between { display: flex; justify-content: space-between; }
          </style>
        </head>
        <body>
          <div class="text-center">
            <h2 style="margin: 0;">${receipt.business_name || "T MART"}</h2>
            <p style="margin: 2px 0;">Supermarket POS Receipt</p>
          </div>
          <div class="divider"></div>
          <div class="flex-between"><span>Bill No:</span><span class="bold">${receiptNo}</span></div>
          <div class="flex-between"><span>Date:</span><span>${receipt.date}</span></div>
          <div class="flex-between"><span>Customer:</span><span>${receipt.customer_name || "Walk-in Customer"}</span></div>
          <div class="flex-between"><span>Payment:</span><span>${receipt.payment_method}</span></div>
          <div class="divider"></div>
          <table>
            <thead>
              <tr><th>Item</th><th class="text-right">Qty</th><th class="text-right">Price</th><th class="text-right">Total</th></tr>
            </thead>
            <tbody>
              ${(receipt.items || []).map((i: any) => `
                <tr>
                  <td>${i.product_name}</td>
                  <td class="text-right">${i.quantity}</td>
                  <td class="text-right">₹${i.price}</td>
                  <td class="text-right">₹${i.total}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
          <div class="divider"></div>
          <div class="flex-between"><span>Subtotal:</span><span>₹${receipt.subtotal}</span></div>
          <div class="flex-between"><span>Discount:</span><span>₹${receipt.discount}</span></div>
          <div class="divider"></div>
          <div class="flex-between bold" style="font-size: 14px;"><span>GRAND TOTAL:</span><span>₹${receipt.grand_total}</span></div>
          ${receipt.amount_paid ? `<div class="flex-between"><span>Amount Paid:</span><span>₹${receipt.amount_paid}</span></div>` : ""}
          ${receipt.change_due ? `<div class="flex-between"><span>Change:</span><span>₹${receipt.change_due}</span></div>` : ""}
          <div class="divider"></div>
          <div class="text-center" style="margin-top: 15px;">
            <p style="margin: 0;">Thank you for shopping with us!</p>
            <p style="margin: 2px 0;">Visit Again</p>
          </div>
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <SharedDashboardLayout
      businessName={business?.name || "T MART"}
      userName={userName}
      role={role}
      pageTitle="T MART Billing"
    >
      {/* POS HEADER BAR */}
      <div className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900">T MART Billing</h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Bill No: <strong className="text-blue-600 font-mono text-sm">{currentBillNo}</strong> • Date: <strong className="text-slate-800">{new Date().toLocaleDateString()}</strong>
          </p>
        </div>

        <button
          onClick={handleNewBill}
          type="button"
          className="rounded-xl bg-blue-600 px-5 py-3 font-extrabold text-white hover:bg-blue-700 shadow-md transition cursor-pointer text-xs flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> + New Bill
        </button>
      </div>

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-bold mb-6 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg("")} className="text-rose-500 hover:text-rose-700"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* POS TWO-COLUMN LAYOUT (Desktop & Mobile Responsive) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">

        {/* LEFT COLUMN: PRODUCT SEARCH & CATALOG */}
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
                className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:border-blue-600 focus:bg-white transition"
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
                        style={{
                          background: isOut ? "#CBD5E1" : "#2563EB",
                          color: "#FFFFFF",
                          border: "none",
                          borderRadius: "10px",
                          padding: "8px 16px",
                          fontSize: "12px",
                          fontWeight: 800,
                          cursor: isOut ? "not-allowed" : "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          pointerEvents: "auto",
                          touchAction: "manipulation",
                        }}
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

              {/* CUSTOMER (UI DISPLAY ONLY) */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Customer</label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Walk-in Customer"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-blue-600"
                  />
                </div>
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
                            <span className="w-6 text-center font-black text-xs">{item.quantity}</span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                              className="p-1 hover:bg-slate-100 rounded-lg cursor-pointer"
                            >
                              <Plus className="w-3 h-3 text-slate-600" />
                            </button>
                          </div>

                          <span className="font-black text-slate-900 w-16 text-right">₹{itemTotal}</span>

                          <button
                            type="button"
                            onClick={() => removeFromCart(item.product.id)}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-xl cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* BILL SUMMARY */}
                <div className="pt-3 border-t border-slate-200 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600 font-semibold">
                    <span>Subtotal</span>
                    <span>₹{subtotal.toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between items-center text-slate-600 font-semibold">
                    <span>Discount</span>
                    <div className="flex items-center gap-1">
                      <span>₹</span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={discount}
                        onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                        className="w-20 px-2 py-1 bg-slate-50 border border-slate-200 rounded-xl text-right font-bold outline-none focus:border-blue-600"
                      />
                    </div>
                  </div>

                  <div className="flex justify-between text-slate-900 font-black text-base pt-2 border-t border-slate-200">
                    <span>Grand Total</span>
                    <span className="text-blue-600">₹{grandTotal.toFixed(2)}</span>
                  </div>
                </div>

                {/* PAYMENT METHOD SELECTION */}
                <div className="space-y-1.5 pt-2">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase">Select Payment</label>
                  <div className="grid grid-cols-3 gap-2">
                    {["CASH", "UPI", "CARD"].map((method) => (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setPaymentMethod(method)}
                        className={`py-2.5 rounded-2xl text-xs font-extrabold transition border cursor-pointer ${
                          paymentMethod === method
                            ? "bg-blue-600 text-white border-blue-600 shadow-md"
                            : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {method}
                      </button>
                    ))}
                  </div>
                </div>

                {/* LARGE COMPLETE SALE BUTTON */}
                <button
                  type="button"
                  onClick={handleCompleteSale}
                  disabled={submitting || cart.length === 0}
                  style={{
                    width: "100%",
                    height: "54px",
                    border: "none",
                    borderRadius: "14px",
                    background: cart.length === 0 ? "#CBD5E1" : "#2563EB",
                    color: "#FFFFFF",
                    fontSize: "15px",
                    fontWeight: 900,
                    cursor: cart.length === 0 ? "not-allowed" : "pointer",
                    boxShadow: cart.length === 0 ? "none" : "0 4px 15px rgba(37, 99, 235, 0.3)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    pointerEvents: "auto",
                    touchAction: "manipulation",
                  }}
                  className="mt-4 transition"
                >
                  <Check className="w-5 h-5" />
                  {submitting ? "Processing..." : "COMPLETE SALE"}
                </button>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* SALE COMPLETED SUCCESS MODAL DIALOG */}
      {saleCompletedModal && lastSaleReceipt && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl border border-slate-200">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-xl font-black">
              ✓
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900">Sale Completed</h3>
              <p className="text-xs font-mono font-bold text-blue-600 mt-1">{lastSaleReceipt.invoice_number}</p>
              <p className="text-lg font-black text-emerald-600 mt-1">Total: ₹{lastSaleReceipt.grand_total}</p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => handlePrintReceipt(lastSaleReceipt)}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl text-xs cursor-pointer shadow-md"
              >
                Print Bill
              </button>
              <button
                type="button"
                onClick={handleNewBill}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl text-xs cursor-pointer shadow-md"
              >
                New Bill
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SAVED BILL DETAILS MODAL */}
      {viewBillModalOpen && selectedSale && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 space-y-4 shadow-2xl border border-slate-200 text-xs">
            <div className="flex justify-between items-start border-b pb-3">
              <div>
                <h3 className="text-lg font-black text-slate-900">T MART Receipt</h3>
                <p className="font-mono text-xs font-bold text-blue-600 mt-0.5">
                  Bill No: {selectedSale.invoice_number || selectedSale.bill_no}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Date: {new Date(selectedSale.created_at).toLocaleDateString()} • {new Date(selectedSale.created_at).toLocaleTimeString()}
                </p>
              </div>
              <button onClick={() => setViewBillModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* BILL ITEMS TABLE */}
            <div className="space-y-2">
              <h4 className="text-[11px] font-black text-slate-400 uppercase">Items Billed</h4>

              {loadingBillItems ? (
                <div className="py-8 text-center text-slate-400 flex flex-col items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                  <span>Loading bill...</span>
                </div>
              ) : billDetailsError ? (
                <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl font-bold">
                  {billDetailsError}
                </div>
              ) : saleItems.length === 0 ? (
                <div className="p-6 bg-slate-50 border border-dashed rounded-xl text-center text-slate-400">
                  No items found for this bill.
                </div>
              ) : (
                <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100 max-h-52 overflow-y-auto">
                  <div className="bg-slate-50 p-2.5 font-bold text-slate-500 text-[10px] uppercase flex justify-between">
                    <span className="flex-1">Product Name</span>
                    <span className="w-12 text-center">Qty</span>
                    <span className="w-16 text-right">Price</span>
                    <span className="w-16 text-right">Total</span>
                  </div>
                  {saleItems.map((item, idx) => (
                    <div key={idx} className="p-2.5 flex justify-between items-center text-xs">
                      <span className="flex-1 font-bold text-slate-900 truncate pr-2">{item.product_name}</span>
                      <span className="w-12 text-center text-slate-600">{item.quantity}</span>
                      <span className="w-16 text-right text-slate-600">₹{item.price}</span>
                      <span className="w-16 text-right font-extrabold text-slate-900">₹{item.total}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* BILL FINANCIAL SUMMARY */}
            <div className="bg-slate-50 p-4 rounded-2xl border space-y-1.5 font-semibold text-slate-700">
              <div className="flex justify-between"><span>Subtotal:</span> <span>₹{Number(selectedSale.subtotal || 0).toFixed(2)}</span></div>
              <div className="flex justify-between"><span>Discount:</span> <span>₹{Number(selectedSale.discount || 0).toFixed(2)}</span></div>
              <div className="flex justify-between font-black text-slate-900 text-sm border-t pt-1.5 mt-1">
                <span>Grand Total:</span> <span className="text-blue-600">₹{Number(selectedSale.total_amount ?? selectedSale.total ?? 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-1 border-t text-slate-500">
                <span>Payment Method:</span> <span className="font-extrabold text-slate-900">{selectedSale.payment_method || "CASH"}</span>
              </div>
            </div>

            {/* BUTTONS */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                disabled={loadingBillItems || saleItems.length === 0}
                onClick={() => {
                  const receiptData = {
                    invoice_number: selectedSale.invoice_number || selectedSale.bill_no,
                    date: new Date(selectedSale.created_at).toLocaleString(),
                    customer_name: selectedSale.customer_name || "Walk-in Customer",
                    payment_method: selectedSale.payment_method || "Cash",
                    business_name: business?.name || "T MART Supermarket",
                    items: saleItems,
                    subtotal: Number(selectedSale.subtotal || 0).toFixed(2),
                    discount: Number(selectedSale.discount || 0).toFixed(2),
                    tax: Number(selectedSale.tax || 0).toFixed(2),
                    grand_total: Number(selectedSale.total_amount ?? selectedSale.total ?? 0).toFixed(2),
                    amount_paid: Number(selectedSale.total_amount ?? selectedSale.total ?? 0).toFixed(2),
                    change_due: "0.00",
                  };
                  handlePrintReceipt(receiptData);
                }}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black rounded-2xl text-xs cursor-pointer shadow-md flex items-center justify-center gap-1.5"
              >
                <Printer className="w-4 h-4" /> Print Bill
              </button>
              <button
                type="button"
                onClick={() => setViewBillModalOpen(false)}
                className="flex-1 py-3 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-2xl text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RECENT SALES HISTORY TABLE */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-extrabold text-slate-900 text-base">Recent Sales History</h3>
            <p className="text-xs text-slate-400">Click any bill row or View button to inspect saved bill items</p>
          </div>
          <button onClick={loadData} className="p-2 text-slate-400 hover:text-slate-600 cursor-pointer">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {sales.length === 0 ? (
          <div className="p-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center text-xs text-slate-400">
            No recent sales found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] text-slate-500 uppercase border-b border-slate-200">
                <tr>
                  <th className="p-3">Bill Number</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Total Amount</th>
                  <th className="p-3">Payment Method</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sales.map((s) => (
                  <tr
                    key={s.id}
                    onClick={() => handleViewBill(s)}
                    className="hover:bg-blue-50/50 cursor-pointer transition"
                  >
                    <td className="p-3 font-mono font-bold text-blue-600">{s.invoice_number || s.bill_no}</td>
                    <td className="p-3 text-slate-500">{new Date(s.created_at).toLocaleDateString()} {new Date(s.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                    <td className="p-3 font-black text-emerald-600">₹{s.total_amount ?? s.total}</td>
                    <td className="p-3">
                      <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 rounded-full font-bold text-[10px]">
                        {s.payment_method || "CASH"}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewBill(s);
                        }}
                        className="px-3 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold rounded-xl text-xs transition cursor-pointer flex items-center gap-1 ml-auto"
                      >
                        <Eye className="w-3.5 h-3.5" /> View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </SharedDashboardLayout>
  );
}
