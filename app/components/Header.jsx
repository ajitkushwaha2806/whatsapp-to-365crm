"use client";

import React from "react";
import { Zap, Menu, LogOut } from "lucide-react";

export default function Header({
  authUser,
  user,
  userButton,
  activeUser,
  teamMembers,
  onUserChange,
  onOpenAddMember,
  onToggleSidebar,
  onLogout,
}) {
  const currentUser = user || authUser;
  const isStaff = currentUser?.role === "staff";
  const staffDisplayName = currentUser?.name || currentUser?.fullName || activeUser;
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between gap-2 sm:gap-3 shadow-2xs">
      {/* Brand & Sidebar Toggle Button */}
      <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="p-1 -ml-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors cursor-pointer shrink-0"
          title="Toggle Leadio Sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-md overflow-hidden flex items-center justify-center shadow-xs shadow-orange-500/20 shrink-0">
          <img src="/icon48.png" alt="Leadio" className="w-full h-full object-cover" />
        </div>
        <div className="min-w-0">
          <h1 className="text-xs sm:text-sm font-bold text-slate-900 leading-tight flex items-center gap-1.5 truncate">
            <span>Leadio</span>
            <span className="text-[9px] font-bold px-1.5 py-0.2 bg-orange-100 text-[#DE5437] rounded-full uppercase shrink-0">
              Pro
            </span>
          </h1>
          <p className="hidden xs:block text-[10px] text-slate-400 font-medium truncate max-w-[130px]">
            WhatsApp Leads &rarr; Sheets
          </p>
        </div>
      </div>

      {/* User / Role & Logout */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {isStaff ? (
          <div className="bg-emerald-50 border border-emerald-200/80 rounded-md px-2 py-1 flex items-center gap-1.5 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            <span className="font-bold text-xs text-emerald-800 truncate max-w-[110px] sm:max-w-[140px]">
              {staffDisplayName}
            </span>
            <span className="text-[9px] font-bold px-1.5 py-0.2 bg-emerald-100/80 text-emerald-700 rounded shrink-0">
              Staff
            </span>
          </div>
        ) : (
          <div className="bg-slate-100/90 border border-slate-200/80 rounded-md px-2 py-1 flex items-center gap-1 shadow-2xs">
            <span className="text-[11px] text-slate-500 hidden sm:inline">As:</span>
            <select
              value={activeUser}
              onChange={(e) => {
                if (e.target.value === "ADD_NEW") {
                  onOpenAddMember();
                } else {
                  onUserChange(e.target.value);
                }
              }}
              className="bg-transparent font-bold text-xs text-[#DE5437] outline-none cursor-pointer max-w-[105px] xs:max-w-[130px] truncate"
            >
              <option value="ALL">Admin (All Workspaces)</option>
              {teamMembers.length > 0 && (
                <optgroup label="Staff">
                  {teamMembers.map((m, idx) => {
                    const mName = typeof m === "string" ? m : m.name || "";
                    const mKey = typeof m === "string" ? m : m.id || m.name || idx;
                    return (
                      <option key={mKey} value={mName}>
                        {mName}
                      </option>
                    );
                  })}
                </optgroup>
              )}
              <option value="ADD_NEW">+ Add Member...</option>
            </select>
          </div>
        )}

        {userButton ? (
          <div className="scale-90 flex-shrink-0">{userButton}</div>
        ) : (
          onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer shrink-0"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )
        )}
      </div>
    </header>
  );
}
