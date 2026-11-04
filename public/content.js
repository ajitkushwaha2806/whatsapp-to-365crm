// Leadio Universal Lead Selector (WhatsApp Web + DigitalMBG Chatbot)
console.log("[Leadio] Content script loaded on:", window.location.href);

const isDigitalMbg = window.location.hostname.includes("digitalmbg.com");
const isWhatsApp = window.location.hostname.includes("whatsapp.com");

// ==========================================
// 0. DIGITALMBG MAIN BRIDGE INJECTION & PHONES CACHE
// ==========================================
const mbgPhonesMap = {};

function loadCachedPhones() {
  try {
    const raw = sessionStorage.getItem("leadio_mbg_phones");
    if (raw) {
      const parsed = JSON.parse(raw);
      Object.assign(mbgPhonesMap, parsed);
    }
  } catch (e) {}
}

function saveCachedPhone(name, phone) {
  if (!name || !phone) return;
  const cleanPhone = String(phone).replace(/\D/g, "");
  if (cleanPhone.length >= 7) {
    mbgPhonesMap[name] = cleanPhone;
    try {
      sessionStorage.setItem("leadio_mbg_phones", JSON.stringify(mbgPhonesMap));
    } catch (e) {}
    autoUpgradeStoredLead(name, cleanPhone);
  }
}

if (isDigitalMbg) {
  loadCachedPhones();

  // Inject bridge script into page context as fallback
  try {
    const s = document.createElement("script");
    s.src = chrome.runtime.getURL("mbg-bridge.js");
    s.onload = () => s.remove();
    (document.head || document.documentElement).appendChild(s);
  } catch (e) {}

  // Listen for broadcast messages from bridge
  window.addEventListener("message", (event) => {
    if (event.data?.type === "LEADIO_PHONE_MAP" && event.data.phones) {
      Object.assign(mbgPhonesMap, event.data.phones);
      // Check if any existing leads need auto-upgrading
      for (const [name, phone] of Object.entries(event.data.phones)) {
        autoUpgradeStoredLead(name, phone);
      }
    }
  });

  // Request latest phones from bridge
  window.postMessage({ type: "LEADIO_REQUEST_PHONES" }, "*");
}

// Automatically upgrade a stored lead if phone was discovered later
function autoUpgradeStoredLead(name, phone) {
  if (!name || !phone) return;
  chrome.storage.local.get(["selectedLeads"], (result) => {
    const leads = result.selectedLeads || [];
    let updated = false;
    const newLeads = leads.map((lead) => {
      // If lead is just the bare name or without valid phone
      if (lead === name) {
        updated = true;
        return `${name} • ${phone}`;
      }
      return lead;
    });

    if (updated) {
      chrome.storage.local.set({ selectedLeads: newLeads });
    }
  });
}

// ==========================================
// 1. WHATSAPP WEB INJECTOR
// ==========================================
function cleanWhatsAppStr(s) {
  if (!s) return "";
  return String(s)
    .replace(/[\u200B-\u200D\uFEFF\u200E\u200F\u202A-\u202E]/g, "")
    .replace(/\u00A0/g, " ")
    .trim();
}

