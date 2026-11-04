"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { getCellValue } from "../helpers";

export function TableMobileCards({
  columns = [],
  data = [],
  selectable = false,
  selectedRows = new Set(),
  onSelectRow,
  getRowId,
  onRowClick,
  renderMobileCard,
  className,
}) {
  return (
    <div className={cn("p-3 space-y-2.5", className)}>
      {data.map((row, rIdx) => {
        const rowId = getRowId ? getRowId(row, rIdx) : rIdx;
        const isSelected = selectedRows.has(rowId);

        if (renderMobileCard) {
          return (
            <div key={rowId} onClick={() => onRowClick && onRowClick(row)}>
              {renderMobileCard(row, rIdx)}
            </div>
          );
        }

        return (
          <div
            key={rowId}
            onClick={() => onRowClick && onRowClick(row)}
            className={cn(
              "p-3.5 bg-white border border-slate-200 rounded-md shadow-2xs space-y-2 transition-all",
              isSelected && "border-[#DE5437] ring-1 ring-[#DE5437]/20 bg-orange-50/10"
            )}
          >
            {columns.map((col, cIdx) => {
              const value = getCellValue(row, col);
              const header = typeof col.header === "string" ? col.header : col.title || col.label || "";

              return (
                <div key={cIdx} className="flex items-center justify-between text-xs py-0.5">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    {header}
                  </span>
                  <div className="font-medium text-slate-900 text-right">
                    {col.render
                      ? col.render(row, rIdx, col)
                      : col.cell
                      ? col.cell(value, row, rIdx)
                      : value !== null && value !== undefined
                      ? String(value)
                      : "—"}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

