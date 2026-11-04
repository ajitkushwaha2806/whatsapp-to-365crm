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
  // 1. Check title attributes on spans/divs (common in WhatsApp)
  const titleEls = row.querySelectorAll('span[title], div[title]');
  for (const el of titleEls) {
    const raw = cleanWhatsAppStr(el.getAttribute("title"));
    if (
      raw &&
      raw.length >= 2 &&
      !/^(unread|read|delivered|pending|pinned|starred|lead|new order|typing...)$/i.test(raw)
    ) {
      return raw;
    }
  }

  // 2. TreeWalker over text nodes in row
  const walker = document.createTreeWalker(row, NodeFilter.SHOW_TEXT);
  const textItems = [];
  let node;
  while ((node = walker.nextNode())) {
    const t = cleanWhatsAppStr(node.textContent);
    if (t) textItems.push(t);
  }

  // 2a. Check if any text node is explicitly a phone number (e.g. +91 6352 188 727)
  for (const t of textItems) {
    const digits = t.replace(/\D/g, "");
    if (digits.length >= 10 && digits.length <= 15 && (/^\+/.test(t) || /^[0-9]/.test(t))) {
      return t;
    }
  }

  // 2b. Fallback: First text node that is not timestamp, badge, or message status
  for (const t of textItems) {
    if (
      t.length >= 2 &&
      !/^\d{1,2}:\d{2}/.test(t) &&
      !/^(yesterday|today|sunday|monday|tuesday|wednesday|thursday|friday|saturday)$/i.test(t) &&
      !/^(lead|new order|unread|typing...)$/i.test(t)
    ) {
      return t;
    }
  }

  return "Unknown";
}

function injectWhatsAppCheckboxes() {
  const chatRows = document.querySelectorAll(
    '#pane-side div[role="listitem"], #pane-side div[role="row"], #pane-side div[data-testid="cell-frame-container"]'
  );

  chrome.storage.local.get(["selectedLeads"], (result) => {
    const leads = result.selectedLeads || [];

    chatRows.forEach((row) => {
      try {
        const contactName = extractWhatsAppRowContact(row);
        if (!contactName || contactName === "Unknown") return;

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

        let checkbox = row.querySelector(".wa-lead-checkbox");

        const handleToggle = (e) => {
          if (e) {
            e.stopPropagation();
            if (e.cancelBubble !== undefined) e.cancelBubble = true;
          }
          const isChecked = checkbox.checked;
          const val = checkbox.dataset.leadValue || contactName;
          if (isChecked) {
            addLead(val);
          } else {
            removeLead(contactName);
          }
        };

        if (!checkbox) {
          checkbox = document.createElement("input");
          checkbox.type = "checkbox";
          checkbox.className = "wa-lead-checkbox";
          checkbox.dataset.contactName = contactName;
          checkbox.dataset.leadValue = leadValue;

          const stopEvt = (e) => {
            e.stopPropagation();
            if (e.cancelBubble !== undefined) e.cancelBubble = true;
          };

          checkbox.addEventListener("click", (e) => {
            stopEvt(e);
            setTimeout(() => handleToggle(e), 0);
          });
          checkbox.addEventListener("mousedown", stopEvt);
          checkbox.addEventListener("mouseup", stopEvt);
          checkbox.addEventListener("pointerdown", stopEvt);
          checkbox.addEventListener("change", handleToggle);

          row.classList.add("wa-lead-row");
          row.insertBefore(checkbox, row.firstChild);
        } else {
          checkbox.dataset.contactName = contactName;
          checkbox.dataset.leadValue = leadValue;
        }

        const cleanContact = cleanWhatsAppStr(contactName);
        checkbox.checked = leads.some((l) => {
          const cleanL = cleanWhatsAppStr(l);
          return (
            cleanL === cleanContact ||
            cleanL.startsWith(cleanContact + " •") ||
            cleanL.includes(cleanContact)
          );
        });
      } catch (err) {
        // Safe catch per row
      }
    });
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
  chrome.storage.local.get(["selectedLeads"], (result) => {
    let leads = result.selectedLeads || [];
    const leadContact = leadStr.split("•")[0].trim();
    // Remove old duplicate representation if exists
    leads = leads.filter((l) => l !== leadStr && l !== leadContact && !l.startsWith(leadContact + " •"));
    leads.push(leadStr);
    chrome.storage.local.set({ selectedLeads: leads });
  });
}

function removeLead(contactName) {
  if (!contactName) return;
  chrome.storage.local.get(["selectedLeads"], (result) => {
    let leads = result.selectedLeads || [];
    leads = leads.filter(
      (l) => l !== contactName && !l.startsWith(contactName + " •") && !l.includes(contactName)
    );
    chrome.storage.local.set({ selectedLeads: leads });
  });
}

// ==========================================
// 4. REAL-TIME STORAGE SYNC
// ==========================================
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "local" && changes.selectedLeads) {
    const newLeads = changes.selectedLeads.newValue || [];
    document.querySelectorAll(".wa-lead-checkbox, .leadio-mbg-checkbox").forEach((cb) => {
      const name = cb.dataset.contactName;
      if (name) {
        cb.checked = newLeads.some(
          (l) => l === name || l.startsWith(name + " •") || l.includes(name)
        );
      }
    });
  }
});

// ==========================================
// 5. OBSERVER & INITIALIZATION
// ==========================================
let debounceTimer = null;
function triggerInject() {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    if (isWhatsApp) {
      injectWhatsAppCheckboxes();
    } else if (isDigitalMbg) {
      injectDigitalMbgCheckboxes();
    } else {
      injectWhatsAppCheckboxes();
      injectDigitalMbgCheckboxes();
    }
  }, 100);
}

const observer = new MutationObserver(() => {
  triggerInject();
});

observer.observe(document.body, { childList: true, subtree: true });

triggerInject();
setTimeout(triggerInject, 800);
setTimeout(triggerInject, 1800);
setTimeout(triggerInject, 3500);