function extractWhatsAppRowContact(row) {
  // If this row is the "Archived" section button or a non-chat item
  const rowFullText = cleanWhatsAppStr(row.innerText || row.textContent || "").toLowerCase();
  if (
    rowFullText === "archived" ||
    rowFullText.startsWith("archived\n") ||
    rowFullText.startsWith("archived ") ||
    rowFullText.includes("archived chats")
  ) {
    const hasTime = /\b\d{1,2}:\d{2}\b|yesterday|\d{1,2}\/\d{1,2}\/\d{2,4}/i.test(rowFullText);
    if (!hasTime) return "Unknown";
  }

  // 1. TreeWalker over text nodes in row (find phone number or clean name first)
  const walker = document.createTreeWalker(row, NodeFilter.SHOW_TEXT);
  const textItems = [];
  let node;
  while ((node = walker.nextNode())) {
    const t = cleanWhatsAppStr(node.textContent);
    if (t) textItems.push(t);
  }

  // 1a. If any text node is explicitly a phone number (+91..., 92171..., etc.)
  for (const t of textItems) {
    const digits = t.replace(/\D/g, "");
    if (digits.length >= 10 && digits.length <= 15 && (/^\+/.test(t) || /^[0-9]/.test(t))) {
      return t;
    }
  }

  const ignoreRegex = /^(unread|read|delivered|pending|pinned|starred|lead|new order|typing\.\.\.|photo|voice call|video call|archived|archive|chats|status|channels|communities|search)$/i;

  // 1b. Check title attributes on contact name spans/headings (avoiding status/pin icons)
  const nameHeadings = row.querySelectorAll('span[title][dir="auto"], span[title]._ao3e, span[title]');
  for (const el of nameHeadings) {
    const raw = cleanWhatsAppStr(el.getAttribute("title"));
    if (
      raw &&
      raw.length >= 2 &&
      !ignoreRegex.test(raw) &&
      !raw.toLowerCase().includes("pinned") &&
      !raw.toLowerCase().includes("unread")
    ) {
      return raw;
    }
  }

  // 1c. Fallback: First text node that is not timestamp, badge, or message status
  for (const t of textItems) {
    const lower = t.toLowerCase();
    if (
      t.length >= 2 &&
      !/^\d{1,2}:\d{2}/.test(t) &&
      !/^(yesterday|today|sunday|monday|tuesday|wednesday|thursday|friday|saturday)$/i.test(t) &&
      !ignoreRegex.test(t) &&
      !lower.includes("started from an ad") &&
      !lower.startsWith("http")
    ) {
      return t;
    }
  }

  return "Unknown";
}

// Synchronous in-memory lead tracking to eliminate UI flicker / uncheck lag
let inMemoryLeads = [];

function isLeadSelected(contactName) {
  if (!contactName) return false;
  const cleanContact = cleanWhatsAppStr(contactName);
  return inMemoryLeads.some((l) => {
    const cleanL = cleanWhatsAppStr(l);
    return (
      cleanL === cleanContact ||
      cleanL.startsWith(cleanContact + " •") ||
      cleanL.includes(cleanContact)
    );
  });
}

function syncCheckboxesDOM() {
  document.querySelectorAll(".wa-lead-checkbox").forEach((cb) => {
    const name = cb.dataset.contactName;
    if (name) {
      const selected = isLeadSelected(name);
      if (cb.checked !== selected) {
        cb.checked = selected;
      }
    }
  });
  document.querySelectorAll(".leadio-mbg-checkbox").forEach((cb) => {
    const name = cb.dataset.contactName;
    if (name) {
      const selected = isLeadSelected(name);
      if (cb.checked !== selected) {
        cb.checked = selected;
      }
    }
  });
}

