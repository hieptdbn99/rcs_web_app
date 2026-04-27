import type { RcsApiDefinition } from "@/lib/rcsApiCatalog";
import type { ApiFormField, JsonObject, RcsEnvelope } from "@/lib/rcsTypes";
import type { RcsRisk } from "@/lib/rcsApiCatalog";

// ─── General helpers ──────────────────────────────────────────────────────────

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

export function formatJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

export function parseJsonObject(text: string): JsonObject {
  const parsed = JSON.parse(text) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("JSON payload phải là object.");
  }
  return parsed as JsonObject;
}

/** Extract a meaningful code from a raw QR scan value (JSON, URL, or plain text). */
export function normalizeQrValue(rawValue: string): string {
  const value = rawValue.trim();

  // Try JSON
  try {
    const parsed = JSON.parse(value) as JsonObject;
    const fields = ["carrierCode", "siteCode", "robotTaskCode", "singleRobotCode", "zoneCode", "code", "id", "value", "text"];
    for (const field of fields) {
      const candidate = parsed[field];
      if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
    }
  } catch {
    // Not JSON — continue.
  }

  // Try URL query params
  try {
    const url = new URL(value);
    const fields = ["carrierCode", "siteCode", "robotTaskCode", "singleRobotCode", "zoneCode", "code", "id", "value"];
    for (const field of fields) {
      const candidate = url.searchParams.get(field);
      if (candidate?.trim()) return candidate.trim();
    }
  } catch {
    // Not a URL.
  }

  return value;
}

// ─── RCS response helpers ─────────────────────────────────────────────────────

export function getRcsBody(result?: RcsEnvelope) {
  if (!result?.rcsResponse || typeof result.rcsResponse !== "object" || Array.isArray(result.rcsResponse)) {
    return undefined;
  }
  return result.rcsResponse as { code?: string; message?: string; data?: JsonObject | null };
}

export function getRcsCode(result?: RcsEnvelope): string | undefined {
  return getRcsBody(result)?.code;
}

export function getRcsMessage(result?: RcsEnvelope): string | undefined {
  return result?.error ?? getRcsBody(result)?.message;
}

export function isRcsSuccess(result?: RcsEnvelope): boolean {
  const code = getRcsCode(result);
  return Boolean(result?.success && (!code || code === "SUCCESS" || code === "0"));
}

export function getTaskCode(result?: RcsEnvelope): string | undefined {
  const data = getRcsBody(result)?.data;
  const code = data?.robotTaskCode ?? data?.taskCode;
  return typeof code === "string" ? code : undefined;
}

// ─── Risk display ─────────────────────────────────────────────────────────────

export function riskStyles(risk: RcsRisk): string {
  if (risk === "danger") return "border-red-200 bg-red-50 text-red-700";
  if (risk === "careful") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

export function riskLabel(risk: RcsRisk): string {
  if (risk === "danger") return "Cần xác nhận";
  if (risk === "careful") return "Cẩn trọng";
  return "An toàn";
}

// ─── Form value helpers ───────────────────────────────────────────────────────

function readPath(source: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((current, segment) => {
    if (!current || typeof current !== "object" || Array.isArray(current)) return undefined;
    return (current as Record<string, unknown>)[segment];
  }, source);
}

function valueToString(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (Array.isArray(value)) return value.join(",");
  if (typeof value === "object") return "";
  return String(value);
}

export function getDefaultFieldValue(api: RcsApiDefinition, field: ApiFormField): string {
  const payload = api.defaultPayload;
  const directValue = payload[field.name];
  if (directValue !== undefined) return valueToString(directValue);

  const mappedDefaults: Record<string, Record<string, string>> = {
    "task-submit": {
      startType: "CARRIER",
      startCode: valueToString(readPath(payload, "targetRoute.0.code")),
      destType: "SITE",
      destCode: valueToString(readPath(payload, "targetRoute.1.code")),
      destOperation: valueToString(readPath(payload, "targetRoute.1.operation")),
      carrierType: "",
    },
    "task-continue": {
      nextSeq: valueToString(readPath(payload, "targetRoute.seq")),
      targetType: valueToString(readPath(payload, "targetRoute.type")),
      targetCode: valueToString(readPath(payload, "targetRoute.code")),
      autoStart: valueToString(readPath(payload, "targetRoute.autoStart")),
      operation: valueToString(readPath(payload, "targetRoute.operation")),
    },
    "task-group": {
      targetType: valueToString(readPath(payload, "targetRoute.type")),
      targetCode: valueToString(readPath(payload, "targetRoute.code")),
      robotTaskCode: valueToString(readPath(payload, "data.0.robotTaskCode")),
      sequence: valueToString(readPath(payload, "data.0.sequence")),
    },
    "custom-normal": {
      siteInfo: "STATION_A",
      result: "1",
    },
  };

  return mappedDefaults[api.id]?.[field.name] ?? "";
}

export function getFieldValue(api: RcsApiDefinition, values: Record<string, string>, field: ApiFormField): string {
  return values[field.name] ?? getDefaultFieldValue(api, field);
}

// ─── Payload builder helpers ──────────────────────────────────────────────────

function numberOrUndefined(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const n = Number(value);
  return Number.isNaN(n) ? undefined : n;
}

function optionalString(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function compactObject<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined && entry !== "")) as T;
}

function splitList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

// ─── Build payload from form values ──────────────────────────────────────────

