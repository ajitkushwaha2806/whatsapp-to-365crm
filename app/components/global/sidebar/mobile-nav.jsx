"use client";

import React from "react";

export function MobileNav({
  activeTab = "leads",
  onTabChange,
  leadsCount = 0,
  sheetsCount = 0,
  teamCount = 0,
  onOpenSidebar,
}) {
  const navItems = [
    {
      id: "leads",
      title: "Live Orders",
      badge: leadsCount > 0 ? leadsCount : null,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
    },
    {
      id: "sheets",
      title: "Reports",
      badge: sheetsCount > 0 ? sheetsCount : null,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
    {
      id: "team",
      title: "Settings",
      badge: teamCount > 0 ? teamCount : null,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 h-16 bg-white/95 backdrop-blur-md border-t border-slate-200 flex items-center justify-around px-2 sm:hidden z-40 shadow-lg">
      {navItems.map((item) => {
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onTabChange && onTabChange(item.id)}
            className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all ${
              isActive ? "text-[#DE5437] font-bold" : "text-slate-400 hover:text-slate-600 font-medium"
            }`}
          >
            <div
              className={`relative flex items-center justify-center w-12 h-7 rounded-full transition-all ${
                isActive ? "bg-orange-50 text-[#DE5437]" : "bg-transparent"
              }`}
            >
              {item.icon}
              {item.badge && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-[#DE5437] text-white text-[9px] font-bold rounded-full flex items-center justify-center shadow-xs">
                  {item.badge}
                </span>
              )}
            </div>
            <span className="text-[10px] leading-none tracking-tight">
              {item.title}
            </span>
          </button>
        );
      })}

      {onOpenSidebar && (
        <button
          type="button"
          onClick={onOpenSidebar}
          className="flex flex-col items-center justify-center flex-1 h-full gap-1 text-slate-400 hover:text-slate-600 transition-all font-medium"
        >
          <div className="flex items-center justify-center w-12 h-7 rounded-full">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
            </svg>
          </div>
          <span className="text-[10px] leading-none tracking-tight">More</span>
        </button>
      )}
    </div>
  );
}

export default MobileNav;
