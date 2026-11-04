"use client";

import React from "react";
import { Zap, Users, Settings, Plug } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";

export function NavMain({
  leadsCount = 0,
  teamCount = 0,
  onCloseMobile,
  title = "MANAGE",
  isStaff = false,
}) {
  const router = useRouter();
  const pathname = usePathname();

  const isStaffPage = pathname === "/staff" || pathname?.startsWith("/staff");
  const isSettingsPage = pathname === "/settings" || pathname?.startsWith("/settings");
  const isIntegrationsPage = pathname === "/integrations" || pathname?.startsWith("/integrations");
  const isLeadsPage = !isStaffPage && !isSettingsPage && !isIntegrationsPage;

  const leadioNavItems = [
    {
      id: "leads",
      label: "Live Leads",
      badge: leadsCount > 0 ? leadsCount : null,
      icon: <Zap className="w-4.5 h-4.5" />,
      isActive: isLeadsPage,
      onClick: () => {
        if (!isLeadsPage) {
          router.push("/");
        }
      },
    },
    ...(!isStaff
      ? [
          {
            id: "staff",
            label: "Staff",
            badge: teamCount > 0 ? teamCount : null,
            icon: <Users className="w-4.5 h-4.5" />,
            isActive: isStaffPage,
            onClick: () => {
              if (!isStaffPage) {
                router.push("/staff");
              }
            },
          },
          {
            id: "integrations",
            label: "Integrations",
            icon: <Plug className="w-4.5 h-4.5" />,
            isActive: isIntegrationsPage,
            onClick: () => {
              if (!isIntegrationsPage) {
                router.push("/integrations");
              }
            },
          },
          {
            id: "settings",
            label: "Settings",
            icon: <Settings className="w-4.5 h-4.5" />,
            isActive: isSettingsPage,
            onClick: () => {
              if (!isSettingsPage) {
                router.push("/settings");
              }
            },
          },
        ]
      : []),
  ];

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {title && (
        <div className="px-5 pt-3 pb-1.5">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            {title}
          </span>
        </div>
      )}

      <nav className="flex-1 px-3 space-y-1 overflow-y-auto custom-scrollbar">
        {leadioNavItems.map((item) => {
          const isActive = item.isActive;

          return (
            <button
              key={item.id}
              onClick={() => {
                item.onClick();
                if (onCloseMobile) onCloseMobile();
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-md text-xs font-semibold transition-all relative cursor-pointer ${
                isActive
                  ? "bg-slate-100/90 text-slate-900 font-bold shadow-2xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              {/* Left active orange accent indicator bar */}
              {isActive && (
                <div className="absolute left-0 top-2 bottom-2 w-1 bg-[#DE5437] rounded-r-md" />
              )}

              <div className="flex items-center gap-3">
                <span className={isActive ? "text-[#DE5437]" : "text-slate-400"}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </div>

              {item.badge !== null && item.badge !== undefined && (
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition-colors ${
                    isActive
                      ? "bg-[#DE5437] text-white shadow-2xs"
                      : "bg-slate-200/80 text-slate-600"
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

export default NavMain;
