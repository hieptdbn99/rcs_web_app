import { NextResponse } from "next/server";
import { callRcsPath, getErrorMessage, type JsonObject } from "@/lib/rcsClient";

export async function POST(request: Request) {
  try {
    const { targetRoute, extraParams, taskType } = await request.json();
    const payload: JsonObject = {
      taskType: taskType || "TRANSPORT",
      targetRoute: targetRoute || [],
      ...(extraParams || {}),
    };

    const result = await callRcsPath("/api/robot/controller/task/submit", payload);

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
    console.error("RCS task submit error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
