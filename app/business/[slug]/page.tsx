"use client";

import { FormEvent, use, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import {
  emptyPage,
  type Business,
  type BusinessItem,
  type BusinessItemType,
  type PageData,
} from "@/lib/business";
import { Pagination } from "@/components/pagination";

const types: BusinessItemType[] = [
  "PAGE",
  "SECTION",
  "PRODUCT",
  "SERVICE",
  "PROJECT",
  "TEAM_MEMBER",
  "TESTIMONIAL",
  "CREDENTIAL",
  "PARTNER",
  "FAQ",
];
export default function BusinessWebsite({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [business, setBusiness] = useState<Business | null>(null);
  const [content, setContent] = useState<Record<string, PageData<BusinessItem>>>({});
  const [mode, setMode] = useState<"light" | "dark">("light");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => {
    void apiFetch<Business>(`/api/v1/businesses/public/${slug}`, {}, false).then(async (r) => {
      if (!r.response.ok) {
        setError(r.result.message);
        return;
      }
      setBusiness(r.result.data);
      const values = await Promise.all(
        types.map((t) =>
          apiFetch<PageData<BusinessItem>>(
            `/api/v1/businesses/public/${slug}/items?type=${t}&page=1&size=12`,
            {},
            false,
          ),
        ),
      );
      const next: Record<string, PageData<BusinessItem>> = {};
      types.forEach((t, i) => {
        if (values[i].response.ok) next[t] = values[i].result.data;
      });
      setContent(next);
      const saved = localStorage.getItem(`business-theme-${slug}`);
      setMode(
        saved === "dark"
          ? "dark"
          : saved === "light"
            ? "light"
            : matchMedia("(prefers-color-scheme: dark)").matches
              ? "dark"
              : "light",
      );
    });
  }, [slug]);
  async function page(type: BusinessItemType, value: number) {
    const r = await apiFetch<PageData<BusinessItem>>(
      `/api/v1/businesses/public/${slug}/items?type=${type}&page=${value}&size=12`,
      {},
      false,
    );
    if (r.response.ok) setContent((v) => ({ ...v, [type]: r.result.data }));
  }
  function toggle() {
    const next = mode === "light" ? "dark" : "light";
    setMode(next);
    localStorage.setItem(`business-theme-${slug}`, next);
  }
  async function enquire(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget,
      d = Object.fromEntries(new FormData(form));
    const r = await apiFetch(
      `/api/v1/businesses/public/${slug}/enquiries`,
      { method: "POST", body: JSON.stringify(d) },
      false,
    );
    setMessage(r.result.message);
    if (r.response.ok) form.reset();
  }
  async function order(e: FormEvent<HTMLFormElement>, item: BusinessItem) {
    e.preventDefault();
    const form = e.currentTarget,
      d = Object.fromEntries(new FormData(form));
    const r = await apiFetch(
      `/api/v1/businesses/public/${slug}/orders`,
      {
        method: "POST",
        body: JSON.stringify({
          ...d,
          itemId: item.id,
          itemName: item.title,
          quantity: Number(d.quantity) || 1,
        }),
      },
      false,
    );
    setMessage(r.result.message);
    if (r.response.ok) form.reset();
  }
  if (error)
    return (
      <main className="business-public-error">
        <h1>Website unavailable</h1>
        <p>{error}</p>
      </main>
    );
  if (!business)
    return (
      <main className="business-public-error">
        <h1>Loading website…</h1>
      </main>
    );
  const colors = {
    "--business-accent": business.accentColor,
    "--business-background": mode === "dark" ? business.darkBackground : business.lightBackground,
  } as React.CSSProperties;
  return (
    <main
      className={`business-public ${mode} template-${business.templateKey.toLowerCase()}`}
      style={colors}
    >
      <nav>
        <a href="#home" className="business-logo">
          {business.logoUrl ? (
            <img src={business.logoUrl} alt="" />
          ) : (
            <b>{business.name.slice(0, 1)}</b>
          )}
          <span>{business.name}</span>
        </a>
        <div>
          <a href="#services">Services</a>
          <a href="#products">Products</a>
          <a href="#projects">Work</a>
          <a href="#contact">Contact</a>
          <button type="button" onClick={toggle}>
            {mode === "dark" ? "Light" : "Dark"} mode
          </button>
        </div>
      </nav>
      <header
        id="home"
        style={{
          backgroundImage: business.coverUrl
            ? `linear-gradient(#0008,#0008),url(${business.coverUrl})`
            : undefined,
        }}
      >
        <p>{business.industry || business.category || "Business"}</p>
        <h1>{business.tagline || business.name}</h1>
        <span>{business.description}</span>
        <div>
          <a href="#services">Explore our work</a>
          <a href="#contact">Start a conversation</a>
        </div>
      </header>
      {content.PAGE?.items.map((i) => (
        <section className="business-section" key={i.id}>
          <p>{i.category || "Page"}</p>
          <h2>{i.title}</h2>
          <div>
            {i.thumbnailUrl && <img src={i.thumbnailUrl} alt="" />}
            <span>{i.description || i.summary}</span>
          </div>
        </section>
      ))}
      {content.SECTION?.items.map((i) => (
        <section className="business-section" key={i.id}>
          <p>{i.category || "About us"}</p>
          <h2>{i.title}</h2>
          <div>
            {i.thumbnailUrl && <img src={i.thumbnailUrl} alt="" />}
            <span>{i.description || i.summary}</span>
          </div>
        </section>
      ))}
      <PublicGrid
        title="Services"
        id="services"
        page={content.SERVICE || emptyPage()}
        onPage={(v) => page("SERVICE", v)}
        order={order}
      />
      <PublicGrid
        title="Products"
        id="products"
        page={content.PRODUCT || emptyPage()}
        onPage={(v) => page("PRODUCT", v)}
        order={order}
      />
      <PublicGrid
        title="Selected work"
        id="projects"
        page={content.PROJECT || emptyPage()}
        onPage={(v) => page("PROJECT", v)}
      />
      <PublicGrid
        title="Our team"
        id="team"
        page={content.TEAM_MEMBER || emptyPage()}
        onPage={(v) => page("TEAM_MEMBER", v)}
      />
      <PublicGrid
        title="Credentials"
        id="credentials"
        page={content.CREDENTIAL || emptyPage()}
        onPage={(v) => page("CREDENTIAL", v)}
      />
      <PublicGrid
        title="Partners"
        id="partners"
        page={content.PARTNER || emptyPage()}
        onPage={(v) => page("PARTNER", v)}
      />
      <PublicGrid
        title="Frequently asked questions"
        id="faq"
        page={content.FAQ || emptyPage()}
        onPage={(v) => page("FAQ", v)}
      />
      {content.TESTIMONIAL?.items.length > 0 && (
        <section className="business-quotes">
          <p>What people say</p>
          {content.TESTIMONIAL.items.map((i) => (
            <blockquote key={i.id}>
              <p>“{i.description || i.summary}”</p>
              <cite>{i.title}</cite>
            </blockquote>
          ))}
        </section>
      )}
      <section className="business-contact" id="contact">
        <div>
          <p>Contact</p>
          <h2>Let&apos;s work together.</h2>
          <span>
            {business.email}
            <br />
            {business.phone}
            <br />
            {business.address}
          </span>
        </div>
        <form onSubmit={enquire}>
          <label>
            Your name
            <input name="name" required />
          </label>
          <label>
            Email
            <input name="email" type="email" required />
          </label>
          <label>
            Company
            <input name="company" />
          </label>
          <label>
            Enquiry type
            <select name="type">
              <option>GENERAL</option>
              <option>QUOTE</option>
              <option>CONSULTATION</option>
              <option>PARTNERSHIP</option>
              <option>VENDOR</option>
              <option>TENDER</option>
              <option>JOB</option>
              <option>INTERNSHIP</option>
            </select>
          </label>
          <label>
            Message
            <textarea name="message" required minLength={2} />
          </label>
          <button>Send enquiry</button>
          {message && <p role="status">{message}</p>}
        </form>
      </section>
      <footer>
        <strong>{business.name}</strong>
        <span>
          © {new Date().getFullYear()} ·{" "}
          {business.websiteUrl && (
            <a href={business.websiteUrl} target="_blank" rel="noreferrer">
              Website ↗
            </a>
          )}
        </span>
      </footer>
    </main>
  );
}

function PublicGrid({
  title,
  id,
  page,
  onPage,
  order,
}: {
  title: string;
  id: string;
  page: PageData<BusinessItem>;
  onPage: (v: number) => void;
  order?: (e: FormEvent<HTMLFormElement>, item: BusinessItem) => void;
}) {
  if (!page.items.length) return null;
  return (
    <section className="business-grid-section" id={id}>
      <p>{title}</p>
      <h2>{title}</h2>
      <div className="business-grid">
        {page.items.map((i) => (
          <article key={i.id}>
            {i.thumbnailUrl && <img src={i.thumbnailUrl} alt="" />}
            <span>{i.category}</span>
            <h3>{i.title}</h3>
            <p>{i.summary || i.description}</p>
            {i.price && (
              <strong>
                {new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(
                  i.price,
                )}
              </strong>
            )}
            {order && (
              <details>
                <summary>Request this {i.type.toLowerCase()}</summary>
                <form onSubmit={(e) => order(e, i)}>
                  <input name="customerName" placeholder="Your name" required />
                  <input name="customerEmail" type="email" placeholder="Email" required />
                  <input name="customerPhone" placeholder="Phone" />
                  <input name="quantity" type="number" min="1" defaultValue="1" />
                  <textarea name="instructions" placeholder="Instructions or questions" />
                  <button>Send request</button>
                </form>
              </details>
            )}
          </article>
        ))}
      </div>
      <Pagination page={page} onPage={onPage} />
    </section>
  );
}
