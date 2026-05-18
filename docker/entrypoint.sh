#!/bin/sh
set -e

CERT_DIR=/app/certificates
KEY_FILE="$CERT_DIR/localhost-key.pem"
CRT_FILE="$CERT_DIR/localhost.pem"

mkdir -p "$CERT_DIR"

if [ ! -f "$KEY_FILE" ] || [ ! -f "$CRT_FILE" ]; then
  echo "[entrypoint] No certificate found. Generating self-signed cert (valid 10 years)..."

  # Collect container IPs so the cert is valid for LAN access too.
  SAN="DNS:localhost,DNS:*.local,IP:127.0.0.1,IP:0.0.0.0"
  for ip in $(hostname -i 2>/dev/null | tr ' ' '\n'); do
    [ -n "$ip" ] && SAN="$SAN,IP:$ip"
  done

  openssl req -x509 -nodes -newkey rsa:2048 -days 3650 \
    -keyout "$KEY_FILE" -out "$CRT_FILE" \
    -subj "/CN=localhost" \
    -addext "subjectAltName=$SAN" \
    -addext "extendedKeyUsage=serverAuth" \
    >/dev/null 2>&1

  echo "[entrypoint] Wrote cert to $CRT_FILE (SAN=$SAN)"
else
  echo "[entrypoint] Reusing existing certificate at $CRT_FILE"
fi

echo "[entrypoint] Starting HTTPS proxy on :${HTTPS_PORT} -> HTTP :${TARGET_PORT}"
node /app/https-proxy.js &
HTTPS_PID=$!

# Stop the proxy when the Next server exits or we receive a stop signal.
trap 'kill $HTTPS_PID 2>/dev/null || true; exit 0' INT TERM

echo "[entrypoint] Starting Next.js standalone server on :${PORT}"
exec node /app/server.js
