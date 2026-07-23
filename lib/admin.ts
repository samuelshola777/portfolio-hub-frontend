export type AdminUser = {
  id: string;
  fullName: string;
  email: string;
  username: string;
  whatsAppNumber?: string | null;
  role: "USER" | "PROFESSIONAL" | "BUSINESS_OWNER" | "SUPER_ADMIN";
  status: "ACTIVE" | "SUSPENDED" | "BLOCKED";
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  createdAt: string;
  lastLoginAt: string | null;
};

export type AdminIdentity = {
  fullName: string;
  role: string;
  username: string;
};
export type AdminPortfolio = { avatarUrl?: string };

export type AdminFilters = {
  search: string;
  status: "" | AdminUser["status"];
  verified: "" | "true" | "false";
  role: "" | Exclude<AdminUser["role"], "SUPER_ADMIN">;
};

export const emptyAdminFilters: AdminFilters = {
  search: "",
  status: "",
  verified: "",
  role: "",
};

export function adminUserParams(
  filters: AdminFilters,
  page: number,
  size: number,
  includeSuperAdmins = false,
) {
  const params = new URLSearchParams({
    page: String(page),
    size: String(size),
    includeSuperAdmins: String(includeSuperAdmins),
  });
  if (filters.search.trim()) params.set("search", filters.search.trim());
  if (filters.status) params.set("status", filters.status);
  if (filters.verified) params.set("verified", filters.verified);
  if (filters.role) params.set("role", filters.role);
  return params;
}
