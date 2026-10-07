"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Store, Home, ReceiptText, Package, Users, MoreHorizontal, Bell, ChevronDown } from "lucide-react";

interface Props {
  businessName: string;
  userName: string;
  children: React.ReactNode;
}

export function MobileBusinessAppShell({ businessName, userName, children }: Props) {
  const pathname = usePathname();

  const bottomNavItems = [
    { label: "Home", icon: Home, href: "/dashboard", color: "text-blue-600 bg-blue-50" },
    { label: "Billing", icon: ReceiptText, href: "/dashboard/billing", color: "text-indigo-600 bg-indigo-50" },
    { label: "Products", icon: Package, href: "/dashboard/products", color: "text-purple-600 bg-purple-50" },
    { label: "Staff", icon: Users, href: "/dashboard/staff", color: "text-amber-600 bg-amber-50" },
    { label: "More", icon: MoreHorizontal, href: "/dashboard/more", color: "text-emerald-600 bg-emerald-50" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans antialiased text-slate-900 pb-24 sm:pb-8">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200/80 px-4 sm:px-6 py-3.5 flex items-center justify-between sticky top-0 z-40 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 rounded-2xl text-white shadow-md shadow-indigo-600/20">
            <Store className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-black text-sm tracking-wider text-slate-900 leading-tight">T MART</h1>
            <button className="flex items-center gap-1 text-[11px] font-extrabold text-blue-600 hover:text-blue-800 transition cursor-pointer">
              <span>{businessName}</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl relative transition cursor-pointer">
            <Bell className="w-4 h-4" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full"></span>
          </button>
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-black text-xs shadow-md shadow-indigo-600/20">
            {userName.charAt(0).toUpperCase()}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {children}
      </main>

      {/* Bottom Navigation ONLY */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200/80 px-3 py-2 flex items-center justify-around z-50 shadow-2xl max-w-lg mx-auto sm:rounded-t-3xl sm:bottom-3 sm:border sm:shadow-xl">
        {bottomNavItems.map((item, idx) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={idx}
              href={item.href}
              className={`flex flex-col items-center gap-1 py-1.5 px-3.5 rounded-2xl transition-all duration-200 group ${
                isActive ? `${item.color} font-black scale-105 shadow-2xs` : "text-slate-400 hover:text-slate-700 font-bold"
              }`}
            >
              <Icon className={`w-5 h-5 transition ${isActive ? "scale-110" : "text-slate-400 group-hover:scale-110"}`} />
              <span className="text-[10px] tracking-tight">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
