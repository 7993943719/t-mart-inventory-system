import React from "react";

interface Props {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}

export function SectionCard({ title, action, children }: Props) {
  return (
    <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="font-extrabold text-slate-900 text-base">{title}</h3>
        {action && <div>{action}</div>}
      </div>
      <div>{children}</div>
    </div>
  );
}
