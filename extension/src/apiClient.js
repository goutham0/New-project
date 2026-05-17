window.ApplyPilotApi = {
  handoffFromLocation() {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const token = params.get("applyfriend_token") || params.get("applypilot_token");
    const baseUrl = params.get("applyfriend_base") || params.get("applypilot_base");
    return token && baseUrl ? { token, baseUrl } : null;
  },

  async handoff() {
    const fromLocation = this.handoffFromLocation();
    if (fromLocation) {
      await chrome.storage.sync.set({
        applyPilotHandoffToken: fromLocation.token,
        applyPilotBaseUrl: fromLocation.baseUrl
      });
      return fromLocation;
    }
    const stored = await chrome.storage.sync.get(["applyPilotBaseUrl", "applyPilotHandoffToken"]);
    return stored.applyPilotBaseUrl && stored.applyPilotHandoffToken
      ? { baseUrl: stored.applyPilotBaseUrl, token: stored.applyPilotHandoffToken }
      : null;
  },

  async getPreparedApplication() {
    const handoff = await this.handoff();
    if (!handoff) {
      throw new Error("Click Prepare and open from Apply Friend before autofilling this page.");
    }
    const url = `${handoff.baseUrl}/api/extension/prepared-application?token=${encodeURIComponent(handoff.token)}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error("Unable to load prepared application. Go back to Apply Friend and click Prepare and open again.");
    }
    return response.json();
  }
};
