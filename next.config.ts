import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    // Berlin scraping bridge reads CSV/JSON reports dynamically via fs.
    // Ensure these files are included in serverless output on Vercel.
    "/api/berlin": ["./data/**/*.csv", "./data/**/*.json"],
  },
};

export default nextConfig;
