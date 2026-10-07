import React from "react";

interface Props {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
}

export function StatCard({ title, value, subtitle, icon }: Props) {
  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-200 space-y-2 group">
      <div className="flex justify-between items-center">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{title}</p>
        {icon && <div className="p-2.5 bg-slate-50 text-indigo-600 rounded-2xl group-hover:scale-110 transition">{icon}</div>}
      </div>
      <h3 className="text-2xl font-black text-slate-900 tracking-tight">{value}</h3>
      {subtitle && <p className="text-[11px] text-slate-500 font-medium">{subtitle}</p>}
    </div>
  );
}
