"use client";

import { useState } from "react";

export default function ExtensionSetup() {
  const [token, setToken] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [status, setStatus] = useState("");

  async function createToken() {
    setStatus("Creating extension connection...");
    const response = await fetch("/api/extension/token");
    const data = await response.json();
    if (!response.ok) {
      setStatus(data.error || "Login before connecting the extension.");
      return;
    }
    setToken(data.token);
    setBaseUrl(data.baseUrl);
    await navigator.clipboard?.writeText(data.token).catch(() => {});
    setStatus("Extension token created and copied. Paste it into the extension popup once.");
  }

  return (
    <div className="extension-steps">
      <button className="secondary-button" type="button" onClick={createToken}>
        Connect extension
      </button>
      {status && <p>{status}</p>}
      {token && (
        <div className="token-box">
          <label>
            Base URL
            <input value={baseUrl} readOnly />
          </label>
          <label>
            Extension token
            <textarea value={token} readOnly rows={3} />
          </label>
        </div>
      )}
    </div>
  );
}
