"use client";

import React, { useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell/AppShell";
import {
  Boxes,
  Truck,
  TrendingUp,
  CreditCard,
  Settings,
  ChevronRight,
  LogOut,
  Share2,
  MessageCircle,
  Copy,
  Check,
  X,
} from "lucide-react";
import { logout } from "@/app/login/actions";

interface Props {
  businessName: string;
  userName: string;
}

export default function MoreClient({ businessName, userName }: Props) {
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareUrl = "https://t-mart-inventory-system.vercel.app";
  const shareText = "Try TWEB — manage billing, products, and stock in one place.";

  const handleShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "TWEB Inventory & POS",
          text: shareText,
          url: shareUrl,
        });
        return;
      } catch (err) {
        // User cancelled or not supported
      }
    }
    setShareModalOpen(true);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      alert(`Copy link: ${shareUrl}`);
    }
  };

  const handleWhatsApp = () => {
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`;
    window.open(waUrl, "_blank");
  };

  const moreItems = [
    { label: "Inventory", desc: "Track stock levels and adjustments", icon: Boxes, href: "/dashboard/inventory", color: "bg-emerald-50 text-emerald-600" },
    { label: "Delivery", desc: "Manage fulfillment and dispatch", icon: Truck, href: "/dashboard/delivery", color: "bg-cyan-50 text-cyan-600" },
    { label: "Reports", desc: "View business sales & analytics", icon: TrendingUp, href: "/dashboard/reports", color: "bg-teal-50 text-teal-600" },
    { label: "Subscription", desc: "Manage your active subscription plan", icon: CreditCard, href: "/dashboard/subscription", color: "bg-purple-50 text-purple-600" },
    { label: "Settings", desc: "Configure business & security settings", icon: Settings, href: "/dashboard/settings", color: "bg-slate-100 text-slate-700" },
  ];

  return (
    <AppShell businessName={businessName} userName={userName}>
      <div className="space-y-4">
        <div className="space-y-1 px-1">
          <h2 className="text-xl font-black text-slate-900">More Options</h2>
          <p className="text-xs text-slate-500 font-medium">Secondary business management modules & sharing</p>
        </div>

        {/* INVITE & SHARE BANNER */}
        <div
          onClick={handleShare}
          className="p-5 rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-600/20 cursor-pointer flex items-center justify-between hover:scale-[1.01] transition"
        >
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-white/20 rounded-2xl">
              <Share2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-black">Invite & Share App</h3>
              <p className="text-xs text-indigo-100 font-medium">Share TWEB with colleagues & friends</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-white/80" />
        </div>

        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden divide-y divide-slate-100">
          {moreItems.map((item, idx) => {
            const Icon = item.icon;
            return (
              <Link
                key={idx}
                href={item.href}
                className="p-4 sm:p-5 flex items-center justify-between hover:bg-slate-50 transition group"
              >
                <div className="flex items-center gap-3.5">
                  <div className={`p-3 rounded-2xl ${item.color} shadow-xs group-hover:scale-110 transition`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 group-hover:text-indigo-600 transition">{item.label}</h3>
                    <p className="text-xs text-slate-400 font-medium">{item.desc}</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition" />
              </Link>
            );
          })}
        </div>

        <div className="pt-2">
          <form action={logout}>
            <button
              type="submit"
              className="w-full py-4 bg-rose-50 hover:bg-rose-100 text-rose-600 font-black rounded-2xl text-xs flex items-center justify-center gap-2 transition shadow-xs cursor-pointer border border-rose-200"
            >
              <LogOut className="w-4 h-4" /> Logout from TWEB
            </button>
          </form>
        </div>
      </div>

      {/* SHARE MODAL */}
      {shareModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-5 text-center text-xs">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-base font-black text-slate-900">Invite & Share TWEB</h3>
              <button onClick={() => setShareModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer p-1"><X className="w-5 h-5" /></button>
            </div>

            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              {shareText}
            </p>

            <div className="space-y-3 pt-1">
              <button
                onClick={handleWhatsApp}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer min-h-[44px]"
              >
                <MessageCircle className="w-4 h-4" /> Share via WhatsApp
              </button>

              <button
                onClick={handleCopyLink}
                className="w-full py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-black rounded-2xl transition flex items-center justify-center gap-2 cursor-pointer min-h-[44px]"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                {copied ? "Link Copied!" : "Copy Link"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
