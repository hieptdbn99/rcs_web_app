import { NextResponse } from "next/server";
import { authorizeRcsOperatorRequest } from "@/lib/rcsAuth";
import { callRcsPath, getErrorMessage } from "@/lib/rcsClient";

export async function POST(request: Request) {
  try {
    const authError = authorizeRcsOperatorRequest(request);
    if (authError) return authError;

    const { robotTaskCode } = await request.json();
    const result = await callRcsPath("/api/robot/controller/task/query", { robotTaskCode });

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
    console.error("RCS task query error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
