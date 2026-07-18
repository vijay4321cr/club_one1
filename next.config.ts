import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  distDir: "dist", // Changes the build output folder from .next to dist
  images: {
    // static export has no image-optimization server
    unoptimized: true,
    // Rizztix serves event/club media from Cloudinary (and may move CDNs);
    // allow any https host for remote images.
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

export default nextConfig;