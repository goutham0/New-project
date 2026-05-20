"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

function DemoApplyFormInner() {
  const searchParams = useSearchParams();
  const title = searchParams.get("title") || "Sample role";
  const company = searchParams.get("company") || "Sample employer";

  return (
    <main className="auth-page demo-apply-page">
      <section className="auth-card demo-apply-card">
        <p className="eyebrow">Employer application form</p>
        <h1 style={{ fontSize: 34 }}>{title}</h1>
        <p>{company} application preview. Use the Apply Friend extension to autofill, then review every field before submitting.</p>

        <form className="form-grid two" onSubmit={(event) => event.preventDefault()}>
          <label>
            <span>First Name</span>
            <input name="first_name" autoComplete="given-name" />
          </label>
          <label>
            <span>Last Name</span>
            <input name="last_name" autoComplete="family-name" />
          </label>
          <label>
            <span>Email Address</span>
            <input name="email" type="email" autoComplete="email" />
          </label>
          <label>
            <span>Phone Number</span>
            <input name="phone" autoComplete="tel" />
          </label>
          <label>
            <span>City</span>
            <input name="city" autoComplete="address-level2" />
          </label>
          <label>
            <span>State</span>
            <input name="state" autoComplete="address-level1" />
          </label>
          <label>
            <span>Country</span>
            <select name="country">
              <option value="">Select</option>
              <option>United States</option>
              <option>Canada</option>
              <option>India</option>
            </select>
          </label>
          <label>
            <span>LinkedIn Profile</span>
            <input name="linkedin" type="url" />
          </label>
          <label>
            <span>Are you authorized to work in the United States?</span>
            <select name="work_authorization">
              <option value="">Select</option>
              <option>Yes</option>
              <option>No</option>
            </select>
          </label>
          <fieldset className="form-fieldset">
            <legend>Will you now or in the future require sponsorship?</legend>
            <label><input type="radio" name="sponsorship" value="Yes" /> Yes</label>
            <label><input type="radio" name="sponsorship" value="No" /> No</label>
          </fieldset>
          <label className="form-wide">
            <span>Why are you interested in this role?</span>
            <textarea name="why_interested" />
          </label>
          <label className="form-wide">
            <span>Cover Letter</span>
            <textarea name="cover_letter" />
          </label>
          <button className="primary-button" type="button">
            Demo submit
          </button>
        </form>
      </section>
    </main>
  );
}

export default function DemoApplyForm() {
  return (
    <Suspense fallback={null}>
      <DemoApplyFormInner />
    </Suspense>
  );
}
