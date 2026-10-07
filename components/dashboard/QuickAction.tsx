import React from "react";
import Link from "next/link";

interface Props {
  label: string;
  href: string;
  icon?: React.ReactNode;
}

export function QuickAction({ label, href, icon }: Props) {
  return (
    <Link
      href={href}
      className="p-4 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200/80 rounded-2xl font-bold text-xs text-slate-800 flex items-center justify-between transition group shadow-xs"
    >
      <span className="flex items-center gap-2">
        {icon}
        {label}
      </span>
      <span className="text-slate-400 group-hover:translate-x-1 transition">→</span>
    </Link>
  );
}
