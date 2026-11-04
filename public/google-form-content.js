// Auto-fill and submit Google Form responses for Leadio extension
(function () {
  const urlParams = new URLSearchParams(window.location.search);
  const isAutoSubmit = urlParams.get("auto_submit") === "true";
  const hasPrefillParams = urlParams.get("usp") === "pp_url" || Array.from(urlParams.keys()).some(k => k.startsWith("entry."));

  // Only run on Google Form viewform pages
  if (!window.location.pathname.endsWith("/viewform")) return;
  if (!isAutoSubmit && !hasPrefillParams) return;

  console.log("[Leadio Form] Script initialized on Google Form:", window.location.href);

  function clickClean(el) {
    if (!el) return;
    el.scrollIntoView({ behavior: "instant", block: "center" });
    el.focus();
    const opts = { bubbles: true, cancelable: true, view: window };
    el.dispatchEvent(new PointerEvent("pointerdown", opts));
    el.dispatchEvent(new MouseEvent("mousedown", opts));
    el.dispatchEvent(new PointerEvent("pointerup", opts));
    el.dispatchEvent(new MouseEvent("mouseup", opts));
    el.dispatchEvent(new MouseEvent("click", opts));
    if (typeof el.click === "function") {
      el.click();
    }
  }

  // 1. Auto-dismiss "Continue current draft?" popup if Google Forms shows it
  function dismissDraftDialog() {
    const dialogs = document.querySelectorAll('div[role="dialog"], div[aria-modal="true"]');
    for (const dlg of dialogs) {
      const buttons = dlg.querySelectorAll('div[role="button"], span[role="button"], button');
      for (const btn of buttons) {
        const txt = (btn.innerText || btn.textContent || "").trim().toLowerCase();
        if (txt === "continue" || txt === "use previous draft" || txt.includes("continue")) {
          console.log("[Leadio Form] Dismissing draft modal:", txt);
          clickClean(btn);
          return true;
        }
      }
    }

    const allHeaders = Array.from(document.querySelectorAll("div, h2, span, p"));
    const hasDraftText = allHeaders.some((el) => {
      const t = (el.innerText || "").toLowerCase();
      return t.includes("continue current draft") || t.includes("previous draft of your form");
    });

    if (hasDraftText) {
      const buttons = document.querySelectorAll('div[role="button"], span[role="button"], button');
      for (const btn of buttons) {
        const txt = (btn.innerText || btn.textContent || "").trim().toLowerCase();
        if (txt === "continue" || txt === "use previous draft") {
          console.log("[Leadio Form] Dismissing draft via header match:", txt);
          clickClean(btn);
          return true;
        }
      }
    }
    return false;
  }

  // 2. Select option (radio, checkbox) matching target value
  function selectOption(expectedVal) {
    if (!expectedVal) return false;
    const target = expectedVal.trim().toLowerCase();
    if (!target) return false;
    const targetNoSpace = target.replace(/[\s\-_/]/g, "");

    // Strategy A: Find by div[role="radio"] or div[role="checkbox"]
    const optionElements = Array.from(
      document.querySelectorAll('div[role="radio"], div[role="checkbox"]')
    );

    for (const el of optionElements) {
      const dataVal = (el.getAttribute("data-value") || "").trim().toLowerCase();
      const ariaLabel = (el.getAttribute("aria-label") || "").trim().toLowerCase();
      const inner = (el.innerText || el.textContent || "").trim().toLowerCase();

      const valNoSpace = (dataVal || inner || ariaLabel).replace(/[\s\-_/]/g, "");

      const matches =
        dataVal === target ||
        ariaLabel === target ||
        inner === target ||
        valNoSpace === targetNoSpace ||
        (target.includes("whatsapp") && valNoSpace.includes("whatsapp")) ||
        (target.includes("onboarding") && valNoSpace.includes("onboarding")) ||
        (target.includes("kapil") && valNoSpace.includes("kapil"));

      if (matches) {
        if (el.getAttribute("aria-checked") !== "true") {
          clickClean(el);
        }
        return true;
      }
    }

    // Strategy B: Search label and text container spans inside question cards
    const textSpans = document.querySelectorAll("span, label, div");
    for (const span of textSpans) {
      if (span.children.length === 0) {
        const txt = (span.textContent || "").trim().toLowerCase();
        const spanNoSpace = txt.replace(/[\s\-_/]/g, "");

        const matches =
          txt === target ||
          spanNoSpace === targetNoSpace ||
          (target.includes("whatsapp") && spanNoSpace.includes("whatsapp")) ||
          (target.includes("onboarding") && spanNoSpace.includes("onboarding")) ||
          (target.includes("kapil") && spanNoSpace.includes("kapil"));

        if (matches) {
          const parentOption =
            span.closest(
              'label, div[role="radio"], div[role="checkbox"], .docssharedWizToggleLabeledContainer'
            ) || span.parentElement;
          if (parentOption) {
            const radioInside =
              parentOption.querySelector('div[role="radio"], div[role="checkbox"]') || parentOption;
            if (radioInside.getAttribute("aria-checked") !== "true") {
              clickClean(radioInside);
            }
            return true;
          }
        }
      }
    }

    return false;
  }

  // 3. Extract all target values from query params
  function getTargetValues() {
    const vals = [];
    for (const [key, val] of urlParams.entries()) {
      if ((key.startsWith("entry.") || /^\d+$/.test(key)) && val) {
        // Exclude pure phone numbers from radio selection
        const isPhone = /^[+0-9\s-]{7,15}$/.test(val.trim());
        if (!isPhone) {
          vals.push(val.trim());
        }
      }
    }
    return vals;
  }

  // 4. Automation execution loop with selection verification
  let step = 0;
  const maxSteps = 16; // 16 * 300ms = ~4.8s max

  function runAutomation() {
    step++;

    // Step 1: Always dismiss draft popup if visible
    dismissDraftDialog();

    const targets = getTargetValues();
    let allSatisfied = true;

    // Try selecting each target value from URL
    for (const val of targets) {
      const ok = selectOption(val);
      if (!ok) allSatisfied = false;
    }

    // Always ensure "Whats App" is selected for Lead Source if present
    selectOption("Whats App");

    // Ensure all required question cards have a selected option
    const questionItems = document.querySelectorAll('div[role="listitem"]');
    questionItems.forEach((q) => {
      const qText = q.innerText || q.textContent || "";
      const isRequired = q.querySelector('.exportStar, [aria-label*="required"]') || qText.includes("*");
      if (isRequired) {
        const radiosInQ = q.querySelectorAll('div[role="radio"]');
        if (radiosInQ.length > 0) {
          const hasChecked = Array.from(radiosInQ).some((r) => r.getAttribute("aria-checked") === "true");
          if (!hasChecked) {
            // Find "Whats App" or default to first radio in question
            const waRadio = Array.from(radiosInQ).find((r) => {
              const txt = (r.getAttribute("data-value") || r.innerText || r.textContent || "").toLowerCase();
              return txt.includes("whatsapp") || txt.includes("whats app");
            });
            if (waRadio) {
              console.log("[Leadio Form] Auto-selecting required Lead Source option: Whats App");
              clickClean(waRadio);
            } else {
              console.log("[Leadio Form] Auto-selecting first option for required question:", qText.slice(0, 30));
              clickClean(radiosInQ[0]);
            }
          }
        }
      }
    });

    // Wait until radio elements exist
    const radios = document.querySelectorAll('div[role="radio"]');
    if (radios.length === 0 && step < maxSteps) {
      setTimeout(runAutomation, 300);
      return;
    }

    // Check if target options are currently checked
    let checkedCount = 0;
    for (const r of radios) {
      if (r.getAttribute("aria-checked") === "true") {
        checkedCount++;
      }
    }

    // If options are selected, or we reached attempt limit, proceed to submit
    const readyToSubmit = isAutoSubmit && (checkedCount >= targets.length || step >= 8);

    if (readyToSubmit) {
      console.log(`[Leadio Form] All options verified (${checkedCount} checked). Submitting...`);
      // Allow 600ms for Google Forms internal state to register before clicking submit
      setTimeout(() => {
        dismissDraftDialog();

        // Final click on Submit button
        const buttons = Array.from(
          document.querySelectorAll('div[role="button"], span[role="button"], button')
        );
        const submitButton = buttons.find((b) => {
          const txt = (b.innerText || b.textContent || "").toLowerCase().trim();
          return (
            txt === "submit" ||
            txt === "submit form" ||
            txt === "enviar" ||
            txt === "kirim" ||
            txt === "soumettre" ||
            txt.includes("submit")
          );
        }) || buttons[buttons.length - 1];

        if (submitButton) {
          console.log("[Leadio Form] Clicking Submit button:", submitButton);
          clickClean(submitButton);
        }
      }, 600);
    } else if (step < maxSteps) {
      setTimeout(runAutomation, 300);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => setTimeout(runAutomation, 250));
  } else {
    setTimeout(runAutomation, 250);
  }
})();
