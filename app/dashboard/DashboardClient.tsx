"use client";

import React, { useState } from "react";
import { logout } from "@/app/login/actions";
import Link from "next/link";
import {
  Store,
  LayoutDashboard,
  Package,
  Boxes,
  ReceiptText,
  ShoppingCart,
  Users,
  Truck,
  TrendingUp,
  CreditCard,
  Settings,
  LogOut,
  Bell,
  HelpCircle,
  Search,
  Plus,
  AlertTriangle,
  ChevronRight,
  ShieldCheck,
  Building,
  Menu,
  X,
} from "lucide-react";

interface Props {
  userEmail: string;
  userName: string;
  role: string;
  businessName: string;
  businessType: string;
  totalProducts: number;
  lowStockCount: number;
  outOfStockCount: number;
  stockValuation: number;
  subPlan: string;
  daysRemaining: number;
  recentProducts: Array<{ id: string; name: string; stock_quantity: number; unit: string }>;
}

export default function DashboardClient({
  userEmail,
  userName,
  role,
  businessName,
  businessType,
  totalProducts,
  lowStockCount,
  outOfStockCount,
  stockValuation,
  subPlan,
  daysRemaining,
  recentProducts,
}: Props) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { label: "Overview", icon: LayoutDashboard, href: "/dashboard", active: true },
    { label: "Products", icon: Package, href: "/dashboard/products" },
    { label: "Inventory", icon: Boxes, href: "/dashboard/inventory" },
    { label: "Billing", icon: ReceiptText, href: "/dashboard/billing" },
    { label: "Sales", icon: ShoppingCart, href: "/dashboard/sales" },
    { label: "Staff", icon: Users, href: "/dashboard/staff" },
    { label: "Delivery", icon: Truck, href: "/dashboard/delivery" },
    { label: "Reports", icon: TrendingUp, href: "/dashboard/reports" },
    { label: "Subscription", icon: CreditCard, href: "/dashboard/subscription" },
    { label: "Settings", icon: Settings, href: "/dashboard/settings" },
  ];

  return (
    <div className="min-h-screen bg-slate-100 flex font-sans antialiased text-slate-900">
      {/* Desktop Fixed Sidebar */}
      <aside className="hidden lg:flex flex-col w-72 bg-slate-900 text-slate-200 border-r border-slate-800 p-5 shrink-0 shadow-2xl justify-between">
        <div className="space-y-6">
          {/* Logo & Header */}
          <div className="flex items-center gap-3 px-2">
            <div className="p-3 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl text-white shadow-lg shadow-indigo-600/30">
              <Store className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-black text-lg text-white tracking-wider">T MART</h1>
              <p className="text-[10px] text-indigo-300 font-bold uppercase tracking-widest">Business Management</p>
            </div>
          </div>

          {/* Business Switcher */}
          <div className="px-3.5 py-3 bg-slate-800/90 rounded-2xl border border-slate-700/60 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0 border border-indigo-500/20">
                🏪
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Active Business</p>
                <p className="text-xs font-black text-white truncate">{businessName}</p>
              </div>
            </div>
            <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 font-black text-[9px] uppercase rounded-full">
              {role}
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1 overflow-y-auto max-h-[calc(100vh-340px)] pr-1">
            {navItems.map((item, idx) => {
              const Icon = item.icon;
              return (
                <Link
                  key={idx}
                  href={item.href}
                  className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl font-bold text-xs transition-all duration-200 group ${
                    item.active
                      ? "bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-600/30"
                      : "hover:bg-slate-800 text-slate-300 hover:text-white"
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${item.active ? "text-white" : "text-indigo-400 group-hover:scale-110 transition"}`} />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer User Info & Logout */}
        <div className="pt-4 border-t border-slate-800 space-y-3">
          <div className="px-3.5 py-3 bg-slate-800/80 rounded-2xl border border-slate-700/50 flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-black text-xs shrink-0 border border-indigo-500/30">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-black text-slate-100 truncate">{userName}</p>
              </div>
              <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">{role}</p>
            </div>
          </div>

          <form action={logout}>
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 py-3 bg-rose-600/10 hover:bg-rose-600 text-rose-400 hover:text-white font-extrabold text-xs rounded-2xl transition-all shadow-xs cursor-pointer"
            >
              <LogOut className="w-4 h-4" /> Logout
            </button>
          </form>
        </div>
      </aside>

      {/* Mobile Drawer Navigation Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 lg:hidden flex">
          <div className="w-72 bg-slate-900 text-slate-200 p-5 flex flex-col justify-between h-full shadow-2xl">
            <div className="space-y-6">
              <div className="flex justify-between items-center pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Store className="w-5 h-5 text-indigo-400" />
                  <span className="font-black text-white text-base">T MART</span>
                </div>
                <button onClick={() => setMobileMenuOpen(false)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="space-y-1 overflow-y-auto max-h-[calc(100vh-200px)]">
                {navItems.map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={idx}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl font-bold text-xs ${
                        item.active ? "bg-indigo-600 text-white" : "text-slate-300 hover:bg-slate-800"
                      }`}
                    >
                      <Icon className="w-4 h-4 text-indigo-400" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>

            <form action={logout} className="pt-4 border-t border-slate-800">
              <button
                type="submit"
                className="w-full py-3 bg-rose-600 text-white font-bold text-xs rounded-2xl flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" /> Logout
              </button>
            </form>
          </div>
          <div className="flex-1" onClick={() => setMobileMenuOpen(false)}></div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="bg-white border-b border-slate-200 px-4 sm:px-8 py-4 flex items-center justify-between sticky top-0 z-30 shadow-xs">
          <div className="flex items-center gap-3 flex-1">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 text-slate-700 hover:bg-slate-100 rounded-xl transition"
            >
              <Menu className="w-6 h-6" />
            </button>

            <div className="relative max-w-md w-full">
              <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search products, bills, customers..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold outline-none focus:border-indigo-600 focus:bg-white transition"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold bg-indigo-50 text-indigo-700 px-3.5 py-1.5 rounded-full border border-indigo-200">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
              🏪 {businessName}
            </span>

            <button className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-2xl relative transition cursor-pointer border border-slate-200/80">
              <Bell className="w-4 h-4" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full"></span>
            </button>

            <button className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-2xl transition cursor-pointer border border-slate-200/80">
              <HelpCircle className="w-4 h-4" />
            </button>

            <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="w-9 h-9 rounded-2xl bg-indigo-100 text-indigo-800 flex items-center justify-center font-extrabold text-xs">
                {userName.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard Overview Content */}
        <main className="p-4 sm:p-6 lg:p-8 flex-1 max-w-7xl w-full mx-auto space-y-8">

          {/* Main Heading & Subtitle */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 font-extrabold text-[10px] uppercase rounded-full">
                  {businessType} • {role}
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Good morning, {userName} 👋
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Here's what's happening with your business today.
              </p>
            </div>

            <div className="flex gap-2">
              <Link
                href="/dashboard/products"
                className="px-5 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-extrabold rounded-2xl text-xs shadow-md shadow-indigo-600/20 transition flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Add Product
              </Link>
            </div>
          </div>

          {/* KPI Cards Grid (4 cards) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-2 hover:shadow-md transition">
              <div className="flex justify-between items-center">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Today's Sales</p>
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <ShoppingCart className="w-4 h-4" />
                </div>
              </div>
              <h3 className="text-2xl font-black text-emerald-600">₹0</h3>
              <p className="text-[11px] text-slate-400 font-medium">No sales yet today</p>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-2 hover:shadow-md transition">
              <div className="flex justify-between items-center">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Orders</p>
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <ReceiptText className="w-4 h-4" />
                </div>
              </div>
              <h3 className="text-2xl font-black text-slate-900">0 Orders</h3>
              <p className="text-[11px] text-slate-400 font-medium">No orders placed</p>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-2 hover:shadow-md transition">
              <div className="flex justify-between items-center">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Products</p>
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Package className="w-4 h-4" />
                </div>
              </div>
              <h3 className="text-2xl font-black text-slate-900">{totalProducts} Products</h3>
              <p className="text-[11px] text-emerald-600 font-bold">Catalog active</p>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-2 hover:shadow-md transition">
              <div className="flex justify-between items-center">
                <p className="text-xs font-bold text-amber-600 uppercase tracking-wider">Low Stock</p>
                <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                  <AlertTriangle className="w-4 h-4" />
                </div>
              </div>
              <h3 className="text-2xl font-black text-amber-600">{lowStockCount} Items</h3>
              <p className="text-[11px] text-amber-700 font-bold">Requires attention</p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">Quick Actions</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <Link
                href="/dashboard/products"
                className="p-4 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200/80 rounded-2xl font-bold text-xs text-slate-800 flex items-center justify-between transition group"
              >
                <span>+ Add Product</span>
                <span className="text-slate-400 group-hover:translate-x-1 transition">→</span>
              </Link>
              <Link
                href="/dashboard/inventory"
                className="p-4 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200/80 rounded-2xl font-bold text-xs text-slate-800 flex items-center justify-between transition group"
              >
                <span>📦 Add Stock</span>
                <span className="text-slate-400 group-hover:translate-x-1 transition">→</span>
              </Link>
              <Link
                href="/dashboard/billing"
                className="p-4 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200/80 rounded-2xl font-bold text-xs text-slate-800 flex items-center justify-between transition group"
              >
                <span>🧾 Create Bill</span>
                <span className="text-slate-400 group-hover:translate-x-1 transition">→</span>
              </Link>
              <Link
                href="/dashboard/staff"
                className="p-4 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200/80 rounded-2xl font-bold text-xs text-slate-800 flex items-center justify-between transition group"
              >
                <span>👥 Add Staff</span>
                <span className="text-slate-400 group-hover:translate-x-1 transition">→</span>
              </Link>
              <Link
                href="/dashboard/delivery"
                className="p-4 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200/80 rounded-2xl font-bold text-xs text-slate-800 flex items-center justify-between transition group"
              >
                <span>🚚 New Delivery</span>
                <span className="text-slate-400 group-hover:translate-x-1 transition">→</span>
              </Link>
            </div>
          </div>

          {/* Inventory Overview & Subscription Card */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Inventory Overview Card */}
            <div className="lg:col-span-2 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="font-extrabold text-slate-900 text-base">Inventory Overview</h3>
                <Link href="/dashboard/inventory" className="text-xs font-bold text-indigo-600 hover:underline">
                  View full inventory →
                </Link>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Total Products</span>
                  <p className="text-xl font-black text-slate-900 mt-1">{totalProducts}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-[10px] text-amber-600 uppercase font-bold">Low Stock</span>
                  <p className="text-xl font-black text-amber-600 mt-1">{lowStockCount}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-[10px] text-rose-600 uppercase font-bold">Out of Stock</span>
                  <p className="text-xl font-black text-rose-600 mt-1">{outOfStockCount}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-[10px] text-emerald-600 uppercase font-bold">Stock Value</span>
                  <p className="text-xl font-black text-emerald-600 mt-1">₹{stockValuation.toLocaleString("en-IN")}</p>
                </div>
              </div>

              {totalProducts === 0 ? (
                <div className="p-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center space-y-3">
                  <div className="w-10 h-10 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto">
                    📦
                  </div>
                  <p className="text-xs font-bold text-slate-800">Your inventory is empty</p>
                  <p className="text-[11px] text-slate-400">Add your first product to start managing your stock.</p>
                  <Link
                    href="/dashboard/products"
                    className="inline-block px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-md transition"
                  >
                    + Add Product
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-slate-400">Recent Products in Catalog:</p>
                  <div className="space-y-2">
                    {recentProducts.map((p) => (
                      <div key={p.id} className="p-3 bg-slate-50 rounded-2xl flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-800">{p.name}</span>
                        <span className="font-bold text-emerald-600">{p.stock_quantity} {p.unit}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Subscription Card */}
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-6">
              <div className="space-y-3">
                <span className="px-3 py-1 bg-emerald-50 text-emerald-700 font-extrabold text-[10px] uppercase tracking-widest rounded-full border border-emerald-200">
                  {subPlan} • ACTIVE
                </span>
                <h3 className="text-xl font-black text-slate-900">Trial remaining: {daysRemaining} days</h3>
                <p className="text-xs text-slate-500">
                  Your trial subscription gives you full access to all T MART ERP features.
                </p>

                {/* Progress bar */}
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${Math.min(100, (daysRemaining / 14) * 100)}%` }}></div>
                </div>
              </div>

              <Link
                href="/dashboard/subscription"
                className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-2xl text-xs text-center transition shadow-md"
              >
                View Subscription
              </Link>
            </div>

          </div>

          {/* Recent Activity */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="font-extrabold text-slate-900 text-base">Recent Activity</h3>
            <div className="p-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center space-y-1">
              <p className="text-xs font-bold text-slate-700">No activity yet</p>
              <p className="text-[11px] text-slate-400">Your sales and inventory activity will appear here.</p>
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}
