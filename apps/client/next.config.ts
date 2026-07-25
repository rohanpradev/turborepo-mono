import path from "node:path";
import type { NextConfig } from "next";

type RemoteImagePattern = {
  hostname: string;
  pathname: "/**";
  port?: string;
  protocol: "http" | "https";
};

const toRemoteImagePattern = (value: string): RemoteImagePattern | null => {
  if (!value) {
    return null;
  }

  if (value.includes("*") && !value.includes("://")) {
    return {
      hostname: value,
      pathname: "/**",
      protocol: "https",
    };
  }

  try {
    const url = new URL(value.includes("://") ? value : `https://${value}`);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }

    return {
      hostname: url.hostname,
      pathname: "/**",
      port: url.port,
      protocol: url.protocol.slice(0, -1) as "http" | "https",
    };
  } catch {
    return null;
  }
};

const remoteImagePatterns = Array.from(
  new Map(
    (process.env.NEXT_PUBLIC_IMAGE_REMOTE_HOSTS ?? "")
      .split(",")
      .map((hostname) => hostname.trim())
      .filter(Boolean)
      .map((value) => toRemoteImagePattern(value))
      .filter((pattern): pattern is RemoteImagePattern => pattern !== null)
      .map((pattern) => [
        `${pattern.protocol}:${pattern.hostname}:${pattern.port ?? ""}`,
        pattern,
      ]),
  ).values(),
);

const workspaceRoot = path.join(__dirname, "../../");

const nextConfig: NextConfig = {
  output: "standalone",
  typedRoutes: true,
  outputFileTracingRoot: workspaceRoot,
  poweredByHeader: false,
  transpilePackages: ["@repo/api-client", "@repo/contracts", "@repo/types"],
  turbopack: {
    root: workspaceRoot,
    resolveAlias: {
      "@": path.join(__dirname, "src"),
    },
  },
  experimental: {
    turbopackFileSystemCacheForBuild: true,
    turbopackPluginRuntimeStrategy: "workerThreads",
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
  images: {
    dangerouslyAllowLocalIP:
      process.env.NEXT_IMAGE_ALLOW_LOCAL_IP === "true" ||
      process.env.NODE_ENV !== "production",
    formats: ["image/avif", "image/webp"],
    maximumResponseBody: 5_000_000,
    maximumRedirects: 3,
    qualities: [75, 85],
    remotePatterns: remoteImagePatterns,
  },
};

export default nextConfig;
