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

  const loadDashboardData = useCallback(async () => {
    setRefreshing(true);
    setQueryError(null);

    try {
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

      // 3. Fetch Products
      const { data: prodsData, error: prodErr } = await supabase
        .from("products")
        .select("*")
        .order("name", { ascending: true });

      if (prodErr) throw prodErr;

      const filteredProds = (prodsData || []).filter((p) => {
        if (!businessId) return true;
        return p.business_id === businessId || p.tenant_id === businessId;
      });
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
      console.error("Dashboard data load error:", err);
      setQueryError(err.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [supabase, businessId]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

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
    return {
      ...sale,
      items,
      billCost,
      saleTotal,
      profit,
    };
  });

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const todaysEnrichedBills = enrichedSales.filter((s) => new Date(s.created_at) >= startOfToday);

  // Product-wise Report
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

  const productReportList = Array.from(productSalesMap.values()).sort((a, b) => b.sales - a.sales);

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

  const go = (path: string) => {
    router.push(path);
  };

  return (
    <SharedDashboardLayout
      businessName={businessName}
      userName={userName}
      role={role}
      pageTitle="Home"
    >
      {/* 1. HEADER BANNER */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white p-6 sm:p-8 rounded-3xl shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest border border-white/20">
            TWEB SaaS
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

      {/* 2. MAIN QUICK ACTIONS (7 ACTIONS) */}
      <section className="mb-8 space-y-3">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">Main Quick Actions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          <button
            onClick={() => go("/dashboard/billing")}
            className="p-4 bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-2xl shadow-md shadow-blue-600/20 hover:scale-[1.02] transition flex flex-col items-center justify-center text-center gap-1.5 cursor-pointer min-h-[88px]"
          >
            <Plus className="w-5 h-5 text-white" />
            <span className="font-black text-xs">+ New Bill</span>
          </button>

          <button
            onClick={() => go("/dashboard/products")}
            className="p-4 bg-white hover:bg-slate-50 text-slate-900 rounded-2xl border border-slate-200/80 shadow-xs hover:scale-[1.02] transition flex flex-col items-center justify-center text-center gap-1.5 cursor-pointer min-h-[88px]"
          >
            <Package className="w-5 h-5 text-indigo-600" />
            <span className="font-extrabold text-xs">Products</span>
          </button>

          <button
            onClick={() => go("/dashboard/stock")}
            className="p-4 bg-white hover:bg-slate-50 text-slate-900 rounded-2xl border border-slate-200/80 shadow-xs hover:scale-[1.02] transition flex flex-col items-center justify-center text-center gap-1.5 cursor-pointer min-h-[88px]"
          >
            <Boxes className="w-5 h-5 text-emerald-600" />
            <span className="font-extrabold text-xs">Stock</span>
          </button>

          <button
            onClick={() => go("/dashboard/purchases")}
            className="p-4 bg-white hover:bg-slate-50 text-slate-900 rounded-2xl border border-slate-200/80 shadow-xs hover:scale-[1.02] transition flex flex-col items-center justify-center text-center gap-1.5 cursor-pointer min-h-[88px]"
          >
            <FileText className="w-5 h-5 text-orange-600" />
            <span className="font-extrabold text-xs">Purchases</span>
          </button>

          <button
            onClick={() => go("/dashboard/customers")}
            className="p-4 bg-white hover:bg-slate-50 text-slate-900 rounded-2xl border border-slate-200/80 shadow-xs hover:scale-[1.02] transition flex flex-col items-center justify-center text-center gap-1.5 cursor-pointer min-h-[88px]"
          >
            <UserCheck className="w-5 h-5 text-blue-600" />
            <span className="font-extrabold text-xs">Customers</span>
          </button>

          <button
            onClick={() => go("/dashboard/purchases")}
            className="p-4 bg-white hover:bg-slate-50 text-slate-900 rounded-2xl border border-slate-200/80 shadow-xs hover:scale-[1.02] transition flex flex-col items-center justify-center text-center gap-1.5 cursor-pointer min-h-[88px]"
          >
            <Truck className="w-5 h-5 text-teal-600" />
            <span className="font-extrabold text-xs">Vendors</span>
          </button>

          <button
            onClick={() => go("/dashboard/reports")}
            className="p-4 bg-white hover:bg-slate-50 text-slate-900 rounded-2xl border border-slate-200/80 shadow-xs hover:scale-[1.02] transition flex flex-col items-center justify-center text-center gap-1.5 cursor-pointer min-h-[88px]"
          >
            <TrendingUp className="w-5 h-5 text-purple-600" />
            <span className="font-extrabold text-xs">Reports</span>
          </button>
        </div>
      </section>

      {/* 3. TODAY'S BUSINESS SUMMARY (Owner / Admin Only) */}
      {isAdminOrOwner && (
        <section className="mb-8 space-y-3">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">Today's Business Summary</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            <div className="bg-white p-4 rounded-3xl border border-blue-100 shadow-xs space-y-1">
              <p className="text-[10px] font-extrabold text-blue-600 uppercase tracking-wider">Today's Sales</p>
              <h3 className="text-lg sm:text-xl font-black text-slate-900">₹{todaysSalesTotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
            </div>
            <div className="bg-white p-4 rounded-3xl border border-orange-100 shadow-xs space-y-1">
              <p className="text-[10px] font-extrabold text-orange-600 uppercase tracking-wider">Today's Purchases</p>
              <h3 className="text-lg sm:text-xl font-black text-orange-600">₹{todaysPurchasesTotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
            </div>
            <div className="bg-white p-4 rounded-3xl border border-emerald-100 shadow-xs space-y-1">
              <p className="text-[10px] font-extrabold text-emerald-600 uppercase tracking-wider">Gross Profit</p>
              <h3 className="text-lg sm:text-xl font-black text-emerald-600">₹{todaysGrossProfit.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
            </div>
            <div className="bg-white p-4 rounded-3xl border border-indigo-100 shadow-xs space-y-1">
              <p className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-wider">Net Profit</p>
              <h3 className="text-lg sm:text-xl font-black text-indigo-600">₹{todaysNetProfit.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
            </div>
            <div className="bg-white p-4 rounded-3xl border border-purple-100 shadow-xs space-y-1">
              <p className="text-[10px] font-extrabold text-purple-600 uppercase tracking-wider">Today's Bills</p>
              <h3 className="text-lg sm:text-xl font-black text-purple-600">{todaysBillsCount}</h3>
            </div>
            <div className="bg-white p-4 rounded-3xl border border-cyan-100 shadow-xs space-y-1">
              <p className="text-[10px] font-extrabold text-cyan-600 uppercase tracking-wider">Total Products</p>
              <h3 className="text-lg sm:text-xl font-black text-cyan-600">{totalProducts}</h3>
            </div>
            <div className="bg-white p-4 rounded-3xl border border-amber-100 shadow-xs space-y-1">
              <p className="text-[10px] font-extrabold text-amber-600 uppercase tracking-wider">Low Stock</p>
              <h3 className="text-lg sm:text-xl font-black text-amber-600">{lowStockCount}</h3>
            </div>
          </div>
        </section>
      )}

      {/* 4. BILL-WISE PROFIT (Owner / Admin Only) */}
      {isAdminOrOwner && (
        <section className="mb-8 space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">Today's Bill-wise Profit</h3>
            <span className="text-xs font-bold text-slate-400">{todaysEnrichedBills.length} bills today</span>
          </div>

          {todaysEnrichedBills.length === 0 ? (
            <div className="bg-white p-8 rounded-3xl border border-slate-200/80 text-center text-xs text-slate-400">
              No bills available for today.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {todaysEnrichedBills.map((sale) => (
                <div
                  key={sale.id}
                  onClick={() => handleOpenBillDetails(sale)}
                  className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-3 hover:shadow-md transition cursor-pointer"
                >
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                    <span className="font-mono font-black text-blue-600 text-sm">#{sale.invoice_number || sale.bill_no}</span>
                    <span className="text-[11px] text-slate-400 font-bold">{new Date(sale.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="p-2.5 bg-blue-50/50 rounded-2xl text-center">
                      <span className="text-[9px] text-blue-600 font-extrabold uppercase block">Sales</span>
                      <span className="font-black text-blue-900 text-xs">₹{sale.saleTotal.toFixed(2)}</span>
                    </div>
                    <div className="p-2.5 bg-orange-50/50 rounded-2xl text-center">
                      <span className="text-[9px] text-orange-600 font-extrabold uppercase block">Cost</span>
                      <span className="font-black text-orange-900 text-xs">₹{sale.billCost.toFixed(2)}</span>
                    </div>
                    <div className="p-2.5 bg-emerald-50/50 rounded-2xl text-center">
                      <span className="text-[9px] text-emerald-600 font-extrabold uppercase block">Profit</span>
                      <span className="font-black text-emerald-900 text-xs">₹{sale.profit.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-[11px] pt-1 text-slate-400">
                    <span>Customer: {sale.customer_name || "Walk-in"}</span>
                    <span className="text-indigo-600 font-bold">View Details →</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* RECENT SALES & LOW STOCK ALERTS PANELS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* RECENT SALES */}
        <section className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-base font-black text-slate-900">Recent Sales</h3>
              <p className="text-xs text-slate-400 font-medium">Latest POS transactions</p>
            </div>

            <button
              onClick={() => go("/dashboard/sales")}
              className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold rounded-xl text-xs transition cursor-pointer flex items-center gap-1"
            >
              View All <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {loading ? (
            <div className="p-8 text-center text-xs text-slate-400">Loading recent sales...</div>
          ) : recentSalesList.length === 0 ? (
            <div className="p-8 bg-slate-50 rounded-2xl border border-dashed text-center space-y-2">
              <Receipt className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs font-bold text-slate-700">No sales recorded today</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentSalesList.map((s) => (
                <div
                  key={s.id}
                  onClick={() => go("/dashboard/sales")}
                  className="p-3.5 bg-slate-50 hover:bg-blue-50/50 rounded-2xl border border-slate-100 flex justify-between items-center text-xs transition cursor-pointer"
                >
                  <div>
                    <span className="font-mono font-bold text-blue-600">{s.invoice_number || s.bill_no}</span>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {new Date(s.created_at).toLocaleDateString()} • {new Date(s.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="font-black text-emerald-600 block text-sm">₹{Number(s.total_amount ?? s.total ?? 0).toFixed(2)}</span>
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full font-bold text-[9px] uppercase">
                      {s.payment_method || "CASH"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* LOW STOCK ALERTS */}
        <section className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-base font-black text-slate-900">Low Stock Alerts</h3>
              <p className="text-xs text-slate-400 font-medium">Products requiring reorder</p>
            </div>

            <button
              onClick={() => go("/dashboard/stock")}
              className="px-3 py-1.5 bg-amber-50 text-amber-700 hover:bg-amber-100 font-bold rounded-xl text-xs transition cursor-pointer flex items-center gap-1"
            >
              View Stock <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {loading ? (
            <div className="p-8 text-center text-xs text-slate-400">Loading stock alerts...</div>
          ) : lowStockList.length === 0 ? (
            <div className="p-8 bg-slate-50 rounded-2xl border border-dashed text-center space-y-2">
              <Boxes className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs font-bold text-slate-700">All products in stock</p>
            </div>
          ) : (
            <div className="space-y-2">
              {lowStockList.map((p) => (
                <div
                  key={p.id}
                  onClick={() => go("/dashboard/stock")}
                  className="p-3.5 bg-slate-50 hover:bg-amber-50/50 rounded-2xl border border-slate-100 flex justify-between items-center text-xs transition cursor-pointer"
                >
                  <div>
                    <h4 className="font-extrabold text-slate-900">{p.name}</h4>
                    <p className="text-[10px] text-slate-400">SKU: {p.barcode || "N/A"}</p>
                  </div>

                  <div className="text-right">
                    <span className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full font-black text-[10px]">
                      {p.stock_quantity || 0} {p.unit || "pcs"} left
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* BILL DETAILS MODAL */}
      {viewBillModalOpen && selectedSale && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-[calc(100%-24px)] p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-5 max-h-[90vh] overflow-y-auto text-xs">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">Bill Details & Profit</h3>
                <p className="text-[11px] font-mono text-slate-400">#{selectedSale.invoice_number || selectedSale.bill_no}</p>
              </div>
              <button onClick={() => setViewBillModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer p-1.5"><X className="w-5 h-5" /></button>
            </div>

            <div className="space-y-1.5 text-slate-700 bg-slate-50 p-4 rounded-2xl">
              <div className="flex justify-between"><span>Bill No:</span> <span className="font-mono font-bold">#{selectedSale.invoice_number || selectedSale.bill_no}</span></div>
              <div className="flex justify-between"><span>Date:</span> <span className="font-bold">{new Date(selectedSale.created_at).toLocaleDateString()}</span></div>
              <div className="flex justify-between"><span>Time:</span> <span className="font-bold">{new Date(selectedSale.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span></div>
              <div className="flex justify-between"><span>Customer:</span> <span className="font-bold">{selectedSale.customer_name || "Walk-in Customer"}</span></div>
              <div className="flex justify-between"><span>Payment:</span> <span className="font-bold uppercase">{selectedSale.payment_method || "CASH"}</span></div>
            </div>

            <div className="space-y-2">
              <h4 className="font-black text-slate-800 uppercase text-[11px]">Products</h4>
              {loadingModalItems ? (
                <div className="p-6 text-center text-slate-400">Loading items...</div>
              ) : modalSaleItems.length === 0 ? (
                <div className="p-4 text-center text-slate-400 bg-slate-50 rounded-2xl">No items found.</div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {modalSaleItems.map((item, idx) => (
                    <div key={idx} className="p-3 bg-white rounded-2xl border border-slate-200/80 space-y-1.5">
                      <div className="flex justify-between font-extrabold text-slate-900">
                        <span>{item.product_name}</span>
                        <span>₹{item.line_total.toFixed(2)}</span>
                      </div>
                      <div className="grid grid-cols-4 gap-1 text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                        <div>Qty: <strong className="text-slate-800">{item.quantity}</strong></div>
                        <div>Sale: <strong className="text-blue-600">₹{item.selling_price.toFixed(2)}</strong></div>
                        {isAdminOrOwner && (
                          <>
                            <div>Cost: <strong className="text-orange-600">₹{item.purchase_cost.toFixed(2)}</strong></div>
                            <div className="text-right">Profit: <strong className="text-emerald-600">₹{item.line_profit.toFixed(2)}</strong></div>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {isAdminOrOwner && (
              <div className="bg-slate-900 text-white p-4 rounded-2xl space-y-1.5 font-bold">
                <div className="flex justify-between text-slate-300 text-[11px]"><span>Sales Total:</span> <span>₹{selectedSale.saleTotal.toFixed(2)}</span></div>
                <div className="flex justify-between text-slate-300 text-[11px]"><span>Purchase Cost:</span> <span>₹{selectedSale.billCost.toFixed(2)}</span></div>
                <div className="border-t border-slate-700 pt-1.5 flex justify-between text-sm font-black text-emerald-400"><span>Bill Profit:</span> <span>₹{selectedSale.profit.toFixed(2)}</span></div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setViewBillModalOpen(false)}
                className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs cursor-pointer min-h-[44px]"
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
