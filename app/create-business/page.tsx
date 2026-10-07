"use client";

import React, { useState } from "react";
import { createBusiness } from "./actions";
import {
  Store,
  Building,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Sparkles,
  ShieldCheck,
} from "lucide-react";

export default function CreateBusinessPage({
  searchParams,
}: {
  searchParams?: { error?: string; message?: string };
}) {
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    const formData = new FormData(e.currentTarget);
    const name = String(formData.get("name") ?? "").trim();
    if (!name) {
      e.preventDefault();
      alert("Please enter your business name.");
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
            <h1 className="font-black text-xl tracking-wider text-slate-900">TWEB</h1>
            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">Business Management Platform</p>
          </div>
        </div>

        <div className="space-y-1.5 pt-4">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Welcome to TWEB 👋</h2>
          <p className="text-xs text-slate-500 font-medium">Set up your business to get started.</p>
        </div>

        {searchParams?.error && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-bold shadow-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{searchParams.error}</span>
          </div>
        )}

        <form action={createBusiness} onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Business Name *</label>
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
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Business Type *</label>
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

          <button
            type="submit"
            disabled={loading}
            className="w-full h-[52px] bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-black rounded-[12px] text-xs shadow-xl shadow-blue-600/20 transition flex items-center justify-center gap-2 cursor-pointer mt-4"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Creating Business...
              </>
            ) : (
              <>
                Create Business →
              </>
            )}
          </button>
        </form>

        <div className="pt-2 text-center border-t border-slate-100">
          <p className="text-[11px] text-slate-400 font-medium">
            Your business will start with a 3-day free trial.
          </p>
        </div>
      </div>
    </main>
  );
}
