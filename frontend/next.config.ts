import type { NextConfig } from "next";

/**
 * The browser always talks to this Next.js app on `/api/*`.
 * Next.js proxies those requests to the FastAPI backend, which keeps the
 * frontend deployable on Vercel while the API runs anywhere (Render/Railway).
 *
 * Override the target with API_PROXY_TARGET when the backend is not on :8000.
 */
const apiProxyTarget = process.env.API_PROXY_TARGET ?? "http://127.0.0.1:8000";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiProxyTarget}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
