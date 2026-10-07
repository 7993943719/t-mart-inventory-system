"use client";

import React, { useState } from "react";
import { createBusiness } from "./actions";
import { Store, Building, ArrowRight, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

export default function CreateBusinessPage({
  searchParams,
}: {
  searchParams?: { error?: string; message?: string };
}) {
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    setLoading(true);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-900 via-indigo-900 to-purple-950 flex items-center justify-center p-4 sm:p-6 font-sans antialiased relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-[440px] bg-white rounded-[24px] shadow-2xl border border-slate-100 p-6 sm:p-10 relative z-10 space-y-6">
        {/* Top Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex p-3.5 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl text-white shadow-lg shadow-indigo-600/30">
            <Store className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="font-black text-xl tracking-wider text-slate-900">T MART</h1>
            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Business Setup</p>
          </div>
        </div>

        {/* Heading & Subtext */}
        <div className="text-center space-y-1">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Create Your Business</h2>
          <p className="text-xs text-slate-500 font-medium">Set up your business to get started</p>
        </div>

        {searchParams?.error && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold shadow-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{searchParams.error}</span>
          </div>
        )}

        {searchParams?.message && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-bold shadow-xs flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{searchParams.message}</span>
          </div>
        )}

        {/* Form */}
        <form action={createBusiness} onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Business Name *</label>
            <div className="relative">
              <Building className="w-4 h-4 absolute left-4 top-4 text-slate-400 pointer-events-none" />
              <input
                name="name"
                type="text"
                required
                className="w-full pl-11 pr-4 h-[52px] bg-slate-50/80 border border-slate-200 rounded-[12px] text-xs font-semibold text-slate-800 outline-none focus:border-indigo-600 focus:bg-white focus:ring-4 focus:ring-indigo-600/10 transition shadow-xs"
                placeholder="Enter your business name"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{ width: "100%", height: "52px", background: "linear-gradient(135deg, #2563eb 0%, #4f46e5 50%, #7c3aed 100%)", color: "#ffffff", fontWeight: 900, fontSize: "13px", borderRadius: "12px", border: "none", cursor: "pointer", boxShadow: "0 10px 20px -5px rgba(79, 70, 229, 0.4)", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", transition: "transform 0.1s ease, opacity 0.2s ease", marginTop: "4px" }}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Creating business...
              </>
            ) : (
              <>
                Create Business <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </main>
  );
}
