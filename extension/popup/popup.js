const statusEl = document.querySelector("#status");
const contentScriptFiles = ["src/fieldMappingEngine.js", "src/apiClient.js", "src/contentScript.js"];

document.querySelector("#autofill").addEventListener("click", async () => {
  try {
    statusEl.textContent = "Autofilling page...";
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    await ensureAutofillScripts(tab);
    const response = await chrome.tabs.sendMessage(tab.id, { type: "APPLYPILOT_AUTOFILL" });
    statusEl.textContent = response.ok ? `Filled ${response.filled} field(s). Review before submitting.` : response.error;
  } catch (error) {
    statusEl.textContent = error.message || "Autofill failed.";
  }
});

async function ensureAutofillScripts(tab) {
  if (!tab?.id || !/^https?:\/\//i.test(tab.url || "")) {
    throw new Error("Open the employer application page before clicking Autofill.");
  }

  for (const file of contentScriptFiles) {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: [file]
    });
  }
}
