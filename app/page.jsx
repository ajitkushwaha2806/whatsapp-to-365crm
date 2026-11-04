"use client";
import Header from "./components/Header";
import TeamTab from "./components/TeamTab";
import { useRouter } from "next/navigation";
import LeadsTab from "./components/LeadsTab";
import BottomNav from "./components/BottomNav";
import Sidebar from "./components/global/sidebar";
import SettingsTab from "./components/SettingsTab";
import StaffLoginView from "./components/StaffLoginView";
import { useEffect, useState, useMemo } from "react";
import { BarChart3, Puzzle, AlertTriangle, CheckCircle2, Info, X, Loader2 } from "lucide-react";
import AddLeadModal from "./components/AddLeadModal";
import AddSheetModal from "./components/AddSheetModal";
import AddMemberModal from "./components/AddMemberModal";
import CreateWorkspaceModal from "./components/CreateWorkspaceModal";
import { getSheets, createSheet, updateSheet, deleteSheet } from "@/lib/api/sheets";
import { getWorkspaces, createWorkspace, syncLeadToCRM } from "@/lib/api/workspaces";
import { syncLeadToCRM365 } from "@/lib/crm365";

function LeadsApp({ authUser: propAuthUser, userButton }) {
  const router = useRouter();
  const [loggedUser, setLoggedUser] = useState(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  // Workspaces state
  const [workspaces, setWorkspaces] = useState([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState("");

  const [activeTab, setActiveTab] = useState("leads");
  const [leads, setLeads] = useState([]);
  const [sheets, setSheets] = useState([]);
  const [activeSheetId, setActiveSheetId] = useState("");
  const [activeUser, setActiveUser] = useState("ALL");
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitProgress, setSubmitProgress] = useState(0);
  const [leadStatuses, setLeadStatuses] = useState({});

  const [isCreateWorkspaceOpen, setIsCreateWorkspaceOpen] = useState(false);
  const [isSheetModalOpen, setIsSheetModalOpen] = useState(false);
  const [editingSheet, setEditingSheet] = useState(null);
  const [isCreatingNewSheet, setIsCreatingNewSheet] = useState(false);

  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [isAddLeadOpen, setIsAddLeadOpen] = useState(false);
  const [toast, setToast] = useState(null); // { message, type: 'error' | 'success' | 'info' }

  const showToast = (message, type = "info") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((curr) => (curr?.message === message ? null : curr));
    }, 5000);
  };

  // 1. Check logged user session from chrome.storage or localStorage
  useEffect(() => {
    const defaultAdminUser = {
      id: "admin_default",
      name: "Admin",
      phone: "9311507651",
      role: "admin",
      isActive: true,
    };

    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(
        [
          "loggedStaffUser",
          "selectedLeads",
          "activeSheetId",
          "activeWorkspaceId",
          "activeUser",
          "userLoggedOut",
          "cachedActiveWorkspace",
        ],
        (result) => {
          if (result.cachedActiveWorkspace && result.cachedActiveWorkspace.id) {
            setWorkspaces((prev) => {
              const exists = prev.some((w) => w.id === result.cachedActiveWorkspace.id);
              return exists ? prev : [result.cachedActiveWorkspace, ...prev];
            });
            setActiveWorkspaceId(result.cachedActiveWorkspace.id);
          }

          if (result.loggedStaffUser) {
            setLoggedUser(result.loggedStaffUser);
            if (result.loggedStaffUser.name) {
              setActiveUser(result.loggedStaffUser.name);
            }
          } else if (!result.userLoggedOut) {
            // Instant access: default to Admin so user is never blocked!
            setLoggedUser(defaultAdminUser);
            setActiveUser("ALL");
          }

          if (result.selectedLeads && Array.isArray(result.selectedLeads)) {
            setLeads(result.selectedLeads);
          }
          if (typeof result.activeSheetId === "string") {
            setActiveSheetId(result.activeSheetId);
          }
          if (typeof result.activeWorkspaceId === "string") {
            setActiveWorkspaceId(result.activeWorkspaceId);
          }
          if (typeof result.activeUser === "string" && !result.loggedStaffUser) {
            setActiveUser(result.activeUser);
          }
          setIsAuthChecking(false);
        }
      );

      const listener = (changes) => {
        if (changes.selectedLeads && Array.isArray(changes.selectedLeads.newValue)) {
          setLeads(changes.selectedLeads.newValue);
        }
        if (changes.loggedStaffUser) {
          setLoggedUser(changes.loggedStaffUser.newValue || null);
        }
      };
      chrome.storage.onChanged.addListener(listener);
      return () => chrome.storage.onChanged.removeListener(listener);
    } else if (typeof window !== "undefined") {
      const savedUser = localStorage.getItem("loggedStaffUser");
      const userLoggedOut = localStorage.getItem("userLoggedOut") === "true";
      const savedCachedWs = localStorage.getItem("cachedActiveWorkspace");

      if (savedCachedWs) {
        try {
          const parsedWs = JSON.parse(savedCachedWs);
          if (parsedWs && parsedWs.id) {
            setWorkspaces((prev) => {
              const exists = prev.some((w) => w.id === parsedWs.id);
              return exists ? prev : [parsedWs, ...prev];
            });
            setActiveWorkspaceId(parsedWs.id);
          }
        } catch {}
      }

      if (savedUser) {
        try {
          const parsed = JSON.parse(savedUser);
          setLoggedUser(parsed);
          if (parsed.name) setActiveUser(parsed.name);
          if (parsed.workspaceId && !storedWsId) {
            setActiveWorkspaceId(parsed.workspaceId);
          }
        } catch {}
      } else if (!userLoggedOut) {
        // Instant access: default to Admin so user is never blocked!
        setLoggedUser(defaultAdminUser);
        setActiveUser("ALL");
      }

      const storedSheetId = localStorage.getItem("activeSheetId");
      if (storedSheetId) setActiveSheetId(storedSheetId);
      const storedWsId = localStorage.getItem("activeWorkspaceId");
      if (storedWsId) setActiveWorkspaceId(storedWsId);
      const storedUser = localStorage.getItem("activeUser");
      if (storedUser && !savedUser) setActiveUser(storedUser);
      const storedLeads = localStorage.getItem("selectedLeads");
      if (storedLeads) {
        try {
          const parsedL = JSON.parse(storedLeads);
          if (Array.isArray(parsedL)) setLeads(parsedL);
        } catch {}
      }
      setIsAuthChecking(false);
    } else {
      setLoggedUser(defaultAdminUser);
      setIsAuthChecking(false);
    }
  }, []);

  const handleLoginSuccess = (user, accessibleSheets = [], wsData = null) => {
    setLoggedUser(user);
    const userName = user.name || "Staff Member";
    setActiveUser(userName);

    const ws = wsData || (user.workspaceId ? {
      id: user.workspaceId,
      name: user.workspaceName || user.companyName || "Hero Motors",
      workspaceCode: user.workspaceCode || "WS-1001",
      integrations: {
        crm365: user.crm || { isEnabled: true, label: "WhatsApp" },
        googleSheets: accessibleSheets || [],
      },
      staff: [user],
    } : null);

    const wsId = ws?.id || user.workspaceId;

    if (ws && ws.id) {
      setWorkspaces((prev) => {
        const exists = prev.some((w) => w.id === ws.id);
        return exists ? prev.map((w) => (w.id === ws.id ? { ...w, ...ws } : w)) : [ws, ...prev];
      });
      setActiveWorkspaceId(ws.id);
    }

    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({
        loggedStaffUser: user,
        activeUser: userName,
        userLoggedOut: false,
        activeWorkspaceId: wsId || "",
        cachedActiveWorkspace: ws || null,
      });
    } else if (typeof window !== "undefined") {
      localStorage.setItem("loggedStaffUser", JSON.stringify(user));
      localStorage.setItem("activeUser", userName);
      localStorage.setItem("userLoggedOut", "false");
      if (wsId) localStorage.setItem("activeWorkspaceId", wsId);
      if (ws) localStorage.setItem("cachedActiveWorkspace", JSON.stringify(ws));
    }

    if (accessibleSheets.length > 0) {
      setActiveSheetId(accessibleSheets[0].id);
    }
    showToast(`Welcome back, ${userName}!`, "success");
  };

  const handleAdminLogin = (adminUserData, workspace) => {
    const adminUser = adminUserData || {
      id: "admin_user",
      name: "Admin",
      fullName: "Admin",
      phone: "9311507651",
      role: "admin",
      isActive: true,
    };
    setLoggedUser(adminUser);
    setActiveUser("ALL");

    if (workspace && workspace.id) {
      setWorkspaces((prev) => {
        const exists = prev.some((w) => w.id === workspace.id);
        return exists ? prev : [workspace, ...prev];
      });
      setActiveWorkspaceId(workspace.id);
      if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ activeWorkspaceId: workspace.id });
      } else if (typeof window !== "undefined") {
        localStorage.setItem("activeWorkspaceId", workspace.id);
      }
    }

    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({
        loggedStaffUser: adminUser,
        activeUser: "ALL",
        userLoggedOut: false,
        cachedActiveWorkspace: workspace || null,
      });
    } else if (typeof window !== "undefined") {
      localStorage.setItem("loggedStaffUser", JSON.stringify(adminUser));
      localStorage.setItem("activeUser", "ALL");
      localStorage.setItem("userLoggedOut", "false");
      if (workspace) localStorage.setItem("cachedActiveWorkspace", JSON.stringify(workspace));
    }
    showToast(`Signed in as ${adminUser.name || "Admin"}`, "success");
  };

  const handleLogout = () => {
    setLoggedUser(null);
    setActiveUser("ALL");

    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      chrome.storage.local.remove(["loggedStaffUser", "cachedActiveWorkspace"]);
      chrome.storage.local.set({ userLoggedOut: true });
    } else if (typeof window !== "undefined") {
      localStorage.removeItem("loggedStaffUser");
      localStorage.removeItem("cachedActiveWorkspace");
      localStorage.setItem("userLoggedOut", "true");
    }
    showToast("Signed out successfully", "info");
  };

  // 2. Load workspaces and sheets from DB
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
            setActiveWorkspaceId((prev) => {
              if (prev && wsList.some((w) => w.id === prev)) return prev;
              return wsList[0].id;
            });
          }
          if (Array.isArray(dbSheets)) {
            setSheets(dbSheets);
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
    if (workspaces.length === 0) {
      if (loggedUser && (loggedUser.workspaceName || loggedUser.workspaceCode || loggedUser.workspaceId)) {
        const defaultCrm = {
          isEnabled: true,
          apiKey: "cmFqbW90b3JzanNyQGdtYWlsLmNvbS8yMTg3NC8yMTg3NC8wMzExMjAyNjEwNDQyNg==",
          label: "WhatsApp",
          apiUrl: "https://www.api.365crm.io/wpaddwebsiteleads",
          status: "connected",
        };
        return {
          id: loggedUser.workspaceId || "ws_active",
          name: loggedUser.workspaceName || loggedUser.companyName || "Hero Motors",
          workspaceCode: loggedUser.workspaceCode || "WS-1001",
          integrations: {
            crm365: loggedUser.crm?.apiKey ? loggedUser.crm : defaultCrm,
            googleSheets: [],
          },
          staff: [],
        };
      }
      return null;
    }
    return (
      workspaces.find((w) => (w.id && w.id === activeWorkspaceId) || (w._id && w._id === activeWorkspaceId)) ||
      workspaces.find((w) => w.id === activeWorkspaceId || w.workspaceCode === activeWorkspaceId) ||
      workspaces.find((w) => loggedUser?.workspaceId && (w.id === loggedUser.workspaceId || w._id === loggedUser.workspaceId)) ||
      workspaces[0]
    );
  }, [workspaces, activeWorkspaceId, loggedUser]);

  // 3. Visible sheets: If an active workspace has googleSheets, use them, otherwise all sheets
  const visibleSheets = useMemo(() => {
    if (activeWorkspace?.integrations?.googleSheets && activeWorkspace.integrations.googleSheets.length > 0) {
      return activeWorkspace.integrations.googleSheets;
    }

    if (!loggedUser || loggedUser.role === "admin") {
      return sheets;
    }

    // If staff logged into a specific workspace, show sheets belonging to that workspace
    if (loggedUser.workspaceCode || loggedUser.workspaceId || loggedUser.sheetId) {
      const targetCode = (loggedUser.workspaceCode || "").toLowerCase();
      const targetId = loggedUser.workspaceId || loggedUser.sheetId;
      const match = sheets.filter((s) => {
        const sCode = (s.workspaceCode || "").toLowerCase();
        return (targetCode && sCode === targetCode) || (targetId && s.workspaceId === targetId) || s.id === targetId;
      });
      if (match.length > 0) return match;
    }

    return sheets;
  }, [activeWorkspace, sheets, loggedUser]);

  // Keep activeSheetId valid for current visible sheets
  useEffect(() => {
    if (visibleSheets.length > 0) {
      if (!activeSheetId || !visibleSheets.some((s) => s.id === activeSheetId)) {
        setActiveSheetId(visibleSheets[0].id);
      }
    }
  }, [visibleSheets, activeSheetId]);

  const activeSheet = useMemo(() => {
    return visibleSheets.find((s) => s.id === activeSheetId) || visibleSheets[0] || null;
  }, [visibleSheets, activeSheetId]);

  const teamMembers = useMemo(() => {
    if (activeWorkspace?.staff && Array.isArray(activeWorkspace.staff) && activeWorkspace.staff.length > 0) {
      return activeWorkspace.staff;
    }
    return Array.isArray(activeSheet?.assignedUsers) ? activeSheet.assignedUsers : [];
  }, [activeWorkspace, activeSheet]);

  const authUser = useMemo(() => {
    if (loggedUser) {
      return {
        fullName: loggedUser.name,
        name: loggedUser.name,
        phone: loggedUser.phone,
        role: loggedUser.role,
      };
    }
    return propAuthUser || null;
  }, [loggedUser, propAuthUser]);

  useEffect(() => {
    if (loggedUser && loggedUser.role === "staff" && loggedUser.name) {
      if (activeUser !== loggedUser.name) {
        setActiveUser(loggedUser.name);
      }
    } else if (authUser?.fullName && teamMembers.length > 0 && activeUser === "ALL") {
      const name = authUser.fullName.trim();
      const matched = teamMembers.find((item) => {
        const m = typeof item === "string" ? item : item.name || "";
        return (
          m.toLowerCase() === name.toLowerCase() ||
          name.toLowerCase().includes(m.toLowerCase())
        );
      });
      if (matched) {
        setActiveUser(typeof matched === "string" ? matched : matched.name);
      }
    }
  }, [authUser, teamMembers, activeUser, loggedUser]);

  useEffect(() => {
    if (activeUser !== "ALL" && activeSheet) {
      let updated = false;
      const newSelectedValues = { ...(activeSheet.selectedValues || {}) };
      for (const field of activeSheet.fields) {
        if (field.options && field.options.includes(activeUser)) {
          if (newSelectedValues[field.id] !== activeUser) {
            newSelectedValues[field.id] = activeUser;
            updated = true;
          }
        }
      }
      if (updated) {
        handleUpdateFieldValues(activeSheet.id, newSelectedValues);
      }
    }
  }, [activeUser, activeSheet?.id]);

  const handleUserChange = (user) => {
    setActiveUser(user);
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ activeUser: user });
    } else if (typeof window !== "undefined") {
      localStorage.setItem("activeUser", user);
    }
  };

  const handleSheetChange = (sheetId) => {
    setActiveSheetId(sheetId);
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ activeSheetId: sheetId });
    } else if (typeof window !== "undefined") {
      localStorage.setItem("activeSheetId", sheetId);
    }
  };

  const handleUpdateFieldValue = (sheetId, fieldId, val) => {
    setSheets((prev) =>
      prev.map((s) => {
        if (s.id === sheetId) {
          return {
            ...s,
            selectedValues: {
              ...(s.selectedValues || {}),
              [fieldId]: val,
            },
          };
        }
        return s;
      })
    );
  };

  const handleUpdateFieldValues = (sheetId, newVals) => {
    setSheets((prev) =>
      prev.map((s) => {
        if (s.id === sheetId) {
          return {
            ...s,
            selectedValues: newVals,
          };
        }
        return s;
      })
    );
  };

  const handleAddLead = (lead) => {
    const updated = [...leads, lead];
    setLeads(updated);
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ selectedLeads: updated });
    } else if (typeof window !== "undefined") {
      localStorage.setItem("selectedLeads", JSON.stringify(updated));
    }
  };

  const handleRemoveLead = (leadToRemove) => {
    const updated = leads.filter((l) => l !== leadToRemove);
    setLeads(updated);
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ selectedLeads: updated });
    } else if (typeof window !== "undefined") {
      localStorage.setItem("selectedLeads", JSON.stringify(updated));
    }
  };

  const handleUpdateLead = (oldLead, newLeadInput) => {
    let cleanNewLead = (newLeadInput || "").trim();
    if (!cleanNewLead) return;

    // If user provided just a phone number (e.g. "7321947689") and oldLead was a name
    const oldName = oldLead.includes("•") ? oldLead.split("•")[0].trim() : oldLead;
    const isDigitsOnly = /^\+?[0-9\s-]{7,15}$/.test(cleanNewLead);
    if (isDigitsOnly && !cleanNewLead.includes("•") && oldName && isNaN(Number(oldName))) {
      cleanNewLead = `${oldName} • ${cleanNewLead.replace(/\D/g, "")}`;
    }

    const updated = leads.map((l) => (l === oldLead ? cleanNewLead : l));
    setLeads(updated);
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ selectedLeads: updated });
    } else if (typeof window !== "undefined") {
      localStorage.setItem("selectedLeads", JSON.stringify(updated));
    }
    setLeadStatuses((prev) => {
      const copy = { ...prev };
      delete copy[oldLead];
      return copy;
    });
    showToast(`Lead updated: ${cleanNewLead}`, "success");
  };

  const handleClearLeads = () => {
    setLeads([]);
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ selectedLeads: [] });
    } else if (typeof window !== "undefined") {
      localStorage.setItem("selectedLeads", JSON.stringify([]));
    }
  };

  useEffect(() => {
    const handleBackgroundMessages = (msg) => {
      if (msg.action === "submitProgress") {
        setSubmitProgress(msg.progress);
      } else if (msg.action === "leadStatus") {
        setLeadStatuses((prev) => ({ ...prev, [msg.lead]: msg.status }));
      } else if (msg.action === "submitComplete") {
        setIsSubmitting(false);
        if (msg.failedLeads && msg.failedLeads.length > 0) {
          alert(`Finished with ${msg.failedLeads.length} failed submission(s).`);
        }
      }
    };

    if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.onMessage) {
      chrome.runtime.onMessage.addListener(handleBackgroundMessages);
    }
    return () => {
      if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.onMessage) {
        chrome.runtime.onMessage.removeListener(handleBackgroundMessages);
      }
    };
  }, []);

  const handleAutoSubmit = async (e) => {
    e.preventDefault();
    if (leads.length === 0 || isSubmitting) return;

    const wsId = activeWorkspace?.id || activeSheet?.workspaceId || "default";
    const crm = activeWorkspace?.integrations?.crm365;
    const isCrmReady = Boolean(crm?.isEnabled && crm?.apiKey);
    const isSheetReady = Boolean(activeSheet?.baseUrl && activeSheet?.leadEntryKey);

    if (!isCrmReady && !isSheetReady) {
      showToast("Please enable 365 CRM or connect a Google Sheet in Integrations.", "error");
      return;
    }

    setIsSubmitting(true);
    setSubmitProgress(0);
    setLeadStatuses({});

    // 1. Sync to 365 CRM if configured
    if (isCrmReady) {
      for (let i = 0; i < leads.length; i++) {
        const leadItem = leads[i];
        try {
          setLeadStatuses((prev) => ({ ...prev, [leadItem]: { status: "filling" } }));

          let name = leadItem;
          let phone = leadItem;
          if (leadItem.includes("•")) {
            const parts = leadItem.split("•");
            name = parts[0].trim();
            phone = parts[1].trim();
          }

          const phoneDigits = phone.replace(/\D/g, "");
          if (phoneDigits.length < 7) {
            throw new Error(`365 CRM requires a valid mobile number with digits, but got name "${leadItem}". Please edit to add phone.`);
          }

          const leadPayload = {
            phone: phoneDigits,
            name: name,
            label: (crm?.label && crm.label !== "Hero Motors" && crm.label !== "Main Workspace") ? crm.label : "WhatsApp",
            capturedBy: activeUser !== "ALL" ? activeUser : "Admin",
            sheetName: activeSheet?.name || activeWorkspace?.name || "WhatsApp Leads",
          };

          if (crm?.apiKey) {
            await syncLeadToCRM365(crm, leadPayload);
          } else {
            await syncLeadToCRM(wsId, leadPayload);
          }
          setLeadStatuses((prev) => ({ ...prev, [leadItem]: { status: "done" } }));
          setSubmitProgress(i + 1);
        } catch (err) {
          console.error("CRM sync error:", err);
          const errorMsg = err.message || "Failed to sync to 365 CRM";
          setLeadStatuses((prev) => ({
            ...prev,
            [leadItem]: { status: "error", error: errorMsg },
          }));
          showToast(`Lead "${leadItem}" failed: ${errorMsg}`, "error");
        }

        // Rate limit: 1 at a time with 1200ms delay between consecutive submissions
        if (i < leads.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 1200));
        }
      }
    }

    // 2. Submit to Google Sheet if configured
    if (isSheetReady) {
      const sheetConfigPayload = {
        baseUrl: activeSheet.baseUrl,
        leadEntryKey: activeSheet.leadEntryKey,
        fieldValues: activeSheet.selectedValues || {},
      };

      if (typeof chrome !== "undefined" && chrome.runtime) {
        chrome.runtime.sendMessage({
          action: "startBulkSubmit",
          leads: leads,
          sheetConfig: sheetConfigPayload,
        });
      } else {
        let curr = 0;
        const interval = setInterval(() => {
          if (curr < leads.length) {
            setLeadStatuses((prev) => ({ ...prev, [leads[curr]]: "done" }));
            curr++;
            setSubmitProgress(curr);
          } else {
            clearInterval(interval);
            setIsSubmitting(false);
          }
        }, 400);
      }
    } else {
      setIsSubmitting(false);
      showToast(`Successfully synced ${leads.length} lead(s) to 365 CRM!`, "success");
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
    try {
      const refreshedSheets = await getSheets();
      setSheets(refreshedSheets);
    } catch {}
    showToast(`Workspace "${newWs.name}" (${newWs.workspaceCode || "Created"}) created successfully!`, "success");
  };

  // Sheet Modal Actions
  const handleOpenAddSheet = () => {
    setIsCreatingNewSheet(true);
    setEditingSheet(null);
    setIsSheetModalOpen(true);
  };

  const handleOpenEditSheet = () => {
    router.push("/settings");
  };

  const handleSaveSheetConfig = async (sheetData) => {
    if (isCreatingNewSheet) {
      const newSheetPayload = {
        name: sheetData.name,
        baseUrl: sheetData.baseUrl,
        leadEntryKey: sheetData.leadEntryKey,
        leadEntryLabel: sheetData.leadEntryLabel,
        assignedUsers: sheetData.assignedUsers,
        fields: sheetData.fields,
        selectedValues: sheetData.defaultValues,
      };

      try {
        const createdSheet = await createSheet(newSheetPayload);
        const updated = [...sheets, createdSheet];
        setSheets(updated);
        setActiveSheetId(createdSheet.id);
        setIsSheetModalOpen(false);
        showToast("Sheet created successfully!", "success");
      } catch (err) {
        console.error("DB create error:", err.message);
        showToast("Error creating sheet: " + err.message, "error");
      }
    } else if (editingSheet) {
      const updatePayload = {
        name: sheetData.name,
        baseUrl: sheetData.baseUrl,
        leadEntryKey: sheetData.leadEntryKey,
        leadEntryLabel: sheetData.leadEntryLabel,
        assignedUsers: sheetData.assignedUsers,
        fields: sheetData.fields,
        selectedValues: {
          ...sheetData.defaultValues,
          ...(editingSheet.selectedValues || {}),
        },
      };

      try {
        const updatedSheet = await updateSheet(editingSheet.id, updatePayload);
        const updated = sheets.map((s) => (s.id === editingSheet.id ? updatedSheet : s));
        setSheets(updated);
        setIsSheetModalOpen(false);
        showToast("Sheet updated successfully!", "success");
      } catch (err) {
        console.error("DB update error:", err.message);
        showToast("Error updating sheet: " + err.message, "error");
      }
    }
  };

  const handleUpdateSheet = async (sheetId, payload) => {
    try {
      const updatedSheet = await updateSheet(sheetId, payload);
      const updated = sheets.map((s) => (s.id === sheetId ? updatedSheet : s));
      setSheets(updated);
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

  const [editingMember, setEditingMember] = useState(null);

  const handleOpenAddMember = () => {
    setEditingMember(null);
    setIsAddMemberOpen(true);
  };

  const handleOpenEditMember = (member) => {
    setEditingMember(member);
    setIsAddMemberOpen(true);
  };

  const handleSaveMember = async (memberData) => {
    if (!activeSheet || !memberData) return;
    const memberObj =
      typeof memberData === "string"
        ? {
            id: `staff_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            name: memberData.trim(),
            phone: "",
            password: "",
            isActive: true,
            status: "active",
          }
        : {
            id: memberData.id || `staff_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            name: (memberData.name || "").trim(),
            phone: (memberData.phone || "").trim(),
            password: (memberData.password || "").trim(),
            isActive: Boolean(memberData.isActive),
            status: memberData.isActive ? "active" : "inactive",
          };

    if (!memberObj.name) return;

    const currentMembers = Array.isArray(activeSheet.assignedUsers) ? [...activeSheet.assignedUsers] : [];
    const normalized = currentMembers.map((m) =>
      typeof m === "string" ? { id: `m_${m}`, name: m, phone: "", password: "", isActive: true, status: "active" } : m
    );

    const existingIndex = normalized.findIndex(
      (m) => (memberObj.id && m.id === memberObj.id) || m.name.toLowerCase() === memberObj.name.toLowerCase()
    );

    let updatedMembers;
    if (existingIndex >= 0) {
      updatedMembers = normalized.map((m, idx) => (idx === existingIndex ? { ...m, ...memberObj } : m));
    } else {
      updatedMembers = [...normalized, memberObj];
    }

    await handleUpdateSheet(activeSheet.id, { assignedUsers: updatedMembers });
    showToast(
      existingIndex >= 0
        ? `Updated ${memberObj.name} in ${activeSheet.name}`
        : `Added ${memberObj.name} to ${activeSheet.name}`,
      "success"
    );
  };

  const handleToggleStatus = async (member) => {
    if (!activeSheet) return;
    const currentMembers = Array.isArray(activeSheet.assignedUsers) ? [...activeSheet.assignedUsers] : [];
    const normalized = currentMembers.map((m) =>
      typeof m === "string" ? { id: `m_${m}`, name: m, phone: "", password: "", isActive: true, status: "active" } : m
    );

    const targetId = member.id;
    const targetName = member.name;

    const updatedMembers = normalized.map((m) => {
      if ((targetId && m.id === targetId) || m.name === targetName) {
        const nextActive = !(m.isActive !== undefined ? m.isActive : m.status !== "inactive");
        return {
          ...m,
          isActive: nextActive,
          status: nextActive ? "active" : "inactive",
        };
      }
      return m;
    });

    await handleUpdateSheet(activeSheet.id, { assignedUsers: updatedMembers });
    const toggledItem = updatedMembers.find((m) => (targetId && m.id === targetId) || m.name === targetName);
    showToast(`${targetName} is now ${toggledItem?.isActive ? "Active" : "Inactive"}`, "info");
  };

  const handleDeleteMember = async (memberToDelete) => {
    if (!activeSheet) return;
    const memberName = typeof memberToDelete === "string" ? memberToDelete : memberToDelete.name;
    const memberId = typeof memberToDelete === "object" ? memberToDelete.id : null;

    if (confirm(`Remove "${memberName}" from ${activeSheet.name}?`)) {
      const currentMembers = Array.isArray(activeSheet.assignedUsers) ? activeSheet.assignedUsers : [];
      const updatedMembers = currentMembers.filter((m) => {
        if (typeof m === "string") return m !== memberName;
        if (memberId && m.id) return m.id !== memberId;
        return m.name !== memberName;
      });

      await handleUpdateSheet(activeSheet.id, { assignedUsers: updatedMembers });
      if (activeUser === memberName) {
        setActiveUser("ALL");
      }
      showToast(`Removed ${memberName} from ${activeSheet.name}`, "success");
    }
  };

  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 selection:bg-orange-100 selection:text-orange-900 font-sans">
        <div className="flex items-center gap-2.5 text-slate-500 font-semibold text-xs">
          <Loader2 className="w-5 h-5 animate-spin text-[#DE5437]" />
          <span>Loading Leadio workspace...</span>
        </div>
      </div>
    );
  }

  if (!loggedUser) {
    return (
      <div className="min-h-screen bg-slate-50">
        <StaffLoginView
          onLoginSuccess={handleLoginSuccess}
          onAdminLogin={handleAdminLogin}
        />
        {/* Floating Toast Notification */}
        {toast && (
          <div
            className={`fixed top-4 right-4 z-[9999] flex items-center gap-3 px-4 py-3 rounded-md shadow-xl border text-xs font-semibold backdrop-blur-md transition-all ${
              toast.type === "error"
                ? "bg-red-50/95 border-red-300 text-red-800 shadow-red-500/10"
                : toast.type === "success"
                ? "bg-emerald-50/95 border-emerald-300 text-emerald-800 shadow-emerald-500/10"
                : "bg-slate-900/95 border-slate-700 text-white shadow-black/20"
            }`}
            role="alert"
          >
            <span className="shrink-0">
              {toast.type === "error" ? (
                <AlertTriangle className="w-4 h-4 text-red-600" />
              ) : toast.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <Info className="w-4 h-4 text-blue-400" />
              )}
            </span>
            <span className="max-w-xs break-words leading-tight">{toast.message}</span>
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

  const isStaff = loggedUser?.role === "staff";

  return (
    <div className="min-h-screen bg-slate-50 w-full selection:bg-orange-100 selection:text-orange-900 font-sans antialiased">

      {/* Leadio Layout Shell: Sidebar + Content */}
      <div className="w-full flex min-h-screen bg-slate-50 relative">

        {/* Leadio Dedicated Sidebar (Persistent on desktop, drawer on mobile) */}
        <Sidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          workspaces={workspaces}
          activeWorkspace={activeWorkspace}
          activeWorkspaceId={activeWorkspaceId}
          onWorkspaceChange={handleWorkspaceChange}
          sheets={visibleSheets}
          activeSheet={activeSheet}
          activeSheetId={activeSheetId}
          onSheetChange={handleSheetChange}
          leadsCount={leads.length}
          teamCount={teamMembers.length}
          authUser={authUser}
          user={loggedUser}
          onLogout={handleLogout}
          activeUser={activeUser}
          onOpenAddSheet={isStaff ? undefined : handleOpenAddSheet}
          onOpenAddWorkspace={isStaff ? undefined : () => setIsCreateWorkspaceOpen(true)}
          isOpenMobile={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />

        {/* Main Content Area */}
        <div className={`flex-1 flex flex-col min-w-0 min-h-screen ${isStaff ? "pb-0" : "pb-16 lg:pb-0"}`}>

          {/* Top Bar with Sidebar Hamburger */}
          <Header
            authUser={authUser}
            user={loggedUser}
            activeUser={activeUser}
            teamMembers={teamMembers}
            onUserChange={handleUserChange}
            onOpenAddMember={handleOpenAddMember}
            onToggleSidebar={() => setIsMobileSidebarOpen(true)}
            onLogout={handleLogout}
          />

          {/* Tab Views */}
          <main className="flex-1 p-2.5 sm:p-4 lg:p-6 overflow-y-auto w-full min-w-0">
            {activeTab === "leads" && (
              <LeadsTab
                leads={leads}
                activeSheet={activeSheet}
                activeWorkspace={activeWorkspace}
                sheets={visibleSheets}
                activeSheetId={activeSheetId}
                onSheetChange={handleSheetChange}
                onUpdateFieldValue={handleUpdateFieldValue}
                onRemoveLead={handleRemoveLead}
                onClearLeads={handleClearLeads}
                onOpenAddLead={() => setIsAddLeadOpen(true)}
                onAutoSubmit={handleAutoSubmit}
                isSubmitting={isSubmitting}
                submitProgress={submitProgress}
                leadStatuses={leadStatuses}
                onOpenEditSheet={loggedUser?.role === "staff" ? undefined : handleOpenEditSheet}
                onOpenAddSheet={loggedUser?.role === "staff" ? undefined : handleOpenAddSheet}
                onNavigateTab={setActiveTab}
                onUpdateLead={handleUpdateLead}
                isStaff={isStaff}
              />
            )}

            {activeTab === "team" && (
              <TeamTab
                activeSheet={activeSheet}
                teamMembers={teamMembers}
                onOpenAddMember={handleOpenAddMember}
                onEditMember={handleOpenEditMember}
                onToggleStatus={handleToggleStatus}
                onDeleteMember={handleDeleteMember}
              />
            )}

            {activeTab === "reports" && (
              <div className="bg-white border border-slate-200 rounded-md p-6 shadow-2xs space-y-4">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-[#DE5437]" />
                  <h3 className="text-sm font-bold text-slate-900">Submission Reports &amp; Activity</h3>
                </div>
                <p className="text-xs text-slate-500">
                  Real-time analytics for WhatsApp leads pushed straight into Google Sheets.
                </p>
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="bg-orange-50 border border-orange-200 rounded-md p-3">
                    <span className="text-[11px] font-semibold text-orange-950 block">Queued Now</span>
                    <span className="text-2xl font-bold text-[#DE5437] mt-1 block">{leads.length}</span>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-200 rounded-md p-3">
                    <span className="text-[11px] font-semibold text-emerald-950 block">Connected Sheets</span>
                    <span className="text-2xl font-bold text-emerald-700 mt-1 block">{sheets.length}</span>
                  </div>
                </div>
              </div>
            )}

            {(activeTab === "settings" || activeTab === "config") && (
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
            )}

            {activeTab === "extension" && (
              <div className="bg-white border border-slate-200 rounded-md p-6 shadow-2xs space-y-4">
                <div className="flex items-center gap-2">
                  <Puzzle className="w-5 h-5 text-emerald-600" />
                  <h3 className="text-sm font-bold text-slate-900">Chrome Extension Integration</h3>
                </div>
                <div className="space-y-2 text-xs text-slate-600 leading-relaxed">
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md flex items-center justify-between">
                    <span className="font-semibold text-emerald-950">Content Script Status:</span>
                    <span className="font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full text-[10px]">
                      Active &amp; Ready
                    </span>
                  </div>
                  <p>
                    Open <strong>web.whatsapp.com</strong> in your browser. Checkboxes will appear alongside individual and group chats to queue leads with one tap.
                  </p>
                </div>
              </div>
            )}
          </main>

          {/* Bottom Tab Navigation Bar (Visible on mobile/extension sidepanel for admin only) */}
          {!isStaff && (
            <BottomNav
              activeTab={activeTab}
              onTabChange={setActiveTab}
              leadsCount={leads.length}
              sheetsCount={sheets.length}
              teamCount={teamMembers.length}
              isStaff={isStaff}
            />
          )}
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
          onClose={() => {
            setIsAddMemberOpen(false);
            setEditingMember(null);
          }}
          editingMember={editingMember}
          onAddMember={handleSaveMember}
          sheetName={activeSheet?.name}
        />

        <AddLeadModal
          isOpen={isAddLeadOpen}
          onClose={() => setIsAddLeadOpen(false)}
          onAddLead={handleAddLead}
        />

        {/* Floating Toast Notification */}
        {toast && (
          <div
            className={`fixed top-4 right-4 z-[9999] flex items-center gap-3 px-4 py-3 rounded-md shadow-xl border text-xs font-semibold backdrop-blur-md transition-all ${
              toast.type === "error"
                ? "bg-red-50/95 border-red-300 text-red-800 shadow-red-500/10"
                : toast.type === "success"
                ? "bg-emerald-50/95 border-emerald-300 text-emerald-800 shadow-emerald-500/10"
                : "bg-slate-900/95 border-slate-700 text-white shadow-black/20"
            }`}
            role="alert"
          >
            <span className="shrink-0">
              {toast.type === "error" ? (
                <AlertTriangle className="w-4 h-4 text-red-600" />
              ) : toast.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <Info className="w-4 h-4 text-blue-400" />
              )}
            </span>
            <span className="max-w-xs break-words leading-tight">{toast.message}</span>
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

export default function Home() {
  return <LeadsApp authUser={null} />;
}
