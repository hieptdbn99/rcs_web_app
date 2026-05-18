// Forwards HTTPS traffic on HTTPS_PORT to the Next.js standalone server on TARGET_PORT.
// Used because Next standalone only listens on HTTP; phone cameras require HTTPS for QR scanning.
const fs = require("fs");
const http = require("http");
const https = require("https");

const targetPort = Number(process.env.TARGET_PORT || process.env.PORT || 3000);
const httpsPort = Number(process.env.HTTPS_PORT || 3443);
const keyPath = process.env.HTTPS_KEY || "/app/certificates/localhost-key.pem";
const certPath = process.env.HTTPS_CERT || "/app/certificates/localhost.pem";

const options = {
  key: fs.readFileSync(keyPath),
  cert: fs.readFileSync(certPath),
};

const server = https.createServer(options, (req, res) => {
  const headers = {
    ...req.headers,
    host: `127.0.0.1:${targetPort}`,
    "x-forwarded-proto": "https",
    "x-forwarded-host": req.headers.host || "",
  };

  const proxyReq = http.request(
    {
      hostname: "127.0.0.1",
      port: targetPort,
      path: req.url,
      method: req.method,
      headers,
    },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
      proxyRes.pipe(res);
    },
  );

  proxyReq.on("error", (error) => {
    res.writeHead(502, { "content-type": "text/plain; charset=utf-8" });
    res.end(`HTTPS proxy error: ${error.message}`);
  });

  req.pipe(proxyReq);
});

server.listen(httpsPort, "0.0.0.0", () => {
  console.log(`RCS HTTPS proxy listening on https://0.0.0.0:${httpsPort}`);
});
