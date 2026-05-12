async function autofillApplyPilot() {
  const { profile, application } = await window.ApplyPilotApi.getPreparedApplication();
  const fields = [...document.querySelectorAll("input:not([type=file]), textarea, select")];
  let filled = 0;

  for (const field of fields) {
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

    field.value = value;
    field.dispatchEvent(new Event("input", { bubbles: true }));
    field.dispatchEvent(new Event("change", { bubbles: true }));
    filled += 1;
  }

  return filled;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== "APPLYPILOT_AUTOFILL") return false;
  autofillApplyPilot()
    .then((filled) => sendResponse({ ok: true, filled }))
    .catch((error) => sendResponse({ ok: false, error: error.message }));
  return true;
});
