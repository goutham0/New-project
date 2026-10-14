window.ApplyFriendApi = {
  handoffFromLocation() {
    if (!["https://www.applyfriend.com", "https://applyfriend.com", "http://localhost:3000"].includes(window.location.origin)) return null;
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const token = params.get("applyfriend_token");
    const baseUrl = params.get("applyfriend_base");
    if (baseUrl && !["https://www.applyfriend.com", "https://applyfriend.com", "http://localhost:3000"].includes(baseUrl)) return null;
    return token && baseUrl ? { token, baseUrl } : null;
  },

  async handoff() {
    const fromLocation = this.handoffFromLocation();
    if (fromLocation) {
      await chrome.runtime.sendMessage({ type: "APPLYFRIEND_CAPTURE_HANDOFF", ...fromLocation });
      return fromLocation;
    }
    return null;
  },

  async getPreparedApplication() {
    const response = await chrome.runtime.sendMessage({ type: "APPLYFRIEND_FETCH_PACKAGE" });
    if (!response?.ok) throw new Error(response?.error || "Unable to fetch prepared application.");
    return response.data;
  }
};
