import type { NextConfig } from "next";
import withPWA from "next-pwa";

const isDev = process.env.NODE_ENV !== "production";

const nextConfig: NextConfig = {
  // 👇 ahora es top-level, no más dentro de experimental
  serverExternalPackages: ["@prisma/client", "prisma"],
};

export default withPWA({
  dest: "public",
  disable: isDev,
})(nextConfig);
