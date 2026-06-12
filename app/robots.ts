import type { MetadataRoute } from "next";
import { appOrigin } from "@/lib/stripe";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/admin",
          "/dashboard",
          "/meals",
          "/workout",
          "/weight",
          "/calendar",
          "/analytics",
          "/weekly",
          "/activity",
          "/coach",
          "/game",
          "/leaderboards",
          "/settings",
          "/onboarding",
          "/verify-email",
          "/verify-phone",
          "/reset-password",
          "/forgot-password",
        ],
      },
    ],
    sitemap: `${appOrigin()}/sitemap.xml`,
  };
}
