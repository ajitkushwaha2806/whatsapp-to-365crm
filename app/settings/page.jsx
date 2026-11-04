"use client";
import Header from "../components/Header";
import BottomNav from "../components/BottomNav";
import Sidebar from "../components/global/sidebar";
import SettingsTab from "../components/SettingsTab";
import AddSheetModal from "../components/AddSheetModal";
import AddMemberModal from "../components/AddMemberModal";
import CreateWorkspaceModal from "../components/CreateWorkspaceModal";
import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import { getSheets, createSheet, updateSheet, deleteSheet } from "@/lib/api/sheets";
import { getWorkspaces, createWorkspace } from "@/lib/api/workspaces";

export default function SettingsPage() {
  const router = useRouter();
  const [loggedUser, setLoggedUser] = useState(null);
  const [workspaces, setWorkspaces] = useState([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState("");
  const [sheets, setSheets] = useState([]);
  const [activeSheetId, setActiveSheetId] = useState("");
  const [activeUser, setActiveUser] = useState("ALL");
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [leadsCount, setLeadsCount] = useState(0);

  const [isCreateWorkspaceOpen, setIsCreateWorkspaceOpen] = useState(false);
  const [isSheetModalOpen, setIsSheetModalOpen] = useState(false);
  const [editingSheet, setEditingSheet] = useState(null);
  const [isCreatingNewSheet, setIsCreatingNewSheet] = useState(false);
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

  useEffect(() => {
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(
        ["loggedStaffUser", "activeSheetId", "activeUser", "selectedLeads"],
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

          if (typeof result.activeSheetId === "string") {
            setActiveSheetId(result.activeSheetId);
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

      const storedSheetId = localStorage.getItem("activeSheetId");
      if (storedSheetId) setActiveSheetId(storedSheetId);
      const storedUser = localStorage.getItem("activeUser");
      if (storedUser) setActiveUser(storedUser);
      const storedLeads = localStorage.getItem("selectedLeads");
      if (storedLeads) {
        try {
          const parsed = JSON.parse(storedLeads);
          if (Array.isArray(parsed)) setLeadsCount(parsed.length);
        } catch { }
      }
    }
  }, [router]);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const [wsList, dbSheets] = await Promise.all([
          getWorkspaces().catch(() => []),
          getSheets().catch(() => []),
        ]);
        if (isMounted) {
          if (Array.isArray(wsList) && wsList.length > 0) {
            setWorkspaces(wsList);
            setActiveWorkspaceId((prev) =>
              prev && wsList.some((w) => w.id === prev) ? prev : wsList[0].id
            );
          }
          if (Array.isArray(dbSheets) && dbSheets.length > 0) {
            setSheets(dbSheets);
            if (dbSheets.length > 0) {
              setActiveSheetId((prev) =>
                prev && dbSheets.some((s) => s.id === prev) ? prev : dbSheets[0].id
              );
            }
          }
        }
      } catch (err) {
        console.error("Database query error:", err.message);
        if (isMounted) {
          showToast("Failed to load data: " + err.message, "error");
        }
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleWorkspaceChange = (wsId) => {
    setActiveWorkspaceId(wsId);
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ activeWorkspaceId: wsId });
    } else if (typeof window !== "undefined") {
      localStorage.setItem("activeWorkspaceId", wsId);
    }
  };

  const activeWorkspace = useMemo(() => {
    if (workspaces.length === 0) return null;
    return workspaces.find((w) => w.id === activeWorkspaceId) || workspaces[0];
  }, [workspaces, activeWorkspaceId]);

  const activeSheet = useMemo(() => {
    return sheets.find((s) => s.id === activeSheetId) || sheets[0] || null;
  }, [sheets, activeSheetId]);

  const teamMembers = useMemo(() => {
    return Array.isArray(activeSheet?.assignedUsers) ? activeSheet.assignedUsers : [];
  }, [activeSheet]);

  const handleSheetChange = (sheetId) => {
    setActiveSheetId(sheetId);
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ activeSheetId: sheetId });
    } else if (typeof window !== "undefined") {
      localStorage.setItem("activeSheetId", sheetId);
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

  const handleUpdateSheet = async (sheetId, payload) => {
    try {
      const updatedSheet = await updateSheet(sheetId, payload);
      setSheets((prev) => prev.map((s) => (s.id === sheetId ? updatedSheet : s)));
      showToast("Sheet updated successfully", "success");
      return updatedSheet;
    } catch (err) {
      console.error("DB update error:", err.message);
      showToast("Error saving sheet: " + err.message, "error");
      return null;
    }
  };

  const handleDeleteSheet = async (idToDelete) => {
    if (sheets.length <= 1) {
      showToast("At least one sheet must remain configured.", "error");
      return;
    }
    if (confirm("Delete this Google Form configuration?")) {
      try {
        await deleteSheet(idToDelete);
        const updated = sheets.filter((s) => s.id !== idToDelete);
        setSheets(updated);
        if (activeSheetId === idToDelete) {
          setActiveSheetId(updated[0]?.id || "");
        }
        showToast("Sheet deleted successfully", "success");
      } catch (err) {
        console.error("DB delete error:", err.message);
        showToast("Error deleting sheet: " + err.message, "error");
      }
    }
  };

  const handleOpenAddSheet = () => {
    setIsCreatingNewSheet(true);
    setEditingSheet(null);
    setIsSheetModalOpen(true);
  };

  const handleSaveSheetConfig = async (sheetData) => {
    if (isCreatingNewSheet) {
      try {
        const createdSheet = await createSheet({
          name: sheetData.name,
          baseUrl: sheetData.baseUrl,
          leadEntryKey: sheetData.leadEntryKey,
          leadEntryLabel: sheetData.leadEntryLabel,
          assignedUsers: sheetData.assignedUsers,
          fields: sheetData.fields,
          selectedValues: sheetData.defaultValues,
        });
        setSheets((prev) => [...prev, createdSheet]);
        setActiveSheetId(createdSheet.id);
        setIsSheetModalOpen(false);
        showToast("Sheet created successfully!", "success");
      } catch (err) {
        showToast("Error creating sheet: " + err.message, "error");
      }
    }
  };

  const handleSaveMember = async (memberData) => {
    if (!activeSheet || !memberData?.name) return;
    const currentMembers = Array.isArray(activeSheet.assignedUsers) ? [...activeSheet.assignedUsers] : [];
    const normalized = currentMembers.map((m) =>
      typeof m === "string" ? { id: `m_${m}`, name: m, phone: "", password: "", isActive: true, status: "active" } : m
    );

    const updatedMembers = [...normalized, memberData];
    try {
      const updated = await updateSheet(activeSheet.id, { assignedUsers: updatedMembers });
      setSheets((prev) => prev.map((s) => (s.id === activeSheet.id ? updated : s)));
      showToast(`Added ${memberData.name} to ${activeSheet.name}`, "success");
    } catch (err) {
      showToast("Error adding staff: " + err.message, "error");
    }
  };

  const handleCreateWorkspace = async (name) => {
    const newWs = await createWorkspace({ name });
    const refreshed = await getWorkspaces();
    setWorkspaces(refreshed);
    if (newWs && newWs.id) {
      setActiveWorkspaceId(newWs.id);
      if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ activeWorkspaceId: newWs.id });
      } else if (typeof window !== "undefined") {
        localStorage.setItem("activeWorkspaceId", newWs.id);
      }
    }
    showToast(`Workspace "${newWs.name}" created!`, "success");
  };

  return (
    <div className="min-h-screen bg-slate-50 w-full selection:bg-orange-100 selection:text-orange-900 font-sans antialiased">
      <div className="w-full flex min-h-screen bg-slate-50 relative">
        {/* Sidebar */}
        <Sidebar
          activeTab="settings"
          workspaces={workspaces}
          activeWorkspace={activeWorkspace}
          activeWorkspaceId={activeWorkspaceId}
          onWorkspaceChange={handleWorkspaceChange}
          sheets={sheets}
          activeSheet={activeSheet}
          activeSheetId={activeSheetId}
          onSheetChange={handleSheetChange}
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

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 min-h-screen pb-16 lg:pb-0">
          <Header
            authUser={loggedUser}
            user={loggedUser}
            activeUser={activeUser}
            teamMembers={teamMembers}
            onUserChange={handleUserChange}
            onOpenAddMember={() => setIsAddMemberOpen(true)}
            onToggleSidebar={() => setIsMobileSidebarOpen(true)}
            onLogout={handleLogout}
          />

          <main className="flex-1 p-2.5 sm:p-4 lg:p-6 overflow-y-auto w-full min-w-0">
            <SettingsTab
              sheets={sheets}
              activeSheet={activeSheet}
              activeSheetId={activeSheetId}
              onSheetChange={handleSheetChange}
              onUpdateSheet={handleUpdateSheet}
              onDeleteSheet={handleDeleteSheet}
              onOpenAddSheet={handleOpenAddSheet}
              teamMembers={teamMembers}
            />
          </main>

          <BottomNav
            activeTab="settings"
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

        <AddSheetModal
          isOpen={isSheetModalOpen}
          onClose={() => setIsSheetModalOpen(false)}
          editingSheet={editingSheet}
          isCreatingNew={isCreatingNewSheet}
          teamMembers={teamMembers}
          onSaveSheet={handleSaveSheetConfig}
        />

        <AddMemberModal
          isOpen={isAddMemberOpen}
          onClose={() => setIsAddMemberOpen(false)}
          onAddMember={handleSaveMember}
          sheetName={activeSheet?.name}
        />

        {/* Floating Toast */}
        {toast && (
          <div
            className={`fixed bottom-20 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-md shadow-lg border text-xs font-semibold animate-in slide-in-from-bottom duration-200 ${toast.type === "error"
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
    </div>
  );
}

