import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import type { TaskGenerateFormState, TaskGenerateRouteRow, TaskGenerateRouteType } from "@/lib/rcsTypes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STORE_DIR = path.join(process.cwd(), "runtime-data");
const STORE_FILE = path.join(STORE_DIR, "task-generate-form.json");

function isRouteType(value: unknown): value is TaskGenerateRouteType {
  return value === "SITE" || value === "CARRIER";
}

function normalizeRoute(value: unknown, index: number): TaskGenerateRouteRow {
  const source = value && typeof value === "object" && !Array.isArray(value) ? (value as Partial<TaskGenerateRouteRow>) : {};
  return {
    id: typeof source.id === "string" && source.id ? source.id : `route-${index + 1}`,
    type: isRouteType(source.type) ? source.type : "SITE",
    code: typeof source.code === "string" ? source.code : "",
  };
}

function normalizeForm(value: unknown): TaskGenerateFormState {
  const source = value && typeof value === "object" && !Array.isArray(value) ? (value as Partial<TaskGenerateFormState>) : {};
  const routes = Array.isArray(source.routes) ? source.routes.map(normalizeRoute) : [];
  return {
    taskType: typeof source.taskType === "string" ? source.taskType : "RunTest",
    robotNo: typeof source.robotNo === "string" ? source.robotNo : "",
    routes: routes.length ? routes : [normalizeRoute({ type: "SITE", code: "" }, 0)],
  };
}

async function writeForm(form: TaskGenerateFormState) {
  await mkdir(STORE_DIR, { recursive: true });
  await writeFile(
    STORE_FILE,
    JSON.stringify({ savedAt: new Date().toISOString(), form }, null, 2),
    "utf8",
  );
}

export async function GET() {
  try {
    const text = await readFile(STORE_FILE, "utf8");
    const parsed = JSON.parse(text) as { form?: unknown };
    return Response.json({ success: true, form: normalizeForm(parsed.form) });
  } catch (error: unknown) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return Response.json({ success: true, form: null });
    }
    return Response.json({ success: false, error: error instanceof Error ? error.message : "Cannot read saved form" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { form?: unknown };
    const form = normalizeForm(body.form);
    await writeForm(form);
    return Response.json({ success: true, form });
  } catch (error: unknown) {
    return Response.json({ success: false, error: error instanceof Error ? error.message : "Cannot save form" }, { status: 500 });
  }
}
