import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PortfolioExperience } from "@/components/portfolio-experience";
import { isPortfolioTheme, type PortfolioProfile } from "@/lib/portfolio";
import { API_BASE_URL, type ApiResponse } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const profile = await loadPortfolio(username);
  if (!profile) return {};
  return {
    title: profile.fullName,
    description: profile.introduction || profile.headline,
  };
}

export default async function PublicPortfolio({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ theme?: string }>;
}) {
  const [{ username }, query] = await Promise.all([params, searchParams]);
  const profile = await loadPortfolio(username);
  if (!profile) notFound();

  if (profile.username.toLowerCase() !== username.toLowerCase()) {
    const themeQuery = isPortfolioTheme(query.theme)
      ? `?theme=${encodeURIComponent(query.theme)}`
      : "";
    redirect(`/${encodeURIComponent(profile.username)}${themeQuery}`);
  }

  const initialTheme = isPortfolioTheme(query.theme) ? query.theme : profile.theme;
  return <PortfolioExperience profile={profile} initialTheme={initialTheme} />;
}

async function loadPortfolio(username: string) {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/portfolios/public/${encodeURIComponent(username)}`,
    { cache: "no-store" },
  );
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Portfolio service returned ${response.status}`);

  const result = (await response.json()) as ApiResponse<{
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
    theme: "ORBIT" | "EDITORIAL" | "SPATIAL";
    accent?: string;
    background?: string;
    font: "GEIST" | "EDITORIAL" | "MONO";
    motion: "FULL" | "REDUCED" | "NONE";
    works: Array<{
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
      projectUrl?: string;
      sourceUrl?: string;
      thumbnailUrl?: string;
      galleryUrls: string[];
      technologyStack: string[];
    }>;
    profileEntries: PortfolioProfile["profileEntries"];
    skills: PortfolioProfile["skills"];
    socialLinks: PortfolioProfile["socialLinks"];
  }>;
  const data = result.data;
  if (!data) throw new Error("Portfolio service returned an empty response");

  return {
    username: data.username,
    fullName: data.fullName,
    headline: data.headline,
    introduction: data.introduction,
    note: data.note,
    availability: data.availability,
    avatarUrl: data.avatarUrl,
    cvUrl: data.cvUrl,
    introVideoUrl: data.introVideoUrl,
    websiteUrl: data.websiteUrl,
    githubUsername: data.githubUsername,
    theme: data.theme.toLowerCase() as PortfolioProfile["theme"],
    themeSettings: {
      accent: data.accent,
      background: data.background,
      font: data.font,
      motion: data.motion,
    },
    works: data.works.map((work, index) => ({
      ...work,
      completedAt: work.ongoing ? null : work.completedAt,
      accent: (["mint", "blue", "violet"] as const)[index % 3],
      href: work.projectUrl || `#${work.slug}`,
    })),
    profileEntries: data.profileEntries ?? [],
    skills: data.skills ?? [],
    socialLinks: data.socialLinks ?? [],
  } satisfies PortfolioProfile;
}
