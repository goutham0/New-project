const statusEl = document.querySelector("#status");
const contentScriptFiles = ["src/fieldMappingEngine.js", "src/apiClient.js", "src/contentScript.js"];

document.querySelector("#autofill").addEventListener("click", async () => {
  try {
    statusEl.textContent = "Autofilling page...";
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    await ensureAutofillScripts(tab);
    const response = await chrome.tabs.sendMessage(tab.id, { type: "APPLYFRIEND_AUTOFILL" });
    statusEl.textContent = response.ok ? `Filled ${response.filled} field(s). Review before submitting.` : response.error;
  } catch (error) {
    statusEl.textContent = error.message || "Autofill failed.";
  }
});

document.querySelector("#markSubmitted").addEventListener("click", async () => {
  try {
    statusEl.textContent = "Recording assisted submission...";
    const stored = await chrome.storage.sync.get([
      "applyFriendBaseUrl",
      "applyFriendHandoffToken"
    ]);
    const baseUrl = stored.applyFriendBaseUrl;
    const token = stored.applyFriendHandoffToken;
    if (!baseUrl || !token) {
      throw new Error("No prepared assisted application found. Open the job from Apply Friend first.");
    }
    const response = await fetch(`${baseUrl}/api/extension/mark-submitted`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token })
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || "Unable to mark submitted.");
    }
    statusEl.textContent = "Recorded as submitted in Apply Friend.";
  } catch (error) {
    statusEl.textContent = error.message || "Unable to record submission.";
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
