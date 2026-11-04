// Auto-submit Google Form responses when initiated by extension bulk submit
window.addEventListener('load', () => {
  const urlParams = new URLSearchParams(window.location.search);

  // AUTO SUBMIT: Fill options and submit form
  if (urlParams.get('auto_submit') === 'true') {
    if (window.location.pathname.endsWith('/viewform')) {
      setTimeout(() => {
        // Generic radio / checkbox / option selector
        const ensureOption = (expectedVal) => {
          if (!expectedVal) return;
          const target = expectedVal.trim().toLowerCase();
          if (!target) return;

          // Check radios
          const radios = Array.from(document.querySelectorAll('div[role="radio"]'));
          for (const radio of radios) {
            const val = (radio.getAttribute('data-value') || radio.innerText || '').trim().toLowerCase();
            if (
              val === target ||
              (target === 'whats app' && (val === 'whats app' || val === 'whatsapp')) ||
              (target.replace(/\s+/g, '') === val.replace(/\s+/g, ''))
            ) {
              if (radio.getAttribute('aria-checked') !== 'true') {
                radio.click();
              }
            }
          }

          // Check checkboxes
          const checkboxes = Array.from(document.querySelectorAll('div[role="checkbox"]'));
          for (const cb of checkboxes) {
            const val = (cb.getAttribute('data-value') || cb.innerText || '').trim().toLowerCase();
            if (
              val === target ||
              val.includes(target) ||
              (target.replace(/\s+/g, '') === val.replace(/\s+/g, ''))
            ) {
              if (cb.getAttribute('aria-checked') !== 'true') {
                cb.click();
              }
            }
          }
        };

        // Dynamically ensure ALL entry parameters present in the URL
        for (const [key, val] of urlParams.entries()) {
          if (key.startsWith('entry.') && val) {
            ensureOption(val);
          }
        }

        setTimeout(() => {
          // Find the submit button and click it
          const buttons = Array.from(document.querySelectorAll('div[role="button"], span[role="button"]'));
          const submitButton = buttons.find(b => {
            const txt = (b.innerText || '').toLowerCase();
            return (
              txt.includes('submit') ||
              txt.includes('enviar') ||
              txt.includes('kirim') ||
              txt.includes('soumettre') ||
              txt.includes('submit form')
            );
          }) || buttons[buttons.length - 1];
          
          if (submitButton) {
            submitButton.click();
          }
        }, 600);
      }, 1200);
    }
  }
});
