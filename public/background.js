chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));

let isProcessing = false;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "startBulkSubmit") {
    if (!isProcessing) {
      processLeads(request.leads, request.sheetConfig, request.config);
    }
    sendResponse({ status: "started" });
  }

  if (request.action === "closeCurrentTab" && sender.tab?.id) {
    chrome.tabs.remove(sender.tab.id).catch(() => {});
    sendResponse({ status: "closed" });
  }
});

const encodeParam = (val) => {
  return encodeURIComponent(val || "")
    .replace(/%20/g, "+")
    .replace(/%2F/g, "/");
};

async function processLeads(leads, sheetConfig, legacyConfig) {
  isProcessing = true;
  const failedLeads = [];
  
  let baseUrl = sheetConfig?.baseUrl || "https://docs.google.com/forms/d/e/1FAIpQLScZQWrclxhIwodroutHS_SV9yWAjB2zJ3cbvPrSkAWocJuyoQ/viewform";
  let leadEntryKey = sheetConfig?.leadEntryKey || "entry.1473863196";
  let fieldValues = sheetConfig?.fieldValues || {};

  // Support legacy config structure if provided
  if (!sheetConfig && legacyConfig) {
    const source = legacyConfig.source || "Whats App";
    const filledBy = legacyConfig.filledBy || "Kapil";
    const taskName = legacyConfig.taskName || "Zomato/Swiggy Onboarding";
    fieldValues = {
      "entry.1495491036": filledBy,
      "entry.542174171": source,
      "entry.1788918737": taskName
    };
  }

  // Ensure clean base url without query string and strip accidental concatenated prefixes
  const lastHttp = Math.max(baseUrl.lastIndexOf("http://"), baseUrl.lastIndexOf("https://"));
  if (lastHttp > 0) {
    baseUrl = baseUrl.substring(lastHttp);
  }
  baseUrl = baseUrl.split('?')[0];
  if (baseUrl.includes("/forms/d/")) {
    baseUrl = baseUrl.replace(/\/edit\/?$/, "/viewform");
  }

  for (let i = 0; i < leads.length; i++) {
    const lead = leads[i];
    chrome.runtime.sendMessage({ action: "leadStatus", lead: lead, status: "submitting" });

    // Build URL query params dynamically
    const queryParts = ["usp=pp_url"];
    if (leadEntryKey) {
      queryParts.push(`${leadEntryKey}=${encodeParam(lead)}`);
    }
    for (const [key, val] of Object.entries(fieldValues)) {
      if (val && key !== leadEntryKey) {
        queryParts.push(`${key}=${encodeParam(val)}`);
      }
    }
    queryParts.push("auto_submit=true");

    const formUrl = `${baseUrl}?${queryParts.join("&")}`;

    try {
      // 1. Create a single background tab
      const tab = await chrome.tabs.create({ url: formUrl, active: false });
      
      // 2. Wait for it to submit and navigate to formResponse
      const success = await new Promise((resolve) => {
        let isResolved = false;
        
        // Safety timeout: force close and move on after 9 seconds no matter what
        const timeoutId = setTimeout(() => {
          if (!isResolved) {
            isResolved = true;
            chrome.tabs.remove(tab.id).catch(() => {});
            resolve(false); // FAILED
          }
        }, 9000);

        // Listen for tab navigation
        const updateListener = (tabId, changeInfo, updatedTab) => {
          if (tabId === tab.id && changeInfo.url) {
            // If it navigated to formResponse, submission was successful!
            if (changeInfo.url.includes("formResponse")) {
              isResolved = true;
              clearTimeout(timeoutId);
              chrome.tabs.onUpdated.removeListener(updateListener);
              // Wait a tiny bit then close
              setTimeout(() => {
                chrome.tabs.remove(tab.id).catch(() => {});
                resolve(true); // SUCCESS
              }, 500);
            }
          }
        };
        chrome.tabs.onUpdated.addListener(updateListener);
      });

      if (!success) {
        failedLeads.push(lead);
        chrome.runtime.sendMessage({ action: "leadStatus", lead: lead, status: "error" });
      } else {
        chrome.runtime.sendMessage({ action: "leadStatus", lead: lead, status: "success" });
      }

    } catch (e) {
      console.error("Error processing lead", lead, e);
      failedLeads.push(lead);
      chrome.runtime.sendMessage({ action: "leadStatus", lead: lead, status: "error" });
    }

    // 3. Notify sidebar of progress
    chrome.runtime.sendMessage({ action: "submitProgress", progress: i + 1 });

    // 4. Rate limit 1 at a time: pause for 1200ms before processing the next form submission
    if (i < leads.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 1200));
    }
  }

  isProcessing = false;
  chrome.runtime.sendMessage({ action: "submitComplete", failedLeads: failedLeads });
}
