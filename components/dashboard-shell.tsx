"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, clearAuth, getAccessToken, uploadFileWithProgress } from "@/lib/api";
import type { ProfileEntry, ProfileEntryType, PortfolioSkill, SocialLink } from "@/lib/portfolio";
import { PasswordField } from "@/components/password-field";
import { WorkspaceThemeToggle } from "@/components/workspace-theme-toggle";
import { BusinessDashboard } from "@/components/business-dashboard";
import { PortfolioBillingPanel } from "@/components/portfolio-billing-panel";

type User = {
  fullName: string;
  email: string;
  username: string;
  whatsAppNumber?: string | null;
  role: "USER" | "PROFESSIONAL" | "BUSINESS_OWNER" | "SUPER_ADMIN";
  status: string;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
};
type Portfolio = {
  id?: string;
  username?: string;
  headline: string;
  introduction: string;
  note: string;
  availability: string;
  avatarUrl?: string;
  cvUrl?: string;
  introVideoUrl?: string;
  websiteUrl?: string;
  githubUsername?: string;
  theme: "ORBIT" | "EDITORIAL" | "SPATIAL";
  accent?: string;
  background?: string;
  font: "GEIST" | "EDITORIAL" | "MONO";
  motion: "FULL" | "REDUCED" | "NONE";
  status: "DRAFT" | "PUBLISHED";
};
type Work = {
  id: string;
  title: string;
  slug: string;
  summary: string;
  description?: string;
  challenge?: string;
  process?: string;
  results?: string;
  category: string;
  role?: string;
  startedAt?: string | null;
  completedAt: string | null;
  ongoing: boolean;
  projectUrl?: string;
  sourceUrl?: string;
  thumbnailUrl?: string;
  galleryUrls: string[];
  technologyStack: string[];
  featured: boolean;
  sortOrder: number;
  status: "DRAFT" | "PUBLISHED";
};
type Asset = {
  id?: string;
  url: string;
  name: string;
  purpose: string;
  bytes: number;
  category: "IMAGE" | "VIDEO" | "DOCUMENT" | "AUDIO" | "OTHER";
};
type ManagedFile = {
  id: string;
  fileUrl: string;
  originalFileName: string;
  fileSizeBytes: number;
  category: string;
  usageType: string;
  createdAt: string;
};
type Analytics = {
  views: number;
  projectClicks: number;
  cvDownloads: number;
  socialClicks: number;
  websiteClicks: number;
  exportDownloads: number;
  enquiries: number;
  dailyViews: Array<{ date: string; value: number }>;
  trafficSources: Array<{ name: string; value: number }>;
  locations: Array<{ name: string; value: number }>;
  topProjects: Array<{ name: string; value: number }>;
};
type Enquiry = {
  id: string;
  name: string;
  email: string;
  company?: string;
  message: string;
  status: "NEW" | "READ" | "ARCHIVED";
  createdAt: string;
};
type Announcement = {
  recipientId: string;
  announcementId: string;
  subject: string;
  message: string;
  attachments: Array<{
    url: string;
    name: string;
    contentType?: string;
    size?: number;
  }>;
  createdAt: string;
  readAt?: string | null;
};
type AnnouncementPage = { items: Announcement[] };
type FeedbackItem = {
  id: string;
  category: string;
  subject: string;
  message: string;
  status: "OPEN" | "RESPONDED" | "CLOSED";
  adminResponse?: string | null;
  createdAt: string;
  respondedAt?: string | null;
};
type FeedbackPage = { items: FeedbackItem[] };
type ProfileContent = {
  entries: ProfileEntry[];
  skills: PortfolioSkill[];
  socialLinks: SocialLink[];
};
type Tab =
  | "Start"
  | "Profile"
  | "Background"
  | "Certifications"
  | "Skills"
  | "Projects"
  | "Files"
  | "Billing"
  | "Analytics"
  | "Enquiries"
  | "Announcements"
  | "Feedback"
  | "Security";

const nav: Array<{ tab: Tab; hint: string }> = [
  { tab: "Start", hint: "Your setup checklist" },
  { tab: "Profile", hint: "Photo, bio and links" },
  { tab: "Background", hint: "Experience and education" },
  { tab: "Certifications", hint: "Credentials and proof" },
  { tab: "Skills", hint: "Capabilities and levels" },
  { tab: "Projects", hint: "Case studies and links" },
  { tab: "Files", hint: "CV, images and video" },
  { tab: "Billing", hint: "Plan, renewal and payments" },
  { tab: "Analytics", hint: "Recruiter activity" },
  { tab: "Enquiries", hint: "Messages from recruiters" },
  { tab: "Announcements", hint: "Updates from Portfolio" },
  { tab: "Feedback", hint: "Complaints and suggestions" },
  { tab: "Security", hint: "Password and 2FA" },
];

const emptyPortfolio: Portfolio = {
  headline: "",
  introduction: "",
  note: "",
  availability: "",
  theme: "ORBIT",
  font: "GEIST",
  motion: "FULL",
  status: "PUBLISHED",
};
const emptyAnalytics: Analytics = {
  views: 0,
  projectClicks: 0,
  cvDownloads: 0,
  socialClicks: 0,
  websiteClicks: 0,
  exportDownloads: 0,
  enquiries: 0,
  dailyViews: [],
  trafficSources: [],
  locations: [],
  topProjects: [],
};

