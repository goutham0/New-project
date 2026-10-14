const allowedOrigins = new Set(["https://www.applyfriend.com", "https://applyfriend.com", "http://localhost:3000"]);

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!["APPLYFRIEND_CAPTURE_HANDOFF", "APPLYFRIEND_FETCH_PACKAGE", "APPLYFRIEND_MARK_SUBMITTED"].includes(message?.type)) return false;
  (async () => {
    const tabId = sender.tab?.id ?? message.tabId;
    if (!Number.isInteger(tabId)) throw new Error("Open the employer application tab first.");
    const key = `handoff:${tabId}`;
    if (message.type === "APPLYFRIEND_CAPTURE_HANDOFF") {
      if (!allowedOrigins.has(message.baseUrl) || new URL(sender.url).origin !== message.baseUrl || typeof message.token !== "string") throw new Error("Invalid handoff origin.");
      await chrome.storage.session.set({ [key]: { baseUrl: message.baseUrl, token: message.token } });
      return { ok: true };
    }
    const stored = (await chrome.storage.session.get(key))[key];
    if (!stored || !allowedOrigins.has(stored.baseUrl) || !stored.token) {
      throw new Error("Open a prepared job from ApplyFriend first.");
    }
    if (message.type === "APPLYFRIEND_MARK_SUBMITTED") {
      if (sender.tab) throw new Error("Confirm submission from the extension popup.");
      const response = await fetch(`${stored.baseUrl}/api/extension/mark-submitted`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: stored.token }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to record submission.");
      return { ok: true, data };
    }
    const response = await fetch(`${stored.baseUrl}/api/extension/prepared-application?token=${encodeURIComponent(stored.token)}`, { cache: "no-store" });
    const data = await response.json();
    if (!response.ok || !data.application) throw new Error(data.error || "Prepared application not found.");
    return { ok: true, data };
  })().then(sendResponse).catch((error) => sendResponse({ ok: false, error: error.message }));
  return true;
});

chrome.tabs.onRemoved.addListener((tabId) => chrome.storage.session.remove(`handoff:${tabId}`));
