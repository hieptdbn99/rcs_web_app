import { spawn } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import selfsigned from "selfsigned";

const require = createRequire(import.meta.url);
const keyPath = path.join("certificates", "localhost-key.pem");
const certPath = path.join("certificates", "localhost.pem");

const args = ["dev", "--webpack", "--experimental-https", "--hostname", "0.0.0.0"];

function getLocalIpAddresses() {
  return Object.values(os.networkInterfaces())
    .flatMap((items) => items ?? [])
    .filter((item) => item.family === "IPv4" && !item.internal)
    .map((item) => item.address);
}

async function ensureCertificateFiles() {
  if (existsSync(keyPath) && existsSync(certPath)) {
    console.log("[dev:https] Using certificates/localhost-key.pem and certificates/localhost.pem.");
    return;
  }

  const ips = ["127.0.0.1", "0.0.0.0", ...getLocalIpAddresses()];
  const notBeforeDate = new Date();
  const notAfterDate = new Date(notBeforeDate);
  notAfterDate.setFullYear(notBeforeDate.getFullYear() + 10);

  console.warn("[dev:https] Certificate files were not found. Generating a local self-signed certificate.");
  mkdirSync(path.dirname(keyPath), { recursive: true });

  const pems = await selfsigned.generate([{ name: "commonName", value: "localhost" }], {
    keyType: "rsa",
    keySize: 2048,
    algorithm: "sha256",
    notBeforeDate,
    notAfterDate,
    extensions: [
      { name: "basicConstraints", cA: false },
      { name: "keyUsage", digitalSignature: true, keyEncipherment: true },
      { name: "extKeyUsage", serverAuth: true },
      {
        name: "subjectAltName",
        altNames: [
          { type: 2, value: "localhost" },
          ...ips.map((ip) => ({ type: 7, ip })),
        ],
      },
    ],
  });

  writeFileSync(keyPath, pems.private, "utf8");
  writeFileSync(certPath, pems.cert, "utf8");
  console.log(`[dev:https] Generated certificate for localhost and ${ips.join(", ")}.`);
}

await ensureCertificateFiles();
args.splice(3, 0, "--experimental-https-key", keyPath, "--experimental-https-cert", certPath);

const nextCliPath = require.resolve("next/dist/bin/next");
const child = spawn(process.execPath, [nextCliPath, ...args], { stdio: "inherit" });

child.on("exit", (code) => {
  process.exit(code ?? 1);
});
