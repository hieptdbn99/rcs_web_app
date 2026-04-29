import crypto from "crypto";
import { NextResponse } from "next/server";

function readCsvEnv(name: string): string[] {
  return (process.env[name] ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function timingSafeEqualString(received: string, expected: string): boolean {
  const receivedBuffer = Buffer.from(received);
  const expectedBuffer = Buffer.from(expected);

  if (receivedBuffer.length !== expectedBuffer.length) return false;
  return crypto.timingSafeEqual(receivedBuffer, expectedBuffer);
}

function getBearerToken(request: Request): string | undefined {
  const authorization = request.headers.get("authorization") ?? "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim();
}

function getClientIp(request: Request): string | undefined {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0]?.trim();

  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  const forwarded = request.headers.get("forwarded");
  const forwardedMatch = forwarded?.match(/for="?([^";,]+)"?/i);
  return forwardedMatch?.[1]?.trim();
}

function validateIpAllowlist(request: Request): NextResponse | null {
  const allowedIps = readCsvEnv("RCS_ALLOWED_CLIENT_IPS");
  if (allowedIps.length === 0) return null;

  const clientIp = getClientIp(request);
  if (clientIp && allowedIps.includes(clientIp)) return null;

  return NextResponse.json(
    {
      success: false,
      error: "Client IP is not allowed to call RCS APIs.",
    },
    { status: 403 }
  );
}

export function authorizeRcsOperatorRequest(request: Request): NextResponse | null {
  const ipError = validateIpAllowlist(request);
  if (ipError) return ipError;

  const expectedToken = process.env.RCS_OPERATOR_TOKEN?.trim();
  if (!expectedToken) return null;

  const receivedToken =
    request.headers.get("x-rcs-operator-token")?.trim() ??
    getBearerToken(request);

  if (receivedToken && timingSafeEqualString(receivedToken, expectedToken)) {
    return null;
  }

  return NextResponse.json(
    {
      success: false,
      error: "Missing or invalid RCS operator token.",
    },
    { status: 401 }
  );
}

export function authorizeRcsCallbackRequest(request: Request): NextResponse | null {
  const expectedToken = process.env.RCS_CALLBACK_TOKEN?.trim();
  if (!expectedToken) return null;

  const requestUrl = new URL(request.url);
  const receivedToken =
    request.headers.get("x-rcs-callback-token")?.trim() ??
    getBearerToken(request) ??
    requestUrl.searchParams.get("token")?.trim();

  if (receivedToken && timingSafeEqualString(receivedToken, expectedToken)) {
    return null;
  }

  return NextResponse.json(
    {
      code: "UNAUTHORIZED",
      message: "Missing or invalid RCS callback token.",
      data: null,
    },
    { status: 401 }
  );
}
