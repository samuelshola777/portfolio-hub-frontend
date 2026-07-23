/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, clearAuth, uploadFileWithProgress } from "@/lib/api";
import {
  emptyPage,
  type Business,
  type BusinessEnquiry,
  type BusinessItem,
  type BusinessItemType,
  type BusinessOrder,
  type PageData,
} from "@/lib/business";
import { Pagination } from "@/components/pagination";
import { WorkspaceThemeToggle } from "@/components/workspace-theme-toggle";

type Tab = "Overview" | "Website" | "Catalog" | "Orders & enquiries" | "Media" | "Settings";
type Props = {
  user: { fullName: string; email: string; username: string; emailVerified: boolean };
};
const tabs: Tab[] = ["Overview", "Website", "Catalog", "Orders & enquiries", "Media", "Settings"];
const websiteTypes: BusinessItemType[] = [
  "PAGE",
  "SECTION",
  "TEAM_MEMBER",
  "TESTIMONIAL",
  "PROJECT",
  "CREDENTIAL",
  "PARTNER",
  "FAQ",
];

export function BusinessDashboard({ user }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("Overview");
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selected, setSelected] = useState("");
  const [kind, setKind] = useState<BusinessItemType>("SECTION");
  const [itemPage, setItemPage] = useState(1);
  const [ordersPage, setOrdersPage] = useState(1);
  const [enquiriesPage, setEnquiriesPage] = useState(1);
  const [items, setItems] = useState<PageData<BusinessItem>>(emptyPage());
  const [orders, setOrders] = useState<PageData<BusinessOrder>>(emptyPage());
  const [enquiries, setEnquiries] = useState<PageData<BusinessEnquiry>>(emptyPage());
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [previewMode, setPreviewMode] = useState<"light" | "dark">("light");
  const active = businesses.find((b) => b.id === selected);
  const flash = (value: string) => {
    setNotice(value);
    window.setTimeout(() => setNotice(""), 4500);
  };
  const loadBusinesses = useCallback(async () => {
    const r = await apiFetch<Business[]>("/api/v1/businesses/private");
    if (r.response.ok) {
      setBusinesses(r.result.data ?? []);
      setSelected((v) => v || r.result.data?.[0]?.id || "");
    }
    setLoading(false);
  }, []);
  const loadItems = useCallback(async () => {
    if (!selected) return;
    const r = await apiFetch<PageData<BusinessItem>>(
      `/api/v1/businesses/private/${selected}/items?type=${kind}&page=${itemPage}&size=12`,
    );
    if (r.response.ok) setItems(r.result.data);
  }, [selected, kind, itemPage]);
  useEffect(() => {
    void loadBusinesses();
  }, [loadBusinesses]);
  useEffect(() => {
    if (tab === "Website" || tab === "Catalog") void loadItems();
  }, [tab, loadItems]);
  useEffect(() => {
    if (!selected || tab !== "Orders & enquiries") return;
    void apiFetch<PageData<BusinessOrder>>(
      `/api/v1/businesses/private/${selected}/orders?page=${ordersPage}&size=20`,
    ).then((o) => {
      if (o.response.ok) setOrders(o.result.data);
    });
  }, [selected, tab, ordersPage]);
  useEffect(() => {
    if (!selected || tab !== "Orders & enquiries") return;
    void apiFetch<PageData<BusinessEnquiry>>(
      `/api/v1/businesses/private/${selected}/enquiries?page=${enquiriesPage}&size=20`,
    ).then((e) => {
      if (e.response.ok) setEnquiries(e.result.data);
    });
  }, [selected, tab, enquiriesPage]);
  async function createBusiness(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const d = new FormData(form);
    const r = await apiFetch<Business>("/api/v1/businesses/private", {
      method: "POST",
      body: JSON.stringify({
        name: d.get("name"),
        slug: d.get("slug"),
        industry: d.get("industry"),
        tagline: d.get("tagline"),
      }),
    });
    if (r.response.ok) {
      setBusinesses((v) => [...v, r.result.data]);
      setSelected(r.result.data.id);
      form.reset();
      flash("Business created. Its public URL is permanent.");
    }
  }
  async function updateBusiness(payload: Record<string, unknown>) {
    if (!active) return false;
    const r = await apiFetch<Business>(`/api/v1/businesses/private/${active.id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    if (r.response.ok) {
      setBusinesses((v) => v.map((b) => (b.id === active.id ? r.result.data : b)));
      return true;
    }
    flash(r.result.message || "Unable to update the business.");
    return false;
  }
  async function saveBusiness(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (await updateBusiness(Object.fromEntries(new FormData(e.currentTarget))))
      flash("Business settings saved.");
  }
  async function createItem(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!active) return;
    const form = e.currentTarget,
      d = new FormData(form);
    const payload = {
      type: kind,
      title: d.get("title"),
      category: d.get("category"),
      summary: d.get("summary"),
      description: d.get("description"),
      thumbnailUrl: d.get("thumbnailUrl"),
      mediaJson: d.get("mediaJson"),
      configurationJson: JSON.stringify({
        sectionType: d.get("sectionType"),
        animation: d.get("animation"),
      }),
      price: d.get("price") ? Number(d.get("price")) : null,
      quantity: d.get("quantity") ? Number(d.get("quantity")) : null,
      featured: d.get("featured") === "on",
      status: d.get("status"),
    };
    const r = await apiFetch<BusinessItem>(`/api/v1/businesses/private/${active.id}/items`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (r.response.ok) {
      form.reset();
      void loadItems();
      flash("Content saved.");
    }
  }
  async function removeItem(id: string) {
    if (!active || !confirm("Remove this item?")) return;
    const r = await apiFetch(`/api/v1/businesses/private/${active.id}/items/${id}`, {
      method: "DELETE",
    });
    if (r.response.ok) void loadItems();
  }
  async function updateOrder(id: string, status: string) {
    if (!active) return;
    const r = await apiFetch<BusinessOrder>(
      `/api/v1/businesses/private/${active.id}/orders/${id}`,
      { method: "PATCH", body: JSON.stringify({ status }) },
    );
    if (r.response.ok)
      setOrders((v) => ({ ...v, items: v.items.map((o) => (o.id === id ? r.result.data : o)) }));
  }
  async function updateEnquiry(id: string, status: string) {
    if (!active) return;
    const r = await apiFetch<BusinessEnquiry>(
      `/api/v1/businesses/private/${active.id}/enquiries/${id}`,
      { method: "PATCH", body: JSON.stringify({ status }) },
    );
    if (r.response.ok)
      setEnquiries((v) => ({
        ...v,
        items: v.items.map((item) => (item.id === id ? r.result.data : item)),
      }));
    else flash(r.result.message || "Unable to update the enquiry.");
  }
  async function resendVerification() {
    const r = await apiFetch("/api/v1/auth/private/resend-verification", { method: "POST" });
    flash(
      r.result.message ||
        (r.response.ok ? "Verification email sent." : "Unable to send verification email."),
    );
  }
  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const category = file.type.startsWith("image/")
      ? "IMAGE"
      : file.type.startsWith("video/")
        ? "VIDEO"
        : "DOCUMENT";
    try {
      const r = await uploadFileWithProgress<{ fileUrl: string }>(
        file,
        category,
        "BUSINESS_MEDIA",
        () => {},
      ).promise;
      await navigator.clipboard.writeText(r.data.fileUrl);
      flash("Uploaded. The URL was copied to your clipboard.");
    } catch (err) {
      flash(err instanceof Error ? err.message : "Upload failed");
    }
  }
  function chooseTab(next: Tab) {
    setTab(next);
    setItemPage(1);
    setOrdersPage(1);
    setEnquiriesPage(1);
    if (next === "Catalog") setKind("PRODUCT");
    if (next === "Website" && !websiteTypes.includes(kind)) setKind("SECTION");
  }
  function logout() {
    clearAuth();
    router.push("/login");
    router.refresh();
  }
  if (loading)
    return (
      <main className="status-page">
        <section>
          <h1>Preparing your business workspace…</h1>
        </section>
      </main>
    );
  const changeKind = (value: BusinessItemType) => {
    setKind(value);
    setItemPage(1);
  };
  return (
    <main className="business-workspace">
      <aside className="business-nav">
        <Link href="/" className="dashboard-wordmark">
          Portfolio<span>/</span>Business
        </Link>
        <div className="business-owner">
          <strong>{user.fullName}</strong>
          <small>{user.email}</small>
        </div>
        <label>
          <span>Current business</span>
          <select
            value={selected}
            onChange={(e) => {
              setSelected(e.target.value);
              setItemPage(1);
              setOrdersPage(1);
              setEnquiriesPage(1);
            }}
          >
            <option value="">Create a business</option>
            {businesses.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
        <nav>
          {tabs.map((t) => (
            <button
              className={tab === t ? "is-active" : ""}
              type="button"
              key={t}
              onClick={() => chooseTab(t)}
            >
              {t}
            </button>
          ))}
        </nav>
        <button type="button" onClick={logout}>
          Sign out
        </button>
      </aside>
      <section className="business-main">
        <header>
          <div>
            <p>Business workspace</p>
            <h1>{tab}</h1>
          </div>
          <div>
            <WorkspaceThemeToggle />
            {active && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    void updateBusiness({
                      status: active.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED",
                    })
                  }
                >
                  {active.status === "PUBLISHED" ? "Unpublish" : "Publish website"}
                </button>
                <Link href={`/business/${active.slug}`} target="_blank">
                  Open website ↗
                </Link>
              </>
            )}
          </div>
        </header>
        {!user.emailVerified && (
          <section className="business-notice" role="alert">
            <strong>Verify your email to upload files and finish publishing.</strong>{" "}
            <button type="button" onClick={() => void resendVerification()}>
              Send verification link
            </button>
          </section>
        )}
        {notice && (
          <p className="business-notice" role="status">
            {notice}
          </p>
        )}
        {!active ? (
          <CreateBusiness onSubmit={createBusiness} />
        ) : (
          <>
            {tab === "Overview" && <Overview business={active} />}{" "}
            {tab === "Website" && (
              <Website
                business={active}
                kind={kind}
                setKind={changeKind}
                items={items}
                onSubmit={createItem}
                remove={removeItem}
                setPage={setItemPage}
                device={device}
                setDevice={setDevice}
                previewMode={previewMode}
                setPreviewMode={setPreviewMode}
              />
            )}{" "}
            {tab === "Catalog" && (
              <Catalog
                kind={kind}
                setKind={changeKind}
                items={items}
                onSubmit={createItem}
                remove={removeItem}
                setPage={setItemPage}
              />
            )}{" "}
            {tab === "Orders & enquiries" && (
              <Orders
                orders={orders}
                enquiries={enquiries}
                setOrdersPage={setOrdersPage}
                setEnquiriesPage={setEnquiriesPage}
                updateOrder={updateOrder}
                updateEnquiry={updateEnquiry}
              />
            )}{" "}
            {tab === "Media" && (
              <section className="business-card media-center">
                <p>Shared media</p>
                <h2>Upload without leaving your work</h2>
                <span>
                  Upload an image, video or document. Its URL is copied automatically so you can
                  paste it into any section or catalog item.
                </span>
                <label className="business-upload">
                  Choose file
                  <input type="file" onChange={upload} disabled={!user.emailVerified} />
                </label>
              </section>
            )}{" "}
            {tab === "Settings" && <Settings business={active} onSubmit={saveBusiness} />}
          </>
        )}
      </section>
    </main>
  );
}

function CreateBusiness({ onSubmit }: { onSubmit: (e: FormEvent<HTMLFormElement>) => void }) {
  return (
    <section className="business-empty">
      <div>
        <p>Start here</p>
        <h2>Create your first business</h2>
        <span>
          Every business has an independent website, catalog, media, orders and enquiries.
        </span>
      </div>
      <form onSubmit={onSubmit}>
        <label>
          Business name
          <input name="name" required />
        </label>
        <label>
          Permanent public URL
          <input name="slug" required pattern="[a-zA-Z0-9-]{3,}" placeholder="lightworks-studio" />
          <small>This cannot be changed later.</small>
        </label>
        <label>
          Industry
          <input name="industry" />
        </label>
        <label>
          Tagline
          <input name="tagline" />
        </label>
        <button>Create business</button>
      </form>
    </section>
  );
}
function Overview({ business }: { business: Business }) {
  const checks = [
    !!business.logoUrl,
    !!business.description,
    !!business.email,
    business.status === "PUBLISHED",
  ];
  return (
    <div className="business-overview">
      <section>
        <p>Permanent address</p>
        <h2>/business/{business.slug}</h2>
        <span>{business.status}</span>
      </section>
      <section>
        <p>Completion</p>
        <strong>{checks.filter(Boolean).length}/4</strong>
        <ul>
          <li className={checks[0] ? "done" : ""}>Logo and cover</li>
          <li className={checks[1] ? "done" : ""}>Business description</li>
          <li className={checks[2] ? "done" : ""}>Contact details</li>
          <li className={checks[3] ? "done" : ""}>Published website</li>
        </ul>
      </section>
      <section>
        <p>Next step</p>
        <h2>Build guided sections</h2>
        <span>
          Add pages, products, services, team members and proof of work without writing code.
        </span>
      </section>
    </div>
  );
}
function TypePicker({
  values,
  value,
  onChange,
}: {
  values: BusinessItemType[];
  value: BusinessItemType;
  onChange: (v: BusinessItemType) => void;
}) {
  return (
    <div className="type-picker">
      {values.map((v) => (
        <button
          type="button"
          key={v}
          className={value === v ? "is-active" : ""}
          onClick={() => onChange(v)}
        >
          {v.replaceAll("_", " ")}
        </button>
      ))}
    </div>
  );
}
function Website({
  business,
  kind,
  setKind,
  items,
  onSubmit,
  remove,
  setPage,
  device,
  setDevice,
  previewMode,
  setPreviewMode,
}: {
  business: Business;
  kind: BusinessItemType;
  setKind: (v: BusinessItemType) => void;
  items: PageData<BusinessItem>;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  remove: (id: string) => void;
  setPage: (p: number) => void;
  device: "desktop" | "tablet" | "mobile";
  setDevice: (v: "desktop" | "tablet" | "mobile") => void;
  previewMode: "light" | "dark";
  setPreviewMode: (v: "light" | "dark") => void;
}) {
  return (
    <div className="builder">
      <aside>
        <h2>Pages & sections</h2>
        <TypePicker values={websiteTypes} value={kind} onChange={setKind} />
        <ItemList items={items} remove={remove} />
        <Pagination page={items} onPage={setPage} />
      </aside>
      <section>
        <div className="preview-tools">
          <div>
            {(["desktop", "tablet", "mobile"] as const).map((v) => (
              <button
                type="button"
                className={device === v ? "is-active" : ""}
                key={v}
                onClick={() => setDevice(v)}
              >
                {v}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setPreviewMode(previewMode === "light" ? "dark" : "light")}
          >
            {previewMode} preview
          </button>
        </div>
        <div className={`site-preview ${device} ${previewMode}`}>
          <header
            style={{
              backgroundImage: business.coverUrl
                ? `linear-gradient(#0006,#0006),url(${business.coverUrl})`
                : undefined,
            }}
          >
            <strong>{business.name}</strong>
            <h2>{business.tagline || "Your business headline"}</h2>
            <p>{business.description || "Complete your business information in Settings."}</p>
          </header>
          {items.items.map((i) => (
            <section key={i.id}>
              <p>{i.type.replaceAll("_", " ")}</p>
              <h3>{i.title}</h3>
              <span>{i.summary || i.description}</span>
            </section>
          ))}
        </div>
      </section>
      <ContentForm kind={kind} onSubmit={onSubmit} />
    </div>
  );
}
function ItemList({
  items,
  remove,
}: {
  items: PageData<BusinessItem>;
  remove: (id: string) => void;
}) {
  return (
    <div className="builder-list">
      {items.items.map((i) => (
        <article key={i.id}>
          {i.thumbnailUrl && <div style={{ backgroundImage: `url(${i.thumbnailUrl})` }} />}
          <strong>{i.title}</strong>
          <small>{i.status}</small>
          <button type="button" onClick={() => remove(i.id)}>
            Remove
          </button>
        </article>
      ))}
      {!items.items.length && <p className="empty-state">Nothing here yet.</p>}
    </div>
  );
}
function ContentForm({
  kind,
  onSubmit,
}: {
  kind: BusinessItemType;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form className="builder-drawer" onSubmit={onSubmit}>
      <h2>Add {kind.replaceAll("_", " ").toLowerCase()}</h2>
      <label>
        Title
        <input name="title" required />
      </label>
      <label>
        Category
        <input name="category" />
      </label>
      <label>
        Section type
        <select name="sectionType">
          <option>TEXT</option>
          <option>IMAGE_TEXT</option>
          <option>VIDEO</option>
          <option>GALLERY</option>
          <option>STATS</option>
          <option>FEATURES</option>
          <option>FAQ</option>
          <option>CTA</option>
          <option>CONTACT</option>
          <option>MAP</option>
          <option>DOCUMENTS</option>
        </select>
      </label>
      <label>
        Summary
        <textarea name="summary" />
      </label>
      <label>
        Full content
        <textarea name="description" />
      </label>
      <label>
        Thumbnail URL
        <input name="thumbnailUrl" />
      </label>
      <label>
        Media URLs
        <textarea name="mediaJson" />
      </label>
      <div className="form-row">
        <label>
          Price
          <input type="number" min="0" step="0.01" name="price" />
        </label>
        <label>
          Quantity
          <input type="number" min="0" name="quantity" />
        </label>
      </div>
      <label>
        Animation
        <select name="animation">
          <option>NONE</option>
          <option>FADE</option>
          <option>SLIDE_UP</option>
          <option>SLIDE_LEFT</option>
          <option>ZOOM</option>
          <option>REVEAL</option>
          <option>STAGGERED</option>
        </select>
      </label>
      <label>
        <input type="checkbox" name="featured" /> Featured
      </label>
      <label>
        Status
        <select name="status" defaultValue="PUBLISHED">
          <option>PUBLISHED</option>
          <option>DRAFT</option>
          <option>HIDDEN</option>
        </select>
      </label>
      <button>Save and publish content</button>
    </form>
  );
}
function Catalog({
  kind,
  setKind,
  items,
  onSubmit,
  remove,
  setPage,
}: {
  kind: BusinessItemType;
  setKind: (v: BusinessItemType) => void;
  items: PageData<BusinessItem>;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  remove: (id: string) => void;
  setPage: (p: number) => void;
}) {
  return (
    <div className="catalog-layout">
      <section className="business-card">
        <TypePicker values={["PRODUCT", "SERVICE"]} value={kind} onChange={setKind} />
        <ItemList items={items} remove={remove} />
        <Pagination page={items} onPage={setPage} />
      </section>
      <ContentForm kind={kind} onSubmit={onSubmit} />
    </div>
  );
}
function Orders({
  orders,
  enquiries,
  setOrdersPage,
  setEnquiriesPage,
  updateOrder,
  updateEnquiry,
}: {
  orders: PageData<BusinessOrder>;
  enquiries: PageData<BusinessEnquiry>;
  setOrdersPage: (p: number) => void;
  setEnquiriesPage: (p: number) => void;
  updateOrder: (id: string, status: string) => void;
  updateEnquiry: (id: string, status: string) => void;
}) {
  return (
    <div className="orders-layout">
      <section className="business-card">
        <h2>Orders</h2>
        {orders.items.map((o) => (
          <article className="order-row" key={o.id}>
            <div>
              <span>
                {o.status} · {new Date(o.createdAt).toLocaleDateString()}
              </span>
              <h3>{o.itemName}</h3>
              <p>
                {o.customerName} · {o.customerEmail} · quantity {o.quantity}
              </p>
            </div>
            <select value={o.status} onChange={(e) => updateOrder(o.id, e.target.value)}>
              {["NEW", "CONFIRMED", "PROCESSING", "READY", "COMPLETED", "CANCELLED"].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </article>
        ))}
        {!orders.items.length && <p className="empty-state">No orders yet.</p>}
        <Pagination page={orders} onPage={setOrdersPage} />
      </section>
      <section className="business-card">
        <h2>Enquiries</h2>
        {enquiries.items.map((e) => (
          <article className="order-row" key={e.id}>
            <div>
              <span>
                {e.type} · {new Date(e.createdAt).toLocaleDateString()}
              </span>
              <h3>
                {e.name}
                {e.company ? ` · ${e.company}` : ""}
              </h3>
              <a href={`mailto:${e.email}`}>{e.email}</a>
              <p>{e.message}</p>
            </div>
            <select value={e.status} onChange={(event) => updateEnquiry(e.id, event.target.value)}>
              {["NEW", "READ", "ARCHIVED"].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </article>
        ))}
        {!enquiries.items.length && <p className="empty-state">No enquiries yet.</p>}
        <Pagination page={enquiries} onPage={setEnquiriesPage} />
      </section>
    </div>
  );
}
function Settings({
  business,
  onSubmit,
}: {
  business: Business;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form className="business-card settings-form" onSubmit={onSubmit}>
      <div>
        <p>Business identity</p>
        <h2>Information and appearance</h2>
        <span>
          Permanent URL: <strong>/business/{business.slug}</strong>
        </span>
      </div>
      <label>
        Business name
        <input name="name" defaultValue={business.name} />
      </label>
      <label>
        Tagline
        <input name="tagline" defaultValue={business.tagline} />
      </label>
      <label>
        Description
        <textarea name="description" defaultValue={business.description} />
      </label>
      <div className="form-row">
        <label>
          Industry
          <input name="industry" defaultValue={business.industry} />
        </label>
        <label>
          Category
          <input name="category" defaultValue={business.category} />
        </label>
      </div>
      <div className="form-row">
        <label>
          Year established
          <input type="number" name="yearEstablished" defaultValue={business.yearEstablished} />
        </label>
        <label>
          Company size
          <input name="companySize" defaultValue={business.companySize} />
        </label>
        <label>
          Registration number
          <input name="registrationNumber" defaultValue={business.registrationNumber} />
        </label>
      </div>
      <div className="form-row">
        <label>
          Email
          <input name="email" defaultValue={business.email} />
        </label>
        <label>
          Phone
          <input name="phone" defaultValue={business.phone} />
        </label>
      </div>
      <label>
        Address
        <input name="address" defaultValue={business.address} />
      </label>
      <label>
        Website URL
        <input name="websiteUrl" defaultValue={business.websiteUrl} />
      </label>
      <label>
        Logo URL
        <input name="logoUrl" defaultValue={business.logoUrl} />
      </label>
      <label>
        Cover URL
        <input name="coverUrl" defaultValue={business.coverUrl} />
      </label>
      <label>
        Introduction video URL
        <input name="introVideoUrl" defaultValue={business.introVideoUrl} />
      </label>
      <label>
        Social links
        <textarea name="socialLinksJson" defaultValue={business.socialLinksJson} />
      </label>
      <div className="form-row">
        <label>
          Template
          <select name="templateKey" defaultValue={business.templateKey}>
            <option>MODERN</option>
            <option>EDITORIAL</option>
            <option>MINIMAL</option>
            <option>BOLD</option>
          </select>
        </label>
        <label>
          Default mode
          <select name="defaultMode" defaultValue={business.defaultMode}>
            <option>LIGHT</option>
            <option>DARK</option>
            <option>SYSTEM</option>
          </select>
        </label>
      </div>
      <div className="form-row">
        <label>
          Accent
          <input type="color" name="accentColor" defaultValue={business.accentColor} />
        </label>
        <label>
          Light background
          <input type="color" name="lightBackground" defaultValue={business.lightBackground} />
        </label>
        <label>
          Dark background
          <input type="color" name="darkBackground" defaultValue={business.darkBackground} />
        </label>
      </div>
      <button>Save business settings</button>
    </form>
  );
}
