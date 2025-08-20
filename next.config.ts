import type { NextConfig } from "next";
import withPWA from "next-pwa";

const isDev = process.env.NODE_ENV !== "production";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "prisma"],  
};

export default withPWA({ dest: "public", disable: isDev })(nextConfig);
