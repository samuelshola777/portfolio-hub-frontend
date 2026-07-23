"use client";

/* eslint-disable @next/next/no-img-element */

import { FormEvent, type CSSProperties, useEffect, useMemo, useState } from "react";
import { API_BASE_URL, apiFetch } from "@/lib/api";
import type { PortfolioProfile, PortfolioTheme, ProfileEntryType } from "@/lib/portfolio";

type GitHubRepo = {
  name: string;
  description?: string;
  url: string;
  language?: string;
  stars: number;
  forks: number;
};

const themeLabels: Record<PortfolioTheme, string> = {
  orbit: "Orbit",
  editorial: "Editorial",
  spatial: "Spatial",
};
const sectionNames: Record<ProfileEntryType, string> = {
  EXPERIENCE: "Experience",
  EDUCATION: "Education",
  CERTIFICATION: "Certifications",
  ACHIEVEMENT: "Achievements",
  PROFESSIONAL_MEMBERSHIP: "Professional memberships",
  VOLUNTEER: "Volunteer work",
  LANGUAGE: "Languages",
  PUBLICATION: "Publications",
  RESEARCH: "Research",
  CONFERENCE_SPEAKING: "Conferences & speaking",
};

function groupBy<T, K extends PropertyKey>(items: T[], keyFor: (item: T) => K) {
  return items.reduce((groups, item) => {
    const key = keyFor(item);
    const current = groups.get(key) ?? [];
    current.push(item);
    groups.set(key, current);
    return groups;
  }, new Map<K, T[]>());
}

