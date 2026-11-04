"use client";

import React from "react";
import { TableRow, TableCell } from "./table-primitives";

export function TableSkeleton({ columnsCount = 4, rows = 5 }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rIdx) => (
        <TableRow key={`skeleton-row-${rIdx}`}>
          {Array.from({ length: columnsCount }).map((_, cIdx) => (
            <TableCell key={`skeleton-cell-${rIdx}-${cIdx}`}>
              <div className="h-4 bg-slate-100 rounded animate-pulse w-3/4" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

export function TableMobileCardSkeleton({ rows = 3 }) {
  return (
    <div className="p-3 space-y-3">
      {Array.from({ length: rows }).map((_, idx) => (
        <div key={`mobile-skeleton-${idx}`} className="p-4 bg-white border border-slate-200 rounded-md space-y-2.5">
          <div className="h-4 bg-slate-100 rounded w-1/3 animate-pulse" />
          <div className="h-3 bg-slate-100 rounded w-2/3 animate-pulse" />
        </div>
      ))}
    </div>
  );
}

