window.ApplyPilotApi = {
  async baseUrl() {
    const stored = await chrome.storage.sync.get(["applyPilotBaseUrl"]);
    return stored.applyPilotBaseUrl || "http://localhost:3000";
  },

  async getPreparedApplication() {
    const baseUrl = await this.baseUrl();
    const response = await fetch(`${baseUrl}/api/extension/prepared-application`, {
      credentials: "include"
    });
    if (!response.ok) {
      throw new Error("Login to ApplyPilot in the same browser before assisted apply.");
    }
    return response.json();
  }
};