function injectWhatsAppCheckboxes() {
  // Clean up any stray checkboxes attached to outer/parent row containers
  document.querySelectorAll('#pane-side div[role="row"] > .wa-lead-checkbox').forEach((cb) => {
    if (cb.parentElement.querySelector('div[role="listitem"] .wa-lead-checkbox, div[data-testid="cell-frame-container"] .wa-lead-checkbox')) {
      cb.remove();
    }
  });

  // Query ONLY the most specific inner chat row container (never combining parent & child)
  let candidateRows = document.querySelectorAll('#pane-side div[role="listitem"]');
  if (!candidateRows || candidateRows.length === 0) {
    candidateRows = document.querySelectorAll('#pane-side div[data-testid="cell-frame-container"]');
  }
  if (!candidateRows || candidateRows.length === 0) {
    candidateRows = document.querySelectorAll('#pane-side div[role="row"]');
  }

  // Ensure no outer container is included if an inner container was already found
  const chatRows = Array.from(candidateRows).filter((row) => {
    return !row.querySelector('div[role="listitem"], div[data-testid="cell-frame-container"]');
  });

  chatRows.forEach((row) => {
    try {
      const contactName = extractWhatsAppRowContact(row);
      if (!contactName || contactName === "Unknown") {
        // If not a valid contact (e.g. Archived folder button), remove any accidental checkbox
        const stray = row.querySelector(".wa-lead-checkbox");
        if (stray) stray.remove();
        return;
      }

      // Extract phone if contactName is pure phone or if title has phone
      let leadValue = contactName;
      const phoneDigits = contactName.replace(/\D/g, "");
      if (phoneDigits.length < 7) {
        // Contact is a saved name, check if tooltip or subtext has phone
        const rowText = cleanWhatsAppStr(row.innerText || row.textContent || "");
        const m = rowText.match(/\+?[0-9]{10,14}/);
        if (m) {
          leadValue = `${contactName} • ${m[0].replace(/\D/g, "")}`;
        }
      }

      // Clean up any duplicate checkboxes within the same row
      const existingCheckboxes = row.querySelectorAll(".wa-lead-checkbox");
      if (existingCheckboxes.length > 1) {
        for (let i = 1; i < existingCheckboxes.length; i++) {
          existingCheckboxes[i].remove();
        }
      }
      let checkbox = existingCheckboxes[0];

      if (!checkbox) {
        checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.className = "wa-lead-checkbox";
        checkbox.dataset.contactName = contactName;
        checkbox.dataset.leadValue = leadValue;

        const stopEvt = (e) => {
          if (e) e.stopPropagation();
        };

        checkbox.addEventListener("mousedown", stopEvt);
        checkbox.addEventListener("mouseup", stopEvt);
        checkbox.addEventListener("pointerdown", stopEvt);
        checkbox.addEventListener("click", (e) => {
          e.stopPropagation();
          const isChecked = checkbox.checked;
          const currentContact = checkbox.dataset.contactName || contactName;
          const val = checkbox.dataset.leadValue || currentContact;
          console.log("[Leadio WA] Click toggle:", currentContact, "checked:", isChecked, "val:", val);
          if (isChecked) {
            addLead(val);
          } else {
            removeLead(currentContact);
          }
        });

        if (!row.classList.contains("wa-lead-row")) {
          row.classList.add("wa-lead-row");
        }
        row.insertBefore(checkbox, row.firstChild);
      } else {
        checkbox.dataset.contactName = contactName;
        checkbox.dataset.leadValue = leadValue;
      }

      const shouldBeChecked = isLeadSelected(contactName);
      if (checkbox.checked !== shouldBeChecked) {
        checkbox.checked = shouldBeChecked;
      }
    } catch (err) {
      // Safe catch per row
    }
  });
}

// ==========================================
// 2. DIGITALMBG CHATBOT INJECTOR & PHONE DETECTOR
// ==========================================

// Inspect the active chat view and right details panel
function inspectActiveChatDetails() {
  let activeName = null;
  let activePhone = null;

  // 1. Find active chat header/name
  const headerEls = document.querySelectorAll(
    'header span, header h1, header h2, header h3, [class*="chat-header"] span, aside h2, aside h3, [class*="contact-info"] h3'
  );
  for (const el of headerEls) {
    const text = el.textContent?.trim();
    if (text && text.length >= 2 && !/^(inbox|conversations|whatsapp|bot mode|human mode|open|closed)/i.test(text)) {
      if (!/^\d{1,2}:\d{2}/.test(text) && !/^\d+$/.test(text)) {
        activeName = text;
        break;
      }
    }
  }

  // 2. Scan right panel and DOM for "Phone" label and adjacent phone digits
  const allElements = document.querySelectorAll("p, span, div, dt, td, label");
  for (const el of allElements) {
    const text = el.textContent?.trim();
    if (text && (/^phone(\s*number)?$/i.test(text) || /^mobile(\s*number)?$/i.test(text) || /^contact$/i.test(text))) {
      // Check parent and ancestor containers
      let curr = el.parentElement;
      for (let depth = 0; depth < 4 && curr; depth++) {
        const full = curr.innerText || curr.textContent || "";
        const m = full.match(/(?:\+?\d{1,3}[-.\s]?)?([6-9]\d{9})\b/) ||
                  full.match(/\b(\d{10,13})\b/) ||
                  full.match(/\+?[0-9]{10,14}/);
        if (m) {
          const raw = (m[1] || m[0]).replace(/\D/g, "");
          if (raw.length >= 7 && raw.length <= 15) {
            activePhone = raw;
            break;
          }
        }
        curr = curr.parentElement;
      }
      if (activePhone) break;

      // Check next sibling
      const next = el.nextElementSibling;
      if (next) {
        const nText = next.innerText || next.textContent || "";
        const m = nText.match(/\b([6-9]\d{9})\b/) || nText.match(/\+?[0-9]{10,14}/);
        if (m) {
          activePhone = (m[1] || m[0]).replace(/\D/g, "");
          break;
        }
      }
    }
  }

  if (activeName && activePhone) {
    saveCachedPhone(activeName, activePhone);
  }

  return { activeName, activePhone };
}

