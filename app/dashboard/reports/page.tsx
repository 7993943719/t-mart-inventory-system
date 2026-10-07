"use client";

import React, { useEffect, useState, useCallback } from "react";
import { SharedDashboardLayout } from "@/components/layout/SharedDashboardLayout";
import { createClient } from "@/lib/supabase/client";
import {
  Download,
  Printer,
  Calendar,
  Plus,
  Trash2,
  Edit2,
  X,
  Eye,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  TrendingUp,
  Receipt,
  DollarSign,
  Package,
  ShieldAlert,
} from "lucide-react";

export default function ReportsPage() {
  const [supabase] = useState(() => createClient());

  // Business & User State
  const [business, setBusiness] = useState<any>(null);
  const [userName, setUserName] = useState("Admin");
  const [role, setRole] = useState("OWNER");
  const [businessId, setBusinessId] = useState<string>("");

  // Tabs State: "bill-wise" | "product-wise" | "daily" | "monthly" | "yearly"
  const [activeTab, setActiveTab] = useState<"bill-wise" | "product-wise" | "daily" | "monthly" | "yearly">("bill-wise");

  // Filter State
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<"today" | "month" | "year" | "custom">("today");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");

  // Data State
  const [sales, setSales] = useState<any[]>([]);
  const [allSaleItems, setAllSaleItems] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);

  // Bill Details Modal State
  const [viewBillModalOpen, setViewBillModalOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<any>(null);
  const [modalSaleItems, setModalSaleItems] = useState<any[]>([]);
  const [loadingModalItems, setLoadingModalItems] = useState(false);

  // Edit Bill Modal State
  const [editBillModalOpen, setEditBillModalOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<any>(null);
  const [editSaleItems, setEditSaleItems] = useState<any[]>([]);
  const [editDiscount, setEditDiscount] = useState<number>(0);
  const [editPaymentMethod, setEditPaymentMethod] = useState("CASH");
  const [submittingEdit, setSubmittingEdit] = useState(false);

  // Delete Bill Confirmation Modal State
  const [deleteBillConfirmOpen, setDeleteBillConfirmOpen] = useState(false);
  const [deletingSale, setDeletingSale] = useState<any>(null);
  const [submittingDelete, setSubmittingDelete] = useState(false);

  // Product-wise Drill-down Modal State
  const [productDrillModalOpen, setProductDrillModalOpen] = useState(false);
  const [selectedProductDrill, setSelectedProductDrill] = useState<string>("");
  const [productDrillBills, setProductDrillBills] = useState<any[]>([]);

  // Status & Error Messages
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isAdminOrOwner = role && ["OWNER", "ADMIN", "OWNER/ADMIN"].includes(role.toUpperCase());

  // Load Initial Session & Data
  const loadInitialData = async () => {
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
        setBusiness(memberships[0].businesses);
        setRole(memberships[0].role || "OWNER");
        activeBizId = memberships[0].businesses?.id || user.id;
      }
      setBusinessId(activeBizId);

      const { data: prof } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      if (prof?.full_name) setUserName(prof.full_name);

      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      setCustomStartDate(firstDay.toISOString().split("T")[0]);
      setCustomEndDate(now.toISOString().split("T")[0]);

      await fetchReportData(activeBizId, "today", "", "");
    } catch (err) {
      console.error("Failed to load user/business data", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Sales, Sale Items, and Products
  const fetchReportData = async (
    bizId: string,
    filter: string,
    startDateStr: string,
    endDateStr: string
  ) => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      // 1. Fetch Products
      const { data: prodsData, error: prodErr } = await supabase
        .from("products")
        .select("*")
        .order("name", { ascending: true });

      if (prodErr) console.error("Products query error:", prodErr);

      const filteredProds = (prodsData || []).filter((p) => {
        if (!bizId) return true;
        return p.business_id === bizId || p.tenant_id === bizId;
      });
      setProducts(filteredProds);

      // 2. Compute Date Range
      let startDate = new Date();
      let endDate = new Date();

      if (filter === "today") {
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
      } else if (filter === "month") {
        startDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
      } else if (filter === "year") {
        startDate = new Date(startDate.getFullYear(), 0, 1);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
      } else if (filter === "custom" && startDateStr && endDateStr) {
        startDate = new Date(startDateStr);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(endDateStr);
        endDate.setHours(23, 59, 59, 999);
      }

      const startIso = startDate.toISOString();
      const endIso = endDate.toISOString();

      // 3. Fetch Sales
      const { data: salesData, error: salesError } = await supabase
        .from("sales")
        .select("*")
        .gte("created_at", startIso)
        .lte("created_at", endIso)
        .order("created_at", { ascending: false });

      if (salesError) {
        console.error("Sales query error:", salesError);
        setErrorMessage(`Sales query error: ${salesError.message}`);
      }

      const filteredSalesList = (salesData || []).filter((s) => {
        if (!bizId) return true;
        return s.business_id === bizId || s.tenant_id === bizId || s.user_id === user?.id;
      });

      setSales(filteredSalesList);

      // 4. Fetch Sale Items
      if (filteredSalesList.length > 0) {
        const saleIds = filteredSalesList.map((s) => s.id);
        const { data: itemsData, error: itemsError } = await supabase
          .from("sale_items")
          .select("*")
          .in("sale_id", saleIds);

        if (itemsError) {
          console.error("Sale items query error:", itemsError);
          setErrorMessage(`Sale items query error: ${itemsError.message}`);
        }

        setAllSaleItems(itemsData || []);
      } else {
        setAllSaleItems([]);
      }

      // 5. Fetch Expenses
      const startDateOnly = startDate.toISOString().split("T")[0];
      const endDateOnly = endDate.toISOString().split("T")[0];
      try {
        const { data: expensesData, error: expErr } = await supabase
          .from("expenses")
          .select("*")
          .gte("expense_date", startDateOnly)
          .lte("expense_date", endDateOnly)
          .order("expense_date", { ascending: false });

        if (!expErr && expensesData) {
          const filteredExpList = (expensesData || []).filter((e) => {
            if (!bizId) return true;
            return e.business_id === bizId || e.tenant_id === bizId || e.user_id === user?.id;
          });
          setExpenses(filteredExpList);
        } else {
          setExpenses([]);
        }
      } catch (e) {
        setExpenses([]);
      }
    } catch (err: any) {
      console.error("Error loading report data:", err);
      setErrorMessage(err.message || "Failed to fetch report data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, [supabase]);

  const handleFilterChange = (filter: "today" | "month" | "year" | "custom") => {
    setTimeFilter(filter);
    fetchReportData(businessId, filter, customStartDate, customEndDate);
  };

  const handleApplyCustomFilter = () => {
    setTimeFilter("custom");
    fetchReportData(businessId, "custom", customStartDate, customEndDate);
  };

  // Robust Product Lookup Helper
  const getProductInfo = (item: any) => {
    let prod = products.find((p) => p.id === item.product_id);
    if (!prod && item.product_name) {
      prod = products.find((p) => p.name?.toLowerCase().trim() === item.product_name?.toLowerCase().trim());
    }
    const rawPurchasePrice = prod ? prod.purchase_price : item.purchase_price;
    const hasCost = rawPurchasePrice !== undefined && rawPurchasePrice !== null && !isNaN(Number(rawPurchasePrice));
    const purchasePrice = hasCost ? Number(rawPurchasePrice) : 0;
    const sellingPrice = Number(item.selling_price || item.price || prod?.selling_price || 0);

    return {
      product: prod,
      purchasePrice,
      sellingPrice,
      hasCost: hasCost && purchasePrice >= 0,
    };
  };

  // Group Sale Items by Sale ID and combine duplicate product_ids
  const itemsBySaleId = new Map<string, any[]>();
  allSaleItems.forEach((item) => {
    const list = itemsBySaleId.get(item.sale_id) || [];
    const existingIndex = list.findIndex((i) => i.product_id === item.product_id);
    if (existingIndex >= 0) {
      list[existingIndex].quantity = Number(list[existingIndex].quantity || 1) + Number(item.quantity || 1);
      const sellPrice = Number(list[existingIndex].selling_price || list[existingIndex].price || 0);
      list[existingIndex].total_amount = Number((sellPrice * list[existingIndex].quantity).toFixed(2));
      list[existingIndex].total = list[existingIndex].total_amount;
    } else {
      list.push({ ...item });
    }
    itemsBySaleId.set(item.sale_id, list);
  });

  // Calculate Bill Profit Metrics for each Sale
  const enrichedSales = sales.map((s) => {
    const items = itemsBySaleId.get(s.id) || [];
    let billPurchaseCost = 0;
    let billSaleTotal = 0;
    let hasAllCosts = true;

    const enrichedItems = items.map((i) => {
      const info = getProductInfo(i);
      const qty = Number(i.quantity || 1);
      const itemPurchaseCost = info.purchasePrice * qty;
      const itemSaleValue = info.sellingPrice * qty;
      const itemProfit = itemSaleValue - itemPurchaseCost;

      if (!info.hasCost) {
        hasAllCosts = false;
      }

      billPurchaseCost += itemPurchaseCost;
      billSaleTotal += itemSaleValue;

      return {
        ...i,
        productName: i.product_name || info.product?.name || "Product",
        quantity: qty,
        purchasePrice: info.purchasePrice,
        sellingPrice: info.sellingPrice,
        purchaseTotal: itemPurchaseCost,
        saleTotal: itemSaleValue,
        itemProfit,
        hasCost: info.hasCost,
      };
    });

    const finalSaleTotal = billSaleTotal > 0 ? billSaleTotal : Number(s.total_amount ?? s.total ?? 0);
    const billProfit = finalSaleTotal - billPurchaseCost;
    const billMargin = finalSaleTotal > 0 ? (billProfit / finalSaleTotal) * 100 : 0;

    return {
      ...s,
      items: enrichedItems,
      billPurchaseCost,
      billSaleTotal: finalSaleTotal,
      billProfit,
      billMargin,
      hasAllCosts,
    };
  });

  const totalSalesAllBills = enrichedSales.reduce((sum, s) => sum + s.billSaleTotal, 0);
  const totalPurchaseAllBills = enrichedSales.reduce((sum, s) => sum + s.billPurchaseCost, 0);
  const totalProfitAllBills = enrichedSales.reduce((sum, s) => sum + s.billProfit, 0);

  // View Bill Details Modal
  const handleViewBillDetails = async (sale: any) => {
    setSelectedSale(sale);
    setViewBillModalOpen(true);
    setLoadingModalItems(true);
    setModalSaleItems([]);

    try {
      const items = itemsBySaleId.get(sale.id) || [];
      const enriched = items.map((i: any) => {
        const info = getProductInfo(i);
        const qty = Number(i.quantity || 1);
        const purchaseTotal = info.purchasePrice * qty;
        const saleTotal = info.sellingPrice * qty;
        const itemProfit = saleTotal - purchaseTotal;

        return {
          product_name: i.product_name || info.product?.name || "Product",
          quantity: qty,
          purchasePrice: info.purchasePrice,
          sellingPrice: info.sellingPrice,
          purchaseTotal,
          saleTotal,
          itemProfit,
          hasCost: info.hasCost,
        };
      });

      setModalSaleItems(enriched);
    } catch (err: any) {
      console.error("Error loading bill modal items:", err);
      setErrorMessage(`Unable to load bill items: ${err.message}`);
    } finally {
      setLoadingModalItems(false);
    }
  };

  // Edit Bill Handler
  const handleOpenEditBill = async (sale: any) => {
    setEditingSale(sale);
    setEditDiscount(Number(sale.discount || 0));
    setEditPaymentMethod(sale.payment_method || "CASH");
    const items = itemsBySaleId.get(sale.id) || [];

    const map = new Map<string, any>();
    items.forEach((i: any) => {
      const pId = i.product_id;
      if (map.has(pId)) {
        const existing = map.get(pId);
        existing.quantity = Number(existing.quantity || 1) + Number(i.quantity || 1);
      } else {
        map.set(pId, { ...i });
      }
    });

    setEditSaleItems(Array.from(map.values()));
    setEditBillModalOpen(true);
  };

  const handleSaveEditBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSale) return;

    setSubmittingEdit(true);
    setErrorMessage(null);

    try {
      const originalItems = itemsBySaleId.get(editingSale.id) || [];
      let newSubtotal = 0;

      // Filter items with quantity > 0
      const validItems = editSaleItems.filter((i) => Number(i.quantity || 0) > 0);

      if (validItems.length === 0) {
        // If all items become quantity 0, restore stock for all original items, delete sale_items, delete sales row
        for (const orig of originalItems) {
          const prod = products.find((p) => p.id === orig.product_id);
          if (prod) {
            const restoredStock = Number(prod.stock_quantity || 0) + Number(orig.quantity || 0);
            const { error: stockErr } = await supabase
              .from("products")
              .update({ stock_quantity: restoredStock, updated_at: new Date().toISOString() })
              .eq("id", prod.id);
            if (stockErr) throw new Error(`Stock restore failed: ${stockErr.message}`);
          }
        }

        const { error: delItemsErr } = await supabase.from("sale_items").delete().eq("sale_id", editingSale.id);
        if (delItemsErr) throw new Error(`Delete sale items failed: ${delItemsErr.message}`);

        const { error: delSaleErr } = await supabase.from("sales").delete().eq("id", editingSale.id);
        if (delSaleErr) throw new Error(`Delete sale failed: ${delSaleErr.message}`);

        setStatusMessage("Bill deleted and stock restored");
        setEditBillModalOpen(false);
        fetchReportData(businessId, timeFilter, customStartDate, customEndDate);
        setTimeout(() => setStatusMessage(null), 4000);
        setSubmittingEdit(false);
        return;
      }

      // Process each item in editSaleItems
      for (const item of editSaleItems) {
        const qty = Number(item.quantity || 0);
        const price = Number(item.selling_price || item.price || 0);
        const itemTotal = Number((price * qty).toFixed(2));

        if (qty === 0) {
          if (item.id) {
            const { error: delErr } = await supabase.from("sale_items").delete().eq("id", item.id);
            if (delErr) throw new Error(`Delete sale item failed: ${delErr.message}`);
          }
        } else {
          newSubtotal += itemTotal;
          if (item.id) {
            // UPDATE existing sale_item by its id (quantity, selling_price, total_amount ONLY)
            const { error: updateErr } = await supabase.from("sale_items").update({
              quantity: qty,
              selling_price: price,
              total_amount: itemTotal,
            }).eq("id", item.id);
            if (updateErr) throw new Error(`Update sale item failed: ${updateErr.message}`);
          } else {
            // INSERT new sale_item if added during edit
            const { error: insErr } = await supabase.from("sale_items").insert({
              sale_id: editingSale.id,
              product_id: item.product_id,
              quantity: qty,
              selling_price: price,
              total_amount: itemTotal,
            });
            if (insErr) throw new Error(`Insert sale item failed: ${insErr.message}`);
          }
        }
      }

      // Correct stock differences (stockDifference = oldQuantity - newQuantity)
      for (const orig of originalItems) {
        const prod = products.find((p) => p.id === orig.product_id);
        if (prod) {
          const matchingNew = editSaleItems.find((i) => i.product_id === orig.product_id);
          const newQty = matchingNew ? Number(matchingNew.quantity || 0) : 0;
          const origQty = Number(orig.quantity || 0);
          const stockDifference = origQty - newQty; // positive = increase stock; negative = decrease stock

          if (stockDifference !== 0) {
            const currentStock = Number(prod.stock_quantity || 0);
            const updatedStock = Math.max(0, currentStock + stockDifference);
            const { error: stockErr } = await supabase
              .from("products")
              .update({ stock_quantity: updatedStock })
              .eq("id", prod.id);
            if (stockErr) throw new Error(`Stock update failed: ${stockErr.message}`);
          }
        }
      }

      // For newly added items during edit (not in originalItems)
      for (const item of validItems) {
        const alreadyOrig = originalItems.find((o) => o.product_id === item.product_id);
        if (!alreadyOrig) {
          const prod = products.find((p) => p.id === item.product_id);
          if (prod) {
            const currentStock = Number(prod.stock_quantity || 0);
            const newQty = Number(item.quantity || 0);
            const updatedStock = Math.max(0, currentStock - newQty);
            const { error: stockErr } = await supabase
              .from("products")
              .update({ stock_quantity: updatedStock })
              .eq("id", prod.id);
            if (stockErr) throw new Error(`Stock update failed: ${stockErr.message}`);
          }
        }
      }

      const total_amount = Math.max(0, newSubtotal - Number(editDiscount || 0));

      // Update existing sales row (subtotal, discount, total_amount, payment_method ONLY)
      const { error: salesUpdateErr } = await supabase
        .from("sales")
        .update({
          subtotal: newSubtotal,
          discount: Number(editDiscount || 0),
          total_amount: total_amount,
          payment_method: editPaymentMethod,
        })
        .eq("id", editingSale.id);

      if (salesUpdateErr) throw new Error(`Sales update failed: ${salesUpdateErr.message}`);

      setStatusMessage("Bill updated successfully");
      setEditBillModalOpen(false);
      fetchReportData(businessId, timeFilter, customStartDate, customEndDate);
      setTimeout(() => setStatusMessage(null), 3500);
    } catch (err: any) {
      console.error("Error editing bill:", err);
      setErrorMessage(`Failed to edit bill: ${err.message}`);
    } finally {
      setSubmittingEdit(false);
    }
  };

  // Delete Bill Handler
  const handleConfirmDeleteBill = async () => {
    if (!deletingSale) return;

    if (!isAdminOrOwner) {
      setErrorMessage("Only Admin/Owner roles can delete bills.");
      setDeleteBillConfirmOpen(false);
      return;
    }

    setSubmittingDelete(true);
    setErrorMessage(null);

    try {
      const selectedSaleId = deletingSale.id;

      const { data: existingItems } = await supabase
        .from("sale_items")
        .select("id")
        .eq("sale_id", selectedSaleId);

      if (existingItems && existingItems.length > 0) {
        setErrorMessage("This bill cannot be deleted because it contains products.");
        setDeleteBillConfirmOpen(false);
        setSubmittingDelete(false);
        return;
      }

      const { error: deleteErr } = await supabase
        .from("sales")
        .delete()
        .eq("id", selectedSaleId);

      if (deleteErr) {
        throw new Error(deleteErr.message);
      }

      setStatusMessage("Bill deleted successfully.");
      setDeleteBillConfirmOpen(false);
      setDeletingSale(null);
      fetchReportData(businessId, timeFilter, customStartDate, customEndDate);
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      console.error("DELETE BILL ERROR:", err);
      setErrorMessage(`Unable to delete bill: ${err.message || "Database rejected operation"}`);
    } finally {
      setSubmittingDelete(false);
    }
  };

  const handlePrintReceipt = (sale: any, items: any[]) => {
    if (!sale) return;

    const printWindow = window.open("", "_blank", "width=400,height=600");
    if (!printWindow) {
      alert("Please allow popups to print receipt.");
      return;
    }

    const receiptNo = sale.invoice_number || sale.bill_no || "BILL-0000";

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
            <h2 style="margin: 0;">${business?.name || "T MART"}</h2>
            <p style="margin: 2px 0;">Supermarket POS Receipt</p>
          </div>
          <div class="divider"></div>
          <div class="flex-between"><span>Bill No:</span><span class="bold">${receiptNo}</span></div>
          <div class="flex-between"><span>Date:</span><span>${new Date(sale.created_at).toLocaleString()}</span></div>
          <div class="flex-between"><span>Payment:</span><span>${sale.payment_method || "CASH"}</span></div>
          <div class="divider"></div>
          <table>
            <thead>
              <tr><th>Item</th><th class="text-right">Qty</th><th class="text-right">Price</th><th class="text-right">Total</th></tr>
            </thead>
            <tbody>
              ${(items || []).map((i: any) => `
                <tr>
                  <td>${i.product_name || i.productName}</td>
                  <td class="text-right">${i.quantity}</td>
                  <td class="text-right">₹{i.sellingPrice}</td>
                  <td class="text-right">₹{i.saleTotal}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
          <div class="divider"></div>
          <div class="flex-between"><span>Subtotal:</span><span>₹{Number(sale.subtotal || 0).toFixed(2)}</span></div>
          <div class="flex-between"><span>Discount:</span><span>₹{Number(sale.discount || 0).toFixed(2)}</span></div>
          <div class="divider"></div>
          <div class="flex-between bold" style="font-size: 14px;"><span>GRAND TOTAL:</span><span>₹{Number(sale.total_amount ?? sale.total ?? 0).toFixed(2)}</span></div>
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

  // Product-wise Report Aggregation (Group all sale_items by product_id)
  const productMap = new Map<string, { name: string; qty: number; purchaseCost: number; sales: number; profit: number; hasCost: boolean; billIds: Set<string> }>();

  allSaleItems.forEach((item) => {
    const info = getProductInfo(item);
    const pName = item.product_name || info.product?.name || "Product";
    const qty = Number(item.quantity || 1);
    const saleVal = info.sellingPrice * qty;
    const purchaseVal = info.purchasePrice * qty;
    const profitVal = saleVal - purchaseVal;

    if (!productMap.has(item.product_id || pName)) {
      productMap.set(item.product_id || pName, {
        name: pName,
        qty: 0,
        purchaseCost: 0,
        sales: 0,
        profit: 0,
        hasCost: true,
        billIds: new Set(),
      });
    }

    const entry = productMap.get(item.product_id || pName)!;
    entry.qty += qty;
    entry.sales += saleVal;
    entry.purchaseCost += purchaseVal;
    entry.profit += profitVal;
    if (!info.hasCost) {
      entry.hasCost = false;
    }
    entry.billIds.add(item.sale_id);
  });

  const productList = Array.from(productMap.values()).sort((a, b) => b.sales - a.sales);

  const handleProductClick = (prodName: string) => {
    const entry = productList.find((p) => p.name === prodName);
    if (!entry) return;

    const matchedSales = enrichedSales.filter((s) => entry.billIds.has(s.id));
    setSelectedProductDrill(prodName);
    setProductDrillBills(matchedSales);
    setProductDrillModalOpen(true);
  };

  // Daily Aggregation
  const dailyMap = new Map<string, { dateStr: string; sales: number; purchase: number; grossProfit: number; expenses: number; netProfit: number; margin: number; billsCount: number }>();

  enrichedSales.forEach((s) => {
    const dStr = new Date(s.created_at).toISOString().split("T")[0];
    if (!dailyMap.has(dStr)) {
      dailyMap.set(dStr, { dateStr: dStr, sales: 0, purchase: 0, grossProfit: 0, expenses: 0, netProfit: 0, margin: 0, billsCount: 0 });
    }
    const d = dailyMap.get(dStr)!;
    d.sales += s.billSaleTotal;
    d.purchase += s.billPurchaseCost;
    d.grossProfit += s.billProfit;
    d.billsCount += 1;
  });

  expenses.forEach((e) => {
    const dStr = e.expense_date || new Date().toISOString().split("T")[0];
    const amt = Number(e.amount || 0);
    if (!dailyMap.has(dStr)) {
      dailyMap.set(dStr, { dateStr: dStr, sales: 0, purchase: 0, grossProfit: 0, expenses: 0, netProfit: 0, margin: 0, billsCount: 0 });
    }
    dailyMap.get(dStr)!.expenses += amt;
  });

  const dailyList = Array.from(dailyMap.values()).map((d) => {
    const netProfit = d.grossProfit - d.expenses;
    const margin = d.sales > 0 ? (netProfit / d.sales) * 100 : 0;
    return { ...d, netProfit, margin };
  }).sort((a, b) => b.dateStr.localeCompare(a.dateStr));

  // Monthly Aggregation
  const monthlyMap = new Map<string, { monthStr: string; sales: number; purchase: number; grossProfit: number; expenses: number; netProfit: number; margin: number; billsCount: number }>();

  dailyList.forEach((d) => {
    const mStr = d.dateStr.substring(0, 7);
    if (!monthlyMap.has(mStr)) {
      monthlyMap.set(mStr, { monthStr: mStr, sales: 0, purchase: 0, grossProfit: 0, expenses: 0, netProfit: 0, margin: 0, billsCount: 0 });
    }
    const m = monthlyMap.get(mStr)!;
    m.sales += d.sales;
    m.purchase += d.purchase;
    m.grossProfit += d.grossProfit;
    m.expenses += d.expenses;
    m.billsCount += d.billsCount;
  });

  const monthlyList = Array.from(monthlyMap.values()).map((m) => {
    const netProfit = m.grossProfit - m.expenses;
    const margin = m.sales > 0 ? (netProfit / m.sales) * 100 : 0;
    return { ...m, netProfit, margin };
  }).sort((a, b) => b.monthStr.localeCompare(a.monthStr));

  // Yearly Aggregation
  const yearlyMap = new Map<string, { yearStr: string; sales: number; purchase: number; grossProfit: number; expenses: number; netProfit: number; margin: number; billsCount: number }>();

  monthlyList.forEach((m) => {
    const yStr = m.monthStr.substring(0, 4);
    if (!yearlyMap.has(yStr)) {
      yearlyMap.set(yStr, { yearStr: yStr, sales: 0, purchase: 0, grossProfit: 0, expenses: 0, netProfit: 0, margin: 0, billsCount: 0 });
    }
    const y = yearlyMap.get(yStr)!;
    y.sales += m.sales;
    y.purchase += m.purchase;
    y.grossProfit += m.grossProfit;
    y.expenses += m.expenses;
    y.billsCount += m.billsCount;
  });

  const yearlyList = Array.from(yearlyMap.values()).map((y) => {
    const netProfit = y.grossProfit - y.expenses;
    const margin = y.sales > 0 ? (netProfit / y.sales) * 100 : 0;
    return { ...y, netProfit, margin };
  }).sort((a, b) => b.yearStr.localeCompare(a.yearStr));

  return (
    <SharedDashboardLayout
      businessName={business?.name || "T MART"}
      userName={userName}
      role={role}
      pageTitle="Reports"
    >
      {/* PAGE HEADER */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900">Reports</h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">Track sales, profit, margins and inventory analytics.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-4 h-4" /> Print
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-2xl text-xs font-bold mb-6 flex justify-between items-center">
          <span>{statusMessage}</span>
          <button onClick={() => setStatusMessage(null)}><X className="w-4 h-4" /></button>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-bold mb-6 flex justify-between items-center">
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)}><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* TOP TABS: [Bill Wise] [Product Wise] [Daily] [Monthly] [Yearly] */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap gap-2 mb-6">
        {[
          { id: "bill-wise", label: "Bill Wise" },
          { id: "product-wise", label: "Product Wise" },
          { id: "daily", label: "Daily" },
          { id: "monthly", label: "Monthly" },
          { id: "yearly", label: "Yearly" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-5 py-2.5 rounded-xl font-black text-xs transition cursor-pointer ${
              activeTab === tab.id
                ? "bg-blue-600 text-white shadow-md"
                : "bg-transparent text-slate-600 hover:bg-slate-100"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* DATE FILTERS: [Today] [This Month] [This Year] [Custom] */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: "today", label: "Today" },
            { id: "month", label: "This Month" },
            { id: "year", label: "This Year" },
            { id: "custom", label: "Custom" },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => handleFilterChange(f.id as any)}
              className={`px-4 py-2.5 rounded-xl font-extrabold text-xs transition cursor-pointer ${
                timeFilter === f.id
                  ? "bg-slate-900 text-white shadow-md"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {timeFilter === "custom" && (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold outline-none"
            />
            <span className="text-slate-400 font-bold">to</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold outline-none"
            />
            <button
              type="button"
              onClick={handleApplyCustomFilter}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl cursor-pointer"
            >
              Apply
            </button>
          </div>
        )}
      </div>

      {/* SUMMARY CARDS */}
      {isAdminOrOwner && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-blue-50/50 border border-blue-200 p-5 rounded-3xl shadow-xs space-y-1">
            <p className="text-[11px] font-extrabold text-blue-700 uppercase tracking-wider">Total Sales</p>
            <h3 className="text-2xl font-black text-blue-900">₹{totalSalesAllBills.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
            <p className="text-[10px] text-blue-600 font-medium">{enrichedSales.length} bills in period</p>
          </div>

          <div className="bg-orange-50/50 border border-orange-200 p-5 rounded-3xl shadow-xs space-y-1">
            <p className="text-[11px] font-extrabold text-orange-700 uppercase tracking-wider">Purchase Cost</p>
            <h3 className="text-2xl font-black text-orange-900">₹{totalPurchaseAllBills.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
            <p className="text-[10px] text-orange-600 font-medium">Cost of goods sold</p>
          </div>

          <div className="bg-emerald-50/50 border border-emerald-200 p-5 rounded-3xl shadow-xs space-y-1">
            <p className="text-[11px] font-extrabold text-emerald-700 uppercase tracking-wider">Gross Profit</p>
            <h3 className="text-2xl font-black text-emerald-900">₹{totalProfitAllBills.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
            <p className="text-[10px] text-emerald-600 font-medium">Sales − Purchase Cost</p>
          </div>
        </div>
      )}

      {/* TAB 1: BILL WISE */}
      {activeTab === "bill-wise" && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 space-y-4 mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">Bill-wise Report</h3>
              <p className="text-xs text-slate-400">Bill No. | Date & Time | Number of Products | Purchase Cost | Sale Total | Profit | Margin % | Payment | Actions</p>
            </div>
            <span className="text-xs font-bold text-slate-400">{enrichedSales.length} bills</span>
          </div>

          {loading ? (
            <div className="p-12 text-center text-xs text-slate-400">Loading bills...</div>
          ) : enrichedSales.length === 0 ? (
            <div className="p-8 bg-slate-50 rounded-2xl border border-dashed text-center text-xs text-slate-400">
              No bills found for the selected period.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-[11px] text-slate-500 uppercase border-b border-slate-200">
                  <tr>
                    <th className="p-3">Bill No.</th>
                    <th className="p-3">Date & Time</th>
                    <th className="p-3">Items</th>
                    {isAdminOrOwner && <th className="p-3 text-orange-600">Purchase Cost</th>}
                    <th className="p-3 text-blue-600">Sale Total</th>
                    {isAdminOrOwner && <th className="p-3 text-emerald-600">Profit</th>}
                    {isAdminOrOwner && <th className="p-3 text-purple-600">Margin</th>}
                    <th className="p-3">Payment</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {enrichedSales.map((s) => (
                    <tr key={s.id} onClick={() => handleViewBillDetails(s)} className="hover:bg-blue-50/50 cursor-pointer transition">
                      <td className="p-3 font-mono font-bold text-blue-600">{s.invoice_number || s.bill_no}</td>
                      <td className="p-3 text-slate-500">{new Date(s.created_at).toLocaleDateString()} {new Date(s.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</td>
                      <td className="p-3 font-semibold text-slate-800">{s.items.length} item(s)</td>
                      {isAdminOrOwner && (
                        <td className="p-3 font-bold text-orange-600">
                          {s.hasAllCosts ? `₹${s.billPurchaseCost.toFixed(2)}` : "Purchase price missing"}
                        </td>
                      )}
                      <td className="p-3 font-extrabold text-blue-600">₹{s.billSaleTotal.toFixed(2)}</td>
                      {isAdminOrOwner && (
                        <td className="p-3 font-black text-emerald-600">
                          {s.hasAllCosts ? `₹${s.billProfit.toFixed(2)}` : "Purchase price missing"}
                        </td>
                      )}
                      {isAdminOrOwner && (
                        <td className="p-3 font-bold text-purple-600">
                          {s.hasAllCosts ? `${s.billMargin.toFixed(2)}%` : "—"}
                        </td>
                      )}
                      <td className="p-3">
                        <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 rounded-full font-bold text-[10px]">
                          {s.payment_method || "CASH"}
                        </span>
                      </td>
                      <td className="p-3 text-right space-x-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => handleViewBillDetails(s)}
                          className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs cursor-pointer inline-flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" /> View
                        </button>
                        {isAdminOrOwner && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleOpenEditBill(s)}
                              className="px-2.5 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 font-bold rounded-lg text-xs cursor-pointer"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setDeletingSale(s);
                                setDeleteBillConfirmOpen(true);
                              }}
                              className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-xs cursor-pointer"
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PRODUCT WISE */}
      {activeTab === "product-wise" && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 space-y-4 mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">Product-wise Report</h3>
              <p className="text-xs text-slate-400">Product | Quantity Sold | Purchase Cost | Sales | Profit | Margin %</p>
            </div>
            <span className="text-xs font-bold text-slate-400">{productList.length} products</span>
          </div>

          {loading ? (
            <div className="p-12 text-center text-xs text-slate-400">Loading product report...</div>
          ) : productList.length === 0 ? (
            <div className="p-8 bg-slate-50 rounded-2xl border border-dashed text-center text-xs text-slate-400">
              No product sales found for the selected period.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-[11px] text-slate-500 uppercase border-b border-slate-200">
                  <tr>
                    <th className="p-3">Product</th>
                    <th className="p-3">Quantity Sold</th>
                    {isAdminOrOwner && <th className="p-3 text-orange-600">Purchase Cost</th>}
                    <th className="p-3 text-blue-600">Sales</th>
                    {isAdminOrOwner && <th className="p-3 text-emerald-600">Profit</th>}
                    {isAdminOrOwner && <th className="p-3 text-purple-600 text-right">Margin %</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {productList.map((item, idx) => {
                    const margin = item.sales > 0 ? (item.profit / item.sales) * 100 : 0;
                    return (
                      <tr
                        key={idx}
                        onClick={() => handleProductClick(item.name)}
                        className="hover:bg-blue-50/50 cursor-pointer transition"
                      >
                        <td className="p-3 font-extrabold text-blue-600 underline">{item.name}</td>
                        <td className="p-3 font-bold text-slate-800">{item.qty}</td>
                        {isAdminOrOwner && (
                          <td className="p-3 font-bold text-orange-600">
                            {item.hasCost ? `₹${item.purchaseCost.toFixed(2)}` : "Purchase price missing"}
                          </td>
                        )}
                        <td className="p-3 font-black text-blue-600">₹{item.sales.toFixed(2)}</td>
                        {isAdminOrOwner && (
                          <td className={`p-3 font-black ${item.profit >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                            {item.hasCost ? `₹${item.profit.toFixed(2)}` : "Purchase price missing"}
                          </td>
                        )}
                        {isAdminOrOwner && (
                          <td className="p-3 text-right font-bold text-purple-600">
                            {item.hasCost ? `${margin.toFixed(2)}%` : "—"}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: DAILY REPORT */}
      {activeTab === "daily" && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 space-y-4 mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">Daily Report</h3>
              <p className="text-xs text-slate-400">Date | Bills | Sales | Purchase Cost | Gross Profit | Expenses | Net Profit | Margin %</p>
            </div>
            <span className="text-xs font-bold text-slate-400">{dailyList.length} days</span>
          </div>

          {dailyList.length === 0 ? (
            <div className="p-8 bg-slate-50 rounded-2xl border border-dashed text-center text-xs text-slate-400">
              No daily data available.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-[11px] text-slate-500 uppercase border-b border-slate-200">
                  <tr>
                    <th className="p-3">Date</th>
                    <th className="p-3">Bills</th>
                    <th className="p-3 text-blue-600">Sales</th>
                    {isAdminOrOwner && <th className="p-3 text-orange-600">Purchase Cost</th>}
                    {isAdminOrOwner && <th className="p-3 text-emerald-600">Gross Profit</th>}
                    <th className="p-3 text-rose-600">Expenses</th>
                    {isAdminOrOwner && <th className="p-3 text-emerald-600">Net Profit</th>}
                    {isAdminOrOwner && <th className="p-3 text-purple-600 text-right">Margin %</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dailyList.map((d) => (
                    <tr key={d.dateStr} className="hover:bg-slate-50">
                      <td className="p-3 font-bold text-blue-600">{d.dateStr}</td>
                      <td className="p-3">{d.billsCount}</td>
                      <td className="p-3 font-black text-blue-600">₹{d.sales.toFixed(2)}</td>
                      {isAdminOrOwner && <td className="p-3 font-bold text-orange-600">₹{d.purchase.toFixed(2)}</td>}
                      {isAdminOrOwner && <td className="p-3 font-bold text-emerald-600">₹{d.grossProfit.toFixed(2)}</td>}
                      <td className="p-3 font-bold text-rose-600">₹{d.expenses.toFixed(2)}</td>
                      {isAdminOrOwner && <td className="p-3 font-black text-emerald-600">₹{d.netProfit.toFixed(2)}</td>}
                      {isAdminOrOwner && <td className="p-3 text-right font-bold text-purple-600">{d.margin.toFixed(2)}%</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: MONTHLY REPORT */}
      {activeTab === "monthly" && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 space-y-4 mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">Monthly Report</h3>
              <p className="text-xs text-slate-400">Month | Bills | Sales | Purchase Cost | Gross Profit | Expenses | Net Profit | Margin %</p>
            </div>
            <span className="text-xs font-bold text-slate-400">{monthlyList.length} months</span>
          </div>

          {monthlyList.length === 0 ? (
            <div className="p-8 bg-slate-50 rounded-2xl border border-dashed text-center text-xs text-slate-400">
              No monthly data available.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-[11px] text-slate-500 uppercase border-b border-slate-200">
                  <tr>
                    <th className="p-3">Month</th>
                    <th className="p-3">Bills</th>
                    <th className="p-3 text-blue-600">Sales</th>
                    {isAdminOrOwner && <th className="p-3 text-orange-600">Purchase Cost</th>}
                    {isAdminOrOwner && <th className="p-3 text-emerald-600">Gross Profit</th>}
                    <th className="p-3 text-rose-600">Expenses</th>
                    {isAdminOrOwner && <th className="p-3 text-emerald-600">Net Profit</th>}
                    {isAdminOrOwner && <th className="p-3 text-purple-600 text-right">Margin %</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {monthlyList.map((m) => (
                    <tr key={m.monthStr} className="hover:bg-slate-50">
                      <td className="p-3 font-bold text-blue-600">{m.monthStr}</td>
                      <td className="p-3">{m.billsCount}</td>
                      <td className="p-3 font-black text-blue-600">₹{m.sales.toFixed(2)}</td>
                      {isAdminOrOwner && <td className="p-3 font-bold text-orange-600">₹{m.purchase.toFixed(2)}</td>}
                      {isAdminOrOwner && <td className="p-3 font-bold text-emerald-600">₹{m.grossProfit.toFixed(2)}</td>}
                      <td className="p-3 font-bold text-rose-600">₹{m.expenses.toFixed(2)}</td>
                      {isAdminOrOwner && <td className="p-3 font-black text-emerald-600">₹{m.netProfit.toFixed(2)}</td>}
                      {isAdminOrOwner && <td className="p-3 text-right font-bold text-purple-600">{m.margin.toFixed(2)}%</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: YEARLY REPORT */}
      {activeTab === "yearly" && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 space-y-4 mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">Yearly Report</h3>
              <p className="text-xs text-slate-400">Year | Bills | Sales | Purchase Cost | Gross Profit | Expenses | Net Profit | Margin %</p>
            </div>
            <span className="text-xs font-bold text-slate-400">{yearlyList.length} years</span>
          </div>

          {yearlyList.length === 0 ? (
            <div className="p-8 bg-slate-50 rounded-2xl border border-dashed text-center text-xs text-slate-400">
              No yearly data available.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-[11px] text-slate-500 uppercase border-b border-slate-200">
                  <tr>
                    <th className="p-3">Year</th>
                    <th className="p-3">Bills</th>
                    <th className="p-3 text-blue-600">Sales</th>
                    {isAdminOrOwner && <th className="p-3 text-orange-600">Purchase Cost</th>}
                    {isAdminOrOwner && <th className="p-3 text-emerald-600">Gross Profit</th>}
                    <th className="p-3 text-rose-600">Expenses</th>
                    {isAdminOrOwner && <th className="p-3 text-emerald-600">Net Profit</th>}
                    {isAdminOrOwner && <th className="p-3 text-purple-600 text-right">Margin %</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {yearlyList.map((y) => (
                    <tr key={y.yearStr} className="hover:bg-slate-50">
                      <td className="p-3 font-bold text-blue-600">{y.yearStr}</td>
                      <td className="p-3">{y.billsCount}</td>
                      <td className="p-3 font-black text-blue-600">₹{y.sales.toFixed(2)}</td>
                      {isAdminOrOwner && <td className="p-3 font-bold text-orange-600">₹{y.purchase.toFixed(2)}</td>}
                      {isAdminOrOwner && <td className="p-3 font-bold text-emerald-600">₹{y.grossProfit.toFixed(2)}</td>}
                      <td className="p-3 font-bold text-rose-600">₹{y.expenses.toFixed(2)}</td>
                      {isAdminOrOwner && <td className="p-3 font-black text-emerald-600">₹{y.netProfit.toFixed(2)}</td>}
                      {isAdminOrOwner && <td className="p-3 text-right font-bold text-purple-600">{y.margin.toFixed(2)}%</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* VIEW BILL DETAILS MODAL */}
      {viewBillModalOpen && selectedSale && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 space-y-4 shadow-2xl border border-slate-200 text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start border-b pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">{business?.name || "T MART"}</h3>
                <p className="font-mono text-xs font-bold text-blue-600 mt-0.5">
                  Bill: {selectedSale.invoice_number || selectedSale.bill_no}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Date: {new Date(selectedSale.created_at).toLocaleDateString()} • Time: {new Date(selectedSale.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} • Payment: {selectedSale.payment_method || "CASH"}
                </p>
              </div>
              <button onClick={() => setViewBillModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* PRODUCT | QTY | PURCHASE | SALE | PROFIT */}
            <div className="space-y-2">
              <h4 className="text-[11px] font-black text-slate-400 uppercase">Bill Products Breakdown</h4>

              {loadingModalItems ? (
                <div className="py-8 text-center text-slate-400 flex flex-col items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                  <span>Loading bill items...</span>
                </div>
              ) : modalSaleItems.length === 0 ? (
                <div className="p-6 bg-slate-50 border border-dashed rounded-xl text-center text-slate-400">
                  No items found for this bill.
                </div>
              ) : (
                <div className="border border-slate-200 rounded-2xl overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-slate-50 text-[10px] uppercase border-b text-slate-500">
                      <tr>
                        <th className="p-2.5">Product</th>
                        <th className="p-2.5 text-center">Qty</th>
                        {isAdminOrOwner && <th className="p-2.5 text-orange-600">Purchase</th>}
                        <th className="p-2.5 text-blue-600">Sale</th>
                        {isAdminOrOwner && <th className="p-2.5 text-emerald-600 text-right">Profit</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {modalSaleItems.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-2.5 font-bold text-slate-900">{item.product_name}</td>
                          <td className="p-2.5 text-center">{item.quantity}</td>
                          {isAdminOrOwner && (
                            <td className="p-2.5 text-orange-600 font-bold">
                              {item.hasCost ? `₹${item.purchaseTotal.toFixed(2)}` : "Purchase price missing"}
                            </td>
                          )}
                          <td className="p-2.5 font-black text-blue-600">₹{item.saleTotal.toFixed(2)}</td>
                          {isAdminOrOwner && (
                            <td className={`p-2.5 text-right font-black ${item.itemProfit >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                              {item.hasCost ? `₹${item.itemProfit.toFixed(2)}` : "Purchase price missing"}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* BILL FINANCIAL SUMMARY */}
            {isAdminOrOwner && (
              <div className="bg-slate-50 p-4 rounded-2xl border space-y-1.5 font-semibold text-slate-700">
                <div className="flex justify-between text-orange-600"><span>Bill Purchase Cost:</span> <span>{selectedSale.hasAllCosts ? `₹${selectedSale.billPurchaseCost.toFixed(2)}` : "Purchase price missing"}</span></div>
                <div className="flex justify-between text-blue-600"><span>Bill Sale Total:</span> <span>₹{selectedSale.billSaleTotal.toFixed(2)}</span></div>
                <div className="flex justify-between text-purple-600"><span>Bill Margin:</span> <span>{selectedSale.hasAllCosts ? `${selectedSale.billMargin.toFixed(2)}%` : "—"}</span></div>
                <div className="flex justify-between font-black text-emerald-600 text-sm border-t pt-1.5 mt-1">
                  <span>Bill Profit:</span> <span>{selectedSale.hasAllCosts ? `₹${selectedSale.billProfit.toFixed(2)}` : "Purchase price missing"}</span>
                </div>
              </div>
            )}

            {/* BUTTONS */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => handlePrintReceipt(selectedSale, modalSaleItems)}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl text-xs cursor-pointer shadow-md flex items-center justify-center gap-1.5"
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

      {/* EDIT BILL MODAL */}
      {editBillModalOpen && editingSale && isAdminOrOwner && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200 text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">Edit Bill: {editingSale.invoice_number || editingSale.bill_no}</h3>
                <p className="text-slate-400">Modify quantities, selling price, discount or payment method</p>
              </div>
              <button onClick={() => setEditBillModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditBill} className="space-y-4">
              <div className="space-y-2">
                <label className="block font-bold text-slate-700 uppercase text-[10px]">Bill Items & Quantities</label>
                {editSaleItems.map((item, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 rounded-2xl border flex items-center justify-between gap-3">
                    <span className="font-bold text-slate-900 flex-1 truncate">{item.product_name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-400">Qty:</span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={item.quantity}
                        onChange={(e) => {
                          const value = e.target.value;
                          const val = value === "" ? 0 : Math.max(0, Number(value));
                          setEditSaleItems((prev) =>
                            prev.map((i, pIdx) => (pIdx === idx ? { ...i, quantity: val } : i))
                          );
                        }}
                        className="w-16 bg-white border rounded-xl px-2 py-1 font-extrabold text-center outline-none"
                      />
                      <span className="text-[10px] text-slate-400">Price:</span>
                      <input
                        type="number"
                        step="0.01"
                        value={item.selling_price || item.price || 0}
                        onChange={(e) => {
                          const val = Number(e.target.value) || 0;
                          setEditSaleItems((prev) =>
                            prev.map((i, pIdx) => (pIdx === idx ? { ...i, selling_price: val, price: val } : i))
                          );
                        }}
                        className="w-20 bg-white border rounded-xl px-2 py-1 font-extrabold text-center outline-none"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase text-[10px] mb-1">Discount (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editDiscount}
                    onChange={(e) => setEditDiscount(Number(e.target.value) || 0)}
                    className="w-full bg-slate-50 border rounded-xl px-3 py-2 font-bold outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase text-[10px] mb-1">Payment Method</label>
                  <select
                    value={editPaymentMethod}
                    onChange={(e) => setEditPaymentMethod(e.target.value)}
                    className="w-full bg-slate-50 border rounded-xl px-3 py-2 font-bold outline-none bg-white cursor-pointer"
                  >
                    <option value="CASH">CASH</option>
                    <option value="UPI">UPI</option>
                    <option value="CARD">CARD</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditBillModalOpen(false)}
                  className="flex-1 py-3 border rounded-2xl font-bold text-slate-600 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingEdit}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl shadow-md cursor-pointer"
                >
                  {submittingEdit ? "Saving Changes..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE BILL CONFIRMATION MODAL */}
      {deleteBillConfirmOpen && deletingSale && isAdminOrOwner && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl border border-slate-200 text-xs">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto text-xl font-black">
              🗑
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">Delete this bill permanently?</h3>
              <p className="text-slate-500 mt-1">This will remove this bill from active sales reports.</p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteBillConfirmOpen(false)}
                className="flex-1 py-3 border rounded-2xl font-bold text-slate-600 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submittingDelete}
                onClick={handleConfirmDeleteBill}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-2xl shadow-md cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" /> {submittingDelete ? "Deleting..." : "Delete Bill"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRODUCT DRILL-DOWN BILLS MODAL */}
      {productDrillModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200 text-xs max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">Bills containing: <span className="text-blue-600">{selectedProductDrill}</span></h3>
                <p className="text-slate-400">List of sales transactions for this product</p>
              </div>
              <button onClick={() => setProductDrillModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {productDrillBills.length === 0 ? (
              <div className="p-6 text-center text-slate-400">No bills found for this product.</div>
            ) : (
              <div className="space-y-2">
                {productDrillBills.map((b) => (
                  <div
                    key={b.id}
                    onClick={() => {
                      setProductDrillModalOpen(false);
                      handleViewBillDetails(b);
                    }}
                    className="p-3 bg-slate-50 hover:bg-blue-50/50 rounded-xl border flex justify-between items-center cursor-pointer transition"
                  >
                    <div>
                      <strong className="text-blue-600 font-mono">{b.invoice_number || b.bill_no}</strong>
                      <p className="text-[10px] text-slate-400">{new Date(b.created_at).toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <span className="font-extrabold text-blue-600 block">₹{b.billSaleTotal.toFixed(2)}</span>
                      {isAdminOrOwner && (
                        <span className="text-[10px] text-emerald-600 font-bold">
                          Profit: {b.billProfit !== null ? `₹${b.billProfit.toFixed(2)}` : "Unavailable"}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setProductDrillModalOpen(false)}
                className="w-full py-3 bg-slate-900 text-white font-bold rounded-2xl cursor-pointer"
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
