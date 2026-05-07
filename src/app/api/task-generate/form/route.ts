import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import type {
  TaskGenerateFormState,
  TaskGenerateOption,
  TaskGenerateOptions,
  TaskGenerateRouteRow,
  TaskGenerateRouteType,
} from "@/lib/rcsTypes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STORE_DIR = path.join(process.cwd(), "runtime-data");
const STORE_FILE = path.join(STORE_DIR, "task-generate-form.json");
const MAX_OPTIONS_PER_TYPE = 100;

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

function createEmptyOptions(): TaskGenerateOptions {
  return { SITE: [], CARRIER: [] };
}

function normalizeOption(value: unknown): TaskGenerateOption | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? { name: trimmed, value: trimmed } : null;
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const source = value as Partial<TaskGenerateOption>;
  const optionValue = typeof source.value === "string" ? source.value.trim() : "";
  if (!optionValue) return null;
  const optionName = typeof source.name === "string" && source.name.trim() ? source.name.trim() : optionValue;
  return { name: optionName, value: optionValue };
}

function normalizeOptionList(value: unknown): TaskGenerateOption[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const options: TaskGenerateOption[] = [];
  for (const item of value) {
    const option = normalizeOption(item);
    if (!option || seen.has(option.value)) continue;
    seen.add(option.value);
    options.push(option);
  }
  return options;
}

function normalizeOptions(value: unknown): TaskGenerateOptions {
  const source = value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  return {
    SITE: normalizeOptionList(source.SITE),
    CARRIER: normalizeOptionList(source.CARRIER),
  };
}

function rememberRouteValues(options: TaskGenerateOptions, form: TaskGenerateFormState): TaskGenerateOptions {
  const next: TaskGenerateOptions = {
    SITE: [...options.SITE],
    CARRIER: [...options.CARRIER],
  };

  for (const route of form.routes) {
    const code = route.code.trim();
    if (!code) continue;
    const existingOption = next[route.type].find((item) => item.value === code);
    const rememberedOption = existingOption ?? { name: code, value: code };
    next[route.type] = [rememberedOption, ...next[route.type].filter((item) => item.value !== code)].slice(0, MAX_OPTIONS_PER_TYPE);
  }

  return next;
}

async function readState(): Promise<{ form: TaskGenerateFormState | null; options: TaskGenerateOptions }> {
  const text = await readFile(STORE_FILE, "utf8");
  const parsed = JSON.parse(text) as { form?: unknown; options?: unknown };
  const form = parsed.form ? normalizeForm(parsed.form) : null;
  const storedOptions = normalizeOptions(parsed.options);
  return {
    form,
    options: form ? rememberRouteValues(storedOptions, form) : storedOptions,
  };
}

async function writeState(form: TaskGenerateFormState, options: TaskGenerateOptions) {
  await mkdir(STORE_DIR, { recursive: true });
  await writeFile(
    STORE_FILE,
    JSON.stringify({ savedAt: new Date().toISOString(), form, options }, null, 2),
    "utf8",
  );
}

export async function GET() {
  try {
    const state = await readState();
    return Response.json({ success: true, form: state.form, options: state.options });
  } catch (error: unknown) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return Response.json({ success: true, form: null, options: createEmptyOptions() });
    }
    return Response.json({ success: false, error: error instanceof Error ? error.message : "Cannot read saved form" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { form?: unknown; rememberOptions?: unknown };
    const form = normalizeForm(body.form);
    let options = createEmptyOptions();
    try {
      options = (await readState()).options;
    } catch (error: unknown) {
      if (!(error && typeof error === "object" && "code" in error && error.code === "ENOENT")) throw error;
    }
    if (body.rememberOptions === true) {
      options = rememberRouteValues(options, form);
    }
    await writeState(form, options);
    return Response.json({ success: true, form, options });
  } catch (error: unknown) {
    return Response.json({ success: false, error: error instanceof Error ? error.message : "Cannot save form" }, { status: 500 });
  }
}
