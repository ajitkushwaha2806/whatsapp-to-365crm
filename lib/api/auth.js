const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== "undefined" && window.location.origin.startsWith("http")
    ? window.location.origin
    : "https://whatsapp-to-365crm-ar8o.vercel.app");

/**
 * Admin Login
 */
export async function loginAdmin({ identifier, password }) {
  const res = await fetch(`${API_BASE_URL}/api/auth/admin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "login",
      identifier,
      password,
    }),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || "Failed to sign in as Admin");
  }
  return data;
}

/**
 * Admin Register
 */
export async function registerAdmin({ name, companyName, identifier, password }) {
  const res = await fetch(`${API_BASE_URL}/api/auth/admin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "register",
      name,
      companyName,
      identifier,
      password,
    }),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || "Failed to register Admin account");
  }
  return data;
}

/**
 * Staff Login
 */
export async function loginStaff({ workspaceId, phone, password }) {
  const res = await fetch(`${API_BASE_URL}/api/auth/staff-login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      workspaceId,
      sheetId: workspaceId,
      phone,
      password,
    }),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || "Failed to sign in as Staff");
  }
  return data;
}

