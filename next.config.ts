import type { NextConfig } from "next";
import os from "os";

// Print local IP addresses to make it easier to access on mobile
const interfaces = os.networkInterfaces();
const localIps = [];
for (const name of Object.keys(interfaces)) {
  for (const iface of interfaces[name]!) {
    if (iface.family === "IPv4" && !iface.internal) {
      localIps.push(iface.address);
      console.log(`\x1b[36m> Local network IP: \x1b[32mhttps://${iface.address}:3000\x1b[0m`);
    }
  }
}
if (localIps.length > 0) {
  console.log("");
}

const configuredDevOrigins = (process.env.ALLOWED_DEV_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: ["192.168.0.156", ...configuredDevOrigins],
};

export default nextConfig;
