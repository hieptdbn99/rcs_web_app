import type { NextConfig } from "next";

const configuredDevOrigins = (process.env.ALLOWED_DEV_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: ["192.168.0.156", ...configuredDevOrigins],
};

export default nextConfig;
