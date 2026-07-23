"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";

type LandingTheme = "orbit" | "editorial" | "spatial";

const LANDING_THEME_KEY = "portfolio-landing-theme";
const LANDING_THEME_EVENT = "portfolio-landing-theme-change";

const features = [
  {
    eyebrow: "01 / Your identity",
    title: "One memorable link",
    copy: "Choose a unique username and share one polished home for your CV, experience and best work.",
  },
  {
    eyebrow: "02 / Your work",
    title: "Proof, not just claims",
    copy: "Add dated projects, outcomes, links, images, documents and videos—whatever your profession needs.",
  },
  {
    eyebrow: "03 / Your style",
    title: "Change the whole mood",
    copy: "Move between three responsive portfolio experiences, then tune the colours, type and motion.",
  },
];

const isLandingTheme = (value: string | null): value is LandingTheme =>
  value === "orbit" || value === "editorial" || value === "spatial";

function getLandingTheme(): LandingTheme {
  const savedTheme = window.localStorage.getItem(LANDING_THEME_KEY);
  return isLandingTheme(savedTheme) ? savedTheme : "editorial";
}

function subscribeToLandingTheme(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(LANDING_THEME_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(LANDING_THEME_EVENT, onStoreChange);
  };
}

export default function Home() {
  const theme = useSyncExternalStore(subscribeToLandingTheme, getLandingTheme, () => "editorial");

  function selectTheme(nextTheme: LandingTheme) {
    window.localStorage.setItem(LANDING_THEME_KEY, nextTheme);
    window.dispatchEvent(new Event(LANDING_THEME_EVENT));
  }

  return (
    <main className={`landing-shell landing-theme-${theme}`}>
      <nav className="landing-nav" aria-label="Primary navigation">
        <Link className="wordmark" href="/" aria-label="Portfolio Hub home">
          Portfolio<span>/</span>
        </Link>
        <div className="landing-nav-links">
          <a href="#how-it-works">How it works</a>
          <Link href="/guide">User guide</Link>
          <Link href="/assisted-setup">Get setup help</Link>
          <Link href="/login">Sign in</Link>
        </div>
        <Link className="nav-cta" href="/register">
          Create your portfolio <span aria-hidden="true">↗</span>
        </Link>
      </nav>

      <section className="landing-hero" aria-labelledby="landing-title">
        <div className="hero-copy">
          <p className="eyebrow">Portfolio infrastructure for every kind of work</p>
          <h1 id="landing-title">
            Your work deserves
            <span>more than a scroll.</span>
          </h1>
          <p className="hero-lede">
            Build a personal portfolio that feels like you. Share your CV, document what you have
            done and guide visitors through it with intention.
          </p>
          <div className="hero-actions">
            <Link className="button button-primary" href="/register">
              Start building <span aria-hidden="true">→</span>
            </Link>
            <Link className="button button-quiet" href="/guide">
              Explore how it works
            </Link>
            <Link className="button button-quiet" href="/assisted-setup">
              Ask an administrator to help
            </Link>
          </div>
          <div className="audience-line" aria-label="Suitable professions">
            <span>Engineering</span>
            <span>Design</span>
            <span>Writing</span>
            <span>Photography</span>
            <span>Consulting</span>
            <span>And more</span>
          </div>
        </div>

        <div className="hero-stage" aria-label="Choose a homepage style">
          <div className="stage-orbit" aria-hidden="true">
            <i />
            <i />
            <i />
          </div>
          <button
            type="button"
            className={`theme-peek theme-peek-orbit${theme === "orbit" ? " is-selected" : ""}`}
            aria-pressed={theme === "orbit"}
            onClick={() => selectTheme("orbit")}
          >
            <span className="theme-index">01</span>
            <span className="peek-visual peek-orbit-visual">
              <i />
            </span>
            <strong>Orbit</strong>
            <small>Focused · Immersive</small>
          </button>
          <button
            type="button"
            className={`theme-peek theme-peek-editorial${theme === "editorial" ? " is-selected" : ""}`}
            aria-pressed={theme === "editorial"}
            onClick={() => selectTheme("editorial")}
          >
            <span className="theme-index">02</span>
            <span className="peek-visual peek-editorial-visual">
              <i />
              <i />
            </span>
            <strong>Editorial</strong>
            <small>Warm · Expressive</small>
          </button>
          <button
            type="button"
            className={`theme-peek theme-peek-spatial${theme === "spatial" ? " is-selected" : ""}`}
            aria-pressed={theme === "spatial"}
            onClick={() => selectTheme("spatial")}
          >
            <span className="theme-index">03</span>
            <span className="peek-visual peek-spatial-visual">
              <i />
              <i />
              <i />
            </span>
            <strong>Spatial</strong>
            <small>Structured · Dynamic</small>
          </button>
          <p className="stage-note" aria-live="polite">
            {theme} style selected · choose another card to change the page
          </p>
        </div>
      </section>

      <section className="feature-strip" id="how-it-works" aria-label="How it works">
        {features.map((feature) => (
          <article key={feature.title}>
            <p>{feature.eyebrow}</p>
            <h2>{feature.title}</h2>
            <span>{feature.copy}</span>
          </article>
        ))}
      </section>
    </main>
  );
}