// Periodically inspect active chat panel to auto-discover phone numbers
if (isDigitalMbg) {
  setInterval(inspectActiveChatDetails, 1500);
}

function findPhoneForDigitalMbg(card, contactName) {
  // 1. If contact name is already a valid phone number
  const directDigits = contactName.replace(/[\s-]/g, "");
  if (/^\+?[0-9]{7,15}$/.test(directDigits)) {
    return directDigits.replace(/\D/g, "");
  }

  // 2. Check local in-memory cache / sessionStorage
  loadCachedPhones();
  if (mbgPhonesMap[contactName]) {
    return mbgPhonesMap[contactName];
  }

  // 3. Check if active chat in right details panel matches this contact
  const active = inspectActiveChatDetails();
  if (active.activePhone) {
    if (!active.activeName || active.activeName.toLowerCase().includes(contactName.toLowerCase()) || contactName.toLowerCase().includes(active.activeName.toLowerCase())) {
      saveCachedPhone(contactName, active.activePhone);
      return active.activePhone;
    }
  }

  // 4. Check DOM attributes on card
  const allCardEls = [card, ...card.querySelectorAll("*")];
  for (const el of allCardEls) {
    if (el.attributes) {
      for (const attr of el.attributes) {
        if (/phone|mobile|jid|wa|leadio/i.test(attr.name)) {
          const m = attr.value.match(/\+?[0-9]{7,14}/);
          if (m) {
            const p = m[0].replace(/\D/g, "");
            saveCachedPhone(contactName, p);
            return p;
          }
        }
      }
    }
  }

  return null;
}

function extractDigitalMbgContact(card) {
  const walker = document.createTreeWalker(card, NodeFilter.SHOW_TEXT);
  const textItems = [];
  let node;
  while ((node = walker.nextNode())) {
    const t = node.textContent?.trim();
    if (t) textItems.push(t);
  }

  // 1. If any text item is explicitly a phone number, return it
  for (const t of textItems) {
    const digits = t.replace(/[\s-]/g, "");
    if (/^\+?[0-9]{10,14}$/.test(digits)) {
      return t;
    }
  }

  // 2. Filter out UI metadata, badges, and snippets
  const noiseKeywords = [
    "open", "bot mode", "human mode", "closed", "pending", "bot",
    "unread", "whatsapp sync", "all", "mine", "today", "yesterday",
    "select a conversations", "search conversations", "no messages yet..."
  ];

  const filtered = textItems.filter((t) => {
    const l = t.toLowerCase();
    if (noiseKeywords.includes(l)) return false;
    if (/^\d+[smhdw]$/i.test(l)) return false;
    if (/^\d{1,2}:\d{2}/.test(l)) return false;
    if (/^\d+$/.test(l) && l.length <= 2) return false;
    if (l.startsWith("hi ") || l.startsWith("hello ") || l.includes("raj motors")) return false;
    if (t.length <= 2) return false;
    return true;
  });

  if (filtered.length > 0) {
    return filtered[0];
  }

  for (const t of textItems) {
    if (t.length > 2 && !noiseKeywords.includes(t.toLowerCase())) {
      return t;
    }
  }

  return null;
}

function findDigitalMbgCards() {
  const cards = new Set();

  const allLeafEls = document.querySelectorAll("span, div, p, a, button, badge");
  for (const el of allLeafEls) {
    if (el.children.length === 0) {
      const txt = el.textContent?.trim();
      if (txt === "open" || txt === "Bot Mode" || txt === "Human Mode" || txt === "closed") {
        let curr = el;
        while (curr && curr !== document.body) {
          curr = curr.parentElement;
          if (!curr) break;
          const parent = curr.parentElement;
          if (parent && parent.children.length >= 2) {
            const rect = curr.getBoundingClientRect();
            if (rect.height >= 40 && rect.height <= 140 && rect.width >= 160) {
              cards.add(curr);
              break;
            }
          }
        }
      }
    }
  }

  if (cards.size === 0) {
    const candidateList = document.querySelectorAll(
      '[class*="conversation"], [class*="chat-item"], [class*="chatItem"], div.cursor-pointer, [role="listitem"], li'
    );
    for (const el of candidateList) {
      if (el.closest("header, [class*='sidebar-icons']")) continue;
      const rect = el.getBoundingClientRect();
      if (rect.height >= 40 && rect.height <= 140 && rect.width >= 160) {
        cards.add(el);
      }
    }
  }

  return Array.from(cards);
}

