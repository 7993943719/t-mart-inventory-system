import React from "react";

export function LoadingState() {
  return (
    <div className="py-24 text-center space-y-3">
      <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
      <p className="text-xs font-semibold text-slate-500">Loading T MART module data...</p>
    </div>
  );
}
