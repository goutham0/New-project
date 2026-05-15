if (!window.__APPLYPILOT_ASSISTED_APPLY_READY__) {
  window.__APPLYPILOT_ASSISTED_APPLY_READY__ = true;

  async function autofillApplyPilot(payload) {
    const { profile, application } = payload || (await window.ApplyPilotApi.getPreparedApplication());
    const fields = [...document.querySelectorAll("input:not([type=file]), textarea, select")];
    let filled = 0;

    for (const field of fields) {
      const type = String(field.getAttribute("type") || "").toLowerCase();
      if (["button", "submit", "reset", "hidden", "password", "checkbox", "radio"].includes(type)) continue;

      const label = window.ApplyPilotFieldMapping.labelFor(field);
      const value = window.ApplyPilotFieldMapping.valueFor(label, profile, application);
      if (!value) continue;

      if (field.tagName === "SELECT") {
        const option = [...field.options].find((item) => item.text.toLowerCase().includes(String(value).toLowerCase()));
        if (option) {
          field.value = option.value;
          field.dispatchEvent(new Event("change", { bubbles: true }));
          filled += 1;
        }
        continue;
      }

      setNativeValue(field, value);
      filled += 1;
    }

    return filled;
  }

  function setNativeValue(field, value) {
    const prototype = field.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
    if (setter) {
      setter.call(field, String(value));
    } else {
      field.value = String(value);
    }
    field.dispatchEvent(new Event("input", { bubbles: true }));
    field.dispatchEvent(new Event("change", { bubbles: true }));
    field.dispatchEvent(new Event("blur", { bubbles: true }));
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.type !== "APPLYPILOT_AUTOFILL") return false;
    autofillApplyPilot(message.payload)
      .then((filled) => sendResponse({ ok: true, filled }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  });

  window.ApplyPilotApi.handoff().then((handoff) => {
    if (!handoff) return;
    setTimeout(() => {
      autofillApplyPilot()
        .then((filled) => {
          window.__APPLYPILOT_LAST_FILL_COUNT__ = filled;
        })
        .catch(() => {});
    }, 1200);
  });
}