export function buildPayloadFromForm(api: RcsApiDefinition, values: Record<string, string>): JsonObject {
  const get = (name: string) => values[name] ?? "";

  switch (api.id) {
    case "task-group":
      return compactObject({
        groupCode: get("groupCode"),
        strategy: get("strategy"),
        strategyValue: get("strategyValue"),
        groupSeq: numberOrUndefined(get("groupSeq")),
        targetRoute: compactObject({ type: get("targetType"), code: get("targetCode") }),
        data: [compactObject({ robotTaskCode: get("robotTaskCode"), sequence: numberOrUndefined(get("sequence")) })],
      });

    case "task-submit": {
      const carrierType = optionalString(get("carrierType"));
      return compactObject({
        taskType: get("taskType"),
        targetRoute: [
          compactObject({ seq: 0, type: get("startType"), code: get("startCode"), operation: get("startType") === "SITE" ? "COLLECT" : undefined }),
          compactObject({ seq: 1, type: get("destType"), code: get("destCode"), operation: optionalString(get("destOperation")) }),
        ],
        initPriority: numberOrUndefined(get("initPriority")),
        interrupt: numberOrUndefined(get("interrupt")),
        extra: carrierType ? { carrierInfo: [{ carrierType }] } : null,
      });
    }

    case "task-continue":
      return compactObject({
        robotTaskCode: get("robotTaskCode"),
        triggerType: get("triggerType"),
        triggerCode: get("triggerCode"),
        targetRoute: compactObject({
          seq: numberOrUndefined(get("nextSeq")),
          type: get("targetType"),
          code: get("targetCode"),
          autoStart: numberOrUndefined(get("autoStart")),
          operation: optionalString(get("operation")),
        }),
        extra: null,
      });

    case "task-cancel":
      return compactObject({
        robotTaskCode: get("robotTaskCode"),
        cancelType: get("cancelType"),
        carrierCode: optionalString(get("carrierCode")),
        reason: optionalString(get("reason")),
        extra: null,
      });

    case "task-priority":
      return compactObject({
        robotTaskCode: get("robotTaskCode"),
        initPriority: numberOrUndefined(get("initPriority")),
        deadline: optionalString(get("deadline")),
        extra: null,
      });

    case "task-pretask":
      return compactObject({
        siteCode: get("siteCode"),
        nextTaskTime: get("nextTaskTime"),
        robotType: optionalString(get("robotType")),
        priority: numberOrUndefined(get("priority")),
        taskCount: numberOrUndefined(get("taskCount")),
        capacityCount: numberOrUndefined(get("capacityCount")),
        amrDir: optionalString(get("amrDir")),
        extra: null,
      });

    case "custom-normal": {
      const siteInfo = splitList(get("siteInfo"));
      const carrierCode = optionalString(get("carrierCode"));
      return compactObject({
        taskCode: get("taskCode"),
        notifyType: get("notifyType"),
        extra: compactObject({
          siteInfo: siteInfo.length ? siteInfo : undefined,
          result: optionalString(get("result")),
          carrierInfo: carrierCode
            ? [compactObject({ carrierType: get("carrierType"), carrierCode, layer: get("layer") })]
            : undefined,
        }),
      });
    }

    case "carrier-bind":
      return compactObject({ carrierCode: get("carrierCode"), siteCode: get("siteCode"), carrierDir: numberOrUndefined(get("carrierDir")), extra: null });

    case "carrier-unbind":
      return compactObject({ carrierCode: get("carrierCode"), siteCode: get("siteCode"), extra: null });

    case "site-bind":
      return compactObject({
        slotCategory: get("slotCategory"),
        slotCode: get("slotCode"),
        carrierCategory: get("carrierCategory"),
        carrierType: optionalString(get("carrierType")),
        carrierCode: optionalString(get("carrierCode")),
        carrierDir: numberOrUndefined(get("carrierDir")),
        temporary: numberOrUndefined(get("temporary")),
        invoke: get("invoke"),
        extra: null,
      });

    case "carrier-lock":
      return compactObject({ carrierCode: get("carrierCode"), invoke: get("invoke"), extra: null });

    case "site-lock":
      return compactObject({ siteCode: get("siteCode"), invoke: get("invoke"), extra: null });

    case "zone-pause":
      return compactObject({ zoneCode: get("zoneCode"), mapCode: optionalString(get("mapCode")), invoke: get("invoke"), extra: null });

    case "zone-homing":
      return compactObject({
        zoneCode: get("zoneCode"),
        autoShutdown: get("autoShutdown"),
        bootTime: optionalString(get("bootTime")),
        expireTime: optionalString(get("expireTime")),
        extra: null,
      });

    case "zone-banish":
      return compactObject({
        zoneCode: get("zoneCode"),
        invoke: get("invoke"),
        pause: optionalString(get("pause")),
        controlMode: optionalString(get("controlMode")),
        targetZoneCode: optionalString(get("targetZoneCode")),
        expireTime: optionalString(get("expireTime")),
        extra: null,
      });

    case "zone-blockade":
      return compactObject({ zoneCode: get("zoneCode"), mapCode: optionalString(get("mapCode")), invoke: get("invoke"), extra: null });

    case "task-query":
      return { robotTaskCode: get("robotTaskCode") };

    case "robot-query":
      return { singleRobotCode: get("singleRobotCode") };

    case "carrier-query":
      return { carrierCode: get("carrierCode") };

    case "eqpt-notify": {
      const carrierCode = optionalString(get("carrierCode"));
      return compactObject({
        eqptCode: get("eqptCode"),
        taskCode: get("taskCode"),
        actionStatus: get("actionStatus"),
        siteCode: get("siteCode"),
        carrierInfo: carrierCode ? [compactObject({ carrierCode, carrierType: get("carrierType") })] : undefined,
        extra: null,
      });
    }

    default:
      return api.defaultPayload;
  }
}
