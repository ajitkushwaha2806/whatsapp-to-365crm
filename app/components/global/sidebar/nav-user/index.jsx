"use client";

import React from "react";
import { Check, LogOut, ShieldCheck, User } from "lucide-react";

export function NavUser({
  user,
  authUser,
  activeUser = "ALL",
  onLogout,
}) {
  const currentUser = user || authUser;
  const isStaff = currentUser?.role === "staff";
  const displayName = currentUser?.name || currentUser?.fullName || "Staff Member";
  const displaySubtitle = currentUser?.phone
    ? `${isStaff ? "Staff" : "Admin"} • ${currentUser.phone}`
    : currentUser?.email || (isStaff ? "Staff Account" : "Admin");

  const initial = displayName ? displayName.charAt(0).toUpperCase() : "U";

  return (
    <div className="bg-white border border-slate-200 rounded-md p-2 flex items-center justify-between gap-2 shadow-2xs hover:border-slate-300 transition-all select-none relative group">
      {/* Left: User Avatar & Info */}
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <div className="w-8 h-8 rounded-md bg-gradient-to-tr from-[#DE5437] to-amber-500 text-white flex items-center justify-center font-bold text-xs shadow-2xs shrink-0">
          {initial}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <span className="font-bold text-xs text-slate-900 truncate">
              {displayName}
            </span>
            {isStaff ? (
              <span className="text-[9px] font-bold px-1.5 py-0.2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded shrink-0">
                Staff
              </span>
            ) : (
              <span className="text-[9px] font-bold px-1.5 py-0.2 bg-orange-50 text-[#DE5437] border border-orange-200 rounded shrink-0">
                Admin
              </span>
            )}
          </div>
          <span className="text-[10px] text-slate-400 truncate block font-medium">
            {displaySubtitle}
          </span>
        </div>
      </div>

      {/* Right: Logout Action */}
      {onLogout && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (confirm(`Log out of ${displayName}'s account?`)) {
              onLogout();
            }
          }}
          className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-md transition-colors cursor-pointer shrink-0"
          title="Sign Out"
        >
          <LogOut className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

export default NavUser;
