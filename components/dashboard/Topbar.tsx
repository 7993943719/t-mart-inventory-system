"use client";

import React from "react";
import { Search, Bell, HelpCircle, Menu } from "lucide-react";

interface Props {
  businessName: string;
  userName: string;
  onOpenMobileMenu: () => void;
  pageTitle?: string;
  breadcrumb?: string;
}

export function Topbar({ businessName, userName, onOpenMobileMenu, pageTitle = "Dashboard", breadcrumb = "Home / Overview" }: Props) {
  return (
    <header className="bg-blue-950/80 backdrop-blur-md border-b border-blue-900/50 px-6 py-4 flex items-center justify-between sticky top-0 z-30 shadow-md text-white">
      <div className="flex items-center gap-4 flex-1">
        <button
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 text-indigo-200 hover:bg-blue-900/60 rounded-xl transition cursor-pointer"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden sm:block">
          <h2 className="text-sm font-black text-white leading-tight">{pageTitle}</h2>
          <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider">{breadcrumb}</p>
        </div>

        <div className="relative max-w-md w-full ml-auto sm:ml-4">
          <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-indigo-300 pointer-events-none" />
          <input
            type="text"
            placeholder="Search products, bills, customers..."
            className="w-full pl-10 pr-4 py-2.5 bg-blue-900/40 border border-blue-800/60 rounded-2xl text-xs font-semibold text-white placeholder-indigo-300 outline-none focus:border-cyan-400 focus:bg-blue-900/60 transition"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className="hidden md:inline-flex items-center gap-1.5 text-xs font-bold bg-blue-900/60 text-cyan-200 px-3.5 py-1.5 rounded-full border border-blue-700/50">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
          🏪 {businessName}
        </span>

        <button className="p-2.5 bg-blue-900/40 hover:bg-blue-800/60 text-indigo-200 rounded-2xl relative transition cursor-pointer border border-blue-800/50">
          <Bell className="w-4 h-4" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full"></span>
        </button>

        <button className="p-2.5 bg-blue-900/40 hover:bg-blue-800/60 text-indigo-200 rounded-2xl transition cursor-pointer border border-blue-800/50">
          <HelpCircle className="w-4 h-4" />
        </button>

        <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-blue-900/60">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center font-extrabold text-xs shadow-sm">
            {userName.charAt(0).toUpperCase()}
          </div>
        </div>
      </div>
    </header>
  );
}
