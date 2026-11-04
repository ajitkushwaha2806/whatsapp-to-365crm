"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  FileSpreadsheet,
  Building2,
  Check,
  Plus,
  Search,
  ChevronDown,
  Copy,
  Hash,
  Users,
  Settings,
} from "lucide-react";
import { formatSheetId, formatWorkspaceId } from "../../helpers/formUrl";

export function RestaurantSwitcher({
  workspaces = [],
  activeWorkspace,
  activeWorkspaceId,
  onWorkspaceChange,
  sheets = [],
  activeSheet,
  activeSheetId,
  onSheetChange,
  onOpenAddSheet,
  onOpenAddWorkspace,
  onOpenEditSheet,
  canAddSheet = true,
  className = "",
  label = "Active Workspace",
  isStaff = false,
  currentUser = null,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState(null);
  const containerRef = useRef(null);

  // Close popup when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Determine items: prioritize workspaces
  const isWorkspaceMode = Array.isArray(workspaces) && workspaces.length > 0;
  const items = isWorkspaceMode ? workspaces : sheets;

  // Filter items by name or code
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase();
    return items.filter((item) => {
      const name = (item.name || "").toLowerCase();
      const code = (item.workspaceCode || item.id || "").toLowerCase();
      return name.includes(q) || code.includes(q);
    });
  }, [items, searchQuery]);

  const fallbackInfo = useMemo(() => {
    if (currentUser?.workspaceName || currentUser?.companyName) {
      return {
        name: currentUser.workspaceName || currentUser.companyName,
        code: currentUser.workspaceCode || "WS-1001",
      };
    }
    if (typeof window !== "undefined") {
      try {
        const u = JSON.parse(localStorage.getItem("loggedStaffUser") || "{}");
        if (u.workspaceName || u.companyName) {
          return {
            name: u.workspaceName || u.companyName,
            code: u.workspaceCode || "WS-1001",
          };
        }
      } catch {}
    }
    return null;
  }, [currentUser]);

  // Current selected item
  const currentItem = useMemo(() => {
    if (isWorkspaceMode) {
      if (activeWorkspace) return activeWorkspace;
      if (activeWorkspaceId) {
        const found = workspaces.find((w) => w.id === activeWorkspaceId || w.workspaceCode === activeWorkspaceId);
        if (found) return found;
      }
      return workspaces[0] || null;
    }
    if (activeWorkspace) return activeWorkspace;
    return activeSheet || sheets.find((s) => s.id === activeSheetId) || sheets[0] || null;
  }, [isWorkspaceMode, workspaces, activeWorkspace, activeWorkspaceId, sheets, activeSheet, activeSheetId]);

  const currentCode = currentItem?.workspaceCode || activeWorkspace?.workspaceCode || fallbackInfo?.code || formatWorkspaceId(currentItem) || "WS-1001";
  const currentName = currentItem?.name || activeWorkspace?.name || fallbackInfo?.name || "Hero Motors";

  const handleSelect = (item) => {
    const targetId = item.id || item._id;
    if (isWorkspaceMode) {
      if (onWorkspaceChange) onWorkspaceChange(targetId, item);
      if (onSheetChange && item.integrations?.googleSheets?.[0]?.id) {
        onSheetChange(item.integrations.googleSheets[0].id);
      }
    } else {
      if (onSheetChange) onSheetChange(targetId, item);
    }
    setIsOpen(false);
  };

  return (
    <div className={`relative w-full ${className}`} ref={containerRef}>
      {/* Active Workspace Trigger Card */}
      <div
        onClick={() => {
          if (!isStaff) setIsOpen((prev) => !prev);
        }}
        className={`bg-white border rounded-xl p-2.5 flex items-center justify-between gap-2.5 shadow-2xs transition-all select-none ${
          isStaff ? "cursor-default border-slate-200" : "cursor-pointer group hover:shadow-xs " + (isOpen ? "border-[#DE5437] ring-2 ring-orange-500/10" : "border-slate-200 hover:border-slate-300")
        }`}
      >
        {/* Thumbnail & Info */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="w-8 h-8 rounded-lg bg-orange-50 border border-orange-200/80 overflow-hidden flex items-center justify-center flex-shrink-0 shadow-2xs group-hover:scale-102 transition-transform text-[#DE5437]">
            <Building2 className="w-4 h-4" />
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="font-bold text-xs text-slate-900 leading-tight truncate">
              {currentName}
            </h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-emerald-500" />
              <span className="text-[10px] text-slate-500 font-mono font-medium truncate">
                {currentCode}
              </span>
              {isWorkspaceMode && currentItem && (
                <span className="text-[10px] text-slate-400">
                  • {currentItem.staff?.length || 0} staff
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Down Chevron / Staff Badge */}
        {!isStaff ? (
          <div className="text-slate-400 group-hover:text-slate-600 transition-transform pr-1 flex-shrink-0">
            <ChevronDown className={`w-4 h-4 transition-transform duration-150 ${isOpen ? "rotate-180 text-[#DE5437]" : ""}`} />
          </div>
        ) : (
          <span className="text-[9px] font-bold text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded-md shrink-0">
            Active
          </span>
        )}
      </div>

      {/* Popover Dropdown Menu */}
      {isOpen && !isStaff && (
        <div className="absolute left-0 right-0 top-full mt-1.5 w-full min-w-[280px] max-w-sm z-50 bg-white border border-slate-200 rounded-xl shadow-2xl p-3 animate-in fade-in duration-150">
          
          {/* Popover Header */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
            <div className="flex items-center gap-1.5 text-slate-500 font-bold text-[10px] uppercase tracking-wider">
              <Building2 className="w-3.5 h-3.5 text-[#DE5437]" />
              <span>YOUR WORKSPACES</span>
            </div>

            <span className="px-2 py-0.5 rounded-full bg-orange-50 text-[#DE5437] font-bold text-[10px] border border-orange-200/60 font-mono">
              {items.length}
            </span>
          </div>

          {/* Search Input Bar */}
          {items.length > 2 && (
            <div className="relative mb-2">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Workspaces..."
                className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-800 outline-none focus:bg-white focus:border-[#DE5437] transition-all shadow-2xs font-medium"
                autoFocus
              />
            </div>
          )}

          {/* Workspaces List */}
          <div className="space-y-1.5 max-h-64 overflow-y-auto custom-scrollbar pr-0.5">
            {filteredItems.length === 0 ? (
              <div className="text-center py-5 text-xs text-slate-400">
                {searchQuery
                  ? `No workspaces found matching "${searchQuery}"`
                  : "No Workspaces added yet"}
              </div>
            ) : (
              filteredItems.map((item) => {
                const itemId = item.id || item._id;
                const currentItemId = activeWorkspaceId || currentItem?.id || currentItem?._id;
                const currentItemName = (currentItem?.name || "").trim().toLowerCase();
                const itemName = (item?.name || "").trim().toLowerCase();

                // Exactly ONE workspace is active at a time:
                // Matches the unique ID or the unique workspace name
                const isSelected = Boolean(
                  currentItem && (
                    (currentItemId && itemId && currentItemId === itemId && (!currentItemName || currentItemName === itemName)) ||
                    (currentItemName && itemName && currentItemName === itemName)
                  )
                );
                const code = item.workspaceCode || formatWorkspaceId(item);
                const staffCount = item.staff?.length || 0;
                const sheetsCount = item.integrations?.googleSheets?.length || 0;

                return (
                  <div
                    key={itemId}
                    onClick={() => handleSelect(item)}
                    className={`w-full p-2.5 rounded-lg flex items-center justify-between gap-2.5 transition-all cursor-pointer ${
                      isSelected
                        ? "bg-orange-50/70 border border-orange-200/80 shadow-2xs"
                        : "hover:bg-slate-50 border border-transparent"
                    }`}
                  >
                    {/* Icon & Details */}
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 shadow-2xs ${
                          isSelected
                            ? "bg-white border border-orange-200 text-[#DE5437]"
                            : "bg-slate-100 border border-slate-200/80 text-slate-500"
                        }`}
                      >
                        <Building2 className="w-3.5 h-3.5" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <h4
                          className={`text-xs font-semibold truncate leading-tight ${
                            isSelected ? "text-[#DE5437] font-bold" : "text-slate-900"
                          }`}
                        >
                          {item.name}
                        </h4>
                        
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              navigator.clipboard.writeText(code);
                              setCopiedId(code);
                              setTimeout(() => setCopiedId(null), 2000);
                            }}
                            className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-white hover:bg-orange-100 text-slate-700 hover:text-[#DE5437] border border-slate-200 font-mono transition-colors inline-flex items-center gap-1 cursor-pointer"
                            title="Click to copy Workspace ID for staff login"
                          >
                            <Hash className="w-2.5 h-2.5 text-[#DE5437]" />
                            <span>{code}</span>
                            {copiedId === code ? (
                              <Check className="w-2.5 h-2.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-2.5 h-2.5 text-slate-400" />
                            )}
                          </button>

                          <span className="text-[10px] text-slate-400 font-medium">
                            • {staffCount} staff • {sheetsCount} sheets
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Checkmark for Selected Workspace */}
                    {isSelected && (
                      <div className="w-5 h-5 rounded-md bg-orange-100 text-[#DE5437] flex items-center justify-center flex-shrink-0 shadow-2xs">
                        <Check className="w-3 h-3 stroke-[2.5]" />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Bottom Actions (+ Create Workspace) */}
          {(canAddSheet && (onOpenAddWorkspace || onOpenAddSheet)) && (
            <div className="pt-2 mt-2 border-t border-slate-100 flex items-center gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsOpen(false);
                  if (onOpenAddWorkspace) {
                    onOpenAddWorkspace();
                  } else if (onOpenAddSheet) {
                    onOpenAddSheet();
                  }
                }}
                className="flex-1 py-1.5 bg-slate-50 hover:bg-orange-50 text-slate-700 hover:text-[#DE5437] border border-slate-200 hover:border-orange-200 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Create Workspace</span>
              </button>
            </div>
          )}

        </div>
      )}
    </div>
  );
}

export const SheetSwitcher = RestaurantSwitcher;
export default RestaurantSwitcher;
