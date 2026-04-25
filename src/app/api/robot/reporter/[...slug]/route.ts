import { NextResponse } from "next/server";
import { getRcsCallbackByPath } from "@/lib/rcsApiCatalog";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params;
  const callbackPath = `/api/robot/reporter/${slug.join("/")}`;
  const api = getRcsCallbackByPath(callbackPath);
  const payload = await request.json().catch(() => null);
  const receivedAt = new Date().toISOString();

  console.log("[RCS callback]", {
    callbackPath,
    apiId: api?.id,
    receivedAt,
    payload,
  });

  return NextResponse.json({
    code: "SUCCESS",
    message: "Succeeded",
    data: {
      callbackPath,
      apiId: api?.id ?? "unmapped-callback",
      receivedAt,
      extra: null,
    },
  });
}
