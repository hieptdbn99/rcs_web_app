import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

const keyPath = path.join("certificates", "localhost-key.pem");
const certPath = path.join("certificates", "localhost.pem");

const args = ["dev", "--webpack", "--experimental-https", "--hostname", "0.0.0.0"];

if (existsSync(keyPath) && existsSync(certPath)) {
  args.splice(2, 0, "--experimental-https-key", keyPath, "--experimental-https-cert", certPath);
  console.log("[dev:https] Using certificates/localhost-key.pem and certificates/localhost.pem.");
} else {
  console.warn("[dev:https] Certificate files were not found.");
  console.warn("[dev:https] Falling back to Next.js automatic certificate generation with mkcert.");
  console.warn("[dev:https] If mkcert fails on this PC, restore the certificates folder or run npm run dev over HTTP.");
}

const command = process.platform === "win32" ? "next.cmd" : "next";
const child = spawn(command, args, { stdio: "inherit" });

child.on("exit", (code) => {
  process.exit(code ?? 1);
});
