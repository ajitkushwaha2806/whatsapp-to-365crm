"use client";

import React, { useState, useEffect } from "react";
import Header from "../components/Header";
import BottomNav from "../components/BottomNav";
import Sidebar from "../components/global/sidebar";
import IntegrationsTab from "../components/IntegrationsTab";
import AddSheetModal from "../components/AddSheetModal";
import AddMemberModal from "../components/AddMemberModal";
import CreateWorkspaceModal from "../components/CreateWorkspaceModal";
import { useRouter } from "next/navigation";
import { Loader2, AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import {
  getWorkspaces,
  createWorkspace,
  saveWorkspaceSheet,
  deleteWorkspaceSheet,
  saveWorkspaceCRM,
  testWorkspaceCRM,
  saveWorkspaceStaff,
} from "@/lib/api/workspaces";

export default function IntegrationsPage() {
  const router = useRouter();
  const [loggedUser, setLoggedUser] = useState(null);
  const [workspaces, setWorkspaces] = useState([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState("");
  const [activeUser, setActiveUser] = useState("ALL");
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [leadsCount, setLeadsCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Workspace Modal state
  const [isCreateWorkspaceOpen, setIsCreateWorkspaceOpen] = useState(false);

  // Google Sheet Modal state
  const [isSheetModalOpen, setIsSheetModalOpen] = useState(false);
  const [editingSheet, setEditingSheet] = useState(null);
  const [isCreatingNewSheet, setIsCreatingNewSheet] = useState(false);

  // Staff Modal state
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
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

  // 1. Session load
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
          if (result.activeWorkspaceId) setActiveWorkspaceId(result.activeWorkspaceId);
          if (result.activeUser) setActiveUser(result.activeUser);
          if (Array.isArray(result.selectedLeads)) setLeadsCount(result.selectedLeads.length);
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
    }
  }, [router]);

  // 2. Load Workspaces
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
        console.error("Failed to load workspaces:", err);
        if (isMounted) showToast("Error loading workspaces: " + err.message, "error");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  const activeWorkspace = React.useMemo(() => {
    return workspaces.find((w) => w.id === activeWorkspaceId) || workspaces[0] || null;
  }, [workspaces, activeWorkspaceId]);

  const googleSheets = React.useMemo(() => {
    return Array.isArray(activeWorkspace?.integrations?.googleSheets)
      ? activeWorkspace.integrations.googleSheets
      : [];
  }, [activeWorkspace]);

  const crmConfig = React.useMemo(() => {
    return activeWorkspace?.integrations?.crm365 || { isEnabled: false };
  }, [activeWorkspace]);

  const workspaceStaff = React.useMemo(() => {
    return Array.isArray(activeWorkspace?.staff) ? activeWorkspace.staff : [];
  }, [activeWorkspace]);

  const handleWorkspaceChange = (wsId) => {
    setActiveWorkspaceId(wsId);
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ activeWorkspaceId: wsId });
    } else if (typeof window !== "undefined") {
      localStorage.setItem("activeWorkspaceId", wsId);
    }
  };

  const handleCreateWorkspace = async (name) => {
    const newWs = await createWorkspace({ name });
    setWorkspaces((prev) => [newWs, ...prev]);
    setActiveWorkspaceId(newWs.id);
    showToast(`Workspace "${newWs.name}" created!`, "success");
  };

  // Google Sheets Management
  const handleOpenAddSheet = () => {
    setIsCreatingNewSheet(true);
    setEditingSheet(null);
    setIsSheetModalOpen(true);
  };

  const handleOpenEditSheet = (sheet) => {
    setIsCreatingNewSheet(false);
    setEditingSheet(sheet);
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
      showToast("Google Sheet integration saved!", "success");
    } catch (err) {
      showToast("Error saving Google Sheet: " + err.message, "error");
    }
  };

  const handleDeleteSheet = async (sheetId) => {
    if (!activeWorkspace) return;
    if (confirm("Are you sure you want to disconnect this Google Sheet?")) {
      try {
        const updatedSheets = await deleteWorkspaceSheet(activeWorkspace.id, sheetId);
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
        showToast("Google Sheet disconnected", "info");
      } catch (err) {
        showToast("Error disconnecting sheet: " + err.message, "error");
      }
    }
  };

  // 365 CRM Management
  const handleSaveCRM = async (crmData) => {
    if (!activeWorkspace) return;
    const updatedCRM = await saveWorkspaceCRM(activeWorkspace.id, crmData);
    setWorkspaces((prev) =>
      prev.map((w) =>
        w.id === activeWorkspace.id
          ? {
              ...w,
              integrations: {
                ...w.integrations,
                crm365: updatedCRM,
              },
            }
          : w
      )
    );
    showToast("365 CRM settings saved successfully", "success");
  };

  const handleTestCRM = async (crmData) => {
    if (!activeWorkspace) throw new Error("No active workspace");
    return await testWorkspaceCRM(activeWorkspace.id, crmData);
  };

  // Staff Modal handler
  const handleSaveMember = async (memberData) => {
    if (!activeWorkspace) return;
    try {
      const updatedStaff = await saveWorkspaceStaff(activeWorkspace.id, memberData);
      setWorkspaces((prev) =>
        prev.map((w) => (w.id === activeWorkspace.id ? { ...w, staff: updatedStaff } : w))
      );
      showToast(`Saved staff member "${memberData.name}"`, "success");
    } catch (err) {
      showToast("Error saving staff: " + err.message, "error");
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans text-slate-800">
      {/* Sidebar */}
      <Sidebar
        activeTab="integrations"
        workspaces={workspaces}
        activeWorkspace={activeWorkspace}
        activeWorkspaceId={activeWorkspaceId}
        onWorkspaceChange={handleWorkspaceChange}
        sheets={googleSheets}
        activeSheet={googleSheets[0]}
        activeSheetId={googleSheets[0]?.id}
        onSheetChange={() => {}}
        leadsCount={leadsCount}
        teamCount={workspaceStaff.length}
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
          teamMembers={workspaceStaff}
          onUserChange={setActiveUser}
          onOpenAddMember={() => setIsAddMemberOpen(true)}
          onToggleSidebar={() => setIsMobileSidebarOpen(true)}
          onLogout={handleLogout}
        />

        <main className="flex-1 p-2.5 sm:p-4 lg:p-6 overflow-y-auto w-full min-w-0">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-24 space-y-3">
              <Loader2 className="w-6 h-6 text-[#DE5437] animate-spin" />
              <p className="text-xs text-slate-500 font-medium">Loading workspace integrations...</p>
            </div>
          ) : (
            <IntegrationsTab
              workspace={activeWorkspace}
              googleSheets={googleSheets}
              crmConfig={crmConfig}
              onOpenAddSheet={handleOpenAddSheet}
        onOpenAddWorkspace={() => setIsCreateWorkspaceOpen(true)}
              onEditSheet={handleOpenEditSheet}
              onDeleteSheet={handleDeleteSheet}
              onSaveCRM={handleSaveCRM}
              onTestCRM={handleTestCRM}
            />
          )}
        </main>

        <BottomNav
          activeTab="integrations"
          leadsCount={leadsCount}
          teamCount={workspaceStaff.length}
        />
      </div>

      {/* Create Workspace Modal */}
      <CreateWorkspaceModal
        isOpen={isCreateWorkspaceOpen}
        onClose={() => setIsCreateWorkspaceOpen(false)}
        onCreateWorkspace={handleCreateWorkspace}
      />

      {/* Add Sheet Modal */}
      <AddSheetModal
        isOpen={isSheetModalOpen}
        onClose={() => setIsSheetModalOpen(false)}
        editingSheet={editingSheet}
        isCreatingNew={isCreatingNewSheet}
        teamMembers={workspaceStaff}
        onSaveSheet={handleSaveSheetConfig}
      />

      {/* Add Member Modal */}
      <AddMemberModal
        isOpen={isAddMemberOpen}
        onClose={() => setIsAddMemberOpen(false)}
        onAddMember={handleSaveMember}
        workspaceName={activeWorkspace?.name || "Workspace"}
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
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

