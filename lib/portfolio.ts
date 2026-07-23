export type PortfolioTheme = "orbit" | "editorial" | "spatial";
export type PortfolioThemeSettings = {
  accent?: string;
  background?: string;
  font?: "GEIST" | "EDITORIAL" | "MONO";
  motion?: "FULL" | "REDUCED" | "NONE";
};

export type ProfileEntryType =
  | "EXPERIENCE"
  | "EDUCATION"
  | "CERTIFICATION"
  | "ACHIEVEMENT"
  | "PROFESSIONAL_MEMBERSHIP"
  | "VOLUNTEER"
  | "LANGUAGE"
  | "PUBLICATION"
  | "RESEARCH"
  | "CONFERENCE_SPEAKING";

export type ProfileEntry = {
  id: string;
  type: ProfileEntryType;
  title: string;
  organization?: string;
  subtitle?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  current: boolean;
  description?: string;
  url?: string;
  thumbnailUrl?: string;
  supportingDocumentUrl?: string;
  published: boolean;
  sortOrder: number;
};

export type PortfolioSkill = {
  id: string;
  name: string;
  category: string;
  proficiency: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT";
  iconUrl?: string;
  featured: boolean;
  sortOrder: number;
};

export type SocialLink = { id: string; platform: string; url: string; sortOrder: number };

export type PortfolioWork = {
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
  completedAt: string | null;
  ongoing: boolean;
  accent: "violet" | "mint" | "blue";
  href: string;
  projectUrl?: string;
  sourceUrl?: string;
  thumbnailUrl?: string;
  galleryUrls: string[];
  technologyStack: string[];
};

export type PortfolioProfile = {
  username: string;
  fullName: string;
  headline: string;
  introduction: string;
  note?: string;
  availability: string;
  avatarUrl?: string;
  cvUrl?: string;
  introVideoUrl?: string;
  websiteUrl?: string;
  githubUsername?: string;
  theme: PortfolioTheme;
  themeSettings?: PortfolioThemeSettings;
  works: PortfolioWork[];
  profileEntries: ProfileEntry[];
  skills: PortfolioSkill[];
  socialLinks: SocialLink[];
};

export function isPortfolioTheme(value: string | undefined): value is PortfolioTheme {
  return value === "orbit" || value === "editorial" || value === "spatial";
}
