"use client";

import { useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";

export default function AssistedHandoffClient() {
  const searchParams = useSearchParams();
  const targetUrl = useMemo(() => safeRedirectUrl(searchParams.get("to")), [searchParams]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      window.location.replace(targetUrl);
    }, 1800);
    return () => window.clearTimeout(timer);
  }, [targetUrl]);

  return (
    <main className="auth-page">
      <section className="auth-card">
        <p className="eyebrow">Assisted apply handoff</p>
        <h1 style={{ fontSize: 36 }}>Opening employer form</h1>
        <p>
          Apply Friend is connecting your prepared application to the Chrome extension, then opening the employer page.
        </p>
        <a className="primary-button" href={targetUrl} style={{ marginTop: 16, display: "inline-flex" }}>
          Continue now
        </a>
      </section>
    </main>
  );
}

function safeRedirectUrl(value) {
  try {
    const parsed = new URL(String(value || ""));
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.toString();
    }
  } catch {}
  return "/dashboard/assisted-apply";
}
