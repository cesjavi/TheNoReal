declare module "next-pwa" {
  import type { NextConfig } from "next";
  type PWAOptions = {
    dest: string;
    disable?: boolean;
    [key: string]: any;
  };
  export default function withPWA(options: PWAOptions): (nextConfig: NextConfig) => NextConfig;
}