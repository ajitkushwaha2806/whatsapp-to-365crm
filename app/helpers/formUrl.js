export const encodeParam = (val) => {
  return encodeURIComponent(val || "")
    .replace(/%20/g, "+")
    .replace(/%2F/g, "/");
};

const safeDecode = (str) => {
  try {
    return decodeURIComponent((str || "").replace(/\+/g, " "));
  } catch {
    return str || "";
  }
};

/**
 * Clean & sanitize any Google Form URL:
 * - Detects and repairs duplicated/concatenated URLs (e.g. https://...1FAIpQLShttps://docs.google.com/...)
 * - Converts /edit URLs to /viewform
 * - Extracts clean baseUrl
 */
export function cleanGoogleFormUrl(rawUrl) {
  if (!rawUrl) return "";
  let clean = rawUrl.trim();

  // If there's an accidental concatenated URL, take the last occurrence of http(s)://
  const lastHttp = clean.lastIndexOf("http://");
  const lastHttps = clean.lastIndexOf("https://");
  const lastIdx = Math.max(lastHttp, lastHttps);
  if (lastIdx > 0) {
    clean = clean.substring(lastIdx);
  }

  if (!clean.startsWith("http://") && !clean.startsWith("https://")) {
    clean = `https://${clean}`;
  }

  // Strip query string if needed
  const [urlWithoutQuery] = clean.split("?");

  // If it's an edit link: /forms/d/<id>/edit -> /forms/d/<id>/viewform
  let normalized = urlWithoutQuery;
  if (normalized.includes("/forms/d/")) {
    normalized = normalized.replace(/\/edit\/?$/, "/viewform");
  }

  return normalized;
}

export const generateFormUrlForLead = (leadName, targetSheet) => {
  if (!targetSheet) return "#";
  const baseUrl = cleanGoogleFormUrl(targetSheet.baseUrl || "");
  const queryParts = ["usp=pp_url"];

  if (targetSheet.leadEntryKey) {
    queryParts.push(`${targetSheet.leadEntryKey}=${encodeParam(leadName)}`);
  }

  const fieldVals = targetSheet.selectedValues || {};
  for (const [key, val] of Object.entries(fieldVals)) {
    if (val && key !== targetSheet.leadEntryKey) {
      queryParts.push(`${key}=${encodeParam(val)}`);
    }
  }

  return `${baseUrl}?${queryParts.join("&")}`;
};

export const detectFieldsFromUrl = (urlStr, teamMembers = [], existingLeadKey = "") => {
  if (!urlStr || !urlStr.trim()) {
    throw new Error("Please paste a Google Form prefilled link.");
  }

  let raw = urlStr.trim();
  const lastHttp = raw.lastIndexOf("http://");
  const lastHttps = raw.lastIndexOf("https://");
  const lastIdx = Math.max(lastHttp, lastHttps);
  if (lastIdx > 0) {
    raw = raw.substring(lastIdx);
  }
  if (!raw.startsWith("http://") && !raw.startsWith("https://")) {
    raw = `https://${raw}`;
  }

  const sanitized = cleanGoogleFormUrl(raw);
  let urlObj;
  try {
    urlObj = new URL(sanitized);
  } catch {
    throw new Error("Invalid Google Form URL format.");
  }

  let baseUrl = `${urlObj.origin}${urlObj.pathname}`;
  if (baseUrl.includes("/forms/d/")) {
    baseUrl = baseUrl.replace(/\/edit\/?$/, "/viewform");
  }

  // Parse query params from original urlStr if present
  let params = new URLSearchParams();
  try {
    const rawUrlObj = new URL(raw);
    params = rawUrlObj.searchParams;
  } catch {
    const queryPart = raw.includes("?") ? raw.split("?")[1] : "";
    params = new URLSearchParams(queryPart);
  }

  let leadEntryKey = existingLeadKey || "";
  let leadEntryLabel = "Customer Phone / WhatsApp Lead";
  let foundLead = Boolean(existingLeadKey);
  const fields = [];

  // Pass 1: detect phone-like field if not already provided
  if (!foundLead) {
    for (const [key, value] of params.entries()) {
      if (key.startsWith("entry.")) {
        const decodedVal = safeDecode(value).trim();
        const isPhoneLike = /^[+0-9\s-]{7,15}$/.test(decodedVal);
        if (isPhoneLike) {
          leadEntryKey = key;
          leadEntryLabel = "Customer Phone / WhatsApp Lead";
          foundLead = true;
          break;
        }
      }
    }
  }

  // Pass 2: collect question fields
  for (const [key, value] of params.entries()) {
    if (key.startsWith("entry.")) {
      if (key === leadEntryKey) {
        continue;
      }

      const decodedVal = safeDecode(value).trim();
      let label = key;
      const lowerVal = decodedVal.toLowerCase();
      if (lowerVal.includes("billing") || lowerVal.includes("software")) {
        label = "Lead Source";
      } else if (teamMembers.some((m) => (typeof m === "string" ? m : m.name || "").toLowerCase() === lowerVal)) {
        label = "Form Fill By";
      } else if (lowerVal.includes("onboarding") || lowerVal.includes("growth")) {
        label = "Service Required";
      } else {
        label = `Question (${key.replace("entry.", "#")})`;
      }

      fields.push({
        id: key,
        label: label,
        options: decodedVal ? [decodedVal] : [],
      });
    }
  }

  // If still no lead key found and there are fields, use first field as phone key
  if (!foundLead && !leadEntryKey && fields.length > 0) {
    const first = fields.shift();
    if (first) {
      leadEntryKey = first.id;
      leadEntryLabel = "Customer Phone / WhatsApp Lead";
    }
  }

  return {
    baseUrl,
    leadEntryKey,
    leadEntryLabel,
    fields,
  };
};

export function formatSheetId(sheet) {
  if (!sheet) return "WS-1001";
  if (typeof sheet === "object") {
    const raw = sheet.workspaceCode || sheet.sheetCode || (sheet.id ? sheet.id.replace(/^sheet_/, "") : "") || (sheet._id ? sheet._id.toString() : "");
    const clean = String(raw).replace(/^(ws|gs|sheet)[-_:\s]*/i, "").toUpperCase().slice(-4) || "1001";
    return `WS-${clean}`;
  }
  const str = String(sheet).trim();
  const clean = str.replace(/^(ws|gs|sheet)[-_:\s]*/i, "").toUpperCase().slice(-4) || "1001";
  return `WS-${clean}`;
}

export const formatWorkspaceId = formatSheetId;
