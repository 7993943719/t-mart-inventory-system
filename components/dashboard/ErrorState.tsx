import React from "react";
import { AlertCircle } from "lucide-react";

interface Props {
  message: string;
}

export function ErrorState({ message }: Props) {
  return (
    <div className="p-6 bg-rose-50 border border-rose-200 text-rose-700 rounded-3xl text-xs font-bold shadow-xs flex items-center gap-3">
      <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
      <span>{message}</span>
    </div>
  );
}
