import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

export type JsonObject = Record<string, unknown>;

export type RcsCallResult = {
  success: boolean;
  httpStatus: number;
  rcsResponse: unknown;
  request: {
    url: string;
    path: string;
    signed: boolean;
  };
};

export function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}

function generateSignature(
  appKey: string,
  appSecret: string,
  host: string,
  path: string,
  nonce: string,
  timestamp: string,
  body: string
) {
  const requestId = uuidv4().replace(/-/g, "").substring(0, 16);
  const authHeader = `nonce="${nonce}",method="HMAC-SHA256",timestamp="${timestamp}"`;
  const version = "v1.0";

  const originalString =
    `POST ${path} HTTP/1.1\n` +
    `AUTHORIZATION: ${authHeader}\n` +
    `HOST: ${host}\n` +
    `X-LR-APPKEY: ${appKey}\n` +
    `X-LR-REQUEST-ID: ${requestId}\n` +
    `X-LR-SOURCE: wms\n` +
    `X-LR-VERSION: ${version}\n\n` +
    `${body}`;

  const hmac = crypto.createHmac("sha256", appSecret);
  hmac.update(originalString, "utf8");
  const hmacHex = hmac.digest("hex");

  const md5 = crypto.createHash("md5");
  md5.update(hmacHex, "utf8");
  const md5Hex = md5.digest("hex");
  const signature = md5Hex.substring(8, 24);

  return { signature, requestId, authHeader, version };
}

async function parseRcsResponse(response: Response) {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

export async function callRcsPath(path: string, payload: JsonObject): Promise<RcsCallResult> {
  const rcsHost = process.env.RCS_HOST;
  const appKey = process.env.APP_KEY || "";
  const appSecret = process.env.APP_SECRET || "";

  if (!rcsHost) {
    throw new Error("Missing RCS_HOST environment variable");
  }

  const bodyString = JSON.stringify(payload ?? {});
  const hostUrl = new URL(rcsHost);
  const hostHeader = hostUrl.host;
  const headers: Record<string, string> = {
    Host: hostHeader,
    "Content-Type": "application/json;charset=UTF-8",
    "X-lr-request-id": uuidv4().replace(/-/g, "").substring(0, 16),
    "X-lr-source": "wms",
    "X-lr-version": "v1.0",
  };

  let rcsUrl = `${rcsHost.replace(/\/+$/, "")}/rcs/rtas${path}`;
  let signed = false;

  if (appKey && appSecret) {
    const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, "+00:00");
    const nonce = Math.random().toString(36).substring(2, 10);
    const { signature, requestId, authHeader, version } = generateSignature(
      appKey,
      appSecret,
      hostHeader,
      path,
      nonce,
      timestamp,
      bodyString
    );

    rcsUrl = `${rcsUrl}?sign=${signature}`;
    headers.Authorization = authHeader;
    headers["X-lr-appkey"] = appKey;
    headers["X-lr-request-id"] = requestId;
    headers["X-lr-source"] = "wms";
    headers["X-lr-version"] = version;
    signed = true;
  }

  const response = await fetch(rcsUrl, {
    method: "POST",
    headers,
    body: bodyString,
  });

  const rcsResponse = await parseRcsResponse(response);

  return {
    success: response.ok,
    httpStatus: response.status,
    rcsResponse,
    request: {
      url: rcsUrl,
      path,
      signed,
    },
  };
}
