if (!window.__APPLYFRIEND_ASSISTED_APPLY_READY__) {
  window.__APPLYFRIEND_ASSISTED_APPLY_READY__ = true;

  async function autofillApplyFriend(payload) {
    const { profile, application } = payload || (await window.ApplyFriendApi.getPreparedApplication());
    const fields = [...document.querySelectorAll("input:not([type=file]), textarea, select")];
    let filled = 0;

    for (const field of fields) {
      const type = String(field.getAttribute("type") || "").toLowerCase();
      if (["button", "submit", "reset", "hidden", "password"].includes(type)) continue;

      const label = window.ApplyFriendFieldMapping.labelFor(field);
      const value = window.ApplyFriendFieldMapping.valueFor(label, profile, application);
      if (!value) continue;

      if (type === "radio") {
        const choiceValue = window.ApplyFriendFieldMapping.choiceValueFor(label, profile, application);
        const optionText = window.ApplyFriendFieldMapping.optionTextFor(field);
        if (window.ApplyFriendFieldMapping.choiceMatches(optionText || field.value, choiceValue)) {
          setNativeChecked(field, true);
          filled += 1;
        }
        continue;
      }

      if (type === "checkbox") {
        const choiceValue = window.ApplyFriendFieldMapping.choiceValueFor(label, profile, application);
        const optionText = window.ApplyFriendFieldMapping.optionTextFor(field);
        if (window.ApplyFriendFieldMapping.isSafeCheckbox(label) && window.ApplyFriendFieldMapping.choiceMatches(optionText || field.value || label, choiceValue)) {
          setNativeChecked(field, true);
          filled += 1;
        }
        continue;
      }

      if (field.tagName === "SELECT") {
        const choiceValue = window.ApplyFriendFieldMapping.choiceValueFor(label, profile, application);
        const option = [...field.options].find((item) =>
          window.ApplyFriendFieldMapping.choiceMatches(`${item.text} ${item.value}`, choiceValue)
        );
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

  function setNativeChecked(field, value) {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "checked")?.set;
    if (setter) {
      setter.call(field, Boolean(value));
    } else {
      field.checked = Boolean(value);
    }
    field.dispatchEvent(new Event("input", { bubbles: true }));
    field.dispatchEvent(new Event("change", { bubbles: true }));
    field.dispatchEvent(new Event("blur", { bubbles: true }));
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.type !== "APPLYFRIEND_AUTOFILL" && message?.type !== "APPLYPILOT_AUTOFILL") return false;
    autofillApplyFriend(message.payload)
      .then((filled) => sendResponse({ ok: true, filled }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  });

  window.ApplyFriendApi.handoff().then((handoff) => {
    if (!handoff) return;
    [900, 2200, 4500, 7500].forEach((delay) => setTimeout(() => {
      autofillApplyFriend()
        .then((filled) => {
          window.__APPLYFRIEND_LAST_FILL_COUNT__ = Math.max(window.__APPLYFRIEND_LAST_FILL_COUNT__ || 0, filled);
        })
        .catch(() => {});
    }, delay));
  });
}
