"use client";

import React from "react";

export function TableError({ error, onRetry }) {
  return (
    <div className="p-8 text-center space-y-3">
      <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto text-lg">
        ⚠️
      </div>
      <div>
        <h4 className="text-xs font-bold text-slate-900">Failed to load data</h4>
        <p className="text-[11px] text-slate-500 mt-0.5">{error?.message || "An unexpected error occurred"}</p>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-md transition-colors"
        >
          Try Again
        </button>
      )}
    </div>
  );
}

