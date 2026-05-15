const baseUrl = document.querySelector("#base-url");
const extensionToken = document.querySelector("#extension-token");
const statusEl = document.querySelector("#status");

chrome.storage.sync.get(["applyPilotBaseUrl", "applyPilotExtensionToken"]).then((stored) => {
  if (stored.applyPilotBaseUrl) baseUrl.value = stored.applyPilotBaseUrl;
  if (stored.applyPilotExtensionToken) extensionToken.value = stored.applyPilotExtensionToken;
});

document.querySelector("#save").addEventListener("click", async () => {
  await chrome.storage.sync.set({
    applyPilotBaseUrl: baseUrl.value.replace(/\/$/, ""),
    applyPilotExtensionToken: extensionToken.value.trim()
  });
  statusEl.textContent = "Connection saved.";
});

document.querySelector("#autofill").addEventListener("click", async () => {
  try {
    const base = baseUrl.value.replace(/\/$/, "");
    const token = extensionToken.value.trim();
    if (!token) {
      statusEl.textContent = "Paste your extension token first.";
      return;
    }

    statusEl.textContent = "Fetching prepared package...";
    const packageResponse = await fetch(`${base}/api/extension/prepared-application`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const payload = await packageResponse.json();
    if (!packageResponse.ok) {
      statusEl.textContent = payload.error || "Unable to fetch prepared package.";
      return;
    }
    if (!payload.application) {
      statusEl.textContent = "Prepare an assisted application first.";
      return;
    }

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const response = await chrome.tabs.sendMessage(tab.id, { type: "APPLYPILOT_AUTOFILL", payload });
    statusEl.textContent = response.ok ? `Filled ${response.filled} field(s).` : response.error;
  } catch (error) {
    statusEl.textContent = error.message || "Autofill failed.";
  }
});
