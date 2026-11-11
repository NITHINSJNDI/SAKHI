import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Lets a verification build run beside a live `next dev` without sharing .next
  distDir: process.env.NEXT_DIST_DIR || ".next",
  devIndicators: false,
  outputFileTracingRoot: __dirname,
  compress: true,
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  experimental: {
    optimizePackageImports: ["@phosphor-icons/react", "recharts", "framer-motion", "motion", "animejs"],
  },
  async headers() {
    const security = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      // Microphone is used by the voice chat; nothing else needs device access
      { key: "Permissions-Policy", value: "camera=(), geolocation=(), microphone=(self), payment=()" },
    ];
    if (process.env.NODE_ENV === "production") {
      security.push({ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" });
    }
    return [
      { source: "/:path*", headers: security },
      // Health data must never be cached by browsers or shared proxies
      { source: "/api/:path*", headers: [{ key: "Cache-Control", value: "no-store, max-age=0" }] },
    ];
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "fastly.picsum.photos" },
    ],
  },
};

export default nextConfig;
