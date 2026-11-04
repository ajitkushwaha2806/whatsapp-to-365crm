"use client";

import React from "react";
import { AppSidebar } from "./index";

export function SidebarLayout({
  children,
  activeTab,
  onTabChange,
  sheets,
  activeSheet,
  activeSheetId,
  onSheetChange,
  leadsCount,
  teamCount,
  authUser,
  userButton,
  activeUser,
  onOpenAddSheet,
  isOpenMobile,
  onCloseMobile,
}) {
  return (
    <div className="flex min-h-screen bg-slate-50 w-full relative">
      <AppSidebar
        activeTab={activeTab}
        onTabChange={onTabChange}
        sheets={sheets}
        activeSheet={activeSheet}
        activeSheetId={activeSheetId}
        onSheetChange={onSheetChange}
        leadsCount={leadsCount}
        teamCount={teamCount}
        authUser={authUser}
        userButton={userButton}
        activeUser={activeUser}
        onOpenAddSheet={onOpenAddSheet}
        isOpenMobile={isOpenMobile}
        onCloseMobile={onCloseMobile}
      />
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {children}
      </div>
    </div>
  );
}

export default SidebarLayout;
