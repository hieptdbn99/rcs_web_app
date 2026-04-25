import { NextResponse } from "next/server";
import { callRcsPath, getErrorMessage, type JsonObject } from "@/lib/rcsClient";

export async function POST(request: Request) {
  try {
    const { carrierCode, siteCode, carrierDir, carrierType, invoke } = await request.json();
    const payload: JsonObject = {
      slotCategory: "SITE",
      slotCode: siteCode,
      carrierCategory: "POD",
      carrierType: carrierType || undefined,
      carrierCode,
      carrierDir: parseInt(carrierDir) || 0,
      invoke: invoke || "BIND",
      extra: null,
    };

    const result = await callRcsPath("/api/robot/controller/site/bind", payload);

    return NextResponse.json(
      {
        success: result.success,
        httpStatus: result.httpStatus,
        rcsResponse: result.rcsResponse,
        request: result.request,
      },
      { status: result.success ? 200 : result.httpStatus }
    );
  } catch (error: unknown) {
    console.error("RCS carrier bind error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
