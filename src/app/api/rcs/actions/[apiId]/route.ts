import { NextResponse } from "next/server";
import { getRcsApiById } from "@/lib/rcsApiCatalog";
import { callRcsPath, getErrorMessage, type JsonObject } from "@/lib/rcsClient";

function isJsonObject(value: unknown): value is JsonObject {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ apiId: string }> }
) {
  try {
    const { apiId } = await params;
    const api = getRcsApiById(apiId);

    if (!api) {
      return NextResponse.json({ error: `Unknown RCS API id: ${apiId}` }, { status: 404 });
    }

    if (api.direction === "callback") {
      return NextResponse.json(
        {
          error: "This API is an inbound callback. Configure RCS to call the local callback path instead.",
          callbackPath: api.localCallbackPath,
        },
        { status: 400 }
      );
    }

    const body = (await request.json().catch(() => ({}))) as unknown;
    const payloadCandidate = isJsonObject(body) && "payload" in body ? body.payload : body;
    const payload = isJsonObject(payloadCandidate) ? payloadCandidate : api.defaultPayload;
    const result = await callRcsPath(api.endpoint, payload);

    return NextResponse.json(
      {
        ...result,
        api: {
          id: api.id,
          title: api.title,
          endpoint: api.endpoint,
        },
      },
      { status: result.success ? 200 : result.httpStatus }
    );
  } catch (error: unknown) {
    console.error("RCS action error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
