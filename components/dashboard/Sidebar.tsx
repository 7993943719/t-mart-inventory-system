"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/login/actions";
import {
  Store,
  Home,
  Package,
  ReceiptText,
  ShoppingCart,
  Users,
  TrendingUp,
  Boxes,
  UserCheck,
  Truck,
  LogOut,
} from "lucide-react";

interface Props {
  businessName: string;
  userName: string;
  role: string;
}

export function Sidebar({ businessName, userName, role }: Props) {
  const pathname = usePathname();

  const navItems = [
    { label: "Home", icon: Home, href: "/dashboard", color: "text-blue-400" },
    { label: "Products", icon: Package, href: "/dashboard/products", color: "text-indigo-400" },
    { label: "New Bill", icon: ReceiptText, href: "/dashboard/billing", color: "text-cyan-400" },
    { label: "Bills", icon: ShoppingCart, href: "/dashboard/sales", color: "text-purple-400" },
    { label: "Customers", icon: UserCheck, href: "/dashboard/customers", color: "text-emerald-400" },
    { label: "Vendors", icon: Truck, href: "/dashboard/purchases", color: "text-orange-400" },
    { label: "Stock", icon: Boxes, href: "/dashboard/stock", color: "text-teal-400" },
    { label: "Staff", icon: Users, href: "/dashboard/staff", color: "text-amber-400" },
  ];

  return (
    <aside className="hidden lg:flex flex-col w-72 bg-slate-950 text-slate-200 border-r border-blue-900/40 p-5 shrink-0 shadow-2xl justify-between">
      <div className="space-y-6">
        {/* TWEB Logo */}
        <div className="flex items-center gap-3 px-2">
          <div className="p-3 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl text-white shadow-lg shadow-indigo-600/30">
            <Store className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-black text-base text-white tracking-wider">TWEB</h1>
            <p className="text-[10px] text-indigo-300 font-bold uppercase tracking-widest">Supermarket POS</p>
          </div>
        </div>

        {/* Business Switcher */}
        <div className="px-3.5 py-3 bg-blue-950/80 rounded-2xl border border-blue-900/50 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0 border border-indigo-500/20">
              🏪
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Business</p>
              <p className="text-xs font-black text-white truncate">{businessName}</p>
            </div>
          </div>
          <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 font-black text-[9px] uppercase rounded-full">
            {role}
          </span>
        </div>

        {/* 8 Navigation Items */}
        <nav className="space-y-1.5 overflow-y-auto max-h-[calc(100vh-320px)] pr-1">
          {navItems.map((item, idx) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={idx}
                href={item.href}
                className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl font-bold text-xs transition-all duration-200 group min-h-[44px] ${
                  isActive
                    ? "bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-600/30 font-black"
                    : "hover:bg-blue-950/60 text-slate-300 hover:text-white"
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-white" : `${item.color} group-hover:scale-110 transition`}`} />
                <span className="truncate text-sm">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom User Info & Logout */}
      <div className="pt-4 border-t border-blue-900/40 space-y-3">
        <div className="px-3.5 py-3 bg-blue-950/60 rounded-2xl border border-blue-900/40 flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-black text-xs shrink-0 border border-indigo-500/30">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black text-slate-100 truncate">{userName}</p>
            <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest">{role}</p>
          </div>
        </div>

        <form action={logout}>
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 py-3 bg-rose-600/10 hover:bg-rose-600 text-rose-400 hover:text-white font-extrabold text-xs rounded-2xl transition-all shadow-xs cursor-pointer min-h-[44px]"
          >
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </form>
      </div>
    </aside>
  );
}
