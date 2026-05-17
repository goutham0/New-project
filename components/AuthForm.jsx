"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AuthForm({ mode }) {
  const router = useRouter();
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const isSignup = mode === "signup";

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setStatus("");
    const formData = new FormData(event.currentTarget);
    const payload = {
      name: String(formData.get("name") || ""),
      email: String(formData.get("email") || ""),
      password: String(formData.get("password") || "")
    };
    const response = await fetch(`/api/auth/${isSignup ? "signup" : "login"}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    setBusy(false);
    if (!response.ok) {
      setStatus(data.error || "Something went wrong.");
      return;
    }
    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <Link className="brand" href="/">
          <span className="brand-mark">A</span>
          <span>Apply Friend</span>
        </Link>
        <div style={{ height: 28 }} />
        <p className="eyebrow">{isSignup ? "Create account" : "Welcome back"}</p>
        <h1 style={{ fontSize: 38 }}>{isSignup ? "Signup" : "Login"}</h1>
        <p>
          {isSignup
            ? "Create your candidate account, then complete your profile and resume."
            : "Login to continue your job search workspace."}
        </p>
        <form className="form-grid" onSubmit={submit}>
          {isSignup && (
            <label>
              <span>Name</span>
              <input name="name" placeholder="Your name" />
            </label>
          )}
          <label>
            <span>Email</span>
            <input name="email" type="email" placeholder="you@example.com" required />
          </label>
          <label>
            <span>Password</span>
            <input name="password" type="password" minLength={8} placeholder="Minimum 8 characters" required />
          </label>
          <button className="primary-button" type="submit" disabled={busy}>
            {busy ? "Please wait" : isSignup ? "Create account" : "Login"}
          </button>
          {status && <p className="status-line error-line">{status}</p>}
        </form>
        <p style={{ marginTop: 18 }}>
          {isSignup ? "Already have an account? " : "Need an account? "}
          <Link className="text-button" href={isSignup ? "/login" : "/signup"}>
            {isSignup ? "Login" : "Signup"}
          </Link>
        </p>
      </section>
    </main>
  );
}
