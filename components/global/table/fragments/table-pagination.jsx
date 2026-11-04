"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { DEFAULT_PAGE_SIZE_OPTIONS, DEFAULT_PAGE_SIZE } from "../helpers/constants";

export function TablePagination({
  currentPage = 1,
  pageSize = DEFAULT_PAGE_SIZE,
  totalItems = 0,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  className,
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(totalItems, currentPage * pageSize);

  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 px-4 sm:px-5 py-3 border-t border-gray-200/80 bg-[#fafbfd]/90 text-xs text-gray-500",
        className
      )}
    >
      {/* Left: Showing entries info + Per page dropdown */}
      <div className="flex items-center justify-between sm:justify-start gap-2.5 sm:gap-3 w-full sm:w-auto">
        <span className="text-xs text-gray-600 whitespace-nowrap">
          Showing{" "}
          <strong className="font-bold text-gray-900">{startItem}</strong>
          {" to "}
          <strong className="font-bold text-gray-900">{endItem}</strong>
          {" of "}
          <strong className="font-bold text-gray-900">{totalItems}</strong>
          {" entries"}
        </span>

        {pageSizeOptions && pageSizeOptions.length > 0 && onPageSizeChange && (
          <div className="flex items-center gap-1.5 border-l border-gray-200 pl-2.5 sm:pl-3 ml-auto sm:ml-0">
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="h-7 px-2 pr-6 text-xs font-semibold rounded-md border border-gray-200 bg-white text-gray-800 shadow-2xs hover:bg-gray-50 outline-none focus:border-[#DE5437] cursor-pointer"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Right: Page navigation buttons [ < ] [ 1 ] [ 2 ] [ > ] */}
      {totalItems > 0 && (
        <div className="flex items-center justify-center sm:justify-end gap-1 sm:gap-1.5 w-full sm:w-auto pt-1 sm:pt-0">
          {/* Previous Page Button */}
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => onPageChange(currentPage - 1)}
            className="h-7 w-7 flex items-center justify-center rounded-md border border-gray-200 hover:bg-white text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs transition-colors cursor-pointer"
            title="Previous Page"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Numbered Page Buttons */}
          <div className="flex items-center gap-1 px-0.5">
            {Array.from({ length: Math.min(totalPages, 5) }).map((_, idx) => {
              let pageNum = idx + 1;
              if (totalPages > 5 && currentPage > 3) {
                pageNum = currentPage - 2 + idx;
                if (pageNum > totalPages) pageNum = totalPages - (4 - idx);
              }

              const isActive = pageNum === currentPage;
              return (
                <button
                  key={`page-btn-${pageNum}`}
                  type="button"
                  onClick={() => onPageChange(pageNum)}
                  className={cn(
                    "flex h-7 min-w-[28px] px-2 items-center justify-center rounded-md text-xs font-semibold transition-all cursor-pointer",
                    isActive
                      ? "bg-[#DE5437] text-white shadow-2xs"
                      : "text-gray-600 hover:bg-gray-100"
                  )}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          {/* Next Page Button */}
          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => onPageChange(currentPage + 1)}
            className="h-7 w-7 flex items-center justify-center rounded-md border border-gray-200 hover:bg-white text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs transition-colors cursor-pointer"
            title="Next Page"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

