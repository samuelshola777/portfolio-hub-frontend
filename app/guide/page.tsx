import Link from "next/link";

const steps = [
  [
    "Create your account",
    "Choose a unique username. It becomes your permanent public address, for example portfolio.com/your-name.",
  ],
  [
    "Complete the basics",
    "Add a headline, short introduction, availability, profile image and optional introduction video.",
  ],
  [
    "Add proof of your ability",
    "Create project case studies with the challenge, process, result, technology stack, media and working links.",
  ],
  [
    "Add optional background",
    "Add experience, education, certifications, achievements, skills and social profiles. Empty sections remain hidden.",
  ],
  [
    "Publish and share",
    "Publish the portfolio, copy your unique link or QR code, and send it to recruiters.",
  ],
  [
    "Learn from analytics",
    "See views, project clicks, CV downloads, traffic sources, locations and recruiter messages.",
  ],
];

export default function GuidePage() {
  return (
    <main className="guide-page">
      <nav>
        <Link className="wordmark" href="/">
          Portfolio<span>/</span>
        </Link>
        <div>
          <Link href="/login">Sign in</Link>
          <Link href="/register">Create portfolio</Link>
        </div>
      </nav>
      <header>
        <p>Simple user guide</p>
        <h1>From empty profile to recruiter-ready portfolio.</h1>
        <span>
          You do not need to complete everything at once. Start with the basics, add your best work,
          then publish when you are ready.
        </span>
        <Link href="/register">Start building →</Link>
      </header>
      <section className="guide-steps">
        {steps.map(([title, text], index) => (
          <article key={title}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <div>
              <h2>{title}</h2>
              <p>{text}</p>
            </div>
          </article>
        ))}
      </section>
      <section className="guide-faq">
        <div>
          <p>What will recruiters see?</p>
          <h2>Only useful, published information.</h2>
        </div>
        <div>
          <details open>
            <summary>What if I have no employment history?</summary>
            <p>Leave experience empty. The section will not appear on your public portfolio.</p>
          </details>
          <details>
            <summary>Can recruiters open my project and social links?</summary>
            <p>
              Yes. Every valid link opens in a new tab, and project clicks are counted in analytics.
            </p>
          </details>
          <details>
            <summary>How do I share the portfolio?</summary>
            <p>
              Use “Copy portfolio link” in the dashboard, download the QR code, or export the
              portfolio as a PDF.
            </p>
          </details>
          <details>
            <summary>Can I change information after publishing?</summary>
            <p>Yes. Update your content at any time; the same public link continues working.</p>
          </details>
        </div>
      </section>
      <footer>
        <p>Ready to build yours?</p>
        <Link href="/register">Create your portfolio →</Link>
      </footer>
    </main>
  );
}
