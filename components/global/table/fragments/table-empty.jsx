"use client";

import React from "react";
import { cn } from "@/lib/utils";

export function TableEmpty({
  icon,
  title = "No records found",
  description = "There are no records matching your request.",
  action,
  className,
}) {
  return (
    <div className={cn("p-8 sm:p-12 flex flex-col items-center justify-center text-center w-full", className)}>
      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3 text-xl">
        {icon || "📭"}
      </div>
      <h4 className="text-sm font-bold text-gray-900">{title}</h4>
      <p className="text-xs text-gray-500 mt-1 max-w-sm">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

