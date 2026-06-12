import type { MetadataRoute } from "next";
import { appOrigin } from "@/lib/stripe";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = appOrigin();
  const lastModified = new Date();

  const entries: Array<{ path: string; priority: number; changeFrequency: "weekly" | "monthly" }> = [
    { path: "/", priority: 1, changeFrequency: "weekly" },
    { path: "/pricing", priority: 0.9, changeFrequency: "weekly" },
    { path: "/install-app", priority: 0.6, changeFrequency: "monthly" },
    { path: "/signup", priority: 0.5, changeFrequency: "monthly" },
    { path: "/login", priority: 0.4, changeFrequency: "monthly" },
    { path: "/terms", priority: 0.2, changeFrequency: "monthly" },
    { path: "/privacy", priority: 0.2, changeFrequency: "monthly" },
    { path: "/refunds", priority: 0.2, changeFrequency: "monthly" },
  ];

  return entries.map(({ path, priority, changeFrequency }) => ({
    url: path === "/" ? base : `${base}${path}`,
    lastModified,
    changeFrequency,
    priority,
  }));
}
