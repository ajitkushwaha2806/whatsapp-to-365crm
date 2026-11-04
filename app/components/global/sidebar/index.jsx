"use client";

import React from "react";
import { X, Zap } from "lucide-react";
import RestaurantSwitcher from "../restaurant-switcher";
import { NavMain } from "./nav-main";
import { SidebarSubscriptionWidget } from "./subscription-widget";
import { NavUser } from "./nav-user";

export function AppSidebar({
  activeTab = "leads",
  onTabChange,
  workspaces = [],
  activeWorkspace,
  activeWorkspaceId,
  onWorkspaceChange,
  sheets = [],
  activeSheet,
  activeSheetId,
  onSheetChange,
  leadsCount = 0,
  teamCount = 0,
  authUser,
  user,
  onLogout,
  userButton,
  activeUser = "ALL",
  onOpenAddSheet,
  onOpenAddWorkspace,
  isOpenMobile = false,
  onCloseMobile,
  className = "",
}) {
  const currentUser = user || authUser;
  const isStaff = currentUser?.role === "staff";

  const sidebarContent = (
    <div
      className={`w-full h-full flex flex-col bg-white border-r border-slate-200/90 text-slate-800 selection:bg-orange-100 selection:text-orange-900 select-none ${className}`}
    >
      {/* 1. Top Workspace Switcher */}
      <div className="p-3.5 pb-2">
        <RestaurantSwitcher
          workspaces={workspaces}
          activeWorkspace={activeWorkspace}
          activeWorkspaceId={activeWorkspaceId}
          onWorkspaceChange={onWorkspaceChange}
          sheets={sheets}
          activeSheet={activeSheet}
          activeSheetId={activeSheetId}
          onSheetChange={onSheetChange}
          onOpenAddSheet={isStaff ? undefined : onOpenAddSheet}
          onOpenAddWorkspace={isStaff ? undefined : onOpenAddWorkspace}
          canAddSheet={!isStaff}
          isStaff={isStaff}
          currentUser={currentUser}
          label="Active Workspace"
        />
      </div>

      {/* 2. Main Navigation Items (Tailored for Leadio) */}
      <NavMain
        activeTab={activeTab}
        onTabChange={onTabChange}
        leadsCount={leadsCount}
        sheetsCount={sheets.length}
        teamCount={teamCount}
        onCloseMobile={onCloseMobile}
        title="MANAGE"
        isStaff={isStaff}
      />

      {/* 3. Bottom Section: Leadio Pro Card + Create Workspace Button + User Pill */}
      <div className="p-3.5 pt-2 space-y-2.5 border-t border-slate-100 bg-slate-50/40">
        {!isStaff && (
          <>
            {/* Subscription / Plan Card */}
            <SidebarSubscriptionWidget
              isExpired={true}
              daysLeft={7}
              onRenew={() => {
                alert("Leadio Pro subscription portal");
              }}
            />

            {/* Big Orange Action Button (+ Create Workspace) */}
            <button
              type="button"
              onClick={onOpenAddWorkspace || onOpenAddSheet}
              className="w-full py-2.5 px-3 bg-[#F0441D] hover:bg-[#d83813] active:scale-[0.98] text-white font-medium rounded-md text-xs flex items-center justify-center gap-2 shadow-sm shadow-orange-500/20 transition-all cursor-pointer"
            >
              <span className="text-base leading-none">+</span>
              <span>Create Workspace</span>
            </button>
          </>
        )}

        {/* User Profile Pill */}
        <NavUser
          user={currentUser}
          authUser={authUser}
          activeUser={activeUser}
          userButton={userButton}
          onLogout={onLogout}
        />
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:block w-72 h-screen sticky top-0 flex-shrink-0 z-20">
        {sidebarContent}
      </aside>

      {/* Mobile Slide-Over Drawer */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in"
            onClick={onCloseMobile}
          />
          <div className="relative flex-1 flex flex-col max-w-[288px] w-full bg-white shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {/* Integrated Header Bar for Mobile Drawer */}
            <div className="flex items-center justify-between px-3.5 pt-3 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-[#DE5437] text-white flex items-center justify-center shadow-xs shadow-orange-500/20">
                  <Zap className="w-3.5 h-3.5 fill-white" />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-xs text-slate-900">Leadio</span>
                  <span className="text-[9px] font-bold px-1.5 py-0.2 bg-orange-100 text-[#DE5437] rounded-full uppercase">
                    Pro
                  </span>
                </div>
              </div>

              {/* Close Button cleanly aligned on the right */}
              <button
                type="button"
                onClick={onCloseMobile}
                className="w-7 h-7 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 flex items-center justify-center text-xs font-bold transition-all cursor-pointer"
                title="Close Sidebar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Main content fills drawer without extra side gutter */}
            <div className="flex-1 min-h-0 overflow-y-auto">
              {sidebarContent}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default AppSidebar;
