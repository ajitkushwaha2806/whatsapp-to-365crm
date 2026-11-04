// Leadio - DigitalMBG Main World Bridge
// Runs in the page's MAIN execution context to hook network responses & React Fiber
(function () {
  if (window.__leadio_bridge_injected) return;
  window.__leadio_bridge_injected = true;

  const contactsMap = {};

  // Load existing contacts from sessionStorage if available
  try {
    const saved = sessionStorage.getItem("leadio_mbg_phones");
    if (saved) {
      Object.assign(contactsMap, JSON.parse(saved));
    }
  } catch (e) {}

  function saveAndBroadcast() {
    try {
      sessionStorage.setItem("leadio_mbg_phones", JSON.stringify(contactsMap));
      window.postMessage({ type: "LEADIO_PHONE_MAP", phones: contactsMap }, "*");
    } catch (e) {}
  }

  function registerContact(name, phone) {
    if (!name || !phone) return;
    const cleanName = String(name).trim();
    const cleanPhone = String(phone).replace(/\D/g, "");
    if (cleanName.length >= 2 && cleanPhone.length >= 7 && cleanPhone.length <= 15) {
      if (contactsMap[cleanName] !== cleanPhone) {
        contactsMap[cleanName] = cleanPhone;
        saveAndBroadcast();
      }
    }
  }

  function scanObjectForContacts(obj, depth = 0) {
    if (!obj || depth > 8 || typeof obj !== "object") return;

    if (Array.isArray(obj)) {
      for (let i = 0; i < Math.min(obj.length, 120); i++) {
        scanObjectForContacts(obj[i], depth + 1);
      }
      return;
    }

    // Check direct properties on object
    const nameKeys = ["name", "contact_name", "contactName", "userName", "username", "customerName", "title", "pushname"];
    const phoneKeys = ["phone", "mobile", "phone_number", "phoneNumber", "wa_id", "waId", "jid", "sender", "recipient", "mobile_number", "user_phone"];

    let foundName = null;
    let foundPhone = null;

    for (const k of nameKeys) {
      if (typeof obj[k] === "string" && obj[k].trim()) {
        foundName = obj[k].trim();
        break;
      }
    }

    for (const k of phoneKeys) {
      if (obj[k]) {
        const str = String(obj[k]).replace(/\D/g, "");
        if (str.length >= 7 && str.length <= 15) {
          foundPhone = str;
          break;
        }
      }
    }

    if (foundName && foundPhone) {
      registerContact(foundName, foundPhone);
    }

    // Also check nested objects
    for (const key of Object.keys(obj)) {
      if (typeof obj[key] === "object" && obj[key] !== null && key !== "_owner" && key !== "stateNode") {
        scanObjectForContacts(obj[key], depth + 1);
      }
    }
  }

  // 1. Monkeypatch window.fetch
  const origFetch = window.fetch;
  if (typeof origFetch === "function") {
    window.fetch = async function (...args) {
      const response = await origFetch.apply(this, args);
      try {
        const clone = response.clone();
        clone
          .json()
          .then((data) => {
            scanObjectForContacts(data);
          })
          .catch(() => {});
      } catch (e) {}
      return response;
    };
  }

  // 2. Monkeypatch XMLHttpRequest
  const origOpen = XMLHttpRequest.prototype.open;
  const origSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (...args) {
    this._url = args[1];
    return origOpen.apply(this, args);
  };
  XMLHttpRequest.prototype.send = function (...args) {
    this.addEventListener("load", function () {
      try {
        if (this.responseText && (this.responseType === "" || this.responseType === "text")) {
          const data = JSON.parse(this.responseText);
          scanObjectForContacts(data);
        }
      } catch (e) {}
    });
    return origSend.apply(this, args);
  };

  // 3. Scan React Fiber on conversation elements
  function scanDOMFibers() {
    const els = document.querySelectorAll("[class*='conversation'], [class*='chat'], [role='listitem'], div.cursor-pointer");
    for (const el of els) {
      try {
        const k = Object.keys(el).find((key) => key.startsWith("__reactFiber$") || key.startsWith("__reactProps$"));
        if (k && el[k]) {
          const props = el[k].memoizedProps || el[k].props;
          if (props) scanObjectForContacts(props);
        }
      } catch (e) {}
    }
  }

  // Periodic fiber scan for elements already rendered
  setInterval(scanDOMFibers, 2000);
  setTimeout(scanDOMFibers, 500);

  // 4. Respond to query from content script
  window.addEventListener("message", (event) => {
    if (event.data?.type === "LEADIO_REQUEST_PHONES") {
      saveAndBroadcast();
    }
  });

  saveAndBroadcast();
})();

