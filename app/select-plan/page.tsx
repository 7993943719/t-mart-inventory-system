import React from "react";
import Link from "next/link";
import { Store, Check, ArrowRight, Sparkles, Building2, AlertCircle } from "lucide-react";
import { selectBusinessPlanAction } from "./actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SelectPlanPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const errorMsg = params.error;

  const plans = [
    {
      id: "basic",
      name: "Basic",
      price: "₹99",
      period: "/ month",
      desc: "Essential POS billing, product catalog & inventory tracking.",
      popular: false,
    },
    {
      id: "pro",
      name: "Pro",
      price: "₹250",
      period: "/ month",
      desc: "Advanced multi-counter inventory, staff management & daily reports.",
      popular: true,
    },
    {
      id: "plus",
      name: "Plus",
      price: "₹450",
      period: "/ month",
      desc: "Full enterprise features, delivery fulfillment & priority Super Owner support.",
      popular: false,
    },
  ];

  return (
    <main className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4 sm:p-6 lg:p-8 font-sans antialiased">
      <div className="w-full max-w-4xl bg-slate-950 rounded-3xl border border-slate-800 p-6 sm:p-10 space-y-8 shadow-2xl">
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-800 pb-6 gap-4">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 font-extrabold text-xs uppercase tracking-widest">
              <Sparkles className="w-4 h-4" /> 3-Day Free Trial Activated
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white mt-1">
              Select Preferred Plan
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Select a plan preference for your business. Payment is not collected today.
            </p>
          </div>

          <Link
            href="/dashboard?success=business_created"
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-extrabold text-xs rounded-xl transition flex items-center gap-1.5 min-h-[44px]"
          >
            Skip for now →
          </Link>
        </div>

        {errorMsg && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-2xl text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" /> {decodeURIComponent(errorMsg)}
          </div>
        )}

        {/* PLAN CARDS GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {plans.map((p) => {
            return (
              <div
                key={p.id}
                className="p-6 rounded-2xl border-2 border-slate-800 bg-slate-900/50 hover:border-slate-700 transition space-y-5 flex flex-col justify-between relative"
              >
                {p.popular && (
                  <span className="absolute -top-3 right-4 px-2.5 py-0.5 bg-indigo-600 text-white font-black text-[9px] uppercase rounded-full tracking-widest shadow-xs">
                    Most Popular
                  </span>
                )}

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-black text-indigo-400 uppercase tracking-wider">
                      {p.name}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-2xl sm:text-3xl font-black text-white">
                      {p.price}{" "}
                      <span className="text-xs font-medium text-slate-400">
                        {p.period}
                      </span>
                    </h3>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed font-medium">
                    {p.desc}
                  </p>
                </div>

                <form action={selectBusinessPlanAction}>
                  <input type="hidden" name="planId" value={p.id} />
                  <button
                    type="submit"
                    className="w-full py-3 text-xs font-black rounded-xl transition cursor-pointer min-h-[44px] flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20"
                  >
                    Select {p.name} Plan
                  </button>
                </form>
              </div>
            );
          })}
        </div>

        {/* FOOTER ACTION */}
        <div className="flex flex-col sm:flex-row justify-between items-center pt-4 border-t border-slate-800 gap-4 text-xs text-slate-400 font-medium">
          <p>
            Your 3-day free trial gives you full access to test all TWEB features.
          </p>
          <Link
            href="/dashboard?success=business_created"
            className="text-xs font-bold text-indigo-400 hover:text-indigo-300 underline flex items-center gap-1"
          >
            Continue to Dashboard →
          </Link>
        </div>
      </div>
    </main>
  );
}
