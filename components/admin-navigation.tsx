import Link from "next/link";

export function AdminNavigation({
  name,
  username,
  avatarUrl,
  active,
}: {
  name: string;
  username: string;
  avatarUrl: string;
  active:
    | "overview"
    | "users"
    | "setup"
    | "announcements"
    | "feedback"
    | "activity"
    | "subscriptions"
    | "billing";
}) {
  return (
    <aside className="admin-navigation">
      <Link href="/" className="dashboard-wordmark">
        Portfolio<span>/</span>
      </Link>
      <p>Super administration</p>
      <Link className="admin-profile-link" href="/dashboard?tab=Profile">
        <span
          className="admin-profile-avatar"
          style={avatarUrl ? { backgroundImage: `url(${avatarUrl})` } : undefined}
        >
          {!avatarUrl && name.slice(0, 1)}
        </span>
        <span>
          <strong>{name}</strong>
          <small>{username ? `@${username}` : "Super admin"}</small>
        </span>
      </Link>
      <nav aria-label="Administration">
        <Link className={active === "overview" ? "is-active" : ""} href="/admin">
          Overview <span>01</span>
        </Link>
        <Link className={active === "users" ? "is-active" : ""} href="/admin#users">
          Users <span>02</span>
        </Link>
        <Link className={active === "setup" ? "is-active" : ""} href="/admin/setup">
          Portfolio setup <span>03</span>
        </Link>
        <Link className={active === "announcements" ? "is-active" : ""} href="/admin/announcements">
          Announcements <span>04</span>
        </Link>
        <Link className={active === "feedback" ? "is-active" : ""} href="/admin/feedback">
          Feedback <span>05</span>
        </Link>
        <Link className={active === "activity" ? "is-active" : ""} href="/admin#activity">
          Activity <span>06</span>
        </Link>
        <Link className={active === "subscriptions" ? "is-active" : ""} href="/admin/subscriptions">
          Subscription plans <span>07</span>
        </Link>
        <Link className={active === "billing" ? "is-active" : ""} href="/admin/billing">
          Payments <span>08</span>
        </Link>
      </nav>
      <Link href="/dashboard">My own portfolio →</Link>
    </aside>
  );
}
