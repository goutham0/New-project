"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const links = [
  ["home", "Home"],
  ["features", "Features"],
  ["how", "How it works"],
  ["pricing", "Pricing"],
  ["testimonials", "Testimonials"],
  ["about", "About"],
  ["feedback", "Feedback"],
  ["settings", "Settings"],
  ["faq", "FAQ"]
];

export default function PublicNav({ isAuthenticated = false }) {
  const [active, setActive] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const sections = links
      .map(([id]) => document.getElementById(id))
      .filter(Boolean);

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target?.id) setActive(visible.target.id);
      },
      {
        rootMargin: "-28% 0px -58% 0px",
        threshold: [0.1, 0.35, 0.65]
      }
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  return (
    <header className={`topbar ${menuOpen ? "menu-open" : ""}`}>
      <Link className="brand" href="/">
        <span className="brand-mark">AF</span>
        <span>Apply Friend</span>
      </Link>
      <button
        className="mobile-menu-button"
        type="button"
        aria-label={menuOpen ? "Close menu" : "Open menu"}
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((current) => !current)}
      >
        <span />
        <span />
        <span />
      </button>
      <nav className="nav-links" aria-label="Public navigation">
        {links.map(([id, label]) => (
          <a
            className={active === id ? "active" : ""}
            href={`#${id}`}
            key={id}
            onClick={() => {
              setActive(id);
              setMenuOpen(false);
            }}
          >
            {label}
          </a>
        ))}
      </nav>
      <div className="actions">
        {isAuthenticated ? (
          <Link className="primary-button" href="/dashboard" onClick={() => setMenuOpen(false)}>Dashboard</Link>
        ) : (
          <>
            <Link className="secondary-button" href="/login" onClick={() => setMenuOpen(false)}>Login</Link>
            <Link className="primary-button" href="/signup" onClick={() => setMenuOpen(false)}>Get Started</Link>
          </>
        )}
      </div>
    </header>
  );
}
