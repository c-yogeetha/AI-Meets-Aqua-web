/** @type {import('next').NextConfig} */
const API_ORIGIN = process.env.API_ORIGIN || "http://127.0.0.1:8000";
const showcaseBuild = process.env.NEXT_PUBLIC_SHOWCASE === "1";

const nextConfig = {
  output: showcaseBuild ? "export" : "standalone",
  images: { unoptimized: true },
  trailingSlash: showcaseBuild,
  poweredByHeader: false,
};

if (!showcaseBuild) {
  nextConfig.experimental = { proxyTimeout: 120000 };
  nextConfig.rewrites = async () => [
    { source: "/api/:path*", destination: `${API_ORIGIN}/api/:path*` },
    { source: "/health", destination: `${API_ORIGIN}/health` },
  ];
  nextConfig.redirects = async () => [
    { source: "/analyse", destination: "/app/analyse", permanent: true },
    { source: "/history", destination: "/app/history", permanent: true },
    { source: "/tanks", destination: "/app/tanks", permanent: true },
    { source: "/settings", destination: "/app/settings", permanent: true },
    { source: "/testing", destination: "/validation", permanent: true },
    { source: "/jobs/:id", destination: "/app/jobs/:id", permanent: true },
    { source: "/results/:id", destination: "/app/results/:id", permanent: true },
  ];
}

export default nextConfig;
