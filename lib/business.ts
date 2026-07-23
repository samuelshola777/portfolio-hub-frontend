export type PageData<T> = {
  items: T[];
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
};
export type Business = {
  id: string;
  slug: string;
  name: string;
  tagline?: string;
  description?: string;
  industry?: string;
  category?: string;
  yearEstablished?: number;
  companySize?: string;
  registrationNumber?: string;
  logoUrl?: string;
  coverUrl?: string;
  email?: string;
  phone?: string;
  websiteUrl?: string;
  address?: string;
  socialLinksJson?: string;
  introVideoUrl?: string;
  templateKey: string;
  accentColor: string;
  lightBackground: string;
  darkBackground: string;
  defaultMode: "LIGHT" | "DARK" | "SYSTEM";
  status: "DRAFT" | "PUBLISHED" | "SUSPENDED";
};
export type BusinessItemType =
  | "PAGE"
  | "SECTION"
  | "PRODUCT"
  | "SERVICE"
  | "TEAM_MEMBER"
  | "TESTIMONIAL"
  | "PROJECT"
  | "CREDENTIAL"
  | "PARTNER"
  | "FAQ";
export type BusinessItem = {
  id: string;
  type: BusinessItemType;
  title: string;
  category?: string;
  summary?: string;
  description?: string;
  thumbnailUrl?: string;
  mediaJson?: string;
  configurationJson?: string;
  price?: number;
  discountPrice?: number;
  quantity?: number;
  featured: boolean;
  sortOrder: number;
  status: "DRAFT" | "PUBLISHED" | "HIDDEN";
};
export type BusinessOrder = {
  id: string;
  itemName: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  quantity: number;
  variation?: string;
  instructions?: string;
  status: "NEW" | "CONFIRMED" | "PROCESSING" | "READY" | "COMPLETED" | "CANCELLED";
  createdAt: string;
};
export type BusinessEnquiry = {
  id: string;
  type: string;
  name: string;
  email: string;
  company?: string;
  phone?: string;
  message: string;
  status: "NEW" | "READ" | "ARCHIVED";
  createdAt: string;
};
export const emptyPage = <T>(): PageData<T> => ({
  items: [],
  currentPage: 1,
  pageSize: 20,
  totalItems: 0,
  totalPages: 0,
  hasNext: false,
  hasPrevious: false,
});
