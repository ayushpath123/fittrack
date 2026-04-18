import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Force module resolution to the current app directory when running `npm run dev`.
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