function triggerRealisticClick(card) {
  const clickable = card.querySelector("a, button, [role='button'], div.cursor-pointer") || card;
  const opts = { bubbles: true, cancelable: true, view: window };
  clickable.dispatchEvent(new MouseEvent("mousedown", opts));
  clickable.dispatchEvent(new MouseEvent("mouseup", opts));
  clickable.dispatchEvent(new MouseEvent("click", opts));
  if (clickable !== card) {
    card.click();
  }
}

function injectDigitalMbgCheckboxes() {
  const cards = findDigitalMbgCards();
  if (!cards || cards.length === 0) return;

  chrome.storage.local.get(["selectedLeads"], (result) => {
    const leads = result.selectedLeads || [];

    cards.forEach((card) => {
      const contact = extractDigitalMbgContact(card);
      if (!contact || contact.length < 2) return;

      let wrap = card.querySelector(".leadio-mbg-checkbox-wrap");
      let checkbox = card.querySelector(".leadio-mbg-checkbox");

      if (!wrap || !checkbox) {
        wrap = document.createElement("div");
        wrap.className = "leadio-mbg-checkbox-wrap";
        wrap.style.cssText = `
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          margin-right: 8px !important;
          margin-left: 4px !important;
          flex-shrink: 0 !important;
          z-index: 99999 !important;
          cursor: pointer !important;
        `;

        checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.className = "leadio-mbg-checkbox";
        checkbox.title = `Select ${contact} for Leadio`;
        checkbox.dataset.contactName = contact;
        checkbox.style.cssText = `
          width: 18px !important;
          height: 18px !important;
          min-width: 18px !important;
          min-height: 18px !important;
          cursor: pointer !important;
          accent-color: #DE5437 !important;
          display: block !important;
          opacity: 1 !important;
          visibility: visible !important;
          pointer-events: auto !important;
          margin: 0 !important;
        `;

        const stopAll = (e) => e.stopPropagation();
        checkbox.addEventListener("click", stopAll);
        checkbox.addEventListener("mousedown", stopAll);
        checkbox.addEventListener("mouseup", stopAll);
        wrap.addEventListener("click", stopAll);
        wrap.addEventListener("mousedown", stopAll);

        checkbox.addEventListener("change", (e) => {
          e.stopPropagation();
          const isChecked = e.target.checked;
          const currentContact = checkbox.dataset.contactName || contact;

          if (isChecked) {
            // Find phone number for this lead
            let phone = findPhoneForDigitalMbg(card, currentContact);

            if (phone) {
              addLead(`${currentContact} • ${phone}`);
              return;
            }

            // If not found yet, click the card to open it and poll the right details panel
            triggerRealisticClick(card);

            let attempts = 0;
            const maxAttempts = 12; // 12 * 100ms = 1.2s
            const pollInterval = setInterval(() => {
              attempts++;
              const detectedPhone =
                findPhoneForDigitalMbg(card, currentContact) ||
                inspectActiveChatDetails().activePhone;

              if (detectedPhone) {
                clearInterval(pollInterval);
                saveCachedPhone(currentContact, detectedPhone);
                addLead(`${currentContact} • ${detectedPhone}`);
                return;
              }

              if (attempts >= maxAttempts) {
                clearInterval(pollInterval);
                // Prompt user for mobile number so 365 CRM sync never fails
                const manual = prompt(
                  `Enter mobile number for "${currentContact}":\n(Required by 365 CRM for lead syncing)`,
                  ""
                );
                if (manual && manual.trim()) {
                  const cleaned = manual.trim().replace(/\D/g, "");
                  if (cleaned.length >= 7) {
                    saveCachedPhone(currentContact, cleaned);
                    addLead(`${currentContact} • ${cleaned}`);
                    return;
                  }
                }
                // If user cancelled, uncheck the box
                checkbox.checked = false;
              }
            }, 100);
          } else {
            removeLead(currentContact);
          }
        });

        wrap.appendChild(checkbox);

        let avatar = null;
        const allInner = card.querySelectorAll("div, span, img");
        for (const el of allInner) {
          const rect = el.getBoundingClientRect();
          if (rect.width >= 24 && rect.width <= 55 && rect.height >= 24 && rect.height <= 55) {
            avatar = el;
            break;
          }
        }

        if (avatar && avatar.parentElement) {
          avatar.parentElement.insertBefore(wrap, avatar);
        } else if (card.firstElementChild) {
          card.insertBefore(wrap, card.firstElementChild);
        } else {
          card.prepend(wrap);
        }
      } else {
        checkbox.dataset.contactName = contact;
      }

      checkbox.checked = leads.some(
        (l) => l === contact || l.startsWith(contact + " •") || l.includes(contact)
      );
    });
  });
}

