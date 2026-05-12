const baseUrl = document.querySelector("#base-url");
const statusEl = document.querySelector("#status");

chrome.storage.sync.get(["applyPilotBaseUrl"]).then((stored) => {
  if (stored.applyPilotBaseUrl) baseUrl.value = stored.applyPilotBaseUrl;
});

document.querySelector("#save").addEventListener("click", async () => {
  await chrome.storage.sync.set({ applyPilotBaseUrl: baseUrl.value.replace(/\/$/, "") });
  statusEl.textContent = "URL saved.";
});

document.querySelector("#autofill").addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const response = await chrome.tabs.sendMessage(tab.id, { type: "APPLYPILOT_AUTOFILL" });
  statusEl.textContent = response.ok ? `Filled ${response.filled} field(s).` : response.error;
});
