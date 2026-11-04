// API client for Sheets CRUD connected to MongoDB backend
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== "undefined" && window.location.origin.startsWith("http")
    ? window.location.origin
    : "http://localhost:3000");

// Persistent & In-memory cache for sheets across page switches
const sheetsCache = new Map();
const lastSheetsFetchTime = new Map();
const inFlightSheetsPromises = new Map();
const CACHE_TTL_MS = 60000;
const SHEETS_STORAGE_PREFIX = "leadio_cached_sheets_";

function getStoredSheets(key) {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SHEETS_STORAGE_PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.timestamp < CACHE_TTL_MS && Array.isArray(parsed.data)) {
      return parsed.data;
    }
  } catch {}
  return null;
}

function setStoredSheets(key, data) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(SHEETS_STORAGE_PREFIX + key, JSON.stringify({ data, timestamp: Date.now() }));
  } catch {}
}

function clearStoredSheets() {
  if (typeof window === "undefined") return;
  try {
    const keys = Object.keys(sessionStorage);
    for (const k of keys) {
      if (k.startsWith(SHEETS_STORAGE_PREFIX)) sessionStorage.removeItem(k);
    }
  } catch {}
}

export function invalidateSheetsCache() {
  sheetsCache.clear();
  lastSheetsFetchTime.clear();
  inFlightSheetsPromises.clear();
  clearStoredSheets();
}

/**
 * Fetch all sheets from DB
 */
export async function getSheets(workspaceId, options = {}) {
  const force = options?.force === true;
  const key = workspaceId || "__all__";
  const now = Date.now();

  if (!force && sheetsCache.has(key) && now - (lastSheetsFetchTime.get(key) || 0) < CACHE_TTL_MS) {
    return sheetsCache.get(key);
  }

  if (!force) {
    const stored = getStoredSheets(key);
    if (stored) {
      sheetsCache.set(key, stored);
      lastSheetsFetchTime.set(key, now);
      return stored;
    }
  }

  if (!force && inFlightSheetsPromises.has(key)) {
    return inFlightSheetsPromises.get(key);
  }

  const promise = (async () => {
    try {
      const url = new URL(`${API_BASE_URL}/api/sheets`);
      if (workspaceId) url.searchParams.append("workspaceId", workspaceId);

      const res = await fetch(url.toString(), {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to fetch sheets from DB");
      }
      const list = data.data || [];
      sheetsCache.set(key, list);
      lastSheetsFetchTime.set(key, Date.now());
      setStoredSheets(key, list);
      return list;
    } finally {
      inFlightSheetsPromises.delete(key);
    }
  })();

  inFlightSheetsPromises.set(key, promise);
  return promise;
}

/**
 * Create a new sheet in DB
 */
export async function createSheet(sheetData) {
  invalidateSheetsCache();
  const res = await fetch(`${API_BASE_URL}/api/sheets`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(sheetData),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || "Failed to create sheet in DB");
  }
  return data.data;
}

/**
 * Update an existing sheet in DB
 */
export async function updateSheet(id, sheetData) {
  invalidateSheetsCache();
  const res = await fetch(`${API_BASE_URL}/api/sheets/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(sheetData),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || "Failed to update sheet in DB");
  }
  return data.data;
}

/**
 * Delete a sheet from DB
 */
export async function deleteSheet(id) {
  invalidateSheetsCache();
  const res = await fetch(`${API_BASE_URL}/api/sheets/${id}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || "Failed to delete sheet from DB");
  }
  return data;
}

/**
 * Fetch staff for a specific sheet/workspace from API
 */
export async function getSheetStaff(sheetId) {
  const res = await fetch(`${API_BASE_URL}/api/sheets/${sheetId}/staff`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || "Failed to fetch staff from API");
  }
  return data.data;
}

/**
 * Add or update a staff member in a specific sheet workspace via API
 */
export async function saveStaffMember(sheetId, staffData) {
  const res = await fetch(`${API_BASE_URL}/api/sheets/${sheetId}/staff`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(staffData),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || "Failed to save staff member");
  }
  return data.data;
}

/**
 * Delete a staff member from a specific sheet workspace via API
 */
export async function deleteStaffMember(sheetId, staffIdOrName) {
  const res = await fetch(
    `${API_BASE_URL}/api/sheets/${sheetId}/staff?staffId=${encodeURIComponent(staffIdOrName)}`,
    {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    }
  );
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || "Failed to remove staff member");
  }
  return data.data;
}

/**
 * Log in a staff member with sheet ID, phone, and password
 */
export async function loginStaffMember({ sheetId, workspaceId, phone, name, password, identifier }) {
  const res = await fetch(`${API_BASE_URL}/api/auth/staff-login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sheetId: sheetId || workspaceId,
      phone: phone || identifier || name,
      password,
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || "Failed to log in");
  }
  return data;
}

