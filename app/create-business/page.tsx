"use client";

export const dynamic = "force-dynamic";

import React, { useState, Suspense } from "react";
import { createBusiness } from "./actions";
import { useSearchParams } from "next/navigation";
import {
  Store,
  Building,
  ArrowRight,
  AlertCircle,
  Loader2,
  Phone,
  CheckCircle2,
  Sparkles,
} from "lucide-react";

function CreateBusinessContent() {
  const searchParams = useSearchParams();
  const errorMsg = searchParams.get("error");
  const [loading, setLoading] = useState(false);
  const [phone, setPhone] = useState("+91 ");
  const [selectedPlan, setSelectedPlan] = useState<"basic" | "pro" | "plus">("basic");

  const plans = [
    {
      id: "basic",
      name: "Basic",
      price: "₹99",
      period: "/ month",
      desc: "Essential POS billing & stock inventory management",
      trial: "Includes 3 Days Free Trial",
    },
    {
      id: "pro",
      name: "Pro",
      price: "₹250",
      period: "/ month",
      desc: "Multi-counter inventory, staff permissions & reports",
      trial: "Includes 3 Days Free Trial",
    },
    {
      id: "plus",
      name: "Plus",
      price: "₹450",
      period: "/ month",
      desc: "Enterprise features, delivery fulfillment & VIP support",
      trial: "Includes 3 Days Free Trial",
    },
  ];

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    const formData = new FormData(e.currentTarget);
    const name = String(formData.get("name") ?? "").trim();
    const phoneInput = String(formData.get("phone") ?? "").trim();

    if (!name) {
      e.preventDefault();
      alert("Please enter your business name.");
      return;
    }

    if (!phoneInput || phoneInput.length < 10) {
      e.preventDefault();
      alert("Please enter a valid owner mobile phone number.");
      return;
    }

    setLoading(true);
  };

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6 lg:p-8 font-sans antialiased text-slate-900">
      <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden p-8 sm:p-12 space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-lg">
            <Store className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-black text-xl tracking-wider text-slate-900">
              TWEB
            </h1>
            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">
              Business Management Platform
            </p>
          </div>
        </div>

        <div className="space-y-1.5 pt-4">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Register Your Business 👋
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Enter your business details below to start your 3-day free trial.
          </p>
        </div>

        {errorMsg && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-bold shadow-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form
          action={createBusiness}
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Business Name *
            </label>
            <div className="relative">
              <Building className="w-4 h-4 absolute left-4 top-4 text-slate-400 pointer-events-none" />
              <input
                name="name"
                type="text"
                required
                className="w-full pl-11 pr-4 h-[52px] bg-slate-50/80 border border-slate-200 rounded-[12px] text-xs font-semibold text-slate-800 outline-none focus:border-blue-600 focus:bg-white transition shadow-xs"
                placeholder="e.g. Pavan Supermarket"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Owner Mobile Number *
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 absolute left-4 top-4 text-slate-400 pointer-events-none" />
              <input
                name="phone"
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full pl-11 pr-4 h-[52px] bg-slate-50/80 border border-slate-200 rounded-[12px] text-xs font-semibold text-slate-800 outline-none focus:border-blue-600 focus:bg-white transition shadow-xs font-mono"
                placeholder="+91 9876543210"
              />
            </div>
            <p className="text-[10px] text-slate-400 font-medium">Used for Super Owner support and billing verification.</p>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Business Type *
            </label>
            <select
              name="business_type"
              required
              className="w-full px-4 h-[52px] bg-slate-50/80 border border-slate-200 rounded-[12px] text-xs font-semibold text-slate-800 outline-none focus:border-blue-600 focus:bg-white transition shadow-xs cursor-pointer"
            >
              <option value="Grocery">Grocery</option>
              <option value="Retail">Retail</option>
              <option value="Wholesale">Wholesale</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* INFORMATIONAL PLAN SELECTION CARDS (3-Day Trial Included) */}
          <div className="space-y-2 pt-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" /> Plan Overview (3-Day Free Trial)
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {plans.map((p) => {
                const isSelected = selectedPlan === p.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => setSelectedPlan(p.id as any)}
                    className={`p-3.5 rounded-2xl border-2 cursor-pointer transition space-y-2 flex flex-col justify-between ${
                      isSelected
                        ? "border-blue-600 bg-blue-50/50 shadow-xs"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="font-black text-xs text-slate-900">{p.name}</span>
                        {isSelected && (
                          <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">
                            ✓
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-black text-blue-600">{p.price} <span className="text-[10px] text-slate-500 font-normal">{p.period}</span></p>
                      <p className="text-[10px] text-slate-500 leading-tight font-medium">{p.desc}</p>
                    </div>
                    <span className="text-[9px] font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full inline-block">
                      {p.trial}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-[52px] bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-black rounded-[12px] text-xs shadow-xl shadow-blue-600/20 transition flex items-center justify-center gap-2 cursor-pointer mt-4"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Registering Business & Starting 3-Day Trial...
              </>
            ) : (
              <>
                Start 3-Day Free Trial
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="pt-2 text-center border-t border-slate-100">
          <p className="text-[11px] text-slate-400 font-medium">
            TWEB • Business Management Platform
          </p>
        </div>
      </div>
    </main>
  );
}

export default function CreateBusinessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center text-xs font-bold text-slate-400">
          Loading...
        </div>
      }
    >
      <CreateBusinessContent />
    </Suspense>
  );
}
