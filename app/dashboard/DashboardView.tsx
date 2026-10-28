"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { SharedDashboardLayout } from "@/components/layout/SharedDashboardLayout";
import { createClient } from "@/lib/supabase/client";
import {
  RefreshCw,
  Plus,
  ArrowRight,
  TrendingUp,
  Receipt,
  Package,
  Boxes,
  ShoppingCart,
  UserCheck,
  Truck,
  Eye,
  X,
  FileText,
  DollarSign,
  AlertTriangle,
  Flame,
  PieChart,
} from "lucide-react";

interface Props {
  businessId: string;
  businessName: string;
  userName: string;
  role: string;
}

export default function DashboardView({
  businessId,
  businessName,
  userName,
  role,
}: Props) {
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Real-time Metrics state
  const [todaysSalesTotal, setTodaysSalesTotal] = useState(0);
  const [todaysPurchasesTotal, setTodaysPurchasesTotal] = useState(0);
  const [todaysGrossProfit, setTodaysGrossProfit] = useState(0);
  const [todaysNetProfit, setTodaysNetProfit] = useState(0);
  const [todaysBillsCount, setTodaysBillsCount] = useState(0);
  const [totalProducts, setTotalProducts] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);

  // Datasets
  const [allSales, setAllSales] = useState<any[]>([]);
  const [allSaleItems, setAllSaleItems] = useState<any[]>([]);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [recentSalesList, setRecentSalesList] = useState<any[]>([]);
  const [lowStockList, setLowStockList] = useState<any[]>([]);

  // Bill Details Modal State
  const [viewBillModalOpen, setViewBillModalOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<any>(null);
  const [modalSaleItems, setModalSaleItems] = useState<any[]>([]);
  const [loadingModalItems, setLoadingModalItems] = useState(false);

  const [queryError, setQueryError] = useState<string | null>(null);

  const isAdminOrOwner = role && ["owner", "admin", "owner/admin"].includes(role.toLowerCase());
  const isDemoMode = process.env.NEXT_PUBLIC_TWEB_DEMO_MODE === "true";

  const loadDashboardData = useCallback(async () => {
    setRefreshing(true);
    setQueryError(null);

    try {
      if (isDemoMode) {
        setAllSales([
          { id: "s1", business_id: businessId || "demo-biz-1", customer_name: "Walk-in Customer", total_amount: 650, payment_method: "CASH", created_at: new Date().toISOString() },
          { id: "s2", business_id: businessId || "demo-biz-1", customer_name: "Priya Sharma", total_amount: 1200, payment_method: "UPI", created_at: new Date().toISOString() },
        ]);
        setRecentSalesList([
          { id: "s1", business_id: businessId || "demo-biz-1", customer_name: "Walk-in Customer", total_amount: 650, payment_method: "CASH", created_at: new Date().toISOString() },
          { id: "s2", business_id: businessId || "demo-biz-1", customer_name: "Priya Sharma", total_amount: 1200, payment_method: "UPI", created_at: new Date().toISOString() },
        ]);
        setAllSaleItems([
          { id: "i1", sale_id: "s1", product_id: "p1", quantity: 10, selling_price: 65, total_amount: 650 },
        ]);
        const sampleProds = [
          { id: "p1", business_id: businessId || "demo-biz-1", name: "Organic Whole Milk 1L", barcode: "8901234567890", category: "Dairy", unit: "Bottle", stock_quantity: 45, minimum_stock: 10, purchase_price: 50, selling_price: 65, mrp: 65, track_expiry: true },
          { id: "p2", business_id: businessId || "demo-biz-1", name: "Fresh Whole Wheat Bread", barcode: "8901234567891", category: "Bakery", unit: "Loaf", stock_quantity: 12, minimum_stock: 5, purchase_price: 30, selling_price: 40, mrp: 40, track_expiry: true },
          { id: "p3", business_id: businessId || "demo-biz-1", name: "Basmati Rice 5kg", barcode: "8901234567892", category: "Grains", unit: "Bag", stock_quantity: 100, minimum_stock: 15, purchase_price: 350, selling_price: 450, mrp: 450, track_expiry: false },
        ];
        setAllProducts(sampleProds);
        setTotalProducts(sampleProds.length);
        setLowStockCount(0);
        setLowStockList([]);
        setTodaysSalesTotal(1850);
        setTodaysBillsCount(2);
        setTodaysPurchasesTotal(800);
        setTodaysGrossProfit(1050);
        setTodaysNetProfit(1050);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();

      // 1. Fetch Sales
      const { data: salesData, error: salesErr } = await supabase
        .from("sales")
        .select("*")
        .order("created_at", { ascending: false });

      if (salesErr) throw salesErr;

      const filteredSales = (salesData || []).filter((s) => {
        if (!businessId) return true;
        return s.business_id === businessId || s.tenant_id === businessId || s.user_id === user?.id;
      });
      setAllSales(filteredSales);
      setRecentSalesList(filteredSales.slice(0, 5));

      // 2. Fetch Sale Items
      if (filteredSales.length > 0) {
        const saleIds = filteredSales.map((s) => s.id);
        const { data: itemsData } = await supabase
          .from("sale_items")
          .select("*")
          .in("sale_id", saleIds);
        setAllSaleItems(itemsData || []);
      } else {
        setAllSaleItems([]);
      }

      // 3. Fetch Products via secure RPC
      const { data: prodsData, error: prodErr } = await supabase.rpc("get_business_products", {
        p_business_id: businessId,
      });

      if (prodErr) throw prodErr;

      const filteredProds = (prodsData || []) as any[];
      setAllProducts(filteredProds);
      setTotalProducts(filteredProds.length);

      const lowStock = filteredProds.filter(
        (p) => Number(p.stock_quantity || 0) <= Number(p.minimum_stock || 10)
      );
      setLowStockList(lowStock.slice(0, 5));
      setLowStockCount(lowStock.length);

      // Compute Today's Metrics
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      const todaySales = filteredSales.filter((s) => new Date(s.created_at) >= startOfToday);
      const todaySalesSum = todaySales.reduce((sum, s) => sum + Number(s.total_amount ?? s.total ?? 0), 0);
      setTodaysSalesTotal(todaySalesSum);
      setTodaysBillsCount(todaySales.length);

      // Compute Today's Purchases & Profit
      if (todaySales.length > 0) {
        const todaySaleIds = new Set(todaySales.map((s) => s.id));
        const todayItems = (allSaleItems || []).filter((i) => todaySaleIds.has(i.sale_id));

        let purCostToday = 0;
        todayItems.forEach((item) => {
          const prod = filteredProds.find((p) => p.id === item.product_id);
          const unitCost = Number(prod?.purchase_price || item.purchase_price || 0);
          purCostToday += unitCost * Number(item.quantity || 1);
        });

        setTodaysPurchasesTotal(purCostToday);
        const gross = todaySalesSum - purCostToday;
        setTodaysGrossProfit(gross);
        setTodaysNetProfit(gross);
      } else {
        setTodaysPurchasesTotal(0);
        setTodaysGrossProfit(0);
        setTodaysNetProfit(0);
      }
    } catch (err: any) {
      const detailed = err?.message || err?.code ? `Database Error [${err.code || "PGRST"}]: ${err.message}${err.details ? ` (${err.details})` : ""}${err.hint ? ` [Hint: ${err.hint}]` : ""}` : "Failed to load dashboard data";
      console.error("Dashboard data load error:", {
        message: err?.message,
        code: err?.code,
        details: err?.details,
        hint: err?.hint,
      });
      setQueryError(detailed);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [supabase, businessId, isDemoMode]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Stock Valuation
  const stockValuation = allProducts.reduce(
    (sum, p) => sum + Number(p.stock_quantity || 0) * Number(p.purchase_price || p.selling_price || 0),
    0
  );

  // Compute Enriched Sales for Owner/Admin
  const productMap = new Map(allProducts.map((p) => [p.id, p]));

  const enrichedSales = allSales.map((sale) => {
    const items = allSaleItems.filter((i) => i.sale_id === sale.id);
    let billCost = 0;
    items.forEach((item) => {
      const prod = productMap.get(item.product_id);
      const unitCost = Number(prod?.purchase_price || item.purchase_price || 0);
      billCost += unitCost * Number(item.quantity || 1);
    });
    const saleTotal = Number(sale.total_amount ?? sale.total ?? 0);
    const profit = saleTotal - billCost;
    const margin = saleTotal > 0 ? (profit / saleTotal) * 100 : 0;
    return {
      ...sale,
      itemsCount: items.reduce((sum, i) => sum + Number(i.quantity || 1), 0),
      totalCost: billCost,
      profit,
      margin,
    };
  });

  const productSalesMap = new Map<string, { name: string; qty: number; sales: number; cost: number; profit: number }>();
  allSaleItems.forEach((item) => {
    const prod = productMap.get(item.product_id);
    const pName = prod?.name || item.product_name || "Product";
    const qty = Number(item.quantity || 1);
    const saleVal = Number(item.total_amount || item.total || (Number(item.selling_price || item.price || 0) * qty));
    const costVal = Number(prod?.purchase_price || item.purchase_price || 0) * qty;
    const profitVal = saleVal - costVal;

    if (!productSalesMap.has(item.product_id || pName)) {
      productSalesMap.set(item.product_id || pName, { name: pName, qty: 0, sales: 0, cost: 0, profit: 0 });
    }
    const entry = productSalesMap.get(item.product_id || pName)!;
    entry.qty += qty;
    entry.sales += saleVal;
    entry.cost += costVal;
    entry.profit += profitVal;
  });

  const topSellersList = Array.from(productSalesMap.values())
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  const handleOpenBillDetails = async (sale: any) => {
    setSelectedSale(sale);
    setViewBillModalOpen(true);
    setLoadingModalItems(true);
    try {
      const items = sale.items || [];
      const enriched = items.map((item: any) => {
        const prod = productMap.get(item.product_id);
        const pName = prod?.name || item.product_name || "Product";
        const qty = Number(item.quantity || 1);
        const sellPrice = Number(item.selling_price || item.price || prod?.selling_price || 0);
        const buyCost = Number(prod?.purchase_price || item.purchase_price || 0);
        const lineTotal = Number(item.total_amount || item.total || (sellPrice * qty));
        const lineProfit = lineTotal - (buyCost * qty);
        return {
          ...item,
          product_name: pName,
          quantity: qty,
          selling_price: sellPrice,
          purchase_cost: buyCost,
          line_total: lineTotal,
          line_profit: lineProfit,
        };
      });
      setModalSaleItems(enriched);
    } catch (err) {
      console.error("Failed to load bill detail items", err);
      setModalSaleItems([]);
    } finally {
      setLoadingModalItems(false);
    }
  };

  const go = (path: string) => router.push(path);

  return (
    <SharedDashboardLayout
      businessName={businessName}
      userName={userName}
      role={role}
      pageTitle="Home"
    >
      {isDemoMode && (
        <div className="p-4 bg-amber-50 border border-amber-300 text-amber-900 rounded-2xl text-xs font-extrabold mb-6 flex items-center gap-2">
          <span>⚠️</span>
          <span>DEMO MODE — NO DATABASE CHANGES (NEXT_PUBLIC_TWEB_DEMO_MODE=true)</span>
        </div>
      )}

      {/* 1. HEADER BANNER */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white p-6 sm:p-8 rounded-3xl shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest border border-white/20">
            TWEB Enterprise POS
          </span>
          <h2 className="text-2xl sm:text-3xl font-black mt-2">Welcome, {userName} 👋</h2>
          <p className="text-xs text-indigo-100 font-medium mt-1">Managing <strong className="text-white">{businessName}</strong></p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadDashboardData}
            className="px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/30 rounded-xl text-xs font-bold text-white transition flex items-center gap-2 cursor-pointer min-h-[44px]"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>
      </div>

      {queryError && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-bold mb-6">
          {queryError}
        </div>
      )}

      {/* 2. MAIN QUICK ACTIONS (5 PRIMARY ACTIONS) */}
      <section className="mb-8 space-y-3">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">Quick Actions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <button
            onClick={() => go("/dashboard/billing")}
            className="p-4 bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-2xl shadow-md shadow-blue-600/20 hover:scale-[1.02] transition flex flex-col items-center justify-center text-center gap-1.5 cursor-pointer min-h-[88px]"
          >
            <Plus className="w-5 h-5 text-white" />
            <span className="font-black text-xs">+ New Sale</span>
          </button>

          <button
            onClick={() => go("/dashboard/stock")}
            className="p-4 bg-gradient-to-br from-indigo-600 to-purple-700 text-white rounded-2xl shadow-md shadow-purple-600/20 hover:scale-[1.02] transition flex flex-col items-center justify-center text-center gap-1.5 cursor-pointer min-h-[88px]"
          >
            <FileText className="w-5 h-5 text-white" />
            <span className="font-black text-xs">Add Purchase</span>
          </button>

          <button
            onClick={() => go("/dashboard/products")}
            className="p-4 bg-gradient-to-br from-violet-600 to-fuchsia-700 text-white rounded-2xl shadow-md shadow-fuchsia-600/20 hover:scale-[1.02] transition flex flex-col items-center justify-center text-center gap-1.5 cursor-pointer min-h-[88px]"
          >
            <Package className="w-5 h-5 text-white" />
            <span className="font-black text-xs">Add Product</span>
          </button>

          <button
            onClick={() => go("/dashboard/sales")}
            className="p-4 bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-2xl shadow-md shadow-emerald-600/20 hover:scale-[1.02] transition flex flex-col items-center justify-center text-center gap-1.5 cursor-pointer min-h-[88px]"
          >
            <ShoppingCart className="w-5 h-5 text-white" />
            <span className="font-black text-xs">Sales History</span>
          </button>

          <button
            onClick={() => go("/dashboard/expiry")}
            className="p-4 bg-gradient-to-br from-amber-600 to-orange-700 text-white rounded-2xl shadow-md shadow-amber-600/20 hover:scale-[1.02] transition flex flex-col items-center justify-center text-center gap-1.5 cursor-pointer min-h-[88px]"
          >
            <Boxes className="w-5 h-5 text-white" />
            <span className="font-black text-xs">Expiry & Batches</span>
          </button>
        </div>
      </section>

      {/* 3. TODAY'S BUSINESS METRICS */}
      <section className="mb-8 space-y-3">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">Today's Overview</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-1">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Today's Sales</p>
            <h3 className="text-2xl font-black text-emerald-600">₹{todaysSalesTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</h3>
            <p className="text-[11px] text-slate-400 font-semibold">{todaysBillsCount} bill(s) processed</p>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-1">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Today's Purchases</p>
            <h3 className="text-2xl font-black text-blue-600">₹{todaysPurchasesTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</h3>
            <p className="text-[11px] text-slate-400 font-semibold">Cost of goods sold</p>
          </div>

          {isAdminOrOwner ? (
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-1">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Gross Profit</p>
              <h3 className="text-2xl font-black text-purple-600">₹{todaysGrossProfit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</h3>
              <p className="text-[11px] text-slate-400 font-semibold">Sales minus product cost</p>
            </div>
          ) : (
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-1">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Products</p>
              <h3 className="text-2xl font-black text-slate-900">{totalProducts}</h3>
              <p className="text-[11px] text-slate-400 font-semibold">Active catalog items</p>
            </div>
          )}

          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-1">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Stock Valuation</p>
            <h3 className="text-2xl font-black text-indigo-600">₹{stockValuation.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</h3>
            <p className="text-[11px] text-slate-400 font-semibold">{totalProducts} items in stock</p>
          </div>
        </div>
      </section>

      {/* 4. RECENT SALES & ALERTS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
              <Receipt className="w-4 h-4 text-blue-600" /> Recent Sales
            </h3>
            <button onClick={() => go("/dashboard/sales")} className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer">
              View All <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {recentSalesList.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs font-semibold">No sales recorded yet today.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-[10px] text-slate-400 uppercase border-b border-slate-100">
                  <tr>
                    <th className="p-3">Invoice #</th>
                    <th className="p-3">Customer</th>
                    <th className="p-3">Method</th>
                    <th className="p-3">Total</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentSalesList.map((sale) => (
                    <tr key={sale.id} className="hover:bg-slate-50">
                      <td className="p-3 font-mono font-bold text-slate-900">{sale.invoice_number || sale.bill_no || sale.id.slice(0, 8)}</td>
                      <td className="p-3 font-semibold text-slate-800">{sale.customer_name || "Walk-in Customer"}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 bg-slate-100 font-bold text-slate-700 rounded-md text-[10px]">
                          {sale.payment_method || "CASH"}
                        </span>
                      </td>
                      <td className="p-3 font-black text-emerald-600">₹{Number(sale.total_amount ?? sale.total ?? 0).toFixed(2)}</td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => handleOpenBillDetails(sale)}
                          className="px-2.5 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 font-bold rounded-lg text-[11px] cursor-pointer"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* LOW STOCK & ALERTS */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" /> Low Stock Alerts
            </h3>
            <button onClick={() => go("/dashboard/stock-alerts")} className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer">
              View All <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {lowStockList.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs font-semibold bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              🎉 All inventory levels are healthy!
            </div>
          ) : (
            <div className="space-y-3">
              {lowStockList.map((prod) => (
                <div key={prod.id} className="p-3 bg-amber-50/60 border border-amber-200/60 rounded-2xl flex justify-between items-center text-xs">
                  <div>
                    <p className="font-extrabold text-slate-900">{prod.name}</p>
                    <p className="text-[10px] text-amber-800 font-bold">Only {prod.stock_quantity} {prod.unit || "pcs"} left</p>
                  </div>
                  <button
                    onClick={() => go("/dashboard/stock")}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-black text-[11px] rounded-xl shadow-xs cursor-pointer"
                  >
                    Restock
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* BILL DETAILS MODAL */}
      {viewBillModalOpen && selectedSale && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-4 text-xs">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">Invoice #{selectedSale.invoice_number || selectedSale.bill_no}</h3>
                <p className="text-[11px] text-slate-400">Customer: {selectedSale.customer_name || "Walk-in Customer"}</p>
              </div>
              <button onClick={() => setViewBillModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
              {loadingModalItems ? (
                <div className="p-8 text-center text-slate-400">Loading items...</div>
              ) : modalSaleItems.length === 0 ? (
                <div className="p-4 text-center text-slate-400">No items found for this bill.</div>
              ) : (
                modalSaleItems.map((item, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 rounded-xl border flex justify-between items-center">
                    <div>
                      <p className="font-extrabold text-slate-900">{item.product_name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">Qty: {item.quantity} × ₹{item.selling_price.toFixed(2)}</p>
                    </div>
                    <span className="font-black text-slate-900">₹{item.line_total.toFixed(2)}</span>
                  </div>
                ))
              )}
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border space-y-1.5 text-xs font-semibold">
              <div className="flex justify-between"><span className="text-slate-500">Subtotal:</span> <span>₹{Number(selectedSale.subtotal || selectedSale.total_amount || 0).toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Discount:</span> <span>₹{Number(selectedSale.discount || 0).toFixed(2)}</span></div>
              <div className="flex justify-between text-sm font-black text-slate-900 pt-1 border-t"><span>Total Paid:</span> <span className="text-emerald-600">₹{Number(selectedSale.total_amount ?? selectedSale.total ?? 0).toFixed(2)}</span></div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setViewBillModalOpen(false)}
                className="w-full py-3 bg-slate-900 text-white font-bold rounded-2xl text-xs cursor-pointer"
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
