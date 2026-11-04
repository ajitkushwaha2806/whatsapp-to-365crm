/**
 * Workspace API Client
 * Provides CRUD methods for Workspaces, direct Workspace Staff,
 * Google Sheets integrations, and 365 CRM integrations.
 */

function getBaseUrl() {
  if (typeof window !== "undefined" && window.location.origin && window.location.origin.startsWith("http")) {
    return window.location.origin;
  }
  return process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BASE_URL || "https://whatsapp-to-365crm-ar8o.vercel.app";
}

// Persistent & In-memory cache to prevent redundant HTTP roundtrips when switching pages/tabs
const CACHE_KEY = "leadio_cached_workspaces";
const CACHE_TTL_MS = 60000; // 60 seconds TTL

let cachedWorkspaces = null;
let lastWorkspacesFetchTime = 0;
let inFlightWorkspacesPromise = null;

function getStoredCache() {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.timestamp < CACHE_TTL_MS && Array.isArray(parsed.data)) {
      return parsed.data;
    }
  } catch {}
  return null;
}

function setStoredCache(data) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
  } catch {}
}

function clearStoredCache() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(CACHE_KEY);
  } catch {}
}

export function invalidateWorkspacesCache() {
  cachedWorkspaces = null;
  lastWorkspacesFetchTime = 0;
  inFlightWorkspacesPromise = null;
  clearStoredCache();
}

export async function getWorkspaces(options = {}) {
  const force = options?.force === true;
  const now = Date.now();

  // 1. Check in-memory cache
  if (!force && cachedWorkspaces && now - lastWorkspacesFetchTime < CACHE_TTL_MS) {
    return cachedWorkspaces;
  }

  // 2. Check session storage cache (persists across page route navigations)
  if (!force) {
    const stored = getStoredCache();
    if (stored) {
      cachedWorkspaces = stored;
      lastWorkspacesFetchTime = now;
      return stored;
    }
  }

  // 3. Deduplicate concurrent requests (e.g. React StrictMode or multiple components mounting simultaneously)
  if (!force && inFlightWorkspacesPromise) {
    return inFlightWorkspacesPromise;
  }

  inFlightWorkspacesPromise = (async () => {
    try {
      const res = await fetch(`${getBaseUrl()}/api/workspaces`, {
        cache: "no-store",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to load workspaces");
      }
      const data = await res.json();
      const list = data.workspaces || [];
      cachedWorkspaces = list;
      lastWorkspacesFetchTime = Date.now();
      setStoredCache(list);
      return list;
    } finally {
      inFlightWorkspacesPromise = null;
    }
  })();

  return inFlightWorkspacesPromise;
}

export async function getWorkspace(id) {
  const res = await fetch(`${getBaseUrl()}/api/workspaces/${id}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to load workspace");
  }
  const data = await res.json();
  return data.workspace;
}

export async function createWorkspace(payload) {
  invalidateWorkspacesCache();
  const res = await fetch(`${getBaseUrl()}/api/workspaces`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || "Failed to create workspace");
  }
  return data.workspace;
}

export async function updateWorkspace(id, payload) {
  invalidateWorkspacesCache();
  const res = await fetch(`${getBaseUrl()}/api/workspaces/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || "Failed to update workspace");
  }
  return data.workspace;
}

export async function deleteWorkspace(id) {
  invalidateWorkspacesCache();
  const res = await fetch(`${getBaseUrl()}/api/workspaces/${id}`, {
    method: "DELETE",
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || "Failed to delete workspace");
  }
  return true;
}

// Workspace Staff (Belongs directly to Workspace!)
export async function getWorkspaceStaff(workspaceId) {
  const res = await fetch(`${getBaseUrl()}/api/workspaces/${workspaceId}/staff`, {
    cache: "no-store",
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || "Failed to fetch workspace staff");
  }
  return data.staff || [];
}

export async function saveWorkspaceStaff(workspaceId, memberData) {
  invalidateWorkspacesCache();
  const res = await fetch(`${getBaseUrl()}/api/workspaces/${workspaceId}/staff`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(memberData),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || "Failed to save staff member");
  }
  return data.staff || [];
}

export async function deleteWorkspaceStaff(workspaceId, memberId) {
  invalidateWorkspacesCache();
  const res = await fetch(
    `${getBaseUrl()}/api/workspaces/${workspaceId}/staff?memberId=${encodeURIComponent(memberId)}`,
    { method: "DELETE" }
  );
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || "Failed to delete staff member");
  }
  return data.staff || [];
}

// Google Sheet Integrations (Multiple sheets inside workspace)
export async function saveWorkspaceSheet(workspaceId, sheetData) {
  invalidateWorkspacesCache();
  const res = await fetch(`${getBaseUrl()}/api/workspaces/${workspaceId}/sheets`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(sheetData),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || "Failed to save Google Sheet integration");
  }
  return data.googleSheets || [];
}

export async function deleteWorkspaceSheet(workspaceId, sheetId) {
  invalidateWorkspacesCache();
  const res = await fetch(
    `${getBaseUrl()}/api/workspaces/${workspaceId}/sheets?sheetId=${encodeURIComponent(sheetId)}`,
    { method: "DELETE" }
  );
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || "Failed to delete sheet integration");
  }
  return data.googleSheets || [];
}

// 365 CRM Integration
export async function saveWorkspaceCRM(workspaceId, crmData) {
  invalidateWorkspacesCache();
  const res = await fetch(`${getBaseUrl()}/api/workspaces/${workspaceId}/crm`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(crmData),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || "Failed to save 365 CRM settings");
  }
  return data.crm365;
}

export async function testWorkspaceCRM(workspaceId, crmData) {
  const res = await fetch(`${getBaseUrl()}/api/workspaces/${workspaceId}/crm/test`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(crmData || {}),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || "Failed to connect to Dynamics 365");
  }
  return data;
}

export async function syncLeadToCRM(workspaceId, lead) {
  const res = await fetch(`${getBaseUrl()}/api/workspaces/${workspaceId}/crm/sync`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lead }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || "Failed to sync lead to Dynamics 365");
  }
  return data;
}

