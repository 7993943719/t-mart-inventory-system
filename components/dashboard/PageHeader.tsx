import React from "react";

interface Props {
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function PageHeader({ title, description, action }: Props) {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs">
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{title}</h1>
        <p className="text-xs sm:text-sm text-slate-500 font-medium">{description}</p>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
