"use client";

import React from "react";
import { Zap } from "lucide-react";

export function SidebarSubscriptionWidget({
  isExpired = true,
  daysLeft = 7,
  onRenew,
}) {
  return (
    <div className="bg-[#FFF4F2] border border-[#FED7D0] rounded-md p-3 space-y-2 shadow-2xs">
      {/* Header: Warning + Paused Badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[#DE5437] font-semibold text-xs">
          <Zap className="w-3.5 h-3.5 fill-[#DE5437]" />
          <span>Leadio Pro</span>
        </div>
        <span className="text-[9px] font-bold bg-[#D92D20] text-white px-1.5 py-0.5 rounded uppercase tracking-wider">
          PAUSED
        </span>
      </div>

      {/* Description */}
      <p className="text-[11px] text-slate-700 leading-snug">
        WhatsApp lead sync is paused. Upgrade to resume automated submissions.
      </p>

      {/* Renew Button */}
      <button
        type="button"
        onClick={onRenew}
        className="w-full py-1.5 bg-[#D92D20] hover:bg-[#b92418] active:scale-[0.98] text-white font-semibold rounded-md text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
      >
        <span>Upgrade to Pro</span>
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
        </svg>
      </button>
    </div>
  );
}

export default SidebarSubscriptionWidget;
