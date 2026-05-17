"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const links = [
  ["about", "About"],
  ["how", "How it works"],
  ["pricing", "Pricing"],
  ["apply-modes", "Apply modes"]
];

export default function PublicNav({ isAuthenticated = false }) {
  const [active, setActive] = useState("");

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
    <header className="topbar">
      <Link className="brand" href="/">
        <span className="brand-mark">A</span>
        <span>Apply Friend</span>
      </Link>
      <nav className="nav-links" aria-label="Public navigation">
        {links.map(([id, label]) => (
          <a
            className={active === id ? "active" : ""}
            href={`#${id}`}
            key={id}
            onClick={() => setActive(id)}
          >
            {label}
          </a>
        ))}
      </nav>
      <div className="actions">
        {isAuthenticated ? (
          <Link className="primary-button" href="/dashboard">Dashboard</Link>
        ) : (
          <>
            <Link className="secondary-button" href="/login">Login</Link>
            <Link className="primary-button" href="/signup">Signup</Link>
          </>
        )}
      </div>
    </header>
  );
}