export function DashboardShell() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("Start");
  const [user, setUser] = useState<User | null>(null);
  const [portfolio, setPortfolio] = useState<Portfolio>(emptyPortfolio);
  const [content, setContent] = useState<ProfileContent>({
    entries: [],
    skills: [],
    socialLinks: [],
  });
  const [works, setWorks] = useState<Work[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [analytics, setAnalytics] = useState<Analytics>(emptyAnalytics);
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [resendBusy, setResendBusy] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [continuousMobile, setContinuousMobile] = useState(false);

  useEffect(() => {
    const requestedTab = new URLSearchParams(window.location.search).get("tab");
    const requestedTabTimer =
      requestedTab && nav.some((item) => item.tab === requestedTab)
        ? window.setTimeout(() => setTab(requestedTab as Tab), 0)
        : undefined;
    if (!getAccessToken()) {
      router.replace("/login");
      return () => {
        if (requestedTabTimer !== undefined) window.clearTimeout(requestedTabTimer);
      };
    }
    Promise.all([
      apiFetch<User>("/api/v1/auth/private/me"),
      apiFetch<Portfolio>("/api/v1/portfolios/private/mine"),
      apiFetch<Work[]>("/api/v1/works/private"),
      apiFetch<ProfileContent>("/api/v1/profile-content/private"),
      apiFetch<Analytics>("/api/v1/analytics/private/mine?days=30"),
      apiFetch<Enquiry[]>("/api/v1/enquiries/private/mine"),
      apiFetch<AnnouncementPage>("/api/v1/announcements/private/mine?page=1&size=50"),
      apiFetch<ManagedFile[]>("/api/v1/utilities/private/files"),
      apiFetch<FeedbackPage>("/api/v1/feedback/private/mine?page=1&size=50"),
    ]).then(([me, profile, work, profileContent, metrics, inbox, news, files, feedbackResult]) => {
      if (me.response.status === 401) {
        clearAuth();
        router.replace("/login?session=expired");
        return;
      }
      if (me.response.status === 403) {
        router.replace("/account-suspended");
        return;
      }
      if (!me.response.ok) {
        setNotice(me.result.message || "Unable to load your account. Please try again.");
        setReady(true);
        return;
      }
      setUser(me.result.data);
      setEmailInput(me.result.data.email);
      if (profile.response.ok) setPortfolio({ ...emptyPortfolio, ...profile.result.data });
      if (work.response.ok) setWorks(work.result.data ?? []);
      if (profileContent.response.ok) setContent(profileContent.result.data);
      if (metrics.response.ok) setAnalytics(metrics.result.data);
      if (inbox.response.ok) setEnquiries(inbox.result.data ?? []);
      if (news.response.ok) setAnnouncements(news.result.data?.items ?? []);
      if (files.response.ok)
        setAssets(
          (files.result.data ?? []).map((file) => ({
            id: file.id,
            url: file.fileUrl,
            name: file.originalFileName,
            purpose: normalizeAssetPurpose(file.usageType),
            bytes: file.fileSizeBytes,
            category: file.category as Asset["category"],
          })),
        );
      if (feedbackResult.response.ok) setFeedback(feedbackResult.result.data?.items ?? []);
      setReady(true);
    });
    return () => {
      if (requestedTabTimer !== undefined) window.clearTimeout(requestedTabTimer);
    };
  }, [router]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setInterval(
      () => setResendCooldown((value) => Math.max(0, value - 1)),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [resendCooldown]);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 680px)");
    const update = () => setContinuousMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  const shareUrl =
    typeof window === "undefined" || !user ? "" : `${window.location.origin}/${user.username}`;
  const completed = useMemo(
    () =>
      [
        Boolean(portfolio.headline && portfolio.introduction),
        Boolean(portfolio.avatarUrl),
        content.skills.length > 0,
        works.length > 0,
        portfolio.status === "PUBLISHED",
      ].filter(Boolean).length,
    [portfolio, content.skills.length, works.length],
  );
  const mobileChecks = useMemo(() => {
    const otherCredentialTypes: ProfileEntryType[] = [
      "ACHIEVEMENT",
      "PROFESSIONAL_MEMBERSHIP",
      "VOLUNTEER",
      "LANGUAGE",
      "PUBLICATION",
      "RESEARCH",
      "CONFERENCE_SPEAKING",
    ];
    return [
      Boolean(user?.fullName && user?.email && user?.whatsAppNumber),
      Boolean(portfolio.headline && portfolio.introduction),
      Boolean(portfolio.avatarUrl || portfolio.cvUrl),
      content.skills.length > 0,
      content.entries.some((entry) => entry.type === "EXPERIENCE"),
      content.entries.some((entry) => entry.type === "EDUCATION"),
      content.entries.some((entry) => entry.type === "CERTIFICATION"),
      content.entries.some((entry) => otherCredentialTypes.includes(entry.type)),
      works.length > 0,
      content.socialLinks.length > 0,
      Boolean(portfolio.availability || portfolio.websiteUrl || portfolio.githubUsername),
      Boolean(portfolio.introVideoUrl),
      portfolio.status === "PUBLISHED",
    ];
  }, [
    content.entries,
    content.skills.length,
    content.socialLinks.length,
    portfolio,
    user,
    works.length,
  ]);
  const mobileCompleted = mobileChecks.filter(Boolean).length;
  const mobilePercentage = Math.round((mobileCompleted / mobileChecks.length) * 100);
  const unreadAnnouncements = announcements.filter((item) => !item.readAt).length;

  function message(value: string) {
    setNotice(value);
    window.setTimeout(() => setNotice(""), 5000);
  }
  async function copyLink() {
    if (portfolio.status !== "PUBLISHED") {
      if (
        !window.confirm("Your portfolio is still a draft. Publish it now and copy the public link?")
      )
        return;
      const publish = await apiFetch<Portfolio>("/api/v1/portfolios/private/mine", {
        method: "PATCH",
        body: JSON.stringify({ status: "PUBLISHED" }),
      });
      if (!publish.response.ok) {
        message(publish.result.message);
        return;
      }
      setPortfolio(publish.result.data);
    }
    await navigator.clipboard.writeText(shareUrl);
    message("Portfolio is published and its link is copied.");
  }
  async function changePortfolioStyle(theme: Portfolio["theme"]) {
    if (theme === portfolio.theme || busy) return;
    setBusy(true);
    const response = await apiFetch<Portfolio>("/api/v1/portfolios/private/mine", {
      method: "PATCH",
      body: JSON.stringify({ theme }),
    });
    if (response.response.ok) {
      setPortfolio(response.result.data);
      message(`${theme.charAt(0) + theme.slice(1).toLowerCase()} portfolio style selected.`);
    } else message(response.result.message);
    setBusy(false);
  }
  function logout() {
    clearAuth();
    router.push("/login");
    router.refresh();
  }

  if (!ready || !user)
    return (
      <main className="status-page">
        <section>
          <p className="auth-kicker">Portfolio workspace</p>
          <h1>
            {notice ? "Your dashboard is temporarily unavailable." : "Preparing your dashboard…"}
          </h1>
          {notice && <p>{notice}</p>}
        </section>
      </main>
    );
  if (user.role === "BUSINESS_OWNER") return <BusinessDashboard user={user} />;

  return (
    <main className="dashboard-v2">
      <aside className="dash-nav">
        <Link href="/" className="dashboard-wordmark">
          Portfolio<span>/</span>
        </Link>
        <button
          type="button"
          className="dash-user"
          onClick={() => setTab("Profile")}
          title="Open my profile"
        >
          <b
            style={
              portfolio.avatarUrl ? { backgroundImage: `url(${portfolio.avatarUrl})` } : undefined
            }
          >
            {!portfolio.avatarUrl && user.fullName.slice(0, 1)}
          </b>
          <span>
            <strong>{user.fullName}</strong>
            <small>@{user.username}</small>
          </span>
        </button>
        <nav>
          {nav.map((item) => (
            <button
              type="button"
              key={item.tab}
              className={tab === item.tab ? "is-active" : ""}
              onClick={() => setTab(item.tab)}
            >
              <strong>{item.tab}</strong>
              <small>{item.hint}</small>
            </button>
          ))}
        </nav>
        <div className="dash-bottom">
          {user.role === "SUPER_ADMIN" && <Link href="/admin">Open administration →</Link>}
          <Link href="/guide">How to use the app</Link>
          <button type="button" onClick={logout}>
            Sign out
          </button>
        </div>
      </aside>
      <section className="dash-content">
        <header className="dash-top">
          <div>
            <p>Portfolio workspace</p>
            <h1>{continuousMobile ? "Portfolio setup" : tab}</h1>
          </div>
          <div className="share-actions">
            <WorkspaceThemeToggle />
            <button type="button" onClick={copyLink}>
              Copy portfolio link
            </button>
            <a href={`/${user.username}`} target="_blank">
              View public page ↗
            </a>
          </div>
        </header>
        <section
          className="mobile-workspace-guide"
          aria-label="Portfolio setup and workspace sections"
        >
          <div className="mobile-progress-summary">
            <span>
              <strong>{mobilePercentage}% complete</strong>
              <small>
                {mobileCompleted} of {mobileChecks.length} sections complete
              </small>
            </span>
            <span className="mobile-progress-track" aria-label={`${mobilePercentage}% complete`}>
              <i style={{ width: `${mobilePercentage}%` }} />
            </span>
          </div>
          {!continuousMobile && (
            <nav className="mobile-section-tabs" aria-label="Workspace sections">
              {nav.map((item) => (
                <button
                  type="button"
                  key={item.tab}
                  className={tab === item.tab ? "is-active" : ""}
                  onClick={() => setTab(item.tab)}
                >
                  <span>{item.tab}</span>
                  {item.tab === "Announcements" && unreadAnnouncements > 0 && (
                    <b>{unreadAnnouncements}</b>
                  )}
                </button>
              ))}
            </nav>
          )}
        </section>
        <section className="portfolio-style-bar" aria-label="Public portfolio style">
          <div>
            <span>Public portfolio style</span>
            <div>
              {(["ORBIT", "EDITORIAL", "SPATIAL"] as const).map((theme) => (
                <button
                  type="button"
                  key={theme}
                  disabled={busy}
                  className={portfolio.theme === theme ? "is-active" : ""}
                  onClick={() => void changePortfolioStyle(theme)}
                >
                  {theme.charAt(0) + theme.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>
          <p>
            This changes only your public portfolio design. Your dashboard layout and saved
            information stay the same.
          </p>
        </section>

        {!user.emailVerified && (
          <>
            <section className="verification-banner">
              <div className="verification-icon" aria-hidden="true">
                ✉
              </div>

              <div className="verification-content">
                <strong>Verify your email address</strong>

                <p>
                  Verify your account to unlock profile images, CVs, videos and project uploads.
                </p>

                <div className="verification-form">
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={emailInput}
                    onChange={(event) => setEmailInput(event.target.value)}
                    aria-label="Email address"
                    readOnly
                    disabled={resendBusy}
                  />

                  <button
                    type="button"
                    disabled={resendBusy || resendCooldown > 0}
                    onClick={async () => {
                      const email = emailInput.trim();

                      if (!email) {
                        message("Please enter your email address.");
                        return;
                      }

                      setResendBusy(true);

                      try {
                        const response = await apiFetch(
                          "/api/v1/auth/private/resend-verification",
                          {
                            method: "POST",
                          },
                        );

                        message(response.result.message || "Verification email sent successfully.");
                        if (response.response.ok) {
                          setResendCooldown(120);
                        } else if (response.response.status === 429) {
                          const seconds = Number(
                            response.result.message?.match(/(\d+) seconds/i)?.[1] ?? 120,
                          );
                          setResendCooldown(Number.isFinite(seconds) ? seconds : 120);
                        }
                      } catch {
                        message("Unable to send the verification email.");
                      } finally {
                        setResendBusy(false);
                      }
                    }}
                  >
                    {resendBusy
                      ? "Sending…"
                      : resendCooldown > 0
                        ? `Send again in ${resendCooldown}s`
                        : "Send verification link"}
                  </button>
                </div>
              </div>
            </section>

            <style jsx>{`
              .verification-banner {
                display: flex;
                align-items: flex-start;
                gap: 16px;
                margin-bottom: 24px;
                padding: 20px;
                border: 1px solid #f0d58a;
                border-radius: 16px;
                background: linear-gradient(135deg, #fffdf5 0%, #fff8dc 100%);
                box-shadow: 0 8px 24px rgba(85, 65, 10, 0.08);
              }

              .verification-icon {
                display: grid;
                place-items: center;
                flex-shrink: 0;
                width: 44px;
                height: 44px;
                border-radius: 12px;
                background: #fff0b8;
                color: #765500;
                font-size: 20px;
              }

              .verification-content {
                flex: 1;
                min-width: 0;
              }

              .verification-content strong {
                display: block;
                margin-bottom: 5px;
                color: #1b2430;
                font-size: 16px;
              }

              .verification-content p {
                margin: 0 0 14px;
                color: #667085;
                font-size: 14px;
                line-height: 1.5;
              }

              .verification-form {
                display: flex;
                gap: 10px;
                max-width: 620px;
              }

              .verification-form input {
                flex: 1;
                min-width: 0;
                height: 44px;
                padding: 0 14px;
                border: 1px solid #d7dce2;
                border-radius: 10px;
                background: #ffffff;
                color: #111827;
                font-size: 14px;
                outline: none;
              }

              .verification-form input:focus {
                border-color: #0f766e;
                box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.12);
              }

              .verification-form input:disabled {
                cursor: not-allowed;
                opacity: 0.7;
              }

              .verification-form button {
                height: 44px;
                padding: 0 18px;
                border: 0;
                border-radius: 10px;
                background: #0b1728;
                color: #ffffff;
                font-weight: 700;
                cursor: pointer;
                white-space: nowrap;
              }

              .verification-form button:hover:not(:disabled) {
                background: #17304f;
              }

              .verification-form button:disabled {
                cursor: not-allowed;
                opacity: 0.65;
              }

              @media (max-width: 640px) {
                .verification-banner {
                  padding: 16px;
                }

                .verification-form {
                  flex-direction: column;
                }

                .verification-form button {
                  width: 100%;
                }
              }
            `}</style>
          </>
        )}

        {notice && (
          <p className="dash-notice" role="status">
            {notice}
          </p>
        )}
        {continuousMobile ? (
          <MobilePortfolioFlow
            user={user}
            setUser={setUser}
            portfolio={portfolio}
            setPortfolio={setPortfolio}
            content={content}
            setContent={setContent}
            works={works}
            setWorks={setWorks}
            assets={assets}
            setAssets={setAssets}
            analytics={analytics}
            enquiries={enquiries}
            setEnquiries={setEnquiries}
            announcements={announcements}
            setAnnouncements={setAnnouncements}
            feedback={feedback}
            setFeedback={setFeedback}
            busy={busy}
            setBusy={setBusy}
            message={message}
            mobileChecks={mobileChecks}
            mobilePercentage={mobilePercentage}
            copyLink={copyLink}
          />
        ) : (
          <>
            {tab === "Start" && (
              <StartPanel
                user={user}
                portfolio={portfolio}
                skillsCount={content.skills.length}
                worksCount={works.length}
                completed={completed}
                setTab={setTab}
                copyLink={copyLink}
              />
            )}
            {tab === "Profile" && (
              <div className="profile-workspace">
                <AccountDetailsPanel
                  user={user}
                  setUser={setUser}
                  busy={busy}
                  setBusy={setBusy}
                  message={message}
                />
                <ProfilePanel
                  verified={user.emailVerified}
                  portfolio={portfolio}
                  setPortfolio={setPortfolio}
                  socials={content.socialLinks}
                  setContent={setContent}
                  busy={busy}
                  setBusy={setBusy}
                  message={message}
                />
              </div>
            )}
            {tab === "Background" && (
              <BackgroundPanel
                verified={user.emailVerified}
                entries={content.entries}
                setContent={setContent}
                busy={busy}
                setBusy={setBusy}
                message={message}
                allowedTypes={[
                  "EXPERIENCE",
                  "EDUCATION",
                  "ACHIEVEMENT",
                  "PROFESSIONAL_MEMBERSHIP",
                  "VOLUNTEER",
                  "LANGUAGE",
                  "PUBLICATION",
                  "RESEARCH",
                  "CONFERENCE_SPEAKING",
                ]}
              />
            )}
            {tab === "Certifications" && (
              <BackgroundPanel
                verified={user.emailVerified}
                entries={content.entries}
                setContent={setContent}
                busy={busy}
                setBusy={setBusy}
                message={message}
                allowedTypes={["CERTIFICATION"]}
                sectionTitle="Certifications"
              />
            )}
            {tab === "Skills" && (
              <SkillsPanel
                verified={user.emailVerified}
                skills={content.skills}
                setContent={setContent}
                busy={busy}
                setBusy={setBusy}
                message={message}
              />
            )}
            {tab === "Projects" && (
              <ProjectsPanel
                verified={user.emailVerified}
                works={works}
                setWorks={setWorks}
                assets={assets}
                setAssets={setAssets}
                busy={busy}
                setBusy={setBusy}
                message={message}
              />
            )}
            {tab === "Files" && (
              <FilesPanel
                verified={user.emailVerified}
                portfolio={portfolio}
                setPortfolio={setPortfolio}
                assets={assets}
                setAssets={setAssets}
                message={message}
              />
            )}
            {tab === "Billing" && portfolio.id && (
              <PortfolioBillingPanel portfolioId={portfolio.id} />
            )}
            {tab === "Analytics" && <AnalyticsPanel analytics={analytics} />}
            {tab === "Enquiries" && (
              <EnquiriesPanel enquiries={enquiries} setEnquiries={setEnquiries} message={message} />
            )}
            {tab === "Announcements" && (
              <AnnouncementsPanel
                announcements={announcements}
                setAnnouncements={setAnnouncements}
                message={message}
              />
            )}
            {tab === "Feedback" && (
              <FeedbackPanel feedback={feedback} setFeedback={setFeedback} message={message} />
            )}
            {tab === "Security" && (
              <SecurityPanel enabledInitially={user.twoFactorEnabled} message={message} />
            )}
          </>
        )}
      </section>
    </main>
  );
}

function MobileSetupStep({
  number,
  title,
  description,
  next,
  done,
  children,
}: {
  number: number;
  title: string;
  description: string;
  next: string;
  done: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`mobile-setup-step ${done ? "is-complete" : ""}`}
      id={`mobile-setup-${number}`}
    >
      <header className="mobile-step-heading">
        <span>{done ? "✓" : number}</span>
        <div>
          <small>Step {number} of 13</small>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        {done && <b>Saved</b>}
      </header>
      <div className="mobile-step-content">{children}</div>
      <footer>
        Next: <strong>{next}</strong>
        <span aria-hidden="true">↓</span>
      </footer>
    </section>
  );
}

function MobilePortfolioFlow({
  user,
  setUser,
  portfolio,
  setPortfolio,
  content,
  setContent,
  works,
  setWorks,
  assets,
  setAssets,
  analytics,
  enquiries,
  setEnquiries,
  announcements,
  setAnnouncements,
  feedback,
  setFeedback,
  busy,
  setBusy,
  message,
  mobileChecks,
  mobilePercentage,
  copyLink,
}: {
  user: User;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  portfolio: Portfolio;
  setPortfolio: React.Dispatch<React.SetStateAction<Portfolio>>;
  content: ProfileContent;
  setContent: React.Dispatch<React.SetStateAction<ProfileContent>>;
  works: Work[];
  setWorks: React.Dispatch<React.SetStateAction<Work[]>>;
  assets: Asset[];
  setAssets: React.Dispatch<React.SetStateAction<Asset[]>>;
  analytics: Analytics;
  enquiries: Enquiry[];
  setEnquiries: React.Dispatch<React.SetStateAction<Enquiry[]>>;
  announcements: Announcement[];
  setAnnouncements: React.Dispatch<React.SetStateAction<Announcement[]>>;
  busy: boolean;
  setBusy: (value: boolean) => void;
  feedback: FeedbackItem[];
  setFeedback: React.Dispatch<React.SetStateAction<FeedbackItem[]>>;
  message: (value: string) => void;
  mobileChecks: boolean[];
  mobilePercentage: number;
  copyLink: () => void;
}) {
  const otherCredentialTypes: ProfileEntryType[] = [
    "ACHIEVEMENT",
    "PROFESSIONAL_MEMBERSHIP",
    "VOLUNTEER",
    "LANGUAGE",
    "PUBLICATION",
    "RESEARCH",
    "CONFERENCE_SPEAKING",
  ];
  const commonProfileProps = {
    verified: user.emailVerified,
    portfolio,
    setPortfolio,
    socials: content.socialLinks,
    setContent,
    busy,
    setBusy,
    message,
  };
  const commonBackgroundProps = {
    verified: user.emailVerified,
    entries: content.entries,
    setContent,
    busy,
    setBusy,
    message,
  };

  return (
    <div className="mobile-portfolio-flow">
      <p className="mobile-flow-intro">
        Everything is open and arranged in order. Complete a section, then continue directly to the
        next one below it.
      </p>
      <MobileSetupStep
        number={1}
        title="Personal information"
        description="Confirm the name and permanent address people will see."
        next="Professional profile"
        done={mobileChecks[0]}
      >
        <AccountDetailsPanel
          user={user}
          setUser={setUser}
          busy={busy}
          setBusy={setBusy}
          message={message}
        />
      </MobileSetupStep>
      <MobileSetupStep
        number={2}
        title="Professional profile"
        description="Explain what you do, your value and the opportunities you want."
        next="Profile photo and CV"
        done={mobileChecks[1]}
      >
        <ProfilePanel {...commonProfileProps} mode="basics" />
      </MobileSetupStep>
      <MobileSetupStep
        number={3}
        title="Profile photo and CV"
        description="Add a professional image and a résumé recruiters can download."
        next="Skills"
        done={mobileChecks[2]}
      >
        <ProfilePanel {...commonProfileProps} mode="photo" />
        <FilesPanel
          verified={user.emailVerified}
          portfolio={portfolio}
          setPortfolio={setPortfolio}
          assets={assets}
          setAssets={setAssets}
          message={message}
          allowedPurposes={["CV"]}
        />
      </MobileSetupStep>
      <MobileSetupStep
        number={4}
        title="Skills"
        description="List your strongest capabilities and group them clearly."
        next="Work experience"
        done={mobileChecks[3]}
      >
        <SkillsPanel
          verified={user.emailVerified}
          skills={content.skills}
          setContent={setContent}
          busy={busy}
          setBusy={setBusy}
          message={message}
        />
      </MobileSetupStep>
      <MobileSetupStep
        number={5}
        title="Work experience"
        description="Add roles, companies, responsibilities and results."
        next="Education"
        done={mobileChecks[4]}
      >
        <BackgroundPanel
          {...commonBackgroundProps}
          allowedTypes={["EXPERIENCE"]}
          sectionTitle="Work experience"
        />
      </MobileSetupStep>
      <MobileSetupStep
        number={6}
        title="Education"
        description="Add schools, qualifications and learning history."
        next="Certifications"
        done={mobileChecks[5]}
      >
        <BackgroundPanel
          {...commonBackgroundProps}
          allowedTypes={["EDUCATION"]}
          sectionTitle="Education"
        />
      </MobileSetupStep>
      <MobileSetupStep
        number={7}
        title="Certifications"
        description="Add certification names, issuing organizations, credential IDs, dates and proof."
        next="Other credentials and achievements"
        done={mobileChecks[6]}
      >
        <BackgroundPanel
          {...commonBackgroundProps}
          allowedTypes={["CERTIFICATION"]}
          sectionTitle="Certifications"
        />
      </MobileSetupStep>
      <MobileSetupStep
        number={8}
        title="Other credentials and achievements"
        description="Include awards, memberships, publications and other professional proof."
        next="Projects"
        done={mobileChecks[7]}
      >
        <BackgroundPanel
          {...commonBackgroundProps}
          allowedTypes={otherCredentialTypes}
          sectionTitle="Credentials and achievements"
        />
      </MobileSetupStep>
      <MobileSetupStep
        number={9}
        title="Projects"
        description="Show the challenge, your process, technology and outcome."
        next="Social links"
        done={mobileChecks[8]}
      >
        <ProjectsPanel
          verified={user.emailVerified}
          works={works}
          setWorks={setWorks}
          assets={assets}
          setAssets={setAssets}
          busy={busy}
          setBusy={setBusy}
          message={message}
        />
      </MobileSetupStep>
      <MobileSetupStep
        number={10}
        title="Social links"
        description="Add only the professional profiles you want visitors to open."
        next="Contact information"
        done={mobileChecks[9]}
      >
        <ProfilePanel {...commonProfileProps} mode="social" />
      </MobileSetupStep>
      <MobileSetupStep
        number={11}
        title="Contact information"
        description="Tell recruiters how to reach you and where to learn more."
        next="Video and appearance"
        done={mobileChecks[10]}
      >
        <ProfilePanel {...commonProfileProps} mode="contact" />
      </MobileSetupStep>
      <MobileSetupStep
        number={12}
        title="Video and appearance"
        description="Add an introduction video and choose how your public portfolio looks."
        next="Review and publish"
        done={mobileChecks[11]}
      >
        <FilesPanel
          verified={user.emailVerified}
          portfolio={portfolio}
          setPortfolio={setPortfolio}
          assets={assets}
          setAssets={setAssets}
          message={message}
          allowedPurposes={["PROFILE_VIDEO"]}
        />
        <ProfilePanel {...commonProfileProps} mode="appearance" />
      </MobileSetupStep>
      <MobileSetupStep
        number={13}
        title="Review and publish"
        description="Preview the finished page, publish it and copy your permanent link."
        next="Complete"
        done={mobileChecks[12]}
      >
        <ProfilePanel {...commonProfileProps} mode="publish" />
        <div className="mobile-review-actions">
          <a href={`/${user.username}`} target="_blank" rel="noreferrer">
            Preview portfolio ↗
          </a>
          <button type="button" onClick={copyLink}>
            {portfolio.status === "PUBLISHED" ? "Copy portfolio link" : "Publish portfolio"}
          </button>
        </div>
      </MobileSetupStep>
      <section className="mobile-after-publishing">
        <div>
          <small>After publishing</small>
          <h2>Your ongoing workspace</h2>
          <p>These sections stay visible below your setup so nothing is hidden.</p>
        </div>
        <AnalyticsPanel analytics={analytics} />
        <EnquiriesPanel enquiries={enquiries} setEnquiries={setEnquiries} message={message} />
        <FeedbackPanel feedback={feedback} setFeedback={setFeedback} message={message} />
        <AnnouncementsPanel
          announcements={announcements}
          setAnnouncements={setAnnouncements}
          message={message}
        />
        <SecurityPanel enabledInitially={user.twoFactorEnabled} message={message} />
      </section>
      <div className="mobile-floating-progress">
        <span>
          <i style={{ width: `${mobilePercentage}%` }} />
        </span>
        <strong>{mobilePercentage}% complete</strong>
      </div>
    </div>
  );
}

function StartPanel({
  user,
  portfolio,
  skillsCount,
  worksCount,
  completed,
  setTab,
  copyLink,
}: {
  user: User;
  portfolio: Portfolio;
  skillsCount: number;
  worksCount: number;
  completed: number;
  setTab: (tab: Tab) => void;
  copyLink: () => void;
}) {
  const steps: Array<{ title: string; text: string; done: boolean; tab: Tab }> = [
    {
      title: "Write your introduction",
      text: "Tell recruiters what you do and the kind of opportunity you want.",
      done: Boolean(portfolio.headline && portfolio.introduction),
      tab: "Profile",
    },
    {
      title: "Add a clear profile image",
      text: "A friendly professional image makes the portfolio feel personal.",
      done: Boolean(portfolio.avatarUrl),
      tab: "Profile",
    },
    {
      title: "List your strongest skills",
      text: "Group skills so recruiters can scan them quickly.",
      done: skillsCount > 0,
      tab: "Skills",
    },
    {
      title: "Publish one case study",
      text: "Explain the challenge, your process and the result.",
      done: worksCount > 0,
      tab: "Projects",
    },
    {
      title: "Publish and share",
      text: "Copy your unique link and send it with applications.",
      done: portfolio.status === "PUBLISHED",
      tab: "Profile",
    },
  ];
  const percentage = completed * 20;
  return (
    <div className="start-panel">
      <section className="setup-overview">
        <div>
          <span>Portfolio progress</span>
          <strong>{percentage}%</strong>
          <small>
            {completed === 5
              ? "Your portfolio is ready to share."
              : `${5 - completed} setup step${5 - completed === 1 ? "" : "s"} remaining.`}
          </small>
        </div>
        <div className="setup-progress" aria-label={`${percentage}% complete`}>
          <span style={{ width: `${percentage}%` }} />
        </div>
        <div className="setup-facts">
          <button type="button" onClick={() => setTab("Profile")}>
            <strong>{portfolio.headline ? "Ready" : "Add"}</strong>
            <span>Profile</span>
          </button>
          <button type="button" onClick={() => setTab("Skills")}>
            <strong>{skillsCount}</strong>
            <span>Skills</span>
          </button>
          <button type="button" onClick={() => setTab("Projects")}>
            <strong>{worksCount}</strong>
            <span>Projects</span>
          </button>
          <button type="button" onClick={copyLink}>
            <strong>{portfolio.status === "PUBLISHED" ? "Live" : "Draft"}</strong>
            <span>Public page</span>
          </button>
        </div>
      </section>
      <section className="welcome-v2">
        <span>{completed}/5 complete</span>
        <h2>Build a recruiter-ready portfolio, one simple step at a time.</h2>
        <p>
          Your public address is <strong>/{user.username}</strong>. Empty optional sections stay
          hidden automatically.
        </p>
        <div>
          <button type="button" onClick={() => setTab("Profile")}>
            Continue setup →
          </button>
          <button type="button" onClick={copyLink}>
            Copy my link
          </button>
        </div>
      </section>
      <section className="checklist">
        <div>
          <p>Getting started</p>
          <h2>Your portfolio checklist</h2>
        </div>
        {steps.map((step, index) => (
          <button
            type="button"
            onClick={() => setTab(step.tab)}
            key={step.title}
            className={step.done ? "is-done" : ""}
          >
            <span>{step.done ? "✓" : index + 1}</span>
            <div>
              <strong>{step.title}</strong>
              <small>{step.text}</small>
            </div>
            <b>→</b>
          </button>
        ))}
      </section>
      <section className="how-card">
        <p>Need help?</p>
        <h3>Read the two-minute guide</h3>
        <span>See exactly what to add, how publishing works, and what a recruiter will see.</span>
        <Link href="/guide">Open the guide →</Link>
      </section>
    </div>
  );
}

function ProfileImageUploader({
  verified,
  portfolio,
  setPortfolio,
  message,
}: {
  verified: boolean;
  portfolio: Portfolio;
  setPortfolio: React.Dispatch<React.SetStateAction<Portfolio>>;
  message: (v: string) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const cancelRef = useRef<null | (() => void)>(null);

  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );

  function choose(event: React.ChangeEvent<HTMLInputElement>) {
    const next = event.target.files?.[0] ?? null;
    setFile(next);
    setProgress(0);
    setPreview(next ? URL.createObjectURL(next) : null);
  }

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      message("Choose an image file for your profile photo.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      message("Your profile image must be 5 MB or smaller.");
      return;
    }

    const formElement = event.currentTarget;
    setUploading(true);
    const task = uploadFileWithProgress<{ fileUrl: string }>(
      file,
      "IMAGE",
      "PROFILE_IMAGE",
      setProgress,
    );
    cancelRef.current = task.cancel;

    try {
      const uploaded = await task.promise;
      const update = await apiFetch<Portfolio>("/api/v1/portfolios/private/mine", {
        method: "PATCH",
        body: JSON.stringify({ avatarUrl: uploaded.data.fileUrl }),
      });
      if (!update.response.ok) {
        message(update.result.message);
        return;
      }

      setPortfolio(update.result.data);
      formElement.reset();
      setFile(null);
      setPreview(null);
      setProgress(0);
      message("Profile image uploaded and saved.");
    } catch (error) {
      message(
        error instanceof DOMException && error.name === "AbortError"
          ? "Upload cancelled."
          : error instanceof Error
            ? error.message
            : "Upload failed",
      );
    } finally {
      setUploading(false);
      cancelRef.current = null;
    }
  }

  async function removeImage() {
    setUploading(true);
    const update = await apiFetch<Portfolio>("/api/v1/portfolios/private/mine", {
      method: "PATCH",
      body: JSON.stringify({ avatarUrl: "" }),
    });
    if (update.response.ok) {
      setPortfolio(update.result.data);
      message("Profile image removed.");
    } else message(update.result.message);
    setUploading(false);
  }

  const displayedImage = preview ?? portfolio.avatarUrl;
  return (
    <form className="editor-card upload-card profile-image-card" onSubmit={upload}>
      <div className="card-heading">
        <span>Profile image</span>
        <h2>Upload your photo here</h2>
        <p>
          Choose a clear image. It is uploaded first, then its URL is saved to your portfolio
          automatically.
        </p>
      </div>
      {!verified && <div className="form-lock">Verify your email before uploading files.</div>}
      {displayedImage && (
        <div
          className="upload-preview profile-image-preview"
          role="img"
          aria-label={preview ? "Selected profile image preview" : "Current profile image"}
          style={{ backgroundImage: `url(${displayedImage})` }}
        />
      )}
      <label className="file-picker">
        <span>{portfolio.avatarUrl ? "Replace profile image" : "Choose profile image"}</span>
        <input type="file" accept="image/*" onChange={choose} disabled={!verified || uploading} />
      </label>
      {file && (
        <p className="file-name">
          {file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB
        </p>
      )}
      {uploading && progress > 0 && (
        <div className="upload-progress">
          <div>
            <span style={{ width: `${progress}%` }} />
          </div>
          <p>{progress}% uploaded</p>
          <button type="button" onClick={() => cancelRef.current?.()}>
            Cancel upload
          </button>
        </div>
      )}
      <button type="submit" disabled={!verified || !file || uploading}>
        {uploading && file ? "Uploading…" : "Upload profile image"}
      </button>
      {portfolio.avatarUrl && (
        <button
          type="button"
          className="secondary-button"
          disabled={uploading}
          onClick={removeImage}
        >
          Remove profile image
        </button>
      )}
    </form>
  );
}

function AccountDetailsPanel({
  user,
  setUser,
  busy,
  setBusy,
  message,
}: {
  user: User;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  busy: boolean;
  setBusy: (value: boolean) => void;
  message: (value: string) => void;
}) {
  async function saveAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const username = String(form.get("username") ?? "").trim();
    if (/\s/.test(username)) {
      message("Username cannot contain spaces.");
      return;
    }

    setBusy(true);
    const response = await apiFetch<User>("/api/v1/auth/private/me", {
      method: "PATCH",
      body: JSON.stringify({
        fullName: form.get("fullName"),
        whatsAppNumber: form.get("whatsAppNumber"),
        username,
      }),
    });
    if (response.response.ok) {
      setUser(response.result.data);
      message("Your account information has been updated.");
    } else {
      message(response.result.message);
    }
    setBusy(false);
  }

  return (
    <form className="editor-card account-details-card" onSubmit={saveAccount}>
      <div className="card-heading">
        <span>Account information</span>
        <h2>Your contact and account details</h2>
        <p>
          Keep your name and active WhatsApp number current. Your username remains your permanent
          portfolio address.
        </p>
      </div>
      <div className="form-row">
        <label>
          <span>Full name</span>
          <input name="fullName" defaultValue={user.fullName} minLength={2} required />
        </label>
        <label>
          <span>Permanent username</span>
          <input
            name="username"
            defaultValue={user.username}
            readOnly
            aria-readonly="true"
            required
          />
          <small>This cannot be changed. Your public link is /{user.username}.</small>
        </label>
      </div>
      <label>
        <span>Email address</span>
        <input value={user.email} readOnly aria-readonly="true" />
        <small>Your sign-in email is displayed here for reference.</small>
      </label>
      <label>
        <span>WhatsApp number</span>
        <input
          name="whatsAppNumber"
          type="tel"
          inputMode="tel"
          defaultValue={user.whatsAppNumber ?? ""}
          required
          placeholder="+2348012345678"
        />
        <small>Enter the WhatsApp number you actively use, including the country code.</small>
      </label>
      <button type="submit" disabled={busy}>
        {busy ? "Saving…" : "Update account information"}
      </button>
    </form>
  );
}

function ProfilePanel({
  verified,
  portfolio,
  setPortfolio,
  socials,
  setContent,
  busy,
  setBusy,
  message,
  mode,
}: {
  verified: boolean;
  portfolio: Portfolio;
  setPortfolio: React.Dispatch<React.SetStateAction<Portfolio>>;
  socials: SocialLink[];
  setContent: React.Dispatch<React.SetStateAction<ProfileContent>>;
  busy: boolean;
  setBusy: (v: boolean) => void;
  message: (v: string) => void;
  mode?: "basics" | "photo" | "social" | "contact" | "appearance" | "publish";
}) {
  const [selectedSocials, setSelectedSocials] = useState<Set<string>>(new Set());
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const form = new FormData(event.currentTarget);
    const body = {
      headline: form.get("headline"),
      introduction: form.get("introduction"),
      note: form.get("note"),
      availability: form.get("availability"),
      websiteUrl: form.get("websiteUrl"),
      githubUsername: form.get("githubUsername"),
      theme: form.get("theme"),
      accent: form.get("accent"),
      background: form.get("background"),
      font: form.get("font"),
      motion: form.get("motion"),
    };
    const r = await apiFetch<Portfolio>("/api/v1/portfolios/private/mine", {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    if (r.response.ok) {
      setPortfolio(r.result.data);
      message("Profile saved.");
    } else message(r.result.message);
    setBusy(false);
  }
  async function togglePublish() {
    setBusy(true);
    const status = portfolio.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED";
    const r = await apiFetch<Portfolio>("/api/v1/portfolios/private/mine", {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    if (r.response.ok) {
      setPortfolio(r.result.data);
      message(
        status === "PUBLISHED"
          ? "Your portfolio is public and ready to share."
          : "Your portfolio is private.",
      );
    } else message(r.result.message);
    setBusy(false);
  }
  async function addSocial(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const r = await apiFetch<SocialLink>("/api/v1/profile-content/private/social-links", {
      method: "POST",
      body: JSON.stringify({
        platform: form.get("platform"),
        url: form.get("url"),
      }),
    });
    if (r.response.ok) {
      setContent((c) => ({
        ...c,
        socialLinks: [...c.socialLinks, r.result.data],
      }));
      formElement.reset();
      message("Social link added.");
    } else message(r.result.message);
    setBusy(false);
  }
  async function removeSocial(id: string) {
    const r = await apiFetch(`/api/v1/profile-content/private/social-links/${id}`, {
      method: "DELETE",
    });
    if (r.response.ok)
      setContent((c) => ({
        ...c,
        socialLinks: c.socialLinks.filter((s) => s.id !== id),
      }));
    else message(r.result.message);
  }
  async function removeSelectedSocials() {
    const ids = Array.from(selectedSocials);
    if (
      !ids.length ||
      !confirm(`Delete ${ids.length} selected social link${ids.length === 1 ? "" : "s"}?`)
    )
      return;
    const results = await Promise.all(
      ids.map((id) =>
        apiFetch(`/api/v1/profile-content/private/social-links/${id}`, {
          method: "DELETE",
        }),
      ),
    );
    const removed = ids.filter((_, index) => results[index].response.ok);
    setContent((c) => ({
      ...c,
      socialLinks: c.socialLinks.filter((link) => !removed.includes(link.id)),
    }));
    setSelectedSocials(new Set());
    message(`${removed.length} social link${removed.length === 1 ? "" : "s"} deleted.`);
  }
  async function savePartial(
    event: FormEvent<HTMLFormElement>,
    fields: string[],
    successMessage: string,
  ) {
    event.preventDefault();
    setBusy(true);
    const form = new FormData(event.currentTarget);
    const body: Record<string, FormDataEntryValue | null> = {};
    fields.forEach((field) => {
      body[field] = form.get(field);
    });
    const response = await apiFetch<Portfolio>("/api/v1/portfolios/private/mine", {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    if (response.response.ok) {
      setPortfolio(response.result.data);
      message(successMessage);
    } else message(response.result.message);
    setBusy(false);
  }
  if (mode === "basics")
    return (
      <form
        className="editor-card"
        onSubmit={(event) =>
          savePartial(event, ["headline", "introduction", "note"], "Professional profile saved.")
        }
      >
        <div className="card-heading">
          <span>Required basics</span>
          <h2>Tell recruiters who you are</h2>
          <p>Keep this clear, specific and easy to scan.</p>
        </div>
        <label>
          <span>Professional headline</span>
          <input
            name="headline"
            defaultValue={portfolio.headline}
            required
            placeholder="Backend Engineer · Java & Cloud"
          />
        </label>
        <label>
          <span>Introduction</span>
          <textarea
            name="introduction"
            defaultValue={portfolio.introduction}
            required
            placeholder="I build reliable software products…"
          />
        </label>
        <label>
          <span>Short personal note (optional)</span>
          <textarea name="note" defaultValue={portfolio.note} />
        </label>
        <button type="submit" disabled={busy}>
          {busy ? "Saving…" : "Save professional profile"}
        </button>
      </form>
    );
  if (mode === "photo")
    return (
      <ProfileImageUploader
        verified={verified}
        portfolio={portfolio}
        setPortfolio={setPortfolio}
        message={message}
      />
    );
  if (mode === "social")
    return (
      <div>
        <form className="editor-card" onSubmit={addSocial}>
          <div className="card-heading">
            <span>Optional links</span>
            <h2>Social media</h2>
            <p>Add only the profiles you want recruiters to visit.</p>
          </div>
          <label>
            <span>Platform</span>
            <select name="platform">
              <option>LinkedIn</option>
              <option>GitHub</option>
              <option>Behance</option>
              <option>Dribbble</option>
              <option>YouTube</option>
              <option>X / Twitter</option>
              <option>Instagram</option>
              <option>Other</option>
            </select>
          </label>
          <label>
            <span>Profile link</span>
            <input name="url" required placeholder="linkedin.com/in/your-name" />
          </label>
          <button type="submit" disabled={busy}>
            Add social link
          </button>
        </form>
        {socials.length > 0 && (
          <div className="entity-bulk-toolbar">
            <button
              type="button"
              onClick={() => setSelectedSocials(new Set(socials.map((link) => link.id)))}
            >
              Select all
            </button>
            <button type="button" onClick={() => setSelectedSocials(new Set())}>
              Clear
            </button>
            <button
              type="button"
              className="danger-action"
              disabled={!selectedSocials.size}
              onClick={() => void removeSelectedSocials()}
            >
              Delete selected ({selectedSocials.size})
            </button>
          </div>
        )}
        <div className="simple-list">
          {socials.map((link) => (
            <article key={link.id}>
              <label className="entity-select">
                <input
                  type="checkbox"
                  checked={selectedSocials.has(link.id)}
                  onChange={() =>
                    setSelectedSocials((current) => {
                      const next = new Set(current);
                      if (next.has(link.id)) next.delete(link.id);
                      else next.add(link.id);
                      return next;
                    })
                  }
                />
                <span>Select</span>
              </label>
              <div>
                <strong>{link.platform}</strong>
                <a href={link.url} target="_blank" rel="noreferrer">
                  {link.url}
                </a>
              </div>
              <button type="button" onClick={() => removeSocial(link.id)}>
                Remove
              </button>
            </article>
          ))}
        </div>
      </div>
    );
  if (mode === "contact")
    return (
      <form
        className="editor-card"
        onSubmit={(event) =>
          savePartial(
            event,
            ["availability", "websiteUrl", "githubUsername"],
            "Contact information saved.",
          )
        }
      >
        <div className="card-heading">
          <span>Contact and availability</span>
          <h2>Help recruiters reach you</h2>
          <p>
            Your account email is already available to Portfolio Hub. Add the public details you
            want to show.
          </p>
        </div>
        <label>
          <span>Availability</span>
          <input
            name="availability"
            defaultValue={portfolio.availability}
            placeholder="Open to full-time roles"
          />
        </label>
        <label>
          <span>Personal website</span>
          <input
            name="websiteUrl"
            defaultValue={portfolio.websiteUrl ?? ""}
            placeholder="yourwebsite.com"
          />
        </label>
        <label>
          <span>GitHub username</span>
          <input
            name="githubUsername"
            defaultValue={portfolio.githubUsername ?? ""}
            placeholder="octocat"
          />
        </label>
        <button type="submit" disabled={busy}>
          {busy ? "Saving…" : "Save contact information"}
        </button>
      </form>
    );
  if (mode === "appearance")
    return (
      <form
        className="editor-card"
        onSubmit={(event) =>
          savePartial(
            event,
            ["theme", "accent", "background", "font", "motion"],
            "Portfolio appearance saved.",
          )
        }
      >
        <div className="card-heading">
          <span>Portfolio appearance</span>
          <h2>Choose how your work looks</h2>
          <p>These settings affect only your public portfolio.</p>
        </div>
        <label>
          <span>Portfolio style</span>
          <select name="theme" defaultValue={portfolio.theme}>
            <option value="ORBIT">Orbit</option>
            <option value="EDITORIAL">Editorial</option>
            <option value="SPATIAL">Spatial</option>
          </select>
        </label>
        <label>
          <span>Typography</span>
          <select name="font" defaultValue={portfolio.font}>
            <option value="GEIST">Modern</option>
            <option value="EDITORIAL">Editorial</option>
            <option value="MONO">Technical</option>
          </select>
        </label>
        <div className="form-row">
          <label>
            <span>Accent</span>
            <input type="color" name="accent" defaultValue={portfolio.accent ?? "#66e3c4"} />
          </label>
          <label>
            <span>Background</span>
            <input
              type="color"
              name="background"
              defaultValue={portfolio.background ?? "#07111f"}
            />
          </label>
        </div>
        <label>
          <span>Motion</span>
          <select name="motion" defaultValue={portfolio.motion}>
            <option value="FULL">Full</option>
            <option value="REDUCED">Reduced</option>
            <option value="NONE">None</option>
          </select>
        </label>
        <button type="submit" disabled={busy}>
          {busy ? "Saving…" : "Save portfolio appearance"}
        </button>
      </form>
    );
  if (mode === "publish")
    return (
      <section className="editor-card mobile-publish-card">
        <div className="card-heading">
          <span>Final check</span>
          <h2>Your portfolio is {portfolio.status === "PUBLISHED" ? "live" : "still private"}</h2>
          <p>
            Preview your page before publishing. You can return and edit any section above at any
            time.
          </p>
        </div>
        <button type="button" disabled={busy} onClick={togglePublish}>
          {busy
            ? "Saving…"
            : portfolio.status === "PUBLISHED"
              ? "Make portfolio private"
              : "Publish portfolio"}
        </button>
        <p className={`publish-state ${portfolio.status.toLowerCase()}`}>
          Current status: {portfolio.status}
        </p>
      </section>
    );
  return (
    <div className="two-column">
      <form className="editor-card" onSubmit={save}>
        <div className="card-heading">
          <span>Required basics</span>
          <h2>Tell recruiters who you are</h2>
          <p>Use clear, short sentences. You can change this at any time.</p>
        </div>
        <label>
          <span>Professional headline</span>
          <input
            name="headline"
            defaultValue={portfolio.headline}
            required
            placeholder="Backend Engineer · Java & Cloud"
          />
          <small>A one-line summary shown beside your name.</small>
        </label>
        <label>
          <span>Introduction</span>
          <textarea
            name="introduction"
            defaultValue={portfolio.introduction}
            required
            placeholder="I build reliable software products…"
          />
        </label>
        <label>
          <span>Short personal note (optional)</span>
          <textarea
            name="note"
            defaultValue={portfolio.note}
            placeholder="What motivates you, how you work, or what you value."
          />
        </label>
        <label>
          <span>Availability</span>
          <input
            name="availability"
            defaultValue={portfolio.availability}
            placeholder="Open to full-time roles"
          />
        </label>
        <label>
          <span>Personal website (optional)</span>
          <input
            name="websiteUrl"
            defaultValue={portfolio.websiteUrl ?? ""}
            placeholder="yourwebsite.com"
          />
          <small>You can enter a link with or without https://.</small>
        </label>
        <label>
          <span>GitHub username (optional)</span>
          <input
            name="githubUsername"
            defaultValue={portfolio.githubUsername ?? ""}
            placeholder="octocat"
          />
          <small>Public repositories will appear automatically.</small>
        </label>
        <div className="form-row">
          <label>
            <span>Portfolio style</span>
            <select name="theme" defaultValue={portfolio.theme}>
              <option value="ORBIT">Orbit</option>
              <option value="EDITORIAL">Editorial</option>
              <option value="SPATIAL">Spatial</option>
            </select>
          </label>
          <label>
            <span>Typography</span>
            <select name="font" defaultValue={portfolio.font}>
              <option value="GEIST">Modern</option>
              <option value="EDITORIAL">Editorial</option>
              <option value="MONO">Technical</option>
            </select>
          </label>
        </div>
        <div className="form-row">
          <label>
            <span>Accent</span>
            <input type="color" name="accent" defaultValue={portfolio.accent ?? "#66e3c4"} />
          </label>
          <label>
            <span>Background</span>
            <input
              type="color"
              name="background"
              defaultValue={portfolio.background ?? "#07111f"}
            />
          </label>
          <label>
            <span>Motion</span>
            <select name="motion" defaultValue={portfolio.motion}>
              <option value="FULL">Full</option>
              <option value="REDUCED">Reduced</option>
              <option value="NONE">None</option>
            </select>
          </label>
        </div>
        <button type="submit" disabled={busy}>
          {busy ? "Saving…" : "Save profile"}
        </button>
        <button type="button" className="secondary-button" disabled={busy} onClick={togglePublish}>
          {portfolio.status === "PUBLISHED" ? "Make portfolio private" : "Publish portfolio"}
        </button>
        <p className={`publish-state ${portfolio.status.toLowerCase()}`}>
          Current status: {portfolio.status}
        </p>
      </form>
      <div>
        <ProfileImageUploader
          verified={verified}
          portfolio={portfolio}
          setPortfolio={setPortfolio}
          message={message}
        />
        <form className="editor-card" onSubmit={addSocial}>
          <div className="card-heading">
            <span>Optional links</span>
            <h2>Social media</h2>
            <p>
              Add only the profiles you want recruiters to visit. Links work with or without
              https://.
            </p>
          </div>
          <label>
            <span>Platform</span>
            <select name="platform">
              <option>LinkedIn</option>
              <option>GitHub</option>
              <option>Behance</option>
              <option>Dribbble</option>
              <option>YouTube</option>
              <option>X / Twitter</option>
              <option>Instagram</option>
              <option>Other</option>
            </select>
          </label>
          <label>
            <span>Profile link</span>
            <input name="url" required placeholder="linkedin.com/in/your-name" />
          </label>
          <button type="submit" disabled={busy}>
            Add social link
          </button>
        </form>
        <div className="simple-list">
          {socials.map((link) => (
            <article key={link.id}>
              <div>
                <strong>{link.platform}</strong>
                <a href={link.url} target="_blank" rel="noreferrer">
                  {link.url}
                </a>
              </div>
              <button type="button" onClick={() => removeSocial(link.id)}>
                Remove
              </button>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}

function BackgroundThumbnailUploader({
  verified,
  value,
  onChange,
  message,
}: {
  verified: boolean;
  value: string;
  onChange: (url: string) => void;
  message: (value: string) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const cancelRef = useRef<null | (() => void)>(null);

  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );

  function choose(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;
    if (preview) URL.revokeObjectURL(preview);
    setProgress(0);
    if (!selected) {
      setFile(null);
      setPreview("");
      return;
    }
    if (!selected.type.startsWith("image/")) {
      message("Choose an image file for this background item.");
      event.target.value = "";
      return;
    }
    if (selected.size > 5 * 1024 * 1024) {
      message("The background image must be 5 MB or smaller.");
      event.target.value = "";
      return;
    }
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
  }

  async function upload() {
    if (!file) return;
    setUploading(true);
    const task = uploadFileWithProgress<{ fileUrl: string }>(
      file,
      "IMAGE",
      "BACKGROUND_THUMBNAIL",
      setProgress,
    );
    cancelRef.current = task.cancel;
    try {
      const uploaded = await task.promise;
      onChange(uploaded.data.fileUrl);
      setFile(null);
      setPreview("");
      message("Background image uploaded. Save the item to finish.");
    } catch (error) {
      message(
        error instanceof DOMException && error.name === "AbortError"
          ? "Image upload cancelled."
          : error instanceof Error
            ? error.message
            : "Image upload failed.",
      );
    } finally {
      setUploading(false);
      cancelRef.current = null;
    }
  }

  const image = preview || value;
  return (
    <section className="inline-background-upload">
      <div>
        <strong>Thumbnail or supporting image (optional)</strong>
        <span>Add a certificate, school, company or achievement image.</span>
      </div>
      {!verified && <div className="form-lock">Verify your email before uploading an image.</div>}
      {image && (
        <div
          className="upload-preview background-image-preview"
          style={{ backgroundImage: `url(${image})` }}
          role="img"
          aria-label="Background image preview"
        />
      )}
      <label className="file-picker">
        <span>Choose image — maximum 5 MB</span>
        <input type="file" accept="image/*" onChange={choose} disabled={!verified || uploading} />
      </label>
      {uploading && (
        <div className="upload-progress">
          <div>
            <span style={{ width: `${progress}%` }} />
          </div>
          <p>{progress}% uploaded</p>
          <button type="button" onClick={() => cancelRef.current?.()}>
            Cancel upload
          </button>
        </div>
      )}
      <button
        type="button"
        className="dashboard-action"
        onClick={upload}
        disabled={!verified || !file || uploading}
      >
        {uploading ? "Uploading image…" : "Upload and use this image"}
      </button>
      {value && (
        <button
          type="button"
          className="dashboard-action secondary-action"
          onClick={() => onChange("")}
          disabled={uploading}
        >
          Remove image
        </button>
      )}
    </section>
  );
}

function CertificationDocumentUploader({
  verified,
  value,
  onChange,
  message,
}: {
  verified: boolean;
  value: string;
  onChange: (url: string) => void;
  message: (value: string) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const cancelRef = useRef<null | (() => void)>(null);

  function choose(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;
    setProgress(0);
    if (!selected) {
      setFile(null);
      return;
    }
    if (selected.type !== "application/pdf" && !selected.type.startsWith("image/")) {
      message("Choose a PDF or image of the certificate.");
      event.target.value = "";
      return;
    }
    if (selected.size > 10 * 1024 * 1024) {
      message("The certificate file must be 10 MB or smaller.");
      event.target.value = "";
      return;
    }
    setFile(selected);
  }

  async function upload() {
    if (!file) return;
    setUploading(true);
    const category = file.type.startsWith("image/") ? "IMAGE" : "DOCUMENT";
    const task = uploadFileWithProgress<{ fileUrl: string }>(
      file,
      category,
      "GENERAL",
      setProgress,
    );
    cancelRef.current = task.cancel;
    try {
      const uploaded = await task.promise;
      onChange(uploaded.data.fileUrl);
      setFile(null);
      setProgress(0);
      message("Certificate proof uploaded. Save the certification to finish.");
    } catch (error) {
      message(
        error instanceof DOMException && error.name === "AbortError"
          ? "Certificate upload cancelled."
          : error instanceof Error
            ? error.message
            : "Certificate upload failed.",
      );
    } finally {
      setUploading(false);
      cancelRef.current = null;
    }
  }

  return (
    <section className="inline-background-upload">
      <div>
        <strong>Certificate proof (optional)</strong>
        <span>Upload a PDF or image recruiters can open.</span>
      </div>
      {!verified && (
        <div className="form-lock">Verify your email before uploading certificate proof.</div>
      )}
      {value && (
        <a href={value} target="_blank" rel="noreferrer">
          View uploaded certificate ↗
        </a>
      )}
      <label className="file-picker">
        <span>Choose PDF or image — maximum 10 MB</span>
        <input
          type="file"
          accept="application/pdf,image/png,image/jpeg,image/webp"
          onChange={choose}
          disabled={!verified || uploading}
        />
      </label>
      {uploading && (
        <div className="upload-progress">
          <div>
            <span style={{ width: `${progress}%` }} />
          </div>
          <p>{progress}% uploaded</p>
          <button type="button" onClick={() => cancelRef.current?.()}>
            Cancel upload
          </button>
        </div>
      )}
      <button
        type="button"
        className="dashboard-action"
        onClick={upload}
        disabled={!verified || !file || uploading}
      >
        {uploading ? "Uploading certificate…" : "Upload certificate proof"}
      </button>
      {value && (
        <button
          type="button"
          className="dashboard-action secondary-action"
          onClick={() => onChange("")}
          disabled={uploading}
        >
          Remove certificate proof
        </button>
      )}
    </section>
  );
}

function FeedbackPanel({
  feedback,
  setFeedback,
  message,
}: {
  feedback: FeedbackItem[];
  setFeedback: React.Dispatch<React.SetStateAction<FeedbackItem[]>>;
  message: (value: string) => void;
}) {
  const [sending, setSending] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const result = await apiFetch<FeedbackItem>("/api/v1/feedback/private", {
      method: "POST",
      body: JSON.stringify({
        category: form.get("category"),
        subject: form.get("subject"),
        message: form.get("message"),
      }),
    });
    if (result.response.ok) {
      setFeedback((current) => [result.result.data, ...current]);
      formElement.reset();
      message("Your message was sent to the super administrator.");
    } else message(result.result.message || "Unable to send feedback");
    setSending(false);
  }
  return (
    <div className="feedback-workspace">
      <form className="editor-card" onSubmit={submit}>
        <div className="card-heading">
          <span>Contact the Portfolio Hub team</span>
          <h2>Complaints and feedback</h2>
          <p>
            Send a complaint, suggestion or technical issue directly to the super administrator.
          </p>
        </div>
        <label>
          <span>Type</span>
          <select name="category">
            <option value="COMPLAINT">Complaint</option>
            <option value="FEEDBACK">Feedback</option>
            <option value="SUGGESTION">Suggestion</option>
            <option value="TECHNICAL_ISSUE">Technical issue</option>
          </select>
        </label>
        <label>
          <span>Subject</span>
          <input name="subject" required />
        </label>
        <label>
          <span>Message</span>
          <textarea name="message" required minLength={5} />
        </label>
        <button type="submit" disabled={sending}>
          {sending ? "Sending…" : "Send to super administrator"}
        </button>
      </form>
      <section className="editor-card">
        <div className="card-heading">
          <span>Your messages</span>
          <h2>Response history</h2>
          <p>Administrator responses also arrive by email and in Announcements.</p>
        </div>
        <div className="feedback-list">
          {feedback.map((item) => (
            <article key={item.id}>
              <header>
                <span>{item.category.replaceAll("_", " ")}</span>
                <b className={`feedback-status status-${item.status.toLowerCase()}`}>
                  {item.status}
                </b>
              </header>
              <h3>{item.subject}</h3>
              <p>{item.message}</p>
              {item.adminResponse && (
                <blockquote>
                  <strong>Portfolio Hub response</strong>
                  <p>{item.adminResponse}</p>
                </blockquote>
              )}
              <time>
                {new Date(
                  item.createdAt.includes("T") ? item.createdAt : item.createdAt.replace(" ", "T"),
                ).toLocaleString()}
              </time>
            </article>
          ))}
          {feedback.length === 0 && (
            <p className="public-empty">You have not submitted any feedback yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}

function AnnouncementsPanel({
  announcements,
  setAnnouncements,
  message,
}: {
  announcements: Announcement[];
  setAnnouncements: React.Dispatch<React.SetStateAction<Announcement[]>>;
  message: (value: string) => void;
}) {
  async function markRead(item: Announcement) {
    if (item.readAt) return;
    const result = await apiFetch<Announcement>(
      `/api/v1/announcements/private/${encodeURIComponent(item.recipientId)}/read`,
      { method: "PATCH" },
    );
    if (!result.response.ok) {
      message(result.result.message || "Unable to mark this announcement as read");
      return;
    }
    setAnnouncements((current) =>
      current.map((value) => (value.recipientId === item.recipientId ? result.result.data : value)),
    );
  }
  return (
    <section className="editor-card announcement-inbox">
      <div className="card-heading">
        <span>Platform updates</span>
        <h2>Announcements</h2>
        <p>Important messages sent to your account by Portfolio administrators.</p>
      </div>
      {announcements.length === 0 ? (
        <p className="public-empty">You do not have any announcements yet.</p>
      ) : (
        announcements.map((item) => (
          <article
            key={item.recipientId}
            className={item.readAt ? "" : "is-unread"}
            onClick={() => void markRead(item)}
          >
            <header>
              <div>
                <span>{item.readAt ? "Read" : "New"}</span>
                <h3>{item.subject}</h3>
              </div>
              <time>
                {new Date(
                  item.createdAt.includes("T") ? item.createdAt : item.createdAt.replace(" ", "T"),
                ).toLocaleString()}
              </time>
            </header>
            <p>{item.message}</p>
            {item.attachments.length > 0 && (
              <div className="announcement-attachments announcement-rich-media">
                {item.attachments.map((file) => {
                  const type = file.contentType ?? "";
                  if (type.startsWith("image/"))
                    return (
                      <a
                        className="announcement-image"
                        key={file.url}
                        href={file.url}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <img src={file.url} alt={file.name} />
                        <span>{file.name} · Open full image ↗</span>
                      </a>
                    );
                  if (type.startsWith("video/"))
                    return (
                      <div
                        className="announcement-video"
                        key={file.url}
                        onClick={(event) => event.stopPropagation()}
                      >
                        <video src={file.url} controls preload="metadata">
                          Your browser does not support this video.
                        </video>
                        <a href={file.url} target="_blank" rel="noreferrer">
                          {file.name} · Open video ↗
                        </a>
                      </div>
                    );
                  return (
                    <a
                      className="announcement-document"
                      key={file.url}
                      href={file.url}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <b>↓</b>
                      <span>
                        <strong>{file.name}</strong>
                        <small>Download attached file</small>
                      </span>
                      <i>Open ↗</i>
                    </a>
                  );
                })}
              </div>
            )}
          </article>
        ))
      )}
    </section>
  );
}

function BackgroundPanel({
  verified,
  entries,
  setContent,
  busy,
  setBusy,
  message,
  allowedTypes,
  sectionTitle,
}: {
  verified: boolean;
  entries: ProfileEntry[];
  setContent: React.Dispatch<React.SetStateAction<ProfileContent>>;
  busy: boolean;
  setBusy: (v: boolean) => void;
  message: (v: string) => void;
  allowedTypes?: ProfileEntryType[];
  sectionTitle?: string;
}) {
  const labels: Record<ProfileEntryType, string> = {
    EXPERIENCE: "Experience",
    EDUCATION: "Education",
    CERTIFICATION: "Certification",
    ACHIEVEMENT: "Achievement",
    PROFESSIONAL_MEMBERSHIP: "Professional membership",
    VOLUNTEER: "Volunteer work",
    LANGUAGE: "Language",
    PUBLICATION: "Publication",
    RESEARCH: "Research",
    CONFERENCE_SPEAKING: "Conference / speaking",
  };
  const visibleTypes = allowedTypes ?? (Object.keys(labels) as ProfileEntryType[]);
  const visibleEntries = entries.filter((entry) => visibleTypes.includes(entry.type));
  const [editing, setEditing] = useState<ProfileEntry | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [supportingDocumentUrl, setSupportingDocumentUrl] = useState("");
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set());
  const certificationOnly = visibleTypes.length === 1 && visibleTypes[0] === "CERTIFICATION";
  function edit(entry: ProfileEntry) {
    setEditing(entry);
    setThumbnailUrl(entry.thumbnailUrl ?? "");
    setSupportingDocumentUrl(entry.supportingDocumentUrl ?? "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function cancelEdit() {
    setEditing(null);
    setThumbnailUrl("");
    setSupportingDocumentUrl("");
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const body = {
      type: form.get("type"),
      title: form.get("title"),
      organization: form.get("organization"),
      subtitle: form.get("subtitle"),
      location: form.get("location"),
      startDate: form.get("startDate") || null,
      endDate: form.get("endDate") || null,
      current: form.get("current") === "on",
      description: form.get("description"),
      url: form.get("url"),
      thumbnailUrl,
      supportingDocumentUrl,
      published: form.get("published") === "on",
      sortOrder: editing?.sortOrder,
    };
    const endpoint = editing
      ? `/api/v1/profile-content/private/entries/${editing.id}`
      : "/api/v1/profile-content/private/entries";
    const response = await apiFetch<ProfileEntry>(endpoint, {
      method: editing ? "PUT" : "POST",
      body: JSON.stringify(body),
    });
    if (response.response.ok) {
      setContent((current) => ({
        ...current,
        entries: editing
          ? current.entries.map((entry) => (entry.id === editing.id ? response.result.data : entry))
          : [...current.entries, response.result.data],
      }));
      formElement.reset();
      cancelEdit();
      message(editing ? "Background item updated." : "Background item added.");
    } else message(response.result.message);
    setBusy(false);
  }
  async function remove(id: string) {
    if (!window.confirm("Delete this saved item?")) return;
    const r = await apiFetch(`/api/v1/profile-content/private/entries/${id}`, {
      method: "DELETE",
    });
    if (r.response.ok)
      setContent((c) => ({
        ...c,
        entries: c.entries.filter((e) => e.id !== id),
      }));
    else message(r.result.message);
  }
  async function removeSelectedEntries() {
    const ids = Array.from(selectedEntries);
    if (
      !ids.length ||
      !confirm(`Delete ${ids.length} selected item${ids.length === 1 ? "" : "s"}?`)
    )
      return;
    setBusy(true);
    const results = await Promise.all(
      ids.map((id) =>
        apiFetch(`/api/v1/profile-content/private/entries/${id}`, {
          method: "DELETE",
        }),
      ),
    );
    const removed = ids.filter((_, index) => results[index].response.ok);
    setContent((c) => ({
      ...c,
      entries: c.entries.filter((entry) => !removed.includes(entry.id)),
    }));
    setSelectedEntries(new Set());
    setBusy(false);
    message(`${removed.length} item${removed.length === 1 ? "" : "s"} deleted.`);
  }
  return (
    <div className="two-column">
      <section className="editor-card">
        <div className="card-heading">
          <span>Saved information</span>
          <h2>{sectionTitle ?? "Your background"}</h2>
          <p>
            {certificationOnly
              ? "Add professional certifications and evidence recruiters can verify."
              : "Edit any saved item. Empty or unpublished sections stay hidden from recruiters."}
          </p>
        </div>
        {visibleEntries.length > 0 && (
          <div className="entity-bulk-toolbar">
            <button
              type="button"
              onClick={() => setSelectedEntries(new Set(visibleEntries.map((entry) => entry.id)))}
            >
              Select all
            </button>
            <button type="button" onClick={() => setSelectedEntries(new Set())}>
              Clear
            </button>
            <button
              type="button"
              className="danger-action"
              disabled={!selectedEntries.size}
              onClick={() => void removeSelectedEntries()}
            >
              Delete selected ({selectedEntries.size})
            </button>
          </div>
        )}
        <div className="grouped-list">
          {visibleTypes.map((type) => {
            const list = visibleEntries.filter((entry) => entry.type === type);
            if (!list.length) return null;
            return (
              <div key={type}>
                <h3>{labels[type]}</h3>
                {list.map((entry) => (
                  <article key={entry.id}>
                    <label className="entity-select">
                      <input
                        type="checkbox"
                        checked={selectedEntries.has(entry.id)}
                        onChange={() =>
                          setSelectedEntries((current) => {
                            const next = new Set(current);
                            if (next.has(entry.id)) next.delete(entry.id);
                            else next.add(entry.id);
                            return next;
                          })
                        }
                      />
                      <span>Select</span>
                    </label>
                    {entry.thumbnailUrl && (
                      <span
                        className="background-editor-thumb"
                        style={{
                          backgroundImage: `url(${entry.thumbnailUrl})`,
                        }}
                      />
                    )}
                    <div>
                      <strong>{entry.title}</strong>
                      <span>{entry.organization}</span>
                      <small>
                        {entry.startDate ?? ""}{" "}
                        {entry.current ? "— Present" : entry.endDate ? `— ${entry.endDate}` : ""} ·{" "}
                        {entry.published ? "Published" : "Draft"}
                      </small>
                    </div>
                    <div className="item-actions">
                      {entry.supportingDocumentUrl && (
                        <a href={entry.supportingDocumentUrl} target="_blank" rel="noreferrer">
                          View proof
                        </a>
                      )}
                      <button type="button" onClick={() => edit(entry)}>
                        Edit
                      </button>
                      <button type="button" onClick={() => remove(entry.id)}>
                        Remove
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            );
          })}
          {visibleEntries.length === 0 && (
            <p className="public-empty">Nothing added yet. Use the form below to add it.</p>
          )}
        </div>
      </section>
      <form key={editing?.id ?? `new-${visibleTypes[0]}`} className="editor-card" onSubmit={save}>
        <div className="card-heading">
          <span>{editing ? "Edit item" : "Add one item"}</span>
          <h2>
            {editing
              ? `Update ${editing.title}`
              : (sectionTitle ?? "Experience, learning or recognition")}
          </h2>
        </div>
        {!certificationOnly && (
          <label>
            <span>Section</span>
            <select name="type" defaultValue={editing?.type ?? visibleTypes[0]}>
              {visibleTypes.map((value) => (
                <option key={value} value={value}>
                  {labels[value]}
                </option>
              ))}
            </select>
          </label>
        )}
        {certificationOnly && <input type="hidden" name="type" value="CERTIFICATION" />}
        <label>
          <span>{certificationOnly ? "Certification name" : "Title"}</span>
          <input
            name="title"
            defaultValue={editing?.title ?? ""}
            required
            placeholder={
              certificationOnly
                ? "AWS Certified Developer – Associate"
                : "Software Engineer or B.Sc. Computer Science"
            }
          />
        </label>
        <label>
          <span>{certificationOnly ? "Issuing organization" : "Organization / school"}</span>
          <input
            name="organization"
            defaultValue={editing?.organization ?? ""}
            placeholder={certificationOnly ? "Amazon Web Services" : "Company or institution"}
          />
        </label>
        <label>
          <span>{certificationOnly ? "Credential ID (optional)" : "Subtitle (optional)"}</span>
          <input name="subtitle" defaultValue={editing?.subtitle ?? ""} />
        </label>
        {!certificationOnly && (
          <label>
            <span>Location (optional)</span>
            <input name="location" defaultValue={editing?.location ?? ""} />
          </label>
        )}
        <div className="form-row">
          <label>
            <span>{certificationOnly ? "Issue date" : "Start date"}</span>
            <input name="startDate" type="date" defaultValue={editing?.startDate ?? ""} />
          </label>
          <label>
            <span>{certificationOnly ? "Expiry date (optional)" : "End date"}</span>
            <input name="endDate" type="date" defaultValue={editing?.endDate ?? ""} />
          </label>
        </div>
        <label className="check-label">
          <input name="current" type="checkbox" defaultChecked={editing?.current ?? false} />{" "}
          <span>
            {certificationOnly ? "This certification does not expire" : "This is current"}
          </span>
        </label>
        <label>
          <span>Description</span>
          <textarea name="description" defaultValue={editing?.description ?? ""} />
        </label>
        <label>
          <span>
            {certificationOnly
              ? "Credential verification link (optional)"
              : "Supporting information link (optional)"}
          </span>
          <input
            name="url"
            defaultValue={editing?.url ?? ""}
            placeholder={certificationOnly ? "credly.com/badges/..." : "example.com/details"}
          />
        </label>
        <BackgroundThumbnailUploader
          key={editing?.id ?? `new-thumbnail-${visibleTypes[0]}`}
          verified={verified}
          value={thumbnailUrl}
          onChange={setThumbnailUrl}
          message={message}
        />
        {certificationOnly ? (
          <CertificationDocumentUploader
            verified={verified}
            value={supportingDocumentUrl}
            onChange={setSupportingDocumentUrl}
            message={message}
          />
        ) : (
          <label>
            <span>Supporting document link (optional)</span>
            <input
              value={supportingDocumentUrl}
              onChange={(event) => setSupportingDocumentUrl(event.target.value)}
            />
          </label>
        )}
        <label className="check-label">
          <input name="published" type="checkbox" defaultChecked={editing?.published ?? true} />{" "}
          <span>Show this on my public portfolio</span>
        </label>
        <button type="submit" disabled={busy}>
          {busy
            ? "Saving…"
            : editing
              ? "Save changes"
              : `Add ${labels[visibleTypes[0]].toLowerCase()}`}
        </button>
        {editing && (
          <button type="button" className="secondary-button" onClick={cancelEdit} disabled={busy}>
            Cancel editing
          </button>
        )}
      </form>
    </div>
  );
}

function SkillIconUploader({
  verified,
  value,
  onChange,
  message,
}: {
  verified: boolean;
  value: string;
  onChange: (url: string) => void;
  message: (value: string) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const cancelRef = useRef<null | (() => void)>(null);

  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );

  function choose(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;
    if (preview) URL.revokeObjectURL(preview);
    setProgress(0);
    onChange("");
    if (!selected) {
      setFile(null);
      setPreview("");
      return;
    }
    if (!selected.type.startsWith("image/")) {
      event.target.value = "";
      message("Choose an image file for the skill icon.");
      return;
    }
    if (selected.size > 2 * 1024 * 1024) {
      event.target.value = "";
      message("The skill icon must be 2 MB or smaller.");
      return;
    }
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
  }

  async function upload() {
    if (!file) return;
    setUploading(true);
    const task = uploadFileWithProgress<{ fileUrl: string }>(
      file,
      "IMAGE",
      "SKILL_ICON",
      setProgress,
    );
    cancelRef.current = task.cancel;
    try {
      const uploaded = await task.promise;
      onChange(uploaded.data.fileUrl);
      message("Skill icon uploaded. Save the skill to finish.");
    } catch (error) {
      message(
        error instanceof DOMException && error.name === "AbortError"
          ? "Skill icon upload cancelled."
          : error instanceof Error
            ? error.message
            : "Skill icon upload failed.",
      );
    } finally {
      setUploading(false);
      cancelRef.current = null;
    }
  }

  const displayedIcon = preview || value;
  return (
    <div className="skill-icon-uploader">
      <div className="skill-icon-upload-copy">
        <strong>Skill icon</strong>
        <span>Upload a square PNG, JPG, WebP or SVG image. Maximum 2 MB.</span>
      </div>
      {!verified && (
        <div className="form-lock">Verify your email before uploading a skill icon.</div>
      )}
      <div className="skill-icon-upload-body">
        <div
          className="skill-icon-preview"
          style={displayedIcon ? { backgroundImage: `url(${displayedIcon})` } : undefined}
        >
          {!displayedIcon && <span>Icon</span>}
        </div>
        <label className="skill-icon-picker">
          <span>{file ? file.name : "Choose skill icon"}</span>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            onChange={choose}
            disabled={!verified || uploading}
          />
        </label>
      </div>
      {uploading && (
        <div className="upload-progress">
          <div>
            <span style={{ width: `${progress}%` }} />
          </div>
          <p>{progress}% uploaded</p>
          <button type="button" onClick={() => cancelRef.current?.()}>
            Cancel upload
          </button>
        </div>
      )}
      <button
        type="button"
        className="skill-icon-upload-button"
        onClick={upload}
        disabled={!verified || !file || uploading}
      >
        {uploading ? "Uploading icon…" : value ? "Replace uploaded icon" : "Upload skill icon"}
      </button>
      {value && <p className="skill-icon-ready">✓ Icon uploaded and ready</p>}
    </div>
  );
}

function SkillsPanel({
  verified,
  skills,
  setContent,
  busy,
  setBusy,
  message,
}: {
  verified: boolean;
  skills: PortfolioSkill[];
  setContent: React.Dispatch<React.SetStateAction<ProfileContent>>;
  busy: boolean;
  setBusy: (v: boolean) => void;
  message: (v: string) => void;
}) {
  const [iconUrl, setIconUrl] = useState("");
  const [uploaderKey, setUploaderKey] = useState(0);
  const [editing, setEditing] = useState<PortfolioSkill | null>(null);
  const [selectedSkills, setSelectedSkills] = useState<Set<string>>(new Set());
  const grouped = useMemo(() => {
    const result = new Map<string, PortfolioSkill[]>();
    skills.forEach((skill) =>
      result.set(skill.category, [...(result.get(skill.category) ?? []), skill]),
    );
    return Array.from(result.entries());
  }, [skills]);

  function edit(skill: PortfolioSkill) {
    setEditing(skill);
    setIconUrl(skill.iconUrl ?? "");
    setUploaderKey((value) => value + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function cancelEdit() {
    setEditing(null);
    setIconUrl("");
    setUploaderKey((value) => value + 1);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const endpoint = editing
      ? `/api/v1/profile-content/private/skills/${editing.id}`
      : "/api/v1/profile-content/private/skills";
    const response = await apiFetch<PortfolioSkill>(endpoint, {
      method: editing ? "PUT" : "POST",
      body: JSON.stringify({
        name: form.get("name"),
        category: form.get("category"),
        proficiency: form.get("proficiency"),
        iconUrl,
        featured: form.get("featured") === "on",
        sortOrder: editing?.sortOrder,
      }),
    });
    if (response.response.ok) {
      setContent((current) => ({
        ...current,
        skills: editing
          ? current.skills.map((skill) => (skill.id === editing.id ? response.result.data : skill))
          : [...current.skills, response.result.data],
      }));
      formElement.reset();
      cancelEdit();
      message(editing ? "Skill updated." : "Skill added.");
    } else {
      message(response.result.message);
    }
    setBusy(false);
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this skill?")) return;
    const response = await apiFetch(`/api/v1/profile-content/private/skills/${id}`, {
      method: "DELETE",
    });
    if (response.response.ok)
      setContent((current) => ({
        ...current,
        skills: current.skills.filter((skill) => skill.id !== id),
      }));
    else message(response.result.message);
  }

  async function removeSelectedSkills() {
    const ids = Array.from(selectedSkills);
    if (
      !ids.length ||
      !window.confirm(`Delete ${ids.length} selected skill${ids.length === 1 ? "" : "s"}?`)
    )
      return;
    setBusy(true);
    const results = await Promise.all(
      ids.map((id) =>
        apiFetch(`/api/v1/profile-content/private/skills/${id}`, {
          method: "DELETE",
        }),
      ),
    );
    const deleted = ids.filter((_, index) => results[index].response.ok);
    setContent((current) => ({
      ...current,
      skills: current.skills.filter((skill) => !deleted.includes(skill.id)),
    }));
    setSelectedSkills(new Set());
    setBusy(false);
    message(
      deleted.length === ids.length
        ? "Selected skills deleted."
        : `${deleted.length} of ${ids.length} skills deleted.`,
    );
  }

  return (
    <div className="two-column skills-workspace">
      {skills.length > 0 && (
        <div className="entity-bulk-toolbar skill-bulk-toolbar">
          <span>
            {selectedSkills.size ? `${selectedSkills.size} selected` : `${skills.length} skills`}
          </span>
          <button
            type="button"
            onClick={() => setSelectedSkills(new Set(skills.map((skill) => skill.id)))}
          >
            Select all
          </button>
          <button type="button" onClick={() => setSelectedSkills(new Set())}>
            Clear
          </button>
          <button
            type="button"
            className="danger-action"
            disabled={!selectedSkills.size}
            onClick={() => void removeSelectedSkills()}
          >
            Delete selected
          </button>
        </div>
      )}
      <section className="editor-card skills-library">
        <div className="card-heading">
          <span>Skills library</span>
          <h2>Your capabilities</h2>
          <p>Organized by category, easy to review and quick to update.</p>
        </div>
        <div className="skill-editor-groups">
          {grouped.map(([category, items]) => (
            <section key={category}>
              <header>
                <h3>{category}</h3>
                <span>
                  {items.length} skill{items.length === 1 ? "" : "s"}
                </span>
              </header>
              <div className="skill-editor-list">
                {items.map((skill) => (
                  <article
                    key={skill.id}
                    className={selectedSkills.has(skill.id) ? "is-selected" : ""}
                  >
                    <label className="skill-select" title={`Select ${skill.name}`}>
                      <input
                        type="checkbox"
                        checked={selectedSkills.has(skill.id)}
                        onChange={() =>
                          setSelectedSkills((current) => {
                            const next = new Set(current);
                            if (next.has(skill.id)) next.delete(skill.id);
                            else next.add(skill.id);
                            return next;
                          })
                        }
                      />
                      <span className="sr-only">Select {skill.name}</span>
                    </label>
                    {skill.iconUrl ? (
                      <span
                        className="skill-list-icon"
                        style={{ backgroundImage: `url(${skill.iconUrl})` }}
                      />
                    ) : (
                      <b className="skill-fallback-icon">{skill.name.slice(0, 2).toUpperCase()}</b>
                    )}
                    <div className="skill-card-copy">
                      <strong>{skill.name}</strong>
                      <span className={`skill-level level-${skill.proficiency.toLowerCase()}`}>
                        {skill.proficiency.toLowerCase()}
                      </span>
                      {skill.featured && <small>Featured</small>}
                    </div>
                    <div className="item-actions">
                      <button type="button" onClick={() => edit(skill)}>
                        Edit
                      </button>
                      <button
                        type="button"
                        className="danger-action"
                        onClick={() => remove(skill.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
          {skills.length === 0 && (
            <div className="skills-empty">
              <strong>No skills added yet</strong>
              <p>Use the form beside this panel to add your first capability.</p>
            </div>
          )}
        </div>
      </section>
      <form key={editing?.id ?? "new-skill"} className="editor-card skill-form" onSubmit={save}>
        <div className="card-heading">
          <span>{editing ? "Edit skill" : "Add a skill"}</span>
          <h2>{editing ? `Update ${editing.name}` : "Keep it easy to scan"}</h2>
          <p>
            For a recognizable technology icon, choose one from{" "}
            <a href="https://devicon.dev/" target="_blank" rel="noreferrer">
              Devicon ↗
            </a>
            , download it, then upload it below.
          </p>
        </div>
        <label>
          <span>Skill or technology</span>
          <input
            name="name"
            defaultValue={editing?.name ?? ""}
            required
            placeholder="Spring Boot"
          />
        </label>
        <label>
          <span>Category</span>
          <input
            name="category"
            defaultValue={editing?.category ?? ""}
            required
            placeholder="Backend development"
          />
        </label>
        <label>
          <span>Proficiency</span>
          <select name="proficiency" defaultValue={editing?.proficiency ?? "INTERMEDIATE"}>
            <option value="BEGINNER">Beginner</option>
            <option value="INTERMEDIATE">Intermediate</option>
            <option value="ADVANCED">Advanced</option>
            <option value="EXPERT">Expert</option>
          </select>
        </label>
        <label className="check-label">
          <input name="featured" type="checkbox" defaultChecked={editing?.featured ?? false} />{" "}
          <span>Feature this skill</span>
        </label>
        <SkillIconUploader
          key={uploaderKey}
          verified={verified}
          value={iconUrl}
          onChange={setIconUrl}
          message={message}
        />
        <button type="submit" disabled={busy}>
          {busy ? "Saving…" : editing ? "Save skill changes" : "Add skill"}
        </button>
        {editing && (
          <button type="button" className="secondary-button" onClick={cancelEdit} disabled={busy}>
            Cancel editing
          </button>
        )}
      </form>
    </div>
  );
}

function ProjectThumbnailUploader({
  verified,
  assets,
  setAssets,
  selectedUrl,
  onSelected,
  message,
}: {
  verified: boolean;
  assets: Asset[];
  setAssets: React.Dispatch<React.SetStateAction<Asset[]>>;
  selectedUrl: string;
  onSelected: (url: string) => void;
  message: (v: string) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const cancelRef = useRef<null | (() => void)>(null);

  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );

  function choose(event: React.ChangeEvent<HTMLInputElement>) {
    const next = event.target.files?.[0] ?? null;
    setFile(next);
    setProgress(0);
    setPreview(next ? URL.createObjectURL(next) : null);
  }

  function chooseExisting(url: string) {
    setFile(null);
    setPreview(null);
    setProgress(0);
    onSelected(url);
  }

  async function upload() {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      message("Choose an image file for the project thumbnail.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      message("The project thumbnail must be 8 MB or smaller.");
      return;
    }

    setUploading(true);
    const task = uploadFileWithProgress<{ fileUrl: string }>(
      file,
      "IMAGE",
      "WORK_THUMBNAIL",
      setProgress,
    );
    cancelRef.current = task.cancel;
    try {
      const uploaded = await task.promise;
      const url = uploaded.data.fileUrl;
      setAssets((list) =>
        list.some((asset) => asset.url === url)
          ? list
          : [
              ...list,
              {
                url,
                name: file.name,
                purpose: "WORK_THUMBNAIL",
                bytes: file.size,
                category: "IMAGE",
              },
            ],
      );
      onSelected(url);
      setFile(null);
      setPreview(null);
      setProgress(0);
      message("Thumbnail uploaded and attached. Continue completing your project.");
    } catch (error) {
      message(
        error instanceof DOMException && error.name === "AbortError"
          ? "Thumbnail upload cancelled."
          : error instanceof Error
            ? error.message
            : "Thumbnail upload failed",
      );
    } finally {
      setUploading(false);
      cancelRef.current = null;
    }
  }

  const displayedImage = preview ?? selectedUrl;
  const thumbnailAssets = assets.filter((asset) => asset.purpose === "WORK_THUMBNAIL");
  return (
    <section className="inline-thumbnail-upload">
      <div className="card-heading">
        <span>Project thumbnail</span>
        <h2>Upload without leaving this form</h2>
        <p>Your project fields stay exactly as they are while the image uploads.</p>
      </div>
      {!verified && (
        <div className="form-lock">Verify your email before uploading a thumbnail.</div>
      )}
      {displayedImage && (
        <div
          className="upload-preview"
          role="img"
          aria-label="Project thumbnail preview"
          style={{ backgroundImage: `url(${displayedImage})` }}
        />
      )}
      <label className="file-picker">
        <span>Choose a new thumbnail — maximum 8 MB</span>
        <input type="file" accept="image/*" onChange={choose} disabled={!verified || uploading} />
      </label>
      {file && (
        <p className="file-name">
          {file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB
        </p>
      )}
      {uploading && (
        <div className="upload-progress">
          <div>
            <span style={{ width: `${progress}%` }} />
          </div>
          <p>{progress}% uploaded</p>
          <button type="button" onClick={() => cancelRef.current?.()}>
            Cancel upload
          </button>
        </div>
      )}
      <button
        type="button"
        className="dashboard-action"
        disabled={!verified || !file || uploading}
        onClick={upload}
      >
        {uploading ? "Uploading thumbnail…" : "Upload and use this thumbnail"}
      </button>
      <label>
        <span>Or use an image uploaded earlier</span>
        <select
          value={selectedUrl}
          onChange={(event) => chooseExisting(event.target.value)}
          disabled={uploading}
        >
          <option value="">No thumbnail</option>
          {thumbnailAssets.map((asset) => (
            <option value={asset.url} key={asset.url}>
              {asset.name}
            </option>
          ))}
        </select>
      </label>
      {selectedUrl && (
        <button
          type="button"
          className="dashboard-action secondary-action"
          disabled={uploading}
          onClick={() => chooseExisting("")}
        >
          Remove selected thumbnail
        </button>
      )}
    </section>
  );
}

// Gallery Uploader Component
function GalleryUploader({
  verified,
  assets,
  setAssets,
  galleryUrls,
  onUpdate,
  message,
}: {
  verified: boolean;
  assets: Asset[];
  setAssets: React.Dispatch<React.SetStateAction<Asset[]>>;
  galleryUrls: string[];
  onUpdate: (urls: string[]) => void;
  message: (v: string) => void;
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadedUrls, setUploadedUrls] = useState<string[]>(galleryUrls);
  const cancelRef = useRef<null | (() => void)>(null);

  useEffect(() => {
    return () => previews.forEach((url) => URL.revokeObjectURL(url));
  }, [previews]);

  function choose(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files ? Array.from(event.target.files) : [];
    setFiles(selected);
    setPreviews(selected.map((file) => URL.createObjectURL(file)));
  }

  function removePreview(index: number) {
    const updatedFiles = files.filter((_, i) => i !== index);
    const updatedPreviews = previews.filter((_, i) => i !== index);
    setFiles(updatedFiles);
    setPreviews(updatedPreviews);
  }

  function removeUploadedUrl(url: string) {
    const updated = uploadedUrls.filter((u) => u !== url);
    setUploadedUrls(updated);
    onUpdate(updated);
  }

  async function uploadGallery() {
    if (files.length === 0) return;

    setUploading(true);
    const uploaded: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const isImage = file.type.startsWith("image/");
      const isVideo = file.type.startsWith("video/");

      if (!isImage && !isVideo) {
        message(`${file.name} is not an image or video.`);
        continue;
      }

      if (file.size > 100 * 1024 * 1024) {
        message(`${file.name} exceeds 100 MB limit.`);
        continue;
      }

      try {
        const category = isImage ? "IMAGE" : "VIDEO";
        const usage = isImage ? "WORK_GALLERY_IMAGE" : "WORK_GALLERY_VIDEO";
        const task = uploadFileWithProgress<{ fileUrl: string }>(
          file,
          category,
          usage,
          setProgress,
        );
        cancelRef.current = task.cancel;

        const result = await task.promise;
        const url = result.data.fileUrl;
        uploaded.push(url);

        setAssets((list) => [
          ...list,
          {
            url,
            name: file.name,
            purpose: "WORK_GALLERY",
            bytes: file.size,
            category,
          },
        ]);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          message("Upload cancelled.");
          break;
        }
        message(error instanceof Error ? error.message : "Upload failed");
      }
    }

    const allUrls = [...uploadedUrls, ...uploaded];
    setUploadedUrls(allUrls);
    onUpdate(allUrls);
    setFiles([]);
    setPreviews([]);
    setUploading(false);
    cancelRef.current = null;
    message(`${uploaded.length} file(s) uploaded successfully.`);
  }

  const allAssets = assets.filter((asset) => asset.purpose === "WORK_GALLERY");

  return (
    <section className="inline-gallery-upload">
      <div className="card-heading">
        <span>Project gallery</span>
        <h2>Upload images or videos</h2>
        <p>Drag & drop or click to upload multiple files. Maximum 100 MB each.</p>
      </div>

      {!verified && (
        <div className="form-lock">Verify your email before uploading gallery files.</div>
      )}

      <div className="gallery-drop-zone">
        <input
          type="file"
          accept="image/*,video/*"
          multiple
          onChange={choose}
          disabled={!verified || uploading}
          id="gallery-file-input"
          style={{ display: "none" }}
        />
        <label htmlFor="gallery-file-input" className="drop-zone-label">
          <span>📁</span>
          <p>Drag & drop or click to upload</p>
          <small>Supports images (JPG, PNG, GIF, WebP) and videos (MP4, WebM)</small>
          <small>Maximum 100 MB per file</small>
        </label>
      </div>

      {previews.length > 0 && (
        <div className="gallery-preview-grid">
          {previews.map((url, index) => (
            <div key={index} className="gallery-item-preview">
              {files[index]?.type.startsWith("video/") ? (
                <video src={url} muted />
              ) : (
                <img src={url} alt={`Gallery ${index + 1}`} />
              )}
              <button type="button" onClick={() => removePreview(index)}>
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {uploading && (
        <div className="upload-progress">
          <div>
            <span style={{ width: `${progress}%` }} />
          </div>
          <p>{progress}% uploaded</p>
          <button type="button" onClick={() => cancelRef.current?.()}>
            Cancel
          </button>
        </div>
      )}

      {files.length > 0 && !uploading && (
        <button type="button" className="dashboard-action" onClick={uploadGallery}>
          Upload {files.length} file(s) to gallery
        </button>
      )}

      {uploadedUrls.length > 0 && (
        <div className="gallery-urls-list">
          <h4>Uploaded gallery items</h4>
          <div className="gallery-items-grid">
            {uploadedUrls.map((url) => (
              <div key={url} className="gallery-item">
                {url.match(/\.(mp4|webm|ogg|mov)$/i) ? (
                  <video src={url} controls />
                ) : (
                  <img src={url} alt="Gallery item" />
                )}
                <button type="button" onClick={() => removeUploadedUrl(url)}>
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {allAssets.length > 0 && (
        <div className="gallery-assets-select">
          <label>
            <span>Or use previously uploaded gallery files</span>
          </label>
          <div className="asset-options">
            {allAssets.map((asset) => (
              <button
                key={asset.url}
                type="button"
                onClick={() => {
                  if (!uploadedUrls.includes(asset.url)) {
                    const updated = [...uploadedUrls, asset.url];
                    setUploadedUrls(updated);
                    onUpdate(updated);
                  }
                }}
                disabled={uploadedUrls.includes(asset.url)}
              >
                {asset.name} {uploadedUrls.includes(asset.url) && "✓"}
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function ProjectsPanel({
  verified,
  works,
  setWorks,
  assets,
  setAssets,
  busy,
  setBusy,
  message,
}: {
  verified: boolean;
  works: Work[];
  setWorks: React.Dispatch<React.SetStateAction<Work[]>>;
  assets: Asset[];
  setAssets: React.Dispatch<React.SetStateAction<Asset[]>>;
  busy: boolean;
  setBusy: (v: boolean) => void;
  message: (v: string) => void;
}) {
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [galleryUrls, setGalleryUrls] = useState<string[]>([]);
  const [editingWork, setEditingWork] = useState<Work | null>(null);
  const [selectedWorks, setSelectedWorks] = useState<Set<string>>(new Set());
  const formRef = useRef<HTMLFormElement>(null);

  function beginEdit(work: Work) {
    setEditingWork(work);
    setThumbnailUrl(work.thumbnailUrl ?? "");
    setGalleryUrls(work.galleryUrls ?? []);
    window.requestAnimationFrame(() =>
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  }

  function resetForm(form?: HTMLFormElement) {
    form?.reset();
    setEditingWork(null);
    setThumbnailUrl("");
    setGalleryUrls([]);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const title = String(form.get("title"));
    const technologies = String(form.get("technologyStack") || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    const projectFields = {
      title,
      summary: form.get("summary"),
      description: form.get("description"),
      challenge: form.get("challenge"),
      process: form.get("process"),
      results: form.get("results"),
      category: form.get("category"),
      role: form.get("role"),
      startedAt: form.get("startedAt") || null,
      completedAt: form.get("ongoing") === "on" ? null : form.get("completedAt") || null,
      ongoing: form.get("ongoing") === "on",
      projectUrl: form.get("projectUrl"),
      sourceUrl: form.get("sourceUrl"),
      thumbnailUrl: thumbnailUrl || "",
      galleryUrls: galleryUrls,
      technologyStack: technologies,
      featured: form.get("featured") === "on",
    };
    const body = editingWork
      ? {
          ...projectFields,
          sortOrder: Number(form.get("sortOrder") ?? editingWork.sortOrder),
        }
      : {
          ...projectFields,
          slug: title
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, ""),
          status: "PUBLISHED",
        };
    const endpoint = editingWork
      ? `/api/v1/works/private/${editingWork.id}`
      : "/api/v1/works/private";
    const result = await apiFetch<Work>(endpoint, {
      method: editingWork ? "PATCH" : "POST",
      body: JSON.stringify(body),
    });
    if (result.response.ok) {
      setWorks((list) =>
        editingWork
          ? list.map((item) => (item.id === editingWork.id ? result.result.data : item))
          : [...list, result.result.data],
      );
      message(editingWork ? "Project changes saved." : "Case study saved and published.");
      resetForm(formElement);
    } else message(result.result.message);
    setBusy(false);
  }

  async function toggle(work: Work) {
    const status = work.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED";
    const result = await apiFetch<Work>(`/api/v1/works/private/${work.id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    if (result.response.ok) {
      setWorks((list) => list.map((item) => (item.id === work.id ? result.result.data : item)));
      message(status === "PUBLISHED" ? "Project published." : "Project returned to drafts.");
    } else message(result.result.message);
  }

  async function remove(work: Work) {
    if (!confirm(`Remove “${work.title}”?`)) return;
    const result = await apiFetch(`/api/v1/works/private/${work.id}`, {
      method: "DELETE",
    });
    if (result.response.ok) {
      setWorks((list) => list.filter((item) => item.id !== work.id));
      if (editingWork?.id === work.id) resetForm(formRef.current ?? undefined);
    } else message(result.result.message);
  }

  async function removeSelectedWorks() {
    const ids = Array.from(selectedWorks);
    if (
      !ids.length ||
      !confirm(`Delete ${ids.length} selected project${ids.length === 1 ? "" : "s"}?`)
    )
      return;
    setBusy(true);
    const results = await Promise.all(
      ids.map((id) => apiFetch(`/api/v1/works/private/${id}`, { method: "DELETE" })),
    );
    const removed = ids.filter((_, index) => results[index].response.ok);
    setWorks((list) => list.filter((work) => !removed.includes(work.id)));
    if (editingWork && removed.includes(editingWork.id)) resetForm(formRef.current ?? undefined);
    setSelectedWorks(new Set());
    setBusy(false);
    message(`${removed.length} project${removed.length === 1 ? "" : "s"} deleted.`);
  }

  return (
    <div className="projects-layout">
      <section className="editor-card">
        <div className="card-heading">
          <span>Your work</span>
          <h2>Project case studies</h2>
          <p>Select Edit to change any information without creating the project again.</p>
        </div>
        {works.length > 0 && (
          <div className="entity-bulk-toolbar">
            <button
              type="button"
              onClick={() => setSelectedWorks(new Set(works.map((work) => work.id)))}
            >
              Select all
            </button>
            <button type="button" onClick={() => setSelectedWorks(new Set())}>
              Clear
            </button>
            <button
              type="button"
              className="danger-action"
              disabled={!selectedWorks.size}
              onClick={() => void removeSelectedWorks()}
            >
              Delete selected ({selectedWorks.size})
            </button>
          </div>
        )}
        <div className="project-editor-list">
          {works.map((work) => (
            <article key={work.id} className={editingWork?.id === work.id ? "is-editing" : ""}>
              <label className="entity-select">
                <input
                  type="checkbox"
                  checked={selectedWorks.has(work.id)}
                  onChange={() =>
                    setSelectedWorks((current) => {
                      const next = new Set(current);
                      if (next.has(work.id)) next.delete(work.id);
                      else next.add(work.id);
                      return next;
                    })
                  }
                />
                <span>Select</span>
              </label>
              <div>
                <span>{work.status}</span>
                <h3>{work.title}</h3>
                <p>{work.summary}</p>
                <small>
                  {work.category} · {work.technologyStack.join(", ") || "No technology added"}
                </small>
              </div>
              <div>
                <button type="button" onClick={() => beginEdit(work)}>
                  Edit
                </button>
                <button type="button" onClick={() => toggle(work)}>
                  {work.status === "PUBLISHED" ? "Unpublish" : "Publish"}
                </button>
                <button type="button" onClick={() => remove(work)}>
                  Remove
                </button>
              </div>
            </article>
          ))}
          {works.length === 0 && (
            <p className="public-empty">No projects yet. Add your strongest work first.</p>
          )}
        </div>
      </section>
      <form
        key={editingWork?.id ?? "new-project"}
        ref={formRef}
        className={`editor-card case-form ${editingWork ? "is-editing" : ""}`}
        onSubmit={save}
      >
        <div className="card-heading">
          <span>{editingWork ? "Editing project" : "New case study"}</span>
          <h2>{editingWork ? `Update ${editingWork.title}` : "Explain the work clearly"}</h2>
          <p>
            {editingWork
              ? "Change any field below and save. The project's publication status will not be changed."
              : "Add the details recruiters need to understand your work."}
          </p>
        </div>
        <div className="form-row">
          <label>
            <span>Project title</span>
            <input name="title" required defaultValue={editingWork?.title ?? ""} />
          </label>
          <label>
            <span>Category</span>
            <input
              name="category"
              required
              placeholder="Fintech, Design…"
              defaultValue={editingWork?.category ?? ""}
            />
          </label>
        </div>
        <label>
          <span>Short outcome</span>
          <textarea
            name="summary"
            required
            minLength={10}
            defaultValue={editingWork?.summary ?? ""}
          />
        </label>
        <label>
          <span>Overview</span>
          <textarea name="description" defaultValue={editingWork?.description ?? ""} />
        </label>
        <div className="case-fields">
          <label>
            <span>Challenge</span>
            <textarea name="challenge" defaultValue={editingWork?.challenge ?? ""} />
          </label>
          <label>
            <span>Process</span>
            <textarea name="process" defaultValue={editingWork?.process ?? ""} />
          </label>
          <label>
            <span>Results</span>
            <textarea name="results" defaultValue={editingWork?.results ?? ""} />
          </label>
        </div>
        <label>
          <span>Your role</span>
          <input name="role" defaultValue={editingWork?.role ?? ""} />
        </label>
        <div className="form-row">
          <label>
            <span>Start date</span>
            <input name="startedAt" type="date" defaultValue={editingWork?.startedAt ?? ""} />
          </label>
          <label>
            <span>Completion date</span>
            <input name="completedAt" type="date" defaultValue={editingWork?.completedAt ?? ""} />
          </label>
        </div>
        <div className="form-row">
          <label>
            <span>Project link</span>
            <input
              name="projectUrl"
              placeholder="project.example.com"
              defaultValue={editingWork?.projectUrl ?? ""}
            />
          </label>
          <label>
            <span>Source link</span>
            <input
              name="sourceUrl"
              placeholder="github.com/your-name/project"
              defaultValue={editingWork?.sourceUrl ?? ""}
            />
          </label>
        </div>
        <label>
          <span>Technology stack</span>
          <input
            name="technologyStack"
            placeholder="Java, Spring Boot, PostgreSQL"
            defaultValue={editingWork?.technologyStack.join(", ") ?? ""}
          />
          <small>Separate technologies with commas.</small>
        </label>
        <ProjectThumbnailUploader
          verified={verified}
          assets={assets}
          setAssets={setAssets}
          selectedUrl={thumbnailUrl}
          onSelected={setThumbnailUrl}
          message={message}
        />
        <GalleryUploader
          verified={verified}
          assets={assets}
          setAssets={setAssets}
          galleryUrls={galleryUrls}
          onUpdate={setGalleryUrls}
          message={message}
        />
        {editingWork && (
          <label>
            <span>Display order</span>
            <input name="sortOrder" type="number" min={0} defaultValue={editingWork.sortOrder} />
            <small>Lower numbers appear first.</small>
          </label>
        )}
        <div className="form-row check-row">
          <label className="check-label">
            <input name="ongoing" type="checkbox" defaultChecked={editingWork?.ongoing ?? false} />{" "}
            <span>Ongoing project</span>
          </label>
          <label className="check-label">
            <input
              name="featured"
              type="checkbox"
              defaultChecked={editingWork?.featured ?? false}
            />{" "}
            <span>Featured project</span>
          </label>
        </div>
        <button type="submit" disabled={busy}>
          {busy ? "Saving…" : editingWork ? "Save project changes" : "Save and publish case study"}
        </button>
        {editingWork && (
          <button
            type="button"
            className="secondary-button"
            disabled={busy}
            onClick={() => resetForm(formRef.current ?? undefined)}
          >
            Cancel editing
          </button>
        )}
      </form>
    </div>
  );
}

type FilePurpose = "AVATAR" | "PROFILE_VIDEO" | "CV" | "WORK_THUMBNAIL" | "WORK_GALLERY";
const filePurposeLabels: Record<FilePurpose, string> = {
  AVATAR: "Profile image — 5 MB",
  PROFILE_VIDEO: "Short introduction video — 50 MB",
  CV: "CV / résumé PDF — 10 MB",
  WORK_THUMBNAIL: "Project thumbnail — 8 MB",
  WORK_GALLERY: "Project gallery — 100 MB",
};

function normalizeAssetPurpose(usage: string) {
  if (usage === "PROFILE_IMAGE") return "AVATAR";
  if (usage === "WORK_GALLERY_IMAGE" || usage === "WORK_GALLERY_VIDEO" || usage === "WORK_DOCUMENT")
    return "WORK_GALLERY";
  return usage;
}

function AssetPreview({ asset }: { asset: Asset }) {
  if (asset.category === "IMAGE")
    return (
      <div
        className="asset-preview asset-preview-image"
        role="img"
        aria-label={`${asset.name} preview`}
        style={{ backgroundImage: `url(${asset.url})` }}
      />
    );
  if (asset.category === "VIDEO")
    return (
      <video
        className="asset-preview asset-preview-video"
        src={asset.url}
        controls
        preload="metadata"
      />
    );
  if (
    asset.category === "DOCUMENT" &&
    (asset.purpose === "CV" || asset.name.toLowerCase().endsWith(".pdf"))
  )
    return (
      <object
        className="asset-preview asset-preview-pdf"
        data={`${asset.url}#toolbar=0&navpanes=0`}
        type="application/pdf"
      >
        <a href={asset.url} target="_blank" rel="noreferrer">
          Open PDF
        </a>
      </object>
    );
  return (
    <a
      className="asset-preview asset-preview-document"
      href={asset.url}
      target="_blank"
      rel="noreferrer"
    >
      <span>{asset.category === "AUDIO" ? "AUDIO" : "FILE"}</span>
      <small>Open preview ↗</small>
    </a>
  );
}

function FilesPanel({
  verified,
  portfolio,
  setPortfolio,
  assets,
  setAssets,
  message,
  allowedPurposes,
  showAssets = true,
}: {
  verified: boolean;
  portfolio: Portfolio;
  setPortfolio: React.Dispatch<React.SetStateAction<Portfolio>>;
  assets: Asset[];
  setAssets: React.Dispatch<React.SetStateAction<Asset[]>>;
  message: (v: string) => void;
  allowedPurposes?: FilePurpose[];
  showAssets?: boolean;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const cancelRef = useRef<null | (() => void)>(null);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const purposeOptions = allowedPurposes ?? (Object.keys(filePurposeLabels) as FilePurpose[]);
  function choose(event: React.ChangeEvent<HTMLInputElement>) {
    const next = event.target.files?.[0] ?? null;
    setFile(next);
    setProgress(0);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(next ? URL.createObjectURL(next) : null);
  }
  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const purpose = String(form.get("purpose"));
    const limits: Record<string, number> = {
      AVATAR: 5,
      CV: 10,
      PROFILE_VIDEO: 50,
      WORK_THUMBNAIL: 8,
      WORK_GALLERY: 100,
    };
    if (file.size > (limits[purpose] ?? 100) * 1024 * 1024)
      return message(`File is larger than the ${limits[purpose]} MB limit.`);
    if (purpose === "CV" && file.type !== "application/pdf")
      return message("Your CV must be a PDF.");
    if ((purpose === "AVATAR" || purpose === "WORK_THUMBNAIL") && !file.type.startsWith("image/"))
      return message("Choose an image file.");
    if (purpose === "PROFILE_VIDEO" && !file.type.startsWith("video/"))
      return message("Choose a video file.");
    const category: Asset["category"] = file.type.startsWith("image/")
      ? "IMAGE"
      : file.type.startsWith("video/")
        ? "VIDEO"
        : file.type.startsWith("audio/")
          ? "AUDIO"
          : "DOCUMENT";
    const usage =
      purpose === "AVATAR"
        ? "PROFILE_IMAGE"
        : purpose === "WORK_GALLERY"
          ? category === "IMAGE"
            ? "WORK_GALLERY_IMAGE"
            : category === "VIDEO"
              ? "WORK_GALLERY_VIDEO"
              : "WORK_DOCUMENT"
          : purpose;
    setUploading(true);
    const task = uploadFileWithProgress<{ fileUrl: string }>(file, category, usage, setProgress);
    cancelRef.current = task.cancel;
    try {
      const result = await task.promise;
      const url = result.data.fileUrl;
      setAssets((list) => [...list, { url, name: file.name, purpose, bytes: file.size, category }]);
      const field =
        purpose === "AVATAR"
          ? "avatarUrl"
          : purpose === "CV"
            ? "cvUrl"
            : purpose === "PROFILE_VIDEO"
              ? "introVideoUrl"
              : null;
      if (field) {
        const update = await apiFetch<Portfolio>("/api/v1/portfolios/private/mine", {
          method: "PATCH",
          body: JSON.stringify({ [field]: url }),
        });
        if (update.response.ok) setPortfolio(update.result.data);
      }
      formElement.reset();
      setFile(null);
      setPreview(null);
      message(
        field
          ? "File uploaded and added to your profile."
          : "File uploaded. Its URL is ready for a project.",
      );
    } catch (error) {
      message(
        error instanceof DOMException && error.name === "AbortError"
          ? "Upload cancelled."
          : error instanceof Error
            ? error.message
            : "Upload failed",
      );
    } finally {
      setUploading(false);
      cancelRef.current = null;
    }
  }
  async function deleteFiles(urls: string[]) {
    const unique = Array.from(new Set(urls.filter(Boolean)));
    if (!unique.length) return;
    if (
      !window.confirm(
        `Delete ${unique.length} selected file${unique.length === 1 ? "" : "s"}? This also removes every portfolio reference to the file.`,
      )
    )
      return;
    const result = await apiFetch<number>("/api/v1/utilities/private/files/delete", {
      method: "POST",
      body: JSON.stringify({ fileUrls: unique }),
    });
    if (!result.response.ok) {
      message(result.result.message || "Unable to delete files");
      return;
    }
    setAssets((current) => current.filter((asset) => !unique.includes(asset.url)));
    setPortfolio((current) => ({
      ...current,
      avatarUrl: unique.includes(current.avatarUrl ?? "") ? "" : current.avatarUrl,
      cvUrl: unique.includes(current.cvUrl ?? "") ? "" : current.cvUrl,
      introVideoUrl: unique.includes(current.introVideoUrl ?? "") ? "" : current.introVideoUrl,
    }));
    setSelectedFiles(new Set());
    message(
      unique.length === 1
        ? "File deleted permanently."
        : `${unique.length} files deleted permanently.`,
    );
  }
  function toggleFile(url: string) {
    setSelectedFiles((current) => {
      const next = new Set(current);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      return next;
    });
  }
  const profileLinks = [
    ["Profile image", portfolio.avatarUrl, "AVATAR", "IMAGE"],
    ["CV / résumé", portfolio.cvUrl, "CV", "DOCUMENT"],
    ["Introduction video", portfolio.introVideoUrl, "PROFILE_VIDEO", "VIDEO"],
  ] as const;
  const labelsByUrl = new Map<string, string[]>();
  profileLinks.forEach(([label, url]) => {
    if (url) labelsByUrl.set(url, [...(labelsByUrl.get(url) ?? []), label]);
  });
  const displayAssets = [...assets];
  profileLinks.forEach(([label, url, purpose, category]) => {
    if (url && !displayAssets.some((asset) => asset.url === url))
      displayAssets.push({ url, name: label, purpose, bytes: 0, category });
  });
  return (
    <div className="two-column files-workspace">
      <form className="editor-card upload-card" onSubmit={upload}>
        <div className="card-heading">
          <span>Secure upload</span>
          <h2>
            {purposeOptions.length === 1
              ? filePurposeLabels[purposeOptions[0]].split(" — ")[0]
              : "Upload a profile or project file"}
          </h2>
          <p>Choose its purpose first, preview it, then upload with confidence.</p>
        </div>
        {!verified && <div className="form-lock">Verify your email before uploading files.</div>}
        <label>
          <span>What is this file for?</span>
          <select name="purpose" disabled={!verified || uploading}>
            {purposeOptions.map((purpose) => (
              <option value={purpose} key={purpose}>
                {filePurposeLabels[purpose]}
              </option>
            ))}
          </select>
        </label>
        <label className="file-picker">
          <span>Choose a file</span>
          <input type="file" onChange={choose} disabled={!verified || uploading} required />
        </label>
        {preview && file?.type.startsWith("image/") && (
          <div className="upload-preview" style={{ backgroundImage: `url(${preview})` }} />
        )}
        {preview && file?.type.startsWith("video/") && (
          <video className="upload-preview-video" src={preview} controls />
        )}
        {preview && file?.type === "application/pdf" && (
          <object className="upload-preview-pdf" data={preview} type="application/pdf">
            <span>PDF selected: {file.name}</span>
          </object>
        )}
        {file && (
          <p className="file-name">
            {file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB
          </p>
        )}
        {uploading && (
          <div className="upload-progress">
            <div>
              <span style={{ width: `${progress}%` }} />
            </div>
            <p>{progress}% uploaded</p>
            <button type="button" onClick={() => cancelRef.current?.()}>
              Cancel upload
            </button>
          </div>
        )}
        <button type="submit" disabled={!verified || !file || uploading}>
          {uploading ? "Uploading…" : "Upload file"}
        </button>
      </form>
      {showAssets && (
        <section className="editor-card file-manager-card">
          <div className="card-heading">
            <span>Visual asset library</span>
            <h2>Your files</h2>
            <p>
              Preview each image, video or PDF before copying, opening or permanently deleting it.
            </p>
          </div>
          <div className="file-bulk-toolbar">
            <span>
              {selectedFiles.size
                ? `${selectedFiles.size} selected`
                : `${displayAssets.length} files`}
            </span>
            <button
              type="button"
              onClick={() => setSelectedFiles(new Set(displayAssets.map((asset) => asset.url)))}
            >
              Select all
            </button>
            <button type="button" onClick={() => setSelectedFiles(new Set())}>
              Clear
            </button>
            <button
              type="button"
              className="danger-action"
              disabled={!selectedFiles.size}
              onClick={() => void deleteFiles(Array.from(selectedFiles))}
            >
              Delete selected
            </button>
          </div>
          <div className="asset-gallery">
            {displayAssets.map((asset) => (
              <article
                key={asset.url}
                className={selectedFiles.has(asset.url) ? "is-selected" : ""}
              >
                <div className="asset-card-preview">
                  <AssetPreview asset={asset} />
                  <label className="asset-card-check">
                    <input
                      type="checkbox"
                      checked={selectedFiles.has(asset.url)}
                      onChange={() => toggleFile(asset.url)}
                    />
                    <span>Select</span>
                  </label>
                  {(labelsByUrl.get(asset.url) ?? []).length > 0 && (
                    <div className="asset-link-badges">
                      {labelsByUrl.get(asset.url)?.map((label) => (
                        <span key={label}>In use: {label}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="asset-card-copy">
                  <span>{asset.category}</span>
                  <strong title={asset.name}>{asset.name}</strong>
                  <small>
                    {asset.purpose.replaceAll("_", " ")} ·{" "}
                    {asset.bytes ? `${(asset.bytes / 1024 / 1024).toFixed(2)} MB` : "Existing file"}
                  </small>
                </div>
                <div className="asset-card-actions">
                  <a href={asset.url} target="_blank" rel="noreferrer">
                    Open
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      void navigator.clipboard.writeText(asset.url);
                      message("File URL copied.");
                    }}
                  >
                    Copy URL
                  </button>
                  <button
                    type="button"
                    className="danger-action"
                    onClick={() => void deleteFiles([asset.url])}
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
            {displayAssets.length === 0 && (
              <div className="skills-empty">
                <strong>No uploaded files yet</strong>
                <p>Your images, videos and documents will appear here with previews.</p>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

function AnalyticsPanel({ analytics }: { analytics: Analytics }) {
  const stats = [
    ["Portfolio views", analytics.views],
    ["Project clicks", analytics.projectClicks],
    ["CV downloads", analytics.cvDownloads],
    ["Website clicks", analytics.websiteClicks],
    ["PDF exports", analytics.exportDownloads],
    ["Recruiter enquiries", analytics.enquiries],
  ];
  const max = Math.max(1, ...analytics.dailyViews.map((d) => d.value));
  return (
    <div className="analytics-panel">
      <div className="metric-grid">
        {stats.map(([label, value]) => (
          <article key={String(label)}>
            <span>{label}</span>
            <strong>{value}</strong>
            <small>Last 30 days</small>
          </article>
        ))}
      </div>
      <section className="editor-card analytics-chart">
        <div className="card-heading">
          <span>Activity</span>
          <h2>Portfolio views by day</h2>
        </div>
        <div>
          {analytics.dailyViews.map((day) => (
            <span
              key={day.date}
              title={`${day.date}: ${day.value}`}
              style={{ height: `${Math.max(4, (day.value / max) * 100)}%` }}
            />
          ))}
        </div>
      </section>
      <div className="analytics-lists">
        <MetricList title="Traffic sources" items={analytics.trafficSources} />
        <MetricList title="Recruiter locations" items={analytics.locations} />
        <MetricList title="Most-clicked projects" items={analytics.topProjects} />
      </div>
    </div>
  );
}
function MetricList({
  title,
  items,
}: {
  title: string;
  items: Array<{ name: string; value: number }>;
}) {
  return (
    <section className="editor-card">
      <div className="card-heading">
        <span>Breakdown</span>
        <h2>{title}</h2>
      </div>
      {items.length ? (
        items.map((item) => (
          <p className="metric-row" key={item.name}>
            <span>{item.name}</span>
            <strong>{item.value}</strong>
          </p>
        ))
      ) : (
        <p className="public-empty">
          No data yet. Share your portfolio to begin collecting insights.
        </p>
      )}
    </section>
  );
}

function EnquiriesPanel({
  enquiries,
  setEnquiries,
  message,
}: {
  enquiries: Enquiry[];
  setEnquiries: React.Dispatch<React.SetStateAction<Enquiry[]>>;
  message: (v: string) => void;
}) {
  const [layout, setLayout] = useState<"cards" | "list">(() => {
    if (typeof window === "undefined") return "cards";
    return window.localStorage.getItem("portfolio-enquiries-layout") === "list" ? "list" : "cards";
  });

  function changeLayout(next: "cards" | "list") {
    setLayout(next);
    window.localStorage.setItem("portfolio-enquiries-layout", next);
  }

  async function update(item: Enquiry, status: Enquiry["status"]) {
    const response = await apiFetch<Enquiry>(`/api/v1/enquiries/private/${item.id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    if (response.response.ok) {
      setEnquiries((list) =>
        list.map((enquiry) => (enquiry.id === item.id ? response.result.data : enquiry)),
      );
    } else {
      message(response.result.message);
    }
  }

  const visibleEnquiries = enquiries.filter((item) => item.status !== "ARCHIVED");
  const archivedCount = enquiries.length - visibleEnquiries.length;

  return (
    <section className="enquiries-workspace">
      <header className="enquiries-heading">
        <div>
          <span>Recruiter inbox</span>
          <h2>Portfolio enquiries</h2>
          <p>Read and manage messages sent from your public portfolio.</p>
        </div>
        <div className="enquiries-layout-switcher" aria-label="Enquiry layout">
          <button
            type="button"
            className={layout === "cards" ? "is-active" : ""}
            onClick={() => changeLayout("cards")}
            aria-pressed={layout === "cards"}
          >
            Cards
          </button>
          <button
            type="button"
            className={layout === "list" ? "is-active" : ""}
            onClick={() => changeLayout("list")}
            aria-pressed={layout === "list"}
          >
            List
          </button>
        </div>
      </header>
      <div className="enquiries-summary">
        <strong>{visibleEnquiries.length}</strong>
        <span>active messages</span>
        {archivedCount > 0 && <small>{archivedCount} archived</small>}
      </div>
      {visibleEnquiries.length > 0 ? (
        <div className={`enquiries-collection layout-${layout}`}>
          {visibleEnquiries.map((item) => (
            <article key={item.id} className={`enquiry-item status-${item.status.toLowerCase()}`}>
              <div className="enquiry-meta">
                <span className={`inbox-status status-${item.status.toLowerCase()}`}>
                  {item.status}
                </span>
                <time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString()}</time>
              </div>
              <div className="enquiry-person">
                <h3>{item.name}</h3>
                {item.company && <span className="inbox-company">{item.company}</span>}
                <a href={`mailto:${item.email}`}>{item.email}</a>
              </div>
              <p className="enquiry-message">{item.message}</p>
              <div className="inbox-actions">
                {item.status === "NEW" && (
                  <button type="button" onClick={() => update(item, "READ")}>
                    Mark as read
                  </button>
                )}
                <a
                  href={`mailto:${item.email}?subject=${encodeURIComponent(`Re: your portfolio enquiry`)}`}
                >
                  Reply
                </a>
                <button type="button" onClick={() => update(item, "ARCHIVED")}>
                  Archive
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="enquiries-empty">
          <strong>Your inbox is clear</strong>
          <p>New recruiter messages will appear here.</p>
        </div>
      )}
    </section>
  );
}

function SecurityPanel({
  enabledInitially,
  message,
}: {
  enabledInitially: boolean;
  message: (v: string) => void;
}) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(enabledInitially);
  const [setup, setSetup] = useState<{
    secret: string;
    qrCodeDataUrl: string;
  } | null>(null);
  const [codes, setCodes] = useState<string[]>([]);

  async function begin() {
    const result = await apiFetch<{ secret: string; qrCodeDataUrl: string }>(
      "/api/v1/auth/private/2fa/setup",
      { method: "POST" },
    );
    if (result.response.ok) setSetup(result.result.data);
    else message(result.result.message);
  }

  async function confirm2fa(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const result = await apiFetch<{ recoveryCodes: string[] }>("/api/v1/auth/private/2fa/confirm", {
      method: "POST",
      body: JSON.stringify({ code: form.get("code") }),
    });

    if (result.response.ok) {
      setEnabled(true);
      setSetup(null);
      setCodes(result.result.data.recoveryCodes);
      message("Two-factor authentication enabled.");
    } else {
      message(result.result.message);
    }
  }

  async function disable2fa(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const result = await apiFetch("/api/v1/auth/private/2fa/disable", {
      method: "POST",
      body: JSON.stringify({ password: form.get("password") }),
    });

    if (result.response.ok) {
      setEnabled(false);
      setCodes([]);
      formElement.reset();
      message("Two-factor authentication disabled.");
    } else {
      message(result.result.message);
    }
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const result = await apiFetch("/api/v1/auth/private/change-password", {
      method: "POST",
      body: JSON.stringify({
        currentPassword: form.get("currentPassword"),
        newPassword: form.get("newPassword"),
      }),
    });

    if (result.response.ok) {
      clearAuth();
      router.push("/login?password=changed");
    } else {
      message(result.result.message);
    }
  }

  return (
    <div className="two-column">
      <section className="editor-card">
        <div className="card-heading">
          <span>Account protection</span>
          <h2>Authenticator app</h2>
          <p>
            Status: <strong>{enabled ? "Enabled" : "Not enabled"}</strong>
          </p>
        </div>

        {!enabled && !setup && (
          <button type="button" onClick={begin}>
            Set up two-factor authentication
          </button>
        )}

        {setup && (
          <div className="two-factor-setup">
            <Image
              src={setup.qrCodeDataUrl}
              alt="Authenticator QR code"
              width={220}
              height={220}
              unoptimized
            />
            <code>{setup.secret}</code>
            <form onSubmit={confirm2fa}>
              <label>
                <span>Six-digit code</span>
                <input
                  name="code"
                  pattern="\d{6}"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  required
                />
              </label>
              <button type="submit">Confirm and enable</button>
            </form>
          </div>
        )}

        {codes.length > 0 && (
          <div className="recovery-codes">
            <strong>Save these one-time recovery codes now.</strong>
            {codes.map((code) => (
              <code key={code}>{code}</code>
            ))}
          </div>
        )}

        {enabled && (
          <form onSubmit={disable2fa}>
            <label>
              <span>Confirm your password to disable 2FA</span>
              <PasswordField name="password" autoComplete="current-password" required />
            </label>
            <button type="submit" className="secondary-button">
              Disable two-factor authentication
            </button>
          </form>
        )}
      </section>

      <form className="editor-card" onSubmit={changePassword}>
        <div className="card-heading">
          <span>Password</span>
          <h2>Change your password</h2>
        </div>
        <label>
          <span>Current password</span>
          <PasswordField name="currentPassword" autoComplete="current-password" required />
        </label>
        <label>
          <span>New password</span>
          <PasswordField name="newPassword" autoComplete="new-password" minLength={5} required />
          <small>Use at least 5 characters.</small>
        </label>
        <button type="submit">Change password</button>
      </form>
    </div>
  );
}
