/**
 * 365 CRM (https://www.api.365crm.io) Integration Client
 *
 * Endpoint: POST https://www.api.365crm.io/wpaddwebsiteleads
 * Headers:
 *   Authorization: <Your API Key>
 *   Content-Type: application/json
 * Body:
 *   customerName: string (Required)
 *   customerMobile: string (Required)
 *   customerEmail: string
 *   customerComment: string
 *   label: string
 */

const CRM_365_ENDPOINT = "https://www.api.365crm.io/wpaddwebsiteleads";

/**
 * Send a lead to 365 CRM API
 */
export async function syncLeadToCRM365(crmConfig, lead) {
  const apiKey = (crmConfig?.apiKey || "").trim();
  if (!apiKey) {
    throw new Error("365 CRM API Key is missing. Please configure your API Key in Workspace Integrations.");
  }

  const leadObj = typeof lead === "string" ? { phone: lead, name: lead } : lead || {};
  let customerMobile = (leadObj.phone || leadObj.customerMobile || "").trim();
  // Strip non-digit characters (spaces, +, -, parentheses) as 365 CRM API strictly requires pure digits
  customerMobile = customerMobile.replace(/\D/g, "");
  if (!customerMobile || customerMobile.length < 7) {
    throw new Error("Lead mobile number (customerMobile) must contain at least 7 digits for 365 CRM.");
  }

  const customerName = (leadObj.name || leadObj.customerName || customerMobile || "WhatsApp Lead").trim();
  const customerEmail = (leadObj.email || leadObj.customerEmail || "").trim();
  let label = (leadObj.label || crmConfig?.label || "WhatsApp").trim();
  if (!label || label.toLowerCase() === "hero motors" || label.toLowerCase() === "main workspace") {
    label = "WhatsApp";
  }

  // Combine comment details
  let customerComment = leadObj.comment || leadObj.customerComment || "";
  if (!customerComment) {
    const prefix = crmConfig.defaultComment || "Lead captured via Leadio";
    const details = [prefix];
    if (leadObj.notes) details.push(`Notes: ${leadObj.notes}`);
    if (leadObj.capturedBy) details.push(`Staff: ${leadObj.capturedBy}`);
    if (leadObj.sheetName) details.push(`Workspace: ${leadObj.sheetName}`);
    details.push(`Time: ${new Date().toLocaleString()}`);
    customerComment = details.join(" | ");
  }

  const payload = {
    customerName,
    customerMobile,
    customerEmail,
    customerComment,
    label,
  };

  const endpoint = (crmConfig?.apiUrl || CRM_365_ENDPOINT).trim();

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  const responseText = await response.text();
  let responseData;
  try {
    responseData = JSON.parse(responseText);
  } catch {
    responseData = { raw: responseText };
  }

  if (!response.ok) {
    throw new Error(
      responseData?.message || responseData?.error || `365 CRM API returned HTTP ${response.status}: ${responseText}`
    );
  }

  // 365 CRM returns HTTP 200 with { status: 0, description: "Please Enter Valid Mobile" } on validation failures
  if (responseData?.status === 0 || responseData?.status === "0" || responseData?.status === false) {
    throw new Error(
      responseData?.description || responseData?.message || "365 CRM rejected lead: Please enter a valid mobile number"
    );
  }

  return {
    success: true,
    data: responseData,
    payload,
  };
}

/**
 * Test 365 CRM API credentials with a validation ping
 */
export async function testCRM365Connection(crmConfig) {
  const apiKey = (crmConfig?.apiKey || "").trim();
  if (!apiKey) {
    return { success: false, error: "Please enter your 365 CRM API Key." };
  }

  try {
    const endpoint = (crmConfig?.apiUrl || CRM_365_ENDPOINT).trim();
    // Test with a validation probe ping
    const testPayload = {
      customerName: "Leadio Test Ping",
      customerMobile: "+10000000000",
      customerEmail: "test@leadio.app",
      customerComment: "API Key Connectivity Test from Leadio Extension",
      label: crmConfig.label || "Leadio Test",
    };

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(testPayload),
    });

    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    if (res.status === 401 || res.status === 403) {
      return { success: false, error: "Invalid API Key: Authentication failed (HTTP " + res.status + ")" };
    }

    if (!res.ok) {
      return {
        success: false,
        error: data?.message || data?.error || `HTTP ${res.status}: ${text}`,
      };
    }

    return {
      success: true,
      message: "Connected successfully to 365 CRM (https://www.api.365crm.io)!",
      data,
    };
  } catch (err) {
    return {
      success: false,
      error: err.message || "Failed to reach https://www.api.365crm.io",
    };
  }
}
