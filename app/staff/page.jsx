"use client";

import Header from "../components/Header";
import BottomNav from "../components/BottomNav";
import Sidebar from "../components/global/sidebar";
import TeamTab from "../components/TeamTab";
import AddMemberModal from "../components/AddMemberModal";
import AddSheetModal from "../components/AddSheetModal";
import CreateWorkspaceModal from "../components/CreateWorkspaceModal";
import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Loader2, AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import {
  getWorkspaces,
  createWorkspace,
  saveWorkspaceStaff,
  deleteWorkspaceStaff,
  saveWorkspaceSheet,
} from "@/lib/api/workspaces";

export default function StaffPage() {
  const router = useRouter();
  const [loggedUser, setLoggedUser] = useState(null);
  const [workspaces, setWorkspaces] = useState([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState("");
  const [activeUser, setActiveUser] = useState("ALL");
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [leadsCount, setLeadsCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const [isCreateWorkspaceOpen, setIsCreateWorkspaceOpen] = useState(false);
  const [isSheetModalOpen, setIsSheetModalOpen] = useState(false);
  const [editingSheet, setEditingSheet] = useState(null);
  const [isCreatingNewSheet, setIsCreatingNewSheet] = useState(false);

  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "info") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((curr) => (curr?.message === message ? null : curr));
    }, 5000);
  };

  const handleLogout = () => {
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      chrome.storage.local.remove(["loggedStaffUser"]);
    } else if (typeof window !== "undefined") {
      localStorage.removeItem("loggedStaffUser");
    }
    router.replace("/");
  };

  // 1. Load active session & user
  useEffect(() => {
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(
        ["loggedStaffUser", "activeWorkspaceId", "activeUser", "selectedLeads"],
        (result) => {
          if (!result.loggedStaffUser) {
            router.replace("/");
            return;
          }
          if (result.loggedStaffUser.role === "staff") {
            router.replace("/");
            return;
          }
          setLoggedUser(result.loggedStaffUser);

          if (typeof result.activeWorkspaceId === "string") {
            setActiveWorkspaceId(result.activeWorkspaceId);
          }
          if (typeof result.activeUser === "string") {
            setActiveUser(result.activeUser);
          }
          if (Array.isArray(result.selectedLeads)) {
            setLeadsCount(result.selectedLeads.length);
          }
        }
      );
    } else if (typeof window !== "undefined") {
      const savedUser = localStorage.getItem("loggedStaffUser");
      if (!savedUser) {
        router.replace("/");
        return;
      }
      try {
        const u = JSON.parse(savedUser);
        if (u.role === "staff") {
          router.replace("/");
          return;
        }
        setLoggedUser(u);
      } catch {
        router.replace("/");
        return;
      }

      const storedWsId = localStorage.getItem("activeWorkspaceId");
      if (storedWsId) setActiveWorkspaceId(storedWsId);
      const storedUser = localStorage.getItem("activeUser");
      if (storedUser) setActiveUser(storedUser);
      const storedLeads = localStorage.getItem("selectedLeads");
      if (storedLeads) {
        try {
          const parsed = JSON.parse(storedLeads);
          if (Array.isArray(parsed)) setLeadsCount(parsed.length);
        } catch {}
      }
    }
  }, [router]);

  // 2. Fetch Workspaces (Staff belongs directly to Workspace!)
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setIsLoading(true);
      try {
        const wsList = await getWorkspaces();
        if (isMounted && Array.isArray(wsList)) {
          setWorkspaces(wsList);
          if (wsList.length > 0) {
            setActiveWorkspaceId((prev) =>
              prev && wsList.some((w) => w.id === prev) ? prev : wsList[0].id
            );
          }
        }
      } catch (err) {
        console.error("Database query error:", err.message);
        if (isMounted) {
          showToast("Failed to load workspace data: " + err.message, "error");
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  const activeWorkspace = useMemo(() => {
    return workspaces.find((w) => w.id === activeWorkspaceId) || workspaces[0] || null;
  }, [workspaces, activeWorkspaceId]);

  // Staff is part of Workspace, NOT any single sheet!
  const teamMembers = useMemo(() => {
    return Array.isArray(activeWorkspace?.staff) ? activeWorkspace.staff : [];
  }, [activeWorkspace]);

  const googleSheets = useMemo(() => {
    return Array.isArray(activeWorkspace?.integrations?.googleSheets)
      ? activeWorkspace.integrations.googleSheets
      : [];
  }, [activeWorkspace]);

  const handleWorkspaceChange = (wsId) => {
    setActiveWorkspaceId(wsId);
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ activeWorkspaceId: wsId });
    } else if (typeof window !== "undefined") {
      localStorage.setItem("activeWorkspaceId", wsId);
    }
  };

  const handleUserChange = (user) => {
    setActiveUser(user);
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ activeUser: user });
    } else if (typeof window !== "undefined") {
      localStorage.setItem("activeUser", user);
    }
  };

  const handleOpenAddMember = () => {
    setEditingMember(null);
    setIsAddMemberOpen(true);
  };

  const handleOpenEditMember = (member) => {
    setEditingMember(member);
    setIsAddMemberOpen(true);
  };

  // Dedicated API call: Add / Update staff in this Workspace
  const handleSaveMember = async (memberData) => {
    if (!activeWorkspace || !memberData?.name) return;

    try {
      const updatedStaffList = await saveWorkspaceStaff(activeWorkspace.id, memberData);
      setWorkspaces((prev) =>
        prev.map((w) =>
          w.id === activeWorkspace.id ? { ...w, staff: updatedStaffList } : w
        )
      );
      showToast(
        editingMember
          ? `Updated ${memberData.name} in ${activeWorkspace.name}`
          : `Added ${memberData.name} to ${activeWorkspace.name}`,
        "success"
      );
    } catch (err) {
      console.error("Failed to save staff:", err.message);
      showToast("Error saving staff: " + err.message, "error");
    }
  };

  // Dedicated API call: Toggle status for staff in this Workspace
  const handleToggleStatus = async (member) => {
    if (!activeWorkspace) return;
    const currentActive =
      member.isActive !== undefined ? Boolean(member.isActive) : member.status !== "inactive";
    const nextActive = !currentActive;

    const payload = {
      ...member,
      isActive: nextActive,
      status: nextActive ? "active" : "inactive",
    };

    try {
      const updatedStaffList = await saveWorkspaceStaff(activeWorkspace.id, payload);
      setWorkspaces((prev) =>
        prev.map((w) =>
          w.id === activeWorkspace.id ? { ...w, staff: updatedStaffList } : w
        )
      );
      showToast(`${member.name} is now ${nextActive ? "Active" : "Inactive"}`, "info");
    } catch (err) {
      console.error("Failed to update status:", err.message);
      showToast("Error updating status: " + err.message, "error");
    }
  };

  // Dedicated API call: Remove staff from this Workspace
  const handleDeleteMember = async (memberToDelete) => {
    if (!activeWorkspace) return;
    const memberName = typeof memberToDelete === "string" ? memberToDelete : memberToDelete.name;
    const memberId = typeof memberToDelete === "object" ? memberToDelete.id : memberName;

    if (confirm(`Remove "${memberName}" from ${activeWorkspace.name}?`)) {
      try {
        const updatedStaffList = await deleteWorkspaceStaff(activeWorkspace.id, memberId || memberName);
        setWorkspaces((prev) =>
          prev.map((w) =>
            w.id === activeWorkspace.id ? { ...w, staff: updatedStaffList } : w
          )
        );
        if (activeUser === memberName) {
          setActiveUser("ALL");
        }
        showToast(`Removed ${memberName} from ${activeWorkspace.name}`, "success");
      } catch (err) {
        console.error("Failed to remove staff:", err.message);
        showToast("Error removing staff: " + err.message, "error");
      }
    }
  };

  const handleCreateWorkspace = async (name) => {
    const newWs = await createWorkspace({ name });
    setWorkspaces((prev) => [newWs, ...prev]);
    setActiveWorkspaceId(newWs.id);
    showToast(`Workspace "${newWs.name}" created!`, "success");
  };

  const handleOpenAddSheet = () => {
    setIsCreatingNewSheet(true);
    setEditingSheet(null);
    setIsSheetModalOpen(true);
  };

  const handleSaveSheetConfig = async (sheetData) => {
    if (!activeWorkspace) return;
    try {
      const updatedSheets = await saveWorkspaceSheet(activeWorkspace.id, sheetData);
      setWorkspaces((prev) =>
        prev.map((w) =>
          w.id === activeWorkspace.id
            ? {
                ...w,
                integrations: {
                  ...w.integrations,
                  googleSheets: updatedSheets,
                },
              }
            : w
        )
      );
      setIsSheetModalOpen(false);
      showToast("Google Sheet connected to workspace!", "success");
    } catch (err) {
      showToast("Error saving sheet: " + err.message, "error");
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans text-slate-800">
      {/* Dynamic Desktop/Mobile Navigation */}
      <Sidebar
        activeTab="staff"
        workspaces={workspaces}
        activeWorkspace={activeWorkspace}
        activeWorkspaceId={activeWorkspaceId}
        onWorkspaceChange={handleWorkspaceChange}
        sheets={googleSheets}
        activeSheet={googleSheets[0]}
        activeSheetId={googleSheets[0]?.id}
        onSheetChange={() => {}}
        leadsCount={leadsCount}
        teamCount={teamMembers.length}
        authUser={loggedUser}
        user={loggedUser}
        onLogout={handleLogout}
        userButton={null}
        activeUser={activeUser}
        onOpenAddSheet={handleOpenAddSheet}
        onOpenAddWorkspace={() => setIsCreateWorkspaceOpen(true)}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <Header
          authUser={loggedUser}
          user={loggedUser}
          activeUser={activeUser}
          teamMembers={teamMembers}
          onUserChange={handleUserChange}
          onOpenAddMember={handleOpenAddMember}
          onToggleSidebar={() => setIsMobileSidebarOpen(true)}
          onLogout={handleLogout}
        />

        <main className="flex-1 p-2.5 sm:p-4 lg:p-6 overflow-y-auto w-full min-w-0">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-24 space-y-3">
              <Loader2 className="w-6 h-6 text-[#DE5437] animate-spin" />
              <p className="text-xs text-slate-500 font-medium">Loading workspace staff...</p>
            </div>
          ) : (
            <TeamTab
              activeSheet={{
                ...activeWorkspace,
                workspaceCode: activeWorkspace?.workspaceCode,
              }}
              teamMembers={teamMembers}
              onOpenAddMember={handleOpenAddMember}
              onEditMember={handleOpenEditMember}
              onToggleStatus={handleToggleStatus}
              onDeleteMember={handleDeleteMember}
            />
          )}
        </main>

        <BottomNav
          activeTab="staff"
          leadsCount={leadsCount}
          teamCount={teamMembers.length}
        />
      </div>

      {/* Modals */}
      <CreateWorkspaceModal
        isOpen={isCreateWorkspaceOpen}
        onClose={() => setIsCreateWorkspaceOpen(false)}
        onCreateWorkspace={handleCreateWorkspace}
      />

      <AddMemberModal
        isOpen={isAddMemberOpen}
        onClose={() => {
          setIsAddMemberOpen(false);
          setEditingMember(null);
        }}
        editingMember={editingMember}
        onAddMember={handleSaveMember}
        sheetName={activeWorkspace?.name}
      />

      <AddSheetModal
        isOpen={isSheetModalOpen}
        onClose={() => setIsSheetModalOpen(false)}
        editingSheet={editingSheet}
        isCreatingNew={isCreatingNewSheet}
        teamMembers={teamMembers}
        onSaveSheet={handleSaveSheetConfig}
      />

      {/* Floating Toast */}
      {toast && (
        <div
          className={`fixed bottom-20 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-md shadow-lg border text-xs font-semibold animate-in slide-in-from-bottom duration-200 ${
            toast.type === "error"
              ? "bg-red-50 border-red-300 text-red-900"
              : toast.type === "success"
              ? "bg-emerald-50 border-emerald-300 text-emerald-900"
              : "bg-slate-900 border-slate-800 text-white"
          }`}
        >
          {toast.type === "error" ? (
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          ) : toast.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <Info className="w-4 h-4 text-blue-400 shrink-0" />
          )}
          <span>{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="ml-2 text-slate-400 hover:text-slate-700 cursor-pointer font-bold text-sm leading-none"
            aria-label="Close"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
