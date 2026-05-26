"use client";

import { useState } from "react";

const feedbackTypes = ["Bug", "Feature Request", "Pricing", "Recruiter Support", "Extension Issue", "Other"];

export default function FeedbackForm() {
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setStatus("");
    const formData = new FormData(event.currentTarget);
    const payload = Object.fromEntries(formData.entries());
    const response = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    setBusy(false);
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setStatus(data.error || "Unable to submit feedback right now.");
      return;
    }
    event.currentTarget.reset();
    setStatus("Thanks for your feedback. Our team will review it.");
  }

  return (
    <form className="feedback-form premium-form" onSubmit={submit}>
      <label>
        <span>Name</span>
        <input name="name" placeholder="Your name" required />
      </label>
      <label>
        <span>Email</span>
        <input name="email" type="email" placeholder="you@example.com" required />
      </label>
      <label>
        <span>Feedback type</span>
        <select name="type" defaultValue="Feature Request">
          {feedbackTypes.map((type) => <option key={type}>{type}</option>)}
        </select>
      </label>
      <label>
        <span>Rating</span>
        <select name="rating" defaultValue="5">
          {["5", "4", "3", "2", "1"].map((rating) => <option key={rating} value={rating}>{rating}</option>)}
        </select>
      </label>
      <label className="form-wide">
        <span>Message</span>
        <textarea name="message" placeholder="Tell us what to improve or what went wrong." required />
      </label>
      <button className="primary-button" type="submit" disabled={busy}>
        {busy ? "Submitting" : "Submit feedback"}
      </button>
      {status && <p className={`status-line ${status.startsWith("Unable") ? "error-line" : ""}`}>{status}</p>}
    </form>
  );
}
