import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allows CI/local verification builds to avoid clobbering the dev server's .next.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // Force module resolution to the current app directory when running `npm run dev`.
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
