import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  // upgrade-insecure-requests makes the browser fetch any stray http subresource over https,
  // so an absolute http URL built behind a proxy cannot turn an https page into mixed content.
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: "upgrade-insecure-requests" },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
    ];
  },
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