function formatDate(value?: string | null) {
  if (!value) return "Present";
  return new Intl.DateTimeFormat("en", { month: "short", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${value}T00:00:00Z`),
  );
}

function isVideo(url: string) {
  return /\.(mp4|webm|mov)(\?|$)/i.test(url);
}

export function PortfolioExperience({
  profile,
  initialTheme,
}: {
  profile: PortfolioProfile;
  initialTheme: PortfolioTheme;
}) {
  const [theme, setTheme] = useState(initialTheme);
  const [colorMode, setColorMode] = useState<"light" | "dark">(
    initialTheme === "editorial" ? "light" : "dark",
  );
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [showCv, setShowCv] = useState(false);
  const [gallery, setGallery] = useState<{ urls: string[]; index: number; title: string } | null>(
    null,
  );
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [enquiryStatus, setEnquiryStatus] = useState("");
  const groupedSkills = useMemo(
    () => groupBy(profile.skills, (skill) => skill.category),
    [profile.skills],
  );
  const entryGroups = useMemo(
    () =>
      groupBy(
        profile.profileEntries.filter((entry) => entry.published !== false),
        (entry) => entry.type,
      ),
    [profile.profileEntries],
  );
  const customStyle = {
    ...(profile.themeSettings?.accent
      ? { "--portfolio-accent": profile.themeSettings.accent }
      : {}),
    ...(profile.themeSettings?.background
      ? { "--portfolio-background": profile.themeSettings.background }
      : {}),
  } as CSSProperties;

  useEffect(() => {
    void track("VIEW", undefined, document.referrer || "Direct");
    if (profile.githubUsername) {
      apiFetch<GitHubRepo[]>(
        `/api/v1/github/public/${encodeURIComponent(profile.githubUsername)}/repositories`,
        {},
        false,
      ).then(({ response, result }) => {
        if (response.ok) setRepos(result.data ?? []);
      });
    }
    // This is intentionally once per public page load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.username, profile.githubUsername]);

  useEffect(() => {
    if (!gallery) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setGallery(null);
      if (event.key === "ArrowRight")
        setGallery((value) =>
          value ? { ...value, index: (value.index + 1) % value.urls.length } : value,
        );
      if (event.key === "ArrowLeft")
        setGallery((value) =>
          value
            ? { ...value, index: (value.index - 1 + value.urls.length) % value.urls.length }
            : value,
        );
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [gallery]);

  async function track(eventType: string, targetId?: string, source?: string) {
    await apiFetch(
      `/api/v1/analytics/public/${encodeURIComponent(profile.username)}/events`,
      {
        method: "POST",
        body: JSON.stringify({ eventType, targetId, source }),
        keepalive: true,
      },
      false,
    );
  }

  async function copyPortfolio() {
    await navigator.clipboard.writeText(window.location.href.split("?")[0]);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  function previewTheme(nextTheme: PortfolioTheme) {
    setTheme(nextTheme);
    const url = new URL(window.location.href);
    if (nextTheme === profile.theme) url.searchParams.delete("theme");
    else url.searchParams.set("theme", nextTheme);
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  }

  function toggleColorMode() {
    setColorMode((current) => (current === "dark" ? "light" : "dark"));
  }

  async function sendEnquiry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEnquiryStatus("Sending…");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const { response, result } = await apiFetch(
      `/api/v1/enquiries/public/${encodeURIComponent(profile.username)}`,
      {
        method: "POST",
        body: JSON.stringify({
          name: form.get("name"),
          email: form.get("email"),
          company: form.get("company"),
          message: form.get("message"),
        }),
      },
      false,
    );
    setEnquiryStatus(response.ok ? "Message sent. Thank you." : result.message);
    if (response.ok) formElement.reset();
  }

  const qrUrl = `${API_BASE_URL}/api/v1/portfolios/public/${encodeURIComponent(profile.username)}/qr`;
  const exportUrl = `${API_BASE_URL}/api/v1/portfolios/public/${encodeURIComponent(profile.username)}/export`;

  return (
    <main
      className={`portfolio-shell public-v2 theme-${theme} mode-${colorMode} font-${profile.themeSettings?.font?.toLowerCase() ?? "geist"} motion-${profile.themeSettings?.motion?.toLowerCase() ?? "full"}`}
      style={customStyle}
    >
      <header className="public-nav">
        <a href="#profile" className="public-brand">
          <strong>{profile.fullName}</strong>
          <span>{profile.headline}</span>
        </a>
        <nav>
          <a href="#projects">Projects</a>
          {profile.profileEntries.length > 0 && <a href="#background">Background</a>}
          {profile.skills.length > 0 && <a href="#skills">Skills</a>}
          <a href="#contact">Contact</a>
        </nav>
        <div className="public-nav-actions">
          <div className="public-theme-switcher" aria-label="Preview portfolio style">
            <span>Style</span>
            {(Object.keys(themeLabels) as PortfolioTheme[]).map((item) => (
              <button
                type="button"
                key={item}
                onClick={() => previewTheme(item)}
                className={theme === item ? "is-active" : ""}
                aria-pressed={theme === item}
              >
                {themeLabels[item]}
              </button>
            ))}
          </div>
          <button className="public-copy-button" type="button" onClick={copyPortfolio}>
            {copied ? "Link copied" : "Copy portfolio link"}
          </button>
          <button
            className="public-color-mode-button"
            type="button"
            onClick={toggleColorMode}
            aria-label={`Switch to ${colorMode === "dark" ? "light" : "dark"} mode`}
            aria-pressed={colorMode === "dark"}
          >
            <span aria-hidden="true">{colorMode === "dark" ? "☀" : "◐"}</span>
            {colorMode === "dark" ? "Light mode" : "Dark mode"}
          </button>
        </div>
      </header>

      <section className="public-hero" id="profile">
        <div className="public-hero-copy">
          <p className="availability">
            <i /> {profile.availability || "Open to opportunities"}
          </p>
          <h1>{profile.fullName}</h1>
          <h2>{profile.headline || "Professional portfolio"}</h2>
          {profile.introduction && <p>{profile.introduction}</p>}
          {profile.note && <blockquote>{profile.note}</blockquote>}
          <div className="public-actions">
            <a className="portfolio-primary" href="#projects">
              See my work <span>→</span>
            </a>
            {profile.cvUrl && (
              <button type="button" onClick={() => setShowCv(true)}>
                View CV <span>↗</span>
              </button>
            )}
            {profile.cvUrl && (
              <a
                href={profile.cvUrl}
                target="_blank"
                rel="noreferrer"
                download
                onClick={() => void track("CV_DOWNLOAD")}
              >
                Download CV <span>↓</span>
              </a>
            )}
            <a href={exportUrl} target="_blank" rel="noreferrer">
              Export portfolio PDF
            </a>
            <button type="button" onClick={() => setShowQr(true)}>
              Show QR code
            </button>
          </div>
          <div className="public-links">
            {profile.websiteUrl && (
              <a
                href={profile.websiteUrl}
                target="_blank"
                rel="noreferrer"
                onClick={() => void track("WEBSITE_CLICK")}
              >
                Personal website ↗
              </a>
            )}
            {profile.socialLinks.map((link) => (
              <a
                key={link.id}
                href={link.url}
                target="_blank"
                rel="noreferrer"
                onClick={() => void track("SOCIAL_CLICK", link.id)}
              >
                {link.platform} ↗
              </a>
            ))}
          </div>
        </div>
        <div className="public-portrait">
          {profile.avatarUrl ? (
            <div
              className="portrait-image"
              style={{ backgroundImage: `url(${profile.avatarUrl})` }}
              role="img"
              aria-label={`${profile.fullName} profile`}
            />
          ) : (
            <span>{profile.fullName.slice(0, 1)}</span>
          )}
        </div>
      </section>

      {profile.introVideoUrl && (
        <section className="intro-video">
          <div>
            <p>Quick introduction</p>
            <h2>Meet the person behind the work.</h2>
          </div>
          <video controls preload="metadata" src={profile.introVideoUrl}>
            Your browser cannot play this video.
          </video>
        </section>
      )}

      <section className="public-section" id="projects">
        <div className="section-title">
          <p>Selected work</p>
          <h2>Projects and case studies</h2>
          <span>
            {profile.works.length} project{profile.works.length === 1 ? "" : "s"}
          </span>
        </div>
        {profile.works.length === 0 ? (
          <p className="public-empty">Published projects will appear here.</p>
        ) : (
          <div className="case-study-list">
            {profile.works.map((work, index) => (
              <article className="case-study" id={work.slug} key={work.id}>
                <div
                  className="case-cover"
                  style={
                    work.thumbnailUrl
                      ? {
                          backgroundImage: `linear-gradient(120deg,rgba(7,17,31,.15),rgba(7,17,31,.65)),url(${work.thumbnailUrl})`,
                        }
                      : undefined
                  }
                >
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <small>{work.category}</small>
                </div>
                <div className="case-body">
                  <h3>{work.title}</h3>
                  <p className="case-summary">{work.summary}</p>
                  {work.description && <p>{work.description}</p>}
                  <div className="case-details">
                    {work.challenge && (
                      <div>
                        <strong>Challenge</strong>
                        <p>{work.challenge}</p>
                      </div>
                    )}
                    {work.process && (
                      <div>
                        <strong>Process</strong>
                        <p>{work.process}</p>
                      </div>
                    )}
                    {work.results && (
                      <div>
                        <strong>Result</strong>
                        <p>{work.results}</p>
                      </div>
                    )}
                  </div>
                  {work.technologyStack.length > 0 && (
                    <div className="tech-stack">
                      {work.technologyStack.map((tech) => (
                        <span key={tech}>{tech}</span>
                      ))}
                    </div>
                  )}
                  <div className="case-links">
                    {work.projectUrl && (
                      <a
                        href={work.projectUrl}
                        target="_blank"
                        rel="noreferrer"
                        onClick={() => void track("PROJECT_CLICK", work.id)}
                      >
                        Visit project ↗
                      </a>
                    )}
                    {work.sourceUrl && (
                      <a
                        href={work.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        onClick={() => void track("PROJECT_CLICK", work.id)}
                      >
                        View source ↗
                      </a>
                    )}
                  </div>
                  {work.galleryUrls.length > 0 && (
                    <div className="case-gallery">
                      {work.galleryUrls.map((url, galleryIndex) => (
                        <button
                          type="button"
                          key={url}
                          onClick={() =>
                            setGallery({
                              urls: work.galleryUrls,
                              index: galleryIndex,
                              title: work.title,
                            })
                          }
                          aria-label={`Open ${work.title} media ${galleryIndex + 1}`}
                        >
                          {isVideo(url) ? (
                            <video muted preload="metadata" src={url} />
                          ) : (
                            <div style={{ backgroundImage: `url(${url})` }} />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {profile.profileEntries.length > 0 && (
        <section className="public-section" id="background">
          <div className="section-title">
            <p>Professional background</p>
            <h2>Experience, education and recognition</h2>
          </div>
          <div className="background-columns">
            {(Object.keys(sectionNames) as ProfileEntryType[]).map((type) => {
              const entries = entryGroups.get(type) ?? [];
              if (entries.length === 0) return null;
              return (
                <div className="background-group" key={type}>
                  <h3>{sectionNames[type]}</h3>
                  {entries.map((entry) => (
                    <article key={entry.id}>
                      {entry.thumbnailUrl && (
                        <span
                          className="background-thumb"
                          style={{ backgroundImage: `url(${entry.thumbnailUrl})` }}
                        />
                      )}
                      <span>
                        {formatDate(entry.startDate)} —{" "}
                        {entry.current ? "Present" : formatDate(entry.endDate)}
                      </span>
                      <h4>{entry.title}</h4>
                      {entry.organization && <strong>{entry.organization}</strong>}
                      {entry.subtitle && <small>{entry.subtitle}</small>}
                      {entry.location && <small>{entry.location}</small>}
                      {entry.description && <p>{entry.description}</p>}
                      {entry.url && (
                        <a href={entry.url} target="_blank" rel="noreferrer">
                          View supporting details ↗
                        </a>
                      )}
                      {entry.supportingDocumentUrl && (
                        <a href={entry.supportingDocumentUrl} target="_blank" rel="noreferrer">
                          Open supporting document ↗
                        </a>
                      )}
                    </article>
                  ))}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {profile.skills.length > 0 && (
        <section className="public-section" id="skills">
          <div className="section-title">
            <p>Capabilities</p>
            <h2>Skills and tools</h2>
          </div>
          <div className="skill-groups">
            {Array.from(groupedSkills.entries()).map(([category, skills]) => (
              <div key={category}>
                <h3>{category}</h3>
                {skills.map((skill) => (
                  <article key={skill.id}>
                    {skill.iconUrl ? (
                      <span style={{ backgroundImage: `url(${skill.iconUrl})` }} />
                    ) : (
                      <b>{skill.name.slice(0, 2).toUpperCase()}</b>
                    )}
                    <div>
                      <strong>{skill.name}</strong>
                      <small>{skill.proficiency.toLowerCase()}</small>
                      <i>
                        <em
                          style={{
                            width: `${{ BEGINNER: 25, INTERMEDIATE: 50, ADVANCED: 75, EXPERT: 100 }[skill.proficiency]}%`,
                          }}
                        />
                      </i>
                    </div>
                  </article>
                ))}
              </div>
            ))}
          </div>
        </section>
      )}

      {repos.length > 0 && (
        <section className="public-section github-section">
          <div className="section-title">
            <p>GitHub</p>
            <h2>Recently updated repositories</h2>
          </div>
          <div className="repo-grid">
            {repos.map((repo) => (
              <a
                href={repo.url}
                target="_blank"
                rel="noreferrer"
                key={repo.name}
                onClick={() => void track("PROJECT_CLICK", `github:${repo.name}`)}
              >
                <strong>{repo.name}</strong>
                <p>{repo.description || "Open-source repository"}</p>
                <span>
                  {repo.language || "Code"} · ★ {repo.stars} · Forks {repo.forks}
                </span>
              </a>
            ))}
          </div>
        </section>
      )}

      <section className="public-contact" id="contact">
        <div>
          <p>Recruiter contact</p>
          <h2>Interested in working together?</h2>
          <span>
            Send a short message. It will appear securely in {profile.fullName.split(" ")[0]}’s
            portfolio dashboard.
          </span>
        </div>
        <form onSubmit={sendEnquiry}>
          <label>
            <span>Your name</span>
            <input name="name" required />
          </label>
          <label>
            <span>Work email</span>
            <input name="email" type="email" required />
          </label>
          <label>
            <span>Company (optional)</span>
            <input name="company" />
          </label>
          <label>
            <span>Message</span>
            <textarea name="message" required minLength={10} />
          </label>
          <button type="submit">Send message →</button>
          {enquiryStatus && <p role="status">{enquiryStatus}</p>}
        </form>
      </section>

      <footer className="public-footer">
        <span>{profile.fullName}</span>
        <button type="button" onClick={copyPortfolio}>
          {copied ? "Copied" : "Copy this portfolio"}
        </button>
        <small>Previewing {themeLabels[theme]} · The owner’s saved style remains unchanged.</small>
      </footer>

      {showQr && (
        <div className="qr-dialog" role="dialog" aria-modal="true" aria-label="Portfolio QR code">
          <div>
            <button type="button" onClick={() => setShowQr(false)} aria-label="Close">
              ×
            </button>
            <p>Scan to open this portfolio</p>
            <img src={qrUrl} alt={`QR code for ${profile.fullName}'s portfolio`} />
            <a href={qrUrl} download={`${profile.username}-qr.png`}>
              Save QR code
            </a>
          </div>
        </div>
      )}
      {showCv && profile.cvUrl && (
        <div
          className="cv-dialog"
          role="dialog"
          aria-modal="true"
          aria-label={`${profile.fullName}'s CV`}
          onClick={() => setShowCv(false)}
        >
          <div onClick={(event) => event.stopPropagation()}>
            <header>
              <div>
                <p>Curriculum vitae</p>
                <strong>{profile.fullName}</strong>
              </div>
              <button type="button" onClick={() => setShowCv(false)} aria-label="Close CV viewer">
                ×
              </button>
            </header>
            <iframe src={profile.cvUrl} title={`${profile.fullName}'s CV`} />
            <footer>
              <span>If the preview does not load, open the original PDF.</span>
              <a href={profile.cvUrl} target="_blank" rel="noreferrer">
                Open PDF in a new tab ↗
              </a>
            </footer>
          </div>
        </div>
      )}
      {gallery && (
        <div
          className="gallery-dialog"
          role="dialog"
          aria-modal="true"
          aria-label={`${gallery.title} media gallery`}
          onClick={() => setGallery(null)}
        >
          <div onClick={(event) => event.stopPropagation()}>
            <header>
              <strong>{gallery.title}</strong>
              <span>
                {gallery.index + 1} / {gallery.urls.length}
              </span>
              <button type="button" onClick={() => setGallery(null)} aria-label="Close gallery">
                ×
              </button>
            </header>
            <section>
              {isVideo(gallery.urls[gallery.index]) ? (
                <video controls autoPlay src={gallery.urls[gallery.index]} />
              ) : (
                <img
                  src={gallery.urls[gallery.index]}
                  alt={`${gallery.title} media ${gallery.index + 1}`}
                />
              )}
              <button
                type="button"
                onClick={() =>
                  setGallery((value) =>
                    value
                      ? {
                          ...value,
                          index: (value.index - 1 + value.urls.length) % value.urls.length,
                        }
                      : value,
                  )
                }
                aria-label="Previous media"
              >
                ←
              </button>
              <button
                type="button"
                onClick={() =>
                  setGallery((value) =>
                    value ? { ...value, index: (value.index + 1) % value.urls.length } : value,
                  )
                }
                aria-label="Next media"
              >
                →
              </button>
            </section>
            <footer>
              {gallery.urls.map((url, index) => (
                <button
                  type="button"
                  className={index === gallery.index ? "is-active" : ""}
                  key={url}
                  onClick={() => setGallery((value) => (value ? { ...value, index } : value))}
                >
                  {isVideo(url) ? <span>Video</span> : <img src={url} alt="" />}
                </button>
              ))}
            </footer>
          </div>
        </div>
      )}
    </main>
  );
}
