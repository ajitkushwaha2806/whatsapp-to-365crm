"use client";

import React from "react";
import { cn } from "@/lib/utils";

export function TableToolbar({
  title,
  subtitle,
  totalCount,
  searchable = false,
  searchPlaceholder = "Search records...",
  searchQuery = "",
  onSearchChange,
  actions,
  searchActions,
  filterTabs,
  activeFilterTab,
  onFilterTabChange,
  selectedCount = 0,
  onClearSelection,
  selectionActions,
  className,
  hideTitleOnMobile = false,
}) {
  const hasSelected = selectedCount > 0;
  const hasHeaderRow = Boolean(title || subtitle || actions || hasSelected);
  const hasFilterRow = Boolean((filterTabs && filterTabs.length > 0) || searchable);

  if (!hasHeaderRow && !hasFilterRow) return null;

  return (
    <div className={cn("flex flex-col gap-3 w-full min-w-0 pb-1", className)}>
      {/* Top Header Row */}
      {(title || subtitle || actions || hasSelected) && (
        <div
          className={cn(
            "flex-col sm:flex-row items-start sm:items-center justify-between gap-3 w-full min-w-0",
            hideTitleOnMobile && !actions && !hasSelected ? "hidden md:flex" : "flex"
          )}
        >
          <div className={cn("min-w-0 flex-1", hideTitleOnMobile && "hidden md:block")}>
            {title && (
              <h3 className="text-base font-bold text-gray-900 tracking-tight flex items-center gap-2">
                <span className="truncate">{title}</span>
                {totalCount !== undefined && totalCount !== null && (
                  <span className="inline-flex items-center shrink-0 rounded-md bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700 border border-gray-200/60">
                    {totalCount}
                  </span>
                )}
              </h3>
            )}
            {subtitle && (
              <p className="text-xs text-gray-500 mt-0.5 line-clamp-2 sm:truncate">
                {subtitle}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-start sm:justify-end min-w-0 shrink-0">
            {hasSelected ? (
              <div className="inline-flex items-center gap-2 bg-[#DE5437]/10 border border-[#DE5437]/20 text-[#DE5437] px-3 py-1.5 rounded-md text-xs font-medium animate-in fade-in duration-150">
                <span>{selectedCount} selected</span>
                {selectionActions}
                {onClearSelection && (
                  <button
                    onClick={onClearSelection}
                    className="ml-1 text-xs opacity-75 hover:opacity-100 underline underline-offset-2 transition-opacity cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>
            ) : (
              actions
            )}
          </div>
        </div>
      )}

      {/* Filter Tabs & Search Bar Row */}
      {(filterTabs || searchable) && (
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 pt-1 w-full min-w-0">
          {filterTabs && filterTabs.length > 0 ? (
            <div className="flex items-center gap-1 p-1 bg-gray-100/80 border border-gray-200/60 rounded-md overflow-x-auto scrollbar-none max-w-full">
              {filterTabs.map((tab) => {
                const isActive = (activeFilterTab || filterTabs[0].value) === tab.value;
                return (
                  <button
                    key={tab.value}
                    onClick={() => onFilterTabChange && onFilterTabChange(tab.value)}
                    className={cn(
                      "px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer whitespace-nowrap shrink-0",
                      isActive
                        ? "bg-white text-gray-900 shadow-2xs font-bold"
                        : "text-gray-500 hover:text-gray-900"
                    )}
                  >
                    {tab.label}
                    {tab.count !== undefined && (
                      <span
                        className={cn(
                          "ml-1.5 px-1.5 py-0.2 rounded-full text-[10px]",
                          isActive ? "bg-gray-100 text-gray-700" : "opacity-60"
                        )}
                      >
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <div />
          )}

          {searchable && (
            <div className="flex items-center gap-2 w-full md:w-auto min-w-0 shrink-0">
              <div className="relative w-full md:w-72 min-w-0 shrink-0 flex-1">
                <div className="relative flex items-center w-full">
                  <svg
                    className="absolute left-3 h-3.5 w-3.5 text-gray-400 pointer-events-none"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  <input
                    type="text"
                    placeholder={searchPlaceholder}
                    value={searchQuery}
                    onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
                    className="w-full h-8.5 pl-8.5 pr-8 text-xs bg-white border border-gray-200 rounded-md text-gray-800 placeholder:text-gray-400 shadow-2xs transition-all outline-none focus:border-[#DE5437] focus:ring-2 focus:ring-[#DE5437]/15"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => onSearchChange && onSearchChange("")}
                      className="absolute right-2.5 p-0.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
                      title="Clear search"
                    >
                      <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
              {searchActions && <div className="shrink-0">{searchActions}</div>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

