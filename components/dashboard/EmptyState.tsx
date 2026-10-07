import React from "react";

interface Props {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: Props) {
  return (
    <div className="p-12 bg-white rounded-3xl border border-dashed border-slate-200 text-center space-y-3">
      {icon && <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto">{icon}</div>}
      <h3 className="text-sm font-bold text-slate-800">{title}</h3>
      <p className="text-xs text-slate-400 max-w-sm mx-auto">{description}</p>
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
}