// ==========================================
// 3. STORAGE HELPERS
// ==========================================
function addLead(leadStr) {
  if (!leadStr || !leadStr.trim()) return;
  const cleanLead = cleanWhatsAppStr(leadStr);
  const leadContact = cleanLead.split("•")[0].trim();
  console.log("[Leadio WA] Adding lead:", cleanLead);

  // Synchronous in-memory update prevents checkbox uncheck lag
  inMemoryLeads = inMemoryLeads.filter(
    (l) => l !== cleanLead && l !== leadContact && !l.startsWith(leadContact + " •")
  );
  inMemoryLeads.push(cleanLead);

  try {
    chrome.storage.local.set({ selectedLeads: inMemoryLeads }, () => {
      console.log("[Leadio WA] Saved to storage. Total leads:", inMemoryLeads.length);
    });
  } catch (err) {
    console.warn("[Leadio] Storage set error:", err);
  }

  try {
    chrome.runtime.sendMessage({ action: "leadAdded", lead: cleanLead, allLeads: inMemoryLeads }).catch(() => {});
  } catch (e) {}
}

function removeLead(contactName) {
  if (!contactName) return;
  const cleanName = cleanWhatsAppStr(contactName);
  console.log("[Leadio WA] Removing lead:", cleanName);

  // Synchronous in-memory update
  inMemoryLeads = inMemoryLeads.filter(
    (l) => l !== cleanName && !l.startsWith(cleanName + " •") && !l.includes(cleanName)
  );

  try {
    chrome.storage.local.set({ selectedLeads: inMemoryLeads }, () => {
      console.log("[Leadio WA] Removed from storage. Total leads:", inMemoryLeads.length);
    });
  } catch (err) {
    console.warn("[Leadio] Storage remove error:", err);
  }

  try {
    chrome.runtime.sendMessage({ action: "leadRemoved", contactName: cleanName, allLeads: inMemoryLeads }).catch(() => {});
  } catch (e) {}
}

// ==========================================
// 4. REAL-TIME STORAGE SYNC
// ==========================================
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "local" && changes.selectedLeads) {
    inMemoryLeads = changes.selectedLeads.newValue || [];
    syncCheckboxesDOM();
  }
});

// ==========================================
// 5. OBSERVER & INITIALIZATION
// ==========================================
let isInjecting = false;
let debounceTimer = null;

function triggerInject() {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    if (isInjecting) return;
    isInjecting = true;
    try {
      if (isWhatsApp) {
        injectWhatsAppCheckboxes();
      } else if (isDigitalMbg) {
        injectDigitalMbgCheckboxes();
      } else {
        injectWhatsAppCheckboxes();
        injectDigitalMbgCheckboxes();
      }
    } finally {
      setTimeout(() => {
        isInjecting = false;
      }, 250);
    }
  }, 200);
}

const observer = new MutationObserver((mutations) => {
  if (isInjecting) return;

  // Ignore mutations purely caused by our own injected checkboxes/classes
  let isOnlySelfMutation = true;
  for (const m of mutations) {
    const target = m.target;
    if (target && target.classList) {
      if (
        target.classList.contains("wa-lead-checkbox") ||
        target.classList.contains("wa-lead-row") ||
        target.classList.contains("leadio-mbg-checkbox") ||
        target.classList.contains("leadio-mbg-checkbox-wrap")
      ) {
        continue;
      }
    }
    isOnlySelfMutation = false;
    break;
  }

  if (!isOnlySelfMutation) {
    triggerInject();
  }
});

observer.observe(document.body, { childList: true, subtree: true });

// Load initial leads from storage before first inject
chrome.storage.local.get(["selectedLeads"], (res) => {
  if (res && Array.isArray(res.selectedLeads)) {
    inMemoryLeads = res.selectedLeads;
  }
  triggerInject();
});

setTimeout(triggerInject, 600);
setTimeout(triggerInject, 1500);
