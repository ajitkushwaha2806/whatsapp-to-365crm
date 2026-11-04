"use client";

import React from "react";
import { Zap, Users, Settings, Plug } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";

export default function BottomNav({ leadsCount = 0, teamCount = 0, isStaff = false }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isStaffUser, setIsStaffUser] = React.useState(Boolean(isStaff));

  React.useEffect(() => {
    if (isStaff) {
      setIsStaffUser(true);
      return;
    }
    if (typeof chrome !== "undefined" && chrome?.storage?.local) {
      chrome.storage.local.get(["loggedStaffUser"], (res) => {
        if (res.loggedStaffUser?.role === "staff") {
          setIsStaffUser(true);
        }
      });
    } else if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("loggedStaffUser");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && parsed.role === "staff") {
            setIsStaffUser(true);
          }
        }
      } catch (e) {}
    }
  }, [isStaff]);

  // Staff members do not need bottom navigation at all
  if (isStaff || isStaffUser) {
    return null;
  }

  const isStaffPage = pathname === "/staff" || pathname?.startsWith("/staff");
  const isSettingsPage = pathname === "/settings" || pathname?.startsWith("/settings");
  const isIntegrationsPage = pathname === "/integrations" || pathname?.startsWith("/integrations");
  const isLeadsPage = !isStaffPage && !isSettingsPage && !isIntegrationsPage;

  const tabs = [
    {
      id: "leads",
      label: "Live Leads",
      icon: <Zap className="w-5 h-5" />,
      badge: leadsCount > 0 ? leadsCount : null,
      isActive: isLeadsPage,
      onClick: () => {
        if (!isLeadsPage) router.push("/");
      },
    },
    {
      id: "staff",
      label: "Staff",
      icon: <Users className="w-5 h-5" />,
      badge: teamCount > 0 ? teamCount : null,
      isActive: isStaffPage,
      onClick: () => {
        if (!isStaffPage) router.push("/staff");
      },
    },
    {
      id: "integrations",
      label: "Integrations",
      icon: <Plug className="w-5 h-5" />,
      isActive: isIntegrationsPage,
      onClick: () => {
        if (!isIntegrationsPage) router.push("/integrations");
      },
    },
    {
      id: "settings",
      label: "Settings",
      icon: <Settings className="w-5 h-5" />,
      isActive: isSettingsPage,
      onClick: () => {
        if (!isSettingsPage) router.push("/settings");
      },
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-lg lg:hidden">
      <div className="max-w-md mx-auto px-6 h-15 flex items-center justify-around">
        {tabs.map((tab) => {
          const isActive = tab.isActive;
          return (
            <button
              key={tab.id}
              onClick={tab.onClick}
              className={`flex flex-col items-center justify-center flex-1 py-1 transition-all relative cursor-pointer ${
                isActive ? "text-[#DE5437] font-bold" : "text-slate-400 hover:text-slate-600 font-medium"
              }`}
            >
              <div className="relative">
                {tab.icon}
                {tab.badge && (
                  <span className="absolute -top-1.5 -right-2.5 min-w-[18px] h-[18px] px-1 bg-[#DE5437] text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-xs">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className="text-[11px] mt-0.5 tracking-tight">{tab.label}</span>
              {isActive && (
                <span className="w-1 h-1 rounded-full bg-[#DE5437] mt-0.5 animate-pulse" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
