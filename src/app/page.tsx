"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import {
  AlertCircle,
  Blocks,
  Bot,
  Camera,
  CheckCircle2,
  ClipboardList,
  Cpu,
  Loader2,
  Map,
  MapPin,
  Package,
  Play,
  QrCode,
  RotateCw,
  Settings2,
  ShieldAlert,
  Square,
  X,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import {
  getRcsApisByGroup,
  RCS_API_GROUPS,
  type RcsApiDefinition,
  type RcsApiGroup,
  type RcsRisk,
} from "@/lib/rcsApiCatalog";

type MainTab = "quick" | RcsApiGroup;
type MoveMode = "carrier-to-site" | "site-to-site";
type QuickScanTarget = "carrier" | "source" | "destination" | "bindCarrier" | "bindSite" | "statusTask";
type ApiFieldScanTarget = {
  kind: "apiField";
  apiId: string;
  fieldName: string;
  label: string;
};
type ScanTarget = QuickScanTarget | ApiFieldScanTarget;
type JsonObject = Record<string, unknown>;
type ScannerControls = { stop: () => void };
type ApiFormField = {
  name: string;
  label: string;
  type?: "text" | "number" | "select" | "textarea";
  placeholder?: string;
  helper?: string;
  options?: Array<{ label: string; value: string }>;
  qr?: boolean;
  wide?: boolean;
};
type ApiFormSchema = {
  summary: string;
  fields: ApiFormField[];
};

type RcsEnvelope = {
  success?: boolean;
  error?: string;
  httpStatus?: number;
  rcsResponse?: unknown;
  request?: {
    url?: string;
    path?: string;
    signed?: boolean;
  };
  api?: {
    id?: string;
    title?: string;
    endpoint?: string;
  };
};

type RecentAction = {
  id: string;
  title: string;
  detail: string;
  code?: string;
  taskCode?: string;
  createdAt: string;
};

const quickScanLabels: Record<QuickScanTarget, string> = {
  carrier: "Quét QR mã kệ",
  source: "Quét QR vị trí lấy",
  destination: "Quét QR vị trí đích",
  bindCarrier: "Quét QR mã kệ cần gắn",
  bindSite: "Quét QR vị trí hiện tại",
  statusTask: "Quét QR mã task",
};

function getScanLabel(target: ScanTarget) {
  if (typeof target === "string") return quickScanLabels[target];
  return `Quét QR cho ${target.label}`;
}

const groupIcons: Record<MainTab, React.ReactNode> = {
  quick: <Play className="h-4 w-4" />,
  task: <ClipboardList className="h-4 w-4" />,
  asset: <Package className="h-4 w-4" />,
  area: <Map className="h-4 w-4" />,
  status: <RotateCw className="h-4 w-4" />,
  integration: <Blocks className="h-4 w-4" />,
};

const fieldOptions = {
  targetType: [
    { label: "Kệ / Carrier", value: "CARRIER" },
    { label: "Vị trí / Site", value: "SITE" },
    { label: "Khu vực / Zone", value: "ZONE" },
    { label: "Ô lưu trữ / Storage", value: "STORAGE" },
  ],
  operation: [
    { label: "Không chọn", value: "" },
    { label: "Lấy hàng", value: "COLLECT" },
    { label: "Giao hàng", value: "DELIVERY" },
    { label: "Xoay", value: "ROTATE" },
  ],
  yesNo: [
    { label: "Có", value: "YES" },
    { label: "Không", value: "NO" },
  ],
};

const API_FORM_SCHEMAS: Record<string, ApiFormSchema> = {
  "task-group": {
    summary: "Dùng khi cần gom nhiều task vào cùng một nhóm chạy theo thứ tự.",
    fields: [
      { name: "groupCode", label: "Mã nhóm task", qr: true },
      { name: "strategy", label: "Chiến lược", type: "select", options: [{ label: "Chạy theo thứ tự nhóm", value: "GROUP_SEQ" }, { label: "Phân bổ theo nhóm", value: "GROUP_ASSIGN" }] },
      { name: "strategyValue", label: "Giá trị chiến lược", type: "select", options: [{ label: "Ordered within and between groups", value: "1" }, { label: "Unordered between groups", value: "0" }, { label: "Ordered between groups", value: "2" }, { label: "Ordered within groups", value: "3" }] },
      { name: "groupSeq", label: "Thứ tự nhóm", type: "number" },
      { name: "targetType", label: "Loại điểm điều phối", type: "select", options: fieldOptions.targetType },
      { name: "targetCode", label: "Mã điểm điều phối", qr: true },
      { name: "robotTaskCode", label: "Mã task ngoài", qr: true },
      { name: "sequence", label: "Thứ tự task", type: "number" },
    ],
  },
  "task-submit": {
    summary: "Tạo task robot. Người vận hành thường chỉ cần chọn loại điểm và nhập/quét mã.",
    fields: [
      { name: "taskType", label: "Loại task", placeholder: "PF-LMR-COMMON" },
      { name: "startType", label: "Loại điểm lấy", type: "select", options: fieldOptions.targetType },
      { name: "startCode", label: "Mã điểm lấy / mã kệ", qr: true },
      { name: "destType", label: "Loại điểm đích", type: "select", options: fieldOptions.targetType },
      { name: "destCode", label: "Mã điểm đích", qr: true },
      { name: "destOperation", label: "Hành động tại đích", type: "select", options: fieldOptions.operation },
      { name: "initPriority", label: "Ưu tiên", type: "number" },
      { name: "interrupt", label: "Cho phép ngắt task", type: "select", options: [{ label: "Không", value: "0" }, { label: "Có", value: "1" }] },
      { name: "carrierType", label: "Loại kệ", helper: "Chỉ cần khi task yêu cầu carrierInfo." },
    ],
  },
  "task-continue": {
    summary: "Cho task nhiều bước chạy tiếp bước kế tiếp.",
    fields: [
      { name: "robotTaskCode", label: "Mã task", qr: true },
      { name: "triggerType", label: "Loại trigger", type: "select", options: [{ label: "Theo task", value: "TASK" }, { label: "Theo vị trí", value: "SITE" }, { label: "Theo kệ", value: "CARRIER" }, { label: "Theo robot", value: "ROBOT" }] },
      { name: "triggerCode", label: "Mã trigger", qr: true },
      { name: "nextSeq", label: "Seq tiếp theo", type: "number" },
      { name: "targetType", label: "Loại điểm tiếp theo", type: "select", options: fieldOptions.targetType },
      { name: "targetCode", label: "Mã điểm tiếp theo", qr: true },
      { name: "autoStart", label: "Tự chạy bước này", type: "select", options: [{ label: "Có", value: "1" }, { label: "Không", value: "0" }] },
      { name: "operation", label: "Hành động", type: "select", options: fieldOptions.operation },
    ],
  },
  "task-cancel": {
    summary: "Hủy task. Chỉ dùng khi chắc chắn task cần dừng.",
    fields: [
      { name: "robotTaskCode", label: "Mã task cần hủy", qr: true },
      { name: "cancelType", label: "Kiểu hủy", type: "select", options: [{ label: "Hủy mềm", value: "CANCEL" }, { label: "Can thiệp thủ công", value: "DROP" }] },
      { name: "carrierCode", label: "Mã kệ liên quan", qr: true },
      { name: "reason", label: "Lý do hủy", wide: true },
    ],
  },
  "task-priority": {
    summary: "Đổi độ ưu tiên task trước khi task kết thúc.",
    fields: [
      { name: "robotTaskCode", label: "Mã task", qr: true },
      { name: "initPriority", label: "Ưu tiên mới", type: "number", helper: "1 đến 120, số lớn ưu tiên cao hơn." },
      { name: "deadline", label: "Deadline", placeholder: "2026-04-25T12:30:00Z", wide: true },
    ],
  },
  "task-pretask": {
    summary: "Gọi robot tới trước một vị trí để chuẩn bị task sắp phát sinh.",
    fields: [
      { name: "siteCode", label: "Mã vị trí", qr: true },
      { name: "nextTaskTime", label: "Thời gian dự kiến tạo task (giây)", type: "number" },
      { name: "robotType", label: "Loại robot" },
      { name: "priority", label: "Ưu tiên", type: "number" },
      { name: "taskCount", label: "Số task dự kiến", type: "number" },
      { name: "capacityCount", label: "Số ô trống tối thiểu", type: "number" },
      { name: "amrDir", label: "Hướng robot", type: "select", options: [{ label: "Không chỉ định", value: "999" }, { label: "0 độ", value: "0" }, { label: "90 độ", value: "90" }, { label: "180 độ", value: "180" }, { label: "-90 độ", value: "-90" }] },
    ],
  },
  "custom-normal": {
    summary: "API tùy chỉnh cho CHECK hoặc FULL_NOTIFY. Chỉ dùng khi kỹ thuật đã thống nhất payload.",
    fields: [
      { name: "taskCode", label: "Mã task", qr: true },
      { name: "notifyType", label: "Loại thông báo", type: "select", options: [{ label: "Kiểm tra cho phép vào", value: "CHECK" }, { label: "Báo đã đầy", value: "FULL_NOTIFY" }] },
      { name: "carrierCode", label: "Mã kệ", qr: true },
      { name: "carrierType", label: "Loại kệ" },
      { name: "layer", label: "Tầng", type: "number" },
      { name: "siteInfo", label: "Danh sách điểm", placeholder: "SITE_A,SITE_B", wide: true },
      { name: "result", label: "Kết quả CHECK", type: "select", options: [{ label: "Cho phép", value: "1" }, { label: "Không cho phép", value: "0" }] },
    ],
  },
  "carrier-bind": {
    summary: "Gắn carrier/kệ vào point.",
    fields: [
      { name: "carrierCode", label: "Mã kệ", qr: true },
      { name: "siteCode", label: "Mã vị trí", qr: true },
      { name: "carrierDir", label: "Góc kệ", type: "select", options: [{ label: "0 độ", value: "0" }, { label: "90 độ", value: "90" }, { label: "180 độ", value: "180" }, { label: "-90 độ", value: "-90" }, { label: "360 độ", value: "360" }] },
    ],
  },
  "carrier-unbind": {
    summary: "Bỏ liên kết carrier/kệ khỏi point.",
    fields: [
      { name: "carrierCode", label: "Mã kệ", qr: true },
      { name: "siteCode", label: "Mã vị trí", qr: true },
    ],
  },
  "site-bind": {
    summary: "Gắn hoặc bỏ gắn storage object/point với carrier. Đây là luồng gắn kệ chính.",
    fields: [
      { name: "invoke", label: "Thao tác", type: "select", options: [{ label: "Gắn", value: "BIND" }, { label: "Bỏ gắn", value: "UNBIND" }] },
      { name: "slotCategory", label: "Loại vị trí", type: "select", options: [{ label: "Point/Site", value: "SITE" }, { label: "Bin", value: "BIN" }] },
      { name: "slotCode", label: "Mã vị trí", qr: true },
      { name: "carrierCategory", label: "Loại carrier", type: "select", options: [{ label: "Rack/POD", value: "POD" }, { label: "Pallet", value: "PALLET" }, { label: "Box", value: "BOX" }, { label: "Material", value: "MAT" }] },
      { name: "carrierType", label: "Kiểu kệ" },
      { name: "carrierCode", label: "Mã kệ", qr: true },
      { name: "carrierDir", label: "Góc kệ", type: "select", options: [{ label: "0 độ", value: "0" }, { label: "90 độ", value: "90" }, { label: "180 độ", value: "180" }, { label: "-90 độ", value: "-90" }, { label: "360 độ", value: "360" }] },
      { name: "temporary", label: "Kệ tạm", type: "select", options: [{ label: "Không", value: "0" }, { label: "Có", value: "1" }] },
    ],
  },
  "carrier-lock": {
    summary: "Khóa hoặc mở khóa kệ/carrier.",
    fields: [
      { name: "carrierCode", label: "Mã kệ", qr: true },
      { name: "invoke", label: "Thao tác", type: "select", options: [{ label: "Khóa", value: "LOCK" }, { label: "Mở khóa", value: "UNLOCK" }] },
    ],
  },
  "site-lock": {
    summary: "Khóa hoặc mở khóa point/vị trí.",
    fields: [
      { name: "siteCode", label: "Mã vị trí", qr: true },
      { name: "invoke", label: "Thao tác", type: "select", options: [{ label: "Khóa", value: "LOCK" }, { label: "Mở khóa", value: "UNLOCK" }] },
    ],
  },
  "zone-pause": {
    summary: "Dừng hoặc khôi phục robot trong một khu vực.",
    fields: [
      { name: "zoneCode", label: "Mã khu vực", qr: true },
      { name: "mapCode", label: "Mã bản đồ" },
      { name: "invoke", label: "Thao tác", type: "select", options: [{ label: "Dừng", value: "FREEZE" }, { label: "Chạy lại", value: "RUN" }] },
    ],
  },
  "zone-homing": {
    summary: "Đưa robot trong khu vực về bãi/khu vực cố định.",
    fields: [
      { name: "zoneCode", label: "Mã khu vực", qr: true },
      { name: "autoShutdown", label: "Tắt nguồn sau khi về", type: "select", options: fieldOptions.yesNo },
      { name: "bootTime", label: "Thời gian bật lại", placeholder: "2026-04-25T08:00:00+07:00" },
      { name: "expireTime", label: "Thời gian timeout", placeholder: "2026-04-25T12:30:00Z" },
    ],
  },
  "zone-banish": {
    summary: "Clear area: đưa robot ra khỏi khu vực hoặc khôi phục khu vực.",
    fields: [
      { name: "zoneCode", label: "Mã khu vực", qr: true },
      { name: "invoke", label: "Thao tác", type: "select", options: [{ label: "Clear area", value: "BANISH" }, { label: "Khôi phục", value: "RUN" }] },
      { name: "pause", label: "Dừng robot sau khi clear", type: "select", options: [{ label: "Không", value: "0" }, { label: "Có", value: "1" }] },
      { name: "controlMode", label: "Cách clear", type: "select", options: [{ label: "Đi ra khỏi vùng", value: "0" }, { label: "Đi đến điểm đỗ tạm", value: "1" }, { label: "Đi đến vùng chỉ định", value: "2" }] },
      { name: "targetZoneCode", label: "Vùng đích", qr: true },
      { name: "expireTime", label: "Thời gian timeout", placeholder: "2026-04-25T12:30:00Z" },
    ],
  },
  "zone-blockade": {
    summary: "Chặn hoặc mở một khu vực để robot bên ngoài không đi vào.",
    fields: [
      { name: "zoneCode", label: "Mã khu vực", qr: true },
      { name: "mapCode", label: "Mã bản đồ" },
      { name: "invoke", label: "Thao tác", type: "select", options: [{ label: "Chặn khu vực", value: "BLOCKADE" }, { label: "Mở khu vực", value: "OPENUP" }] },
    ],
  },
  "task-query": {
    summary: "Tra cứu trạng thái task.",
    fields: [{ name: "robotTaskCode", label: "Mã task", qr: true }],
  },
  "robot-query": {
    summary: "Tra cứu trạng thái robot.",
    fields: [{ name: "singleRobotCode", label: "Mã robot", qr: true }],
  },
  "carrier-query": {
    summary: "Tra cứu trạng thái kệ/carrier.",
    fields: [{ name: "carrierCode", label: "Mã kệ", qr: true }],
  },
  "eqpt-notify": {
    summary: "Báo RCS rằng thiết bị bên thứ ba đã thực hiện xong một bước.",
    fields: [
      { name: "eqptCode", label: "Mã thiết bị", qr: true },
      { name: "taskCode", label: "Mã task", qr: true },
      { name: "actionStatus", label: "Trạng thái thực hiện", type: "select", options: [{ label: "Cửa mở đúng vị trí", value: "1" }, { label: "Cửa đóng đúng vị trí", value: "2" }, { label: "Thang máy mở cửa", value: "3" }, { label: "Hàng tới tầng đích", value: "4" }, { label: "Lấy hàng", value: "5" }, { label: "Đặt hàng", value: "6" }, { label: "Đã tới", value: "7" }] },
      { name: "siteCode", label: "Mã vị trí", qr: true },
      { name: "carrierCode", label: "Mã kệ", qr: true },
      { name: "carrierType", label: "Loại kệ" },
    ],
  },
};

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}

function formatJson(value: unknown) {
  return JSON.stringify(value, null, 2);
}

function parseJsonObject(text: string) {
  const parsed = JSON.parse(text) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("JSON payload phải là object.");
  }
  return parsed as JsonObject;
}

function normalizeQrValue(rawValue: string) {
  const value = rawValue.trim();

  try {
    const parsed = JSON.parse(value) as JsonObject;
    const fields = ["carrierCode", "siteCode", "robotTaskCode", "singleRobotCode", "zoneCode", "code", "id", "value", "text"];
    for (const field of fields) {
      const candidate = parsed[field];
      if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
    }
  } catch {
    // Not JSON, continue with URL/plain text parsing.
  }

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

function getRcsBody(result?: RcsEnvelope) {
  if (!result?.rcsResponse || typeof result.rcsResponse !== "object" || Array.isArray(result.rcsResponse)) {
    return undefined;
  }
  return result.rcsResponse as { code?: string; message?: string; data?: JsonObject | null };
}

function getRcsCode(result?: RcsEnvelope) {
  return getRcsBody(result)?.code;
}

function getRcsMessage(result?: RcsEnvelope) {
  return result?.error || getRcsBody(result)?.message;
}

function isRcsSuccess(result?: RcsEnvelope) {
  const code = getRcsCode(result);
  return Boolean(result?.success && (!code || code === "SUCCESS" || code === "0"));
}

function getTaskCode(result?: RcsEnvelope) {
  const data = getRcsBody(result)?.data;
  const code = data?.robotTaskCode ?? data?.taskCode;
  return typeof code === "string" ? code : undefined;
}

function riskStyles(risk: RcsRisk) {
  if (risk === "danger") return "border-red-200 bg-red-50 text-red-700";
  if (risk === "careful") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function riskLabel(risk: RcsRisk) {
  if (risk === "danger") return "Cần xác nhận";
  if (risk === "careful") return "Cẩn trọng";
  return "An toàn";
}

function readPath(source: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((current, segment) => {
    if (!current || typeof current !== "object" || Array.isArray(current)) return undefined;
    return (current as Record<string, unknown>)[segment];
  }, source);
}

function valueToString(value: unknown) {
  if (value === undefined || value === null) return "";
  if (Array.isArray(value)) return value.join(",");
  if (typeof value === "object") return "";
  return String(value);
}

function getDefaultFieldValue(api: RcsApiDefinition, field: ApiFormField) {
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

function getFieldValue(api: RcsApiDefinition, values: Record<string, string>, field: ApiFormField) {
  return values[field.name] ?? getDefaultFieldValue(api, field);
}

function numberOrUndefined(value: string) {
  if (!value.trim()) return undefined;
  const numberValue = Number(value);
  return Number.isNaN(numberValue) ? undefined : numberValue;
}

function optionalString(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function compactObject<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined && entry !== "")) as T;
}

function splitList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildPayloadFromForm(api: RcsApiDefinition, values: Record<string, string>) {
  const get = (name: string) => values[name] ?? "";

  switch (api.id) {
    case "task-group":
      return compactObject({
        groupCode: get("groupCode"),
        strategy: get("strategy"),
        strategyValue: get("strategyValue"),
        groupSeq: numberOrUndefined(get("groupSeq")),
        targetRoute: compactObject({
          type: get("targetType"),
          code: get("targetCode"),
        }),
        data: [
          compactObject({
            robotTaskCode: get("robotTaskCode"),
            sequence: numberOrUndefined(get("sequence")),
          }),
        ],
      });
    case "task-submit": {
      const carrierType = optionalString(get("carrierType"));
      return compactObject({
        taskType: get("taskType"),
        targetRoute: [
          compactObject({
            seq: 0,
            type: get("startType"),
            code: get("startCode"),
            operation: get("startType") === "SITE" ? "COLLECT" : undefined,
          }),
          compactObject({
            seq: 1,
            type: get("destType"),
            code: get("destCode"),
            operation: optionalString(get("destOperation")),
          }),
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
            ? [
                compactObject({
                  carrierType: get("carrierType"),
                  carrierCode,
                  layer: get("layer"),
                }),
              ]
            : undefined,
        }),
      });
    }
    case "carrier-bind":
      return compactObject({
        carrierCode: get("carrierCode"),
        siteCode: get("siteCode"),
        carrierDir: numberOrUndefined(get("carrierDir")),
        extra: null,
      });
    case "carrier-unbind":
      return compactObject({
        carrierCode: get("carrierCode"),
        siteCode: get("siteCode"),
        extra: null,
      });
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
      return compactObject({
        carrierCode: get("carrierCode"),
        invoke: get("invoke"),
        extra: null,
      });
    case "site-lock":
      return compactObject({
        siteCode: get("siteCode"),
        invoke: get("invoke"),
        extra: null,
      });
    case "zone-pause":
      return compactObject({
        zoneCode: get("zoneCode"),
        mapCode: optionalString(get("mapCode")),
        invoke: get("invoke"),
        extra: null,
      });
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
      return compactObject({
        zoneCode: get("zoneCode"),
        mapCode: optionalString(get("mapCode")),
        invoke: get("invoke"),
        extra: null,
      });
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

export default function Home() {
  const [activeTab, setActiveTab] = useState<MainTab>("quick");
  const [selectedByGroup, setSelectedByGroup] = useState<Partial<Record<RcsApiGroup, string>>>({});
  const [payloadTexts, setPayloadTexts] = useState<Record<string, string>>({});
  const [apiFormValues, setApiFormValues] = useState<Record<string, Record<string, string>>>({});
  const [moveMode, setMoveMode] = useState<MoveMode>("carrier-to-site");
  const [carrierCode, setCarrierCode] = useState("");
  const [sourceCode, setSourceCode] = useState("");
  const [destinationCode, setDestinationCode] = useState("");
  const [taskType, setTaskType] = useState("PF-LMR-COMMON");
  const [priority, setPriority] = useState("10");
  const [carrierType, setCarrierType] = useState("66");
  const [bindCarrierCode, setBindCarrierCode] = useState("");
  const [bindSiteCode, setBindSiteCode] = useState("");
  const [bindDirection, setBindDirection] = useState("0");
  const [statusTaskCode, setStatusTaskCode] = useState("");
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [scanTarget, setScanTarget] = useState<ScanTarget | null>(null);
  const [scannerError, setScannerError] = useState("");
  const [lastResult, setLastResult] = useState<RcsEnvelope | null>(null);
  const [recentActions, setRecentActions] = useState<RecentAction[]>(() => {
    if (typeof window === "undefined") return [];

    const saved = window.localStorage.getItem("rcs_recent_actions");
    if (!saved) return [];

    try {
      return JSON.parse(saved) as RecentAction[];
    } catch {
      window.localStorage.removeItem("rcs_recent_actions");
      return [];
    }
  });

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scannerControlsRef = useRef<ScannerControls | null>(null);

  const moveReady = useMemo(() => {
    if (moveMode === "carrier-to-site") return carrierCode.trim() && destinationCode.trim();
    return sourceCode.trim() && destinationCode.trim();
  }, [carrierCode, destinationCode, moveMode, sourceCode]);

  const stopScanner = useCallback(() => {
    scannerControlsRef.current?.stop();
    scannerControlsRef.current = null;
    setScanTarget(null);
  }, []);

  const applyScanValue = useCallback((target: ScanTarget, value: string) => {
    if (typeof target !== "string") {
      setApiFormValues((current) => ({
        ...current,
        [target.apiId]: {
          ...(current[target.apiId] ?? {}),
          [target.fieldName]: value,
        },
      }));
      return;
    }

    if (target === "carrier") setCarrierCode(value);
    if (target === "source") setSourceCode(value);
    if (target === "destination") setDestinationCode(value);
    if (target === "bindCarrier") setBindCarrierCode(value);
    if (target === "bindSite") setBindSiteCode(value);
    if (target === "statusTask") setStatusTaskCode(value);
  }, []);

  useEffect(() => {
    return stopScanner;
  }, [stopScanner]);

  useEffect(() => {
    if (!scanTarget || !videoRef.current) return;

    let mounted = true;
    setScannerError("");
    const reader = new BrowserMultiFormatReader();

    reader
      .decodeFromVideoDevice(undefined, videoRef.current, (result, error, controls) => {
        if (!mounted) return;
        scannerControlsRef.current = controls;

        if (result) {
          const value = normalizeQrValue(result.getText());
          applyScanValue(scanTarget, value);
          toast.success(`Đã quét: ${value}`);
          stopScanner();
        }

        if (error && error.name !== "NotFoundException") {
          setScannerError(error.message);
        }
      })
      .then((controls) => {
        scannerControlsRef.current = controls;
      })
      .catch((error: unknown) => {
        setScannerError(getErrorMessage(error));
      });

    return () => {
      mounted = false;
      stopScanner();
    };
  }, [applyScanValue, scanTarget, stopScanner]);

  const saveRecentAction = (action: Omit<RecentAction, "id" | "createdAt">) => {
    const next = [
      {
        ...action,
        id: crypto.randomUUID(),
        createdAt: new Date().toLocaleString("vi-VN"),
      },
      ...recentActions,
    ].slice(0, 10);

    setRecentActions(next);
    window.localStorage.setItem("rcs_recent_actions", JSON.stringify(next));
  };

  const callRcsAction = async (apiId: string, payload: JsonObject) => {
    const response = await fetch(`/api/rcs/actions/${apiId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payload }),
    });
    const data = (await response.json()) as RcsEnvelope;
    setLastResult(data);

    if (!response.ok || !data.success) {
      throw new Error(data.error || getRcsMessage(data) || "RCS request failed");
    }

    return data;
  };

  const executeMoveTask = async () => {
    if (!moveReady) {
      toast.error("Vui lòng quét hoặc nhập đủ mã trước khi gửi lệnh.");
      return;
    }

    const fromText = moveMode === "carrier-to-site" ? carrierCode.trim() : sourceCode.trim();
    const toText = destinationCode.trim();
    const confirmed = window.confirm(`Gửi robot thực hiện lệnh?\n\nTừ: ${fromText}\nĐến: ${toText}`);
    if (!confirmed) return;

    const targetRoute =
      moveMode === "carrier-to-site"
        ? [
            { seq: 0, type: "CARRIER", code: carrierCode.trim() },
            { seq: 1, type: "SITE", code: destinationCode.trim(), operation: "DELIVERY" },
          ]
        : [
            { seq: 0, type: "SITE", code: sourceCode.trim(), operation: "COLLECT" },
            { seq: 1, type: "SITE", code: destinationCode.trim(), operation: "DELIVERY" },
          ];

    const payload: JsonObject = {
      taskType: taskType.trim(),
      targetRoute,
      initPriority: Number(priority) || 10,
      interrupt: 0,
      extra: moveMode === "site-to-site" ? { carrierInfo: [{ carrierType }] } : null,
    };

    setLoadingAction("move");
    try {
      const result = await callRcsAction("task-submit", payload);
      const taskCode = getTaskCode(result);

      if (isRcsSuccess(result)) {
        toast.success("Đã gửi lệnh robot thành công.");
        saveRecentAction({
          title: "Chuyển kệ",
          detail: `${fromText} -> ${toText}`,
          code: getRcsCode(result),
          taskCode,
        });
      } else {
        toast.error(getRcsMessage(result) || "RCS trả về lỗi nghiệp vụ.");
      }
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoadingAction(null);
    }
  };

  const executeBind = async () => {
    if (!bindCarrierCode.trim() || !bindSiteCode.trim()) {
      toast.error("Vui lòng quét hoặc nhập đủ mã kệ và vị trí hiện tại.");
      return;
    }

    const confirmed = window.confirm(
      `Gắn kệ vào vị trí này trên RCS?\n\nKệ: ${bindCarrierCode.trim()}\nVị trí: ${bindSiteCode.trim()}\nGóc: ${bindDirection} độ`
    );
    if (!confirmed) return;

    setLoadingAction("bind");
    try {
      const result = await callRcsAction("site-bind", {
        slotCategory: "SITE",
        slotCode: bindSiteCode.trim(),
        carrierCategory: "POD",
        carrierType: carrierType.trim() || undefined,
        carrierCode: bindCarrierCode.trim(),
        carrierDir: Number(bindDirection),
        invoke: "BIND",
        extra: null,
      });

      if (isRcsSuccess(result)) {
        toast.success("Đã gắn kệ vào vị trí trên RCS.");
        saveRecentAction({
          title: "Gắn kệ",
          detail: `${bindCarrierCode.trim()} tại ${bindSiteCode.trim()}`,
          code: getRcsCode(result),
        });
      } else {
        toast.error(getRcsMessage(result) || "RCS trả về lỗi nghiệp vụ.");
      }
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoadingAction(null);
    }
  };

  const queryTaskStatus = async () => {
    if (!statusTaskCode.trim()) {
      toast.error("Vui lòng nhập hoặc quét mã task.");
      return;
    }

    setLoadingAction("status");
    try {
      const result = await callRcsAction("task-query", {
        robotTaskCode: statusTaskCode.trim(),
      });

      if (isRcsSuccess(result)) {
        toast.success("Đã lấy trạng thái task.");
      } else {
        toast.error(getRcsMessage(result) || "Không lấy được trạng thái.");
      }
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoadingAction(null);
    }
  };

  const executeCatalogApi = async (api: RcsApiDefinition, payload: JsonObject) => {
    if (api.direction === "callback") {
      toast("Đây là callback để RCS gọi vào web, không phải API gọi sang RCS.", { icon: "i" });
      return;
    }

    if (api.risk === "danger") {
      const confirmed = window.confirm(`API này có thể ảnh hưởng vận hành robot/khu vực.\n\nTiếp tục gọi ${api.title}?`);
      if (!confirmed) return;
    }

    setLoadingAction(api.id);
    try {
      const result = await callRcsAction(api.id, payload);

      if (isRcsSuccess(result)) {
        toast.success(`Đã gọi ${api.title}.`);
        saveRecentAction({
          title: api.title,
          detail: api.endpoint,
          code: getRcsCode(result),
          taskCode: getTaskCode(result),
        });
      } else {
        toast.error(getRcsMessage(result) || "RCS trả về lỗi nghiệp vụ.");
      }
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <main className="min-h-screen bg-[#f4f6f8] text-slate-950">
      <Toaster position="top-center" toastOptions={{ duration: 2800 }} />

      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur md:px-8">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-950 text-white">
                <Bot className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-lg font-semibold leading-tight md:text-2xl">RCS Worker Panel</h1>
                <p className="text-xs text-slate-500 md:text-sm">Vận hành nhanh và console API RCS-2000</p>
              </div>
            </div>
            <div className="hidden rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700 md:block">
              Branch dev
            </div>
          </div>

          <nav className="mt-3 flex gap-2 overflow-x-auto pb-1">
            <TopTab active={activeTab === "quick"} icon={groupIcons.quick} label="Nhanh" onClick={() => setActiveTab("quick")} />
            {RCS_API_GROUPS.map((group) => (
              <TopTab
                key={group.id}
                active={activeTab === group.id}
                icon={groupIcons[group.id]}
                label={group.title}
                onClick={() => setActiveTab(group.id)}
              />
            ))}
          </nav>
        </header>

        <div className="flex-1 px-4 py-5 md:px-8 md:py-8">
          {activeTab === "quick" ? (
            <section className="grid gap-5 lg:grid-cols-[1fr_360px]">
              <div className="space-y-5">
                <QuickMovePanel
                  moveMode={moveMode}
                  setMoveMode={(mode) => {
                    setMoveMode(mode);
                    setTaskType(mode === "carrier-to-site" ? "PF-LMR-COMMON" : "PF-DETECT-CARRIER");
                  }}
                  carrierCode={carrierCode}
                  setCarrierCode={setCarrierCode}
                  sourceCode={sourceCode}
                  setSourceCode={setSourceCode}
                  destinationCode={destinationCode}
                  setDestinationCode={setDestinationCode}
                  taskType={taskType}
                  setTaskType={setTaskType}
                  priority={priority}
                  setPriority={setPriority}
                  carrierType={carrierType}
                  setCarrierType={setCarrierType}
                  loading={loadingAction === "move"}
                  moveReady={Boolean(moveReady)}
                  startScan={setScanTarget}
                  executeMoveTask={executeMoveTask}
                />

                <QuickBindPanel
                  bindCarrierCode={bindCarrierCode}
                  setBindCarrierCode={setBindCarrierCode}
                  bindSiteCode={bindSiteCode}
                  setBindSiteCode={setBindSiteCode}
                  bindDirection={bindDirection}
                  setBindDirection={setBindDirection}
                  carrierType={carrierType}
                  setCarrierType={setCarrierType}
                  loading={loadingAction === "bind"}
                  startScan={setScanTarget}
                  executeBind={executeBind}
                />
              </div>

              <aside className="space-y-5">
                <QuickStatusPanel
                  statusTaskCode={statusTaskCode}
                  setStatusTaskCode={setStatusTaskCode}
                  loading={loadingAction === "status"}
                  startScan={setScanTarget}
                  queryTaskStatus={queryTaskStatus}
                />
                <ResultPanel result={lastResult} />
                <RecentList recentActions={recentActions} />
              </aside>
            </section>
          ) : (
            <ApiConsole
              group={activeTab}
              selectedByGroup={selectedByGroup}
              setSelectedByGroup={setSelectedByGroup}
              payloadTexts={payloadTexts}
              setPayloadTexts={setPayloadTexts}
              apiFormValues={apiFormValues}
              setApiFormValues={setApiFormValues}
              startScan={setScanTarget}
              loadingAction={loadingAction}
              executeCatalogApi={executeCatalogApi}
              lastResult={lastResult}
            />
          )}
        </div>
      </div>

      {scanTarget && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/70 p-0 md:items-center md:justify-center md:p-6">
          <div className="w-full rounded-t-2xl bg-white p-4 shadow-2xl md:max-w-lg md:rounded-2xl">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">{getScanLabel(scanTarget)}</h2>
                <p className="text-sm text-slate-500">Đưa QR vào giữa khung camera.</p>
              </div>
              <button onClick={stopScanner} className="icon-button" aria-label="Đóng quét QR">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-hidden rounded-xl bg-black">
              <video ref={videoRef} className="aspect-[3/4] w-full object-cover md:aspect-video" muted playsInline />
            </div>

            {scannerError && (
              <div className="mt-3 flex gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{scannerError}</span>
              </div>
            )}

            <button onClick={stopScanner} className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-3 font-semibold text-white">
              <Square className="h-4 w-4" />
              Dừng quét
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

function TopTab({ active, icon, label, onClick }: { active: boolean; icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition ${
        active ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function Panel({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-700">{icon}</div>
        <h2 className="text-base font-semibold md:text-lg">{title}</h2>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-slate-700">{label}</span>
      {children}
    </label>
  );
}

function CodeInput({
  label,
  value,
  onChange,
  scanTarget,
  startScan,
  placeholder,
  icon,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  scanTarget: ScanTarget;
  startScan: (target: ScanTarget) => void;
  placeholder: string;
  icon: React.ReactNode;
}) {
  return (
    <Field label={label}>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{icon}</div>
          <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="field-input pl-10 font-mono" />
        </div>
        <button onClick={() => startScan(scanTarget)} className="icon-button h-12 w-12 shrink-0 bg-slate-950 text-white hover:bg-slate-800" aria-label={`Quét ${label}`}>
          <QrCode className="h-5 w-5" />
        </button>
      </div>
    </Field>
  );
}

function QuickMovePanel(props: {
  moveMode: MoveMode;
  setMoveMode: (mode: MoveMode) => void;
  carrierCode: string;
  setCarrierCode: (value: string) => void;
  sourceCode: string;
  setSourceCode: (value: string) => void;
  destinationCode: string;
  setDestinationCode: (value: string) => void;
  taskType: string;
  setTaskType: (value: string) => void;
  priority: string;
  setPriority: (value: string) => void;
  carrierType: string;
  setCarrierType: (value: string) => void;
  loading: boolean;
  moveReady: boolean;
  startScan: (target: ScanTarget) => void;
  executeMoveTask: () => void;
}) {
  return (
    <Panel title="Chạy robot nhanh" icon={<Bot className="h-5 w-5" />}>
      <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-100 p-1">
        <button
          onClick={() => props.setMoveMode("carrier-to-site")}
          className={`rounded-md px-3 py-3 text-sm font-semibold ${props.moveMode === "carrier-to-site" ? "bg-white text-slate-950 shadow-sm" : "text-slate-600"}`}
        >
          Kệ {"->"} Trạm
        </button>
        <button
          onClick={() => props.setMoveMode("site-to-site")}
          className={`rounded-md px-3 py-3 text-sm font-semibold ${props.moveMode === "site-to-site" ? "bg-white text-slate-950 shadow-sm" : "text-slate-600"}`}
        >
          Vị trí {"->"} Vị trí
        </button>
      </div>

      {props.moveMode === "carrier-to-site" ? (
        <div className="grid gap-3 md:grid-cols-2">
          <CodeInput
            label="Mã kệ"
            value={props.carrierCode}
            onChange={props.setCarrierCode}
            scanTarget="carrier"
            startScan={props.startScan}
            placeholder="VD: RACK_01"
            icon={<Package className="h-5 w-5" />}
          />
          <CodeInput
            label="Vị trí đích"
            value={props.destinationCode}
            onChange={props.setDestinationCode}
            scanTarget="destination"
            startScan={props.startScan}
            placeholder="VD: STATION_A"
            icon={<MapPin className="h-5 w-5" />}
          />
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          <CodeInput
            label="Vị trí lấy"
            value={props.sourceCode}
            onChange={props.setSourceCode}
            scanTarget="source"
            startScan={props.startScan}
            placeholder="VD: SITE_A"
            icon={<MapPin className="h-5 w-5" />}
          />
          <CodeInput
            label="Vị trí đích"
            value={props.destinationCode}
            onChange={props.setDestinationCode}
            scanTarget="destination"
            startScan={props.startScan}
            placeholder="VD: SITE_B"
            icon={<MapPin className="h-5 w-5" />}
          />
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-3">
        <Field label="Task type">
          <input value={props.taskType} onChange={(event) => props.setTaskType(event.target.value)} className="field-input font-mono" />
        </Field>
        <Field label="Ưu tiên">
          <input value={props.priority} onChange={(event) => props.setPriority(event.target.value)} inputMode="numeric" className="field-input" />
        </Field>
        <Field label="Loại kệ">
          <input value={props.carrierType} onChange={(event) => props.setCarrierType(event.target.value)} className="field-input" />
        </Field>
      </div>

      <button onClick={props.executeMoveTask} disabled={!props.moveReady || props.loading} className="primary-button">
        {props.loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Play className="h-5 w-5" />}
        Gửi lệnh robot
      </button>
    </Panel>
  );
}

function QuickBindPanel(props: {
  bindCarrierCode: string;
  setBindCarrierCode: (value: string) => void;
  bindSiteCode: string;
  setBindSiteCode: (value: string) => void;
  bindDirection: string;
  setBindDirection: (value: string) => void;
  carrierType: string;
  setCarrierType: (value: string) => void;
  loading: boolean;
  startScan: (target: ScanTarget) => void;
  executeBind: () => void;
}) {
  return (
    <Panel title="Gắn kệ vào vị trí" icon={<Package className="h-5 w-5" />}>
      <div className="grid gap-3 md:grid-cols-2">
        <CodeInput
          label="Mã kệ"
          value={props.bindCarrierCode}
          onChange={props.setBindCarrierCode}
          scanTarget="bindCarrier"
          startScan={props.startScan}
          placeholder="Quét QR trên kệ"
          icon={<Package className="h-5 w-5" />}
        />
        <CodeInput
          label="Vị trí hiện tại"
          value={props.bindSiteCode}
          onChange={props.setBindSiteCode}
          scanTarget="bindSite"
          startScan={props.startScan}
          placeholder="Quét QR tại vị trí"
          icon={<MapPin className="h-5 w-5" />}
        />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Góc kệ">
          <select value={props.bindDirection} onChange={(event) => props.setBindDirection(event.target.value)} className="field-input">
            <option value="0">0 độ</option>
            <option value="90">90 độ</option>
            <option value="180">180 độ</option>
            <option value="-90">-90 độ</option>
            <option value="360">360 độ</option>
          </select>
        </Field>
        <Field label="Loại kệ">
          <input value={props.carrierType} onChange={(event) => props.setCarrierType(event.target.value)} className="field-input" />
        </Field>
      </div>

      <button
        onClick={props.executeBind}
        disabled={!props.bindCarrierCode.trim() || !props.bindSiteCode.trim() || props.loading}
        className="primary-button bg-amber-600 hover:bg-amber-500 disabled:bg-amber-300"
      >
        {props.loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
        Xác nhận gắn kệ
      </button>
    </Panel>
  );
}

function QuickStatusPanel(props: {
  statusTaskCode: string;
  setStatusTaskCode: (value: string) => void;
  loading: boolean;
  startScan: (target: ScanTarget) => void;
  queryTaskStatus: () => void;
}) {
  return (
    <Panel title="Tra cứu nhanh" icon={<ClipboardList className="h-5 w-5" />}>
      <CodeInput
        label="Mã task"
        value={props.statusTaskCode}
        onChange={props.setStatusTaskCode}
        scanTarget="statusTask"
        startScan={props.startScan}
        placeholder="robotTaskCode"
        icon={<ClipboardList className="h-5 w-5" />}
      />
      <button onClick={props.queryTaskStatus} disabled={props.loading} className="secondary-button">
        {props.loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <RotateCw className="h-5 w-5" />}
        Kiểm tra task
      </button>
    </Panel>
  );
}

function ApiConsole({
  group,
  selectedByGroup,
  setSelectedByGroup,
  payloadTexts,
  setPayloadTexts,
  apiFormValues,
  setApiFormValues,
  startScan,
  loadingAction,
  executeCatalogApi,
  lastResult,
}: {
  group: RcsApiGroup;
  selectedByGroup: Partial<Record<RcsApiGroup, string>>;
  setSelectedByGroup: React.Dispatch<React.SetStateAction<Partial<Record<RcsApiGroup, string>>>>;
  payloadTexts: Record<string, string>;
  setPayloadTexts: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  apiFormValues: Record<string, Record<string, string>>;
  setApiFormValues: React.Dispatch<React.SetStateAction<Record<string, Record<string, string>>>>;
  startScan: (target: ScanTarget) => void;
  loadingAction: string | null;
  executeCatalogApi: (api: RcsApiDefinition, payload: JsonObject) => void;
  lastResult: RcsEnvelope | null;
}) {
  const apis = getRcsApisByGroup(group);
  const selectedApi = apis.find((api) => api.id === selectedByGroup[group]) ?? apis[0];
  const groupInfo = RCS_API_GROUPS.find((item) => item.id === group);

  if (!selectedApi) return null;

  const payloadText = payloadTexts[selectedApi.id] ?? formatJson(selectedApi.defaultPayload);
  const schema = API_FORM_SCHEMAS[selectedApi.id];
  const formValues = apiFormValues[selectedApi.id] ?? {};
  const formPayload = schema ? buildPayloadFromForm(selectedApi, Object.fromEntries(schema.fields.map((field) => [field.name, getFieldValue(selectedApi, formValues, field)]))) : selectedApi.defaultPayload;

  const updateFormValue = (fieldName: string, value: string) => {
    setApiFormValues((current) => ({
      ...current,
      [selectedApi.id]: {
        ...(current[selectedApi.id] ?? {}),
        [fieldName]: value,
      },
    }));
  };

  const callUsingJson = () => {
    try {
      executeCatalogApi(selectedApi, parseJsonObject(payloadText));
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <section className="grid gap-5 lg:grid-cols-[360px_1fr]">
      <aside className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold">{groupInfo?.title}</h2>
          <p className="text-sm text-slate-500">{groupInfo?.description}</p>
        </div>

        <div className="space-y-2">
          {apis.map((api) => (
            <button
              key={api.id}
              onClick={() => setSelectedByGroup((current) => ({ ...current, [group]: api.id }))}
              className={`w-full rounded-xl border p-3 text-left transition ${
                selectedApi.id === api.id ? "border-slate-950 bg-white shadow-sm" : "border-slate-200 bg-white hover:border-slate-400"
              }`}
            >
              <div className="mb-1 flex items-start justify-between gap-2">
                <p className="font-semibold">{api.title}</p>
                <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${riskStyles(api.risk)}`}>{riskLabel(api.risk)}</span>
              </div>
              <p className="text-xs font-medium text-slate-500">{api.workflow}</p>
              <p className="mt-1 line-clamp-2 text-sm text-slate-600">{api.description}</p>
            </button>
          ))}
        </div>
      </aside>

      <div className="space-y-5">
        <Panel title={selectedApi.title} icon={selectedApi.direction === "callback" ? <Cpu className="h-5 w-5" /> : <Settings2 className="h-5 w-5" />}>
          <div className="grid gap-3 md:grid-cols-[1fr_auto]">
            <div>
              <p className="text-sm text-slate-600">{selectedApi.description}</p>
              <p className="mt-2 break-all rounded-lg bg-slate-100 px-3 py-2 font-mono text-xs text-slate-700">{selectedApi.endpoint}</p>
            </div>
            <div className="flex flex-wrap items-start gap-2 md:justify-end">
              <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${riskStyles(selectedApi.risk)}`}>{riskLabel(selectedApi.risk)}</span>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                {selectedApi.direction === "callback" ? "RCS gọi vào web" : "Web gọi sang RCS"}
              </span>
            </div>
          </div>

          {selectedApi.notes?.map((note) => (
            <div key={note} className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{note}</span>
            </div>
          ))}

          {selectedApi.direction === "callback" ? (
            <div className="space-y-3">
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
                Cấu hình RCS gọi về endpoint local này trên máy chạy web:
                <pre className="mt-2 overflow-auto rounded bg-white p-2 font-mono text-xs text-blue-900">{selectedApi.localCallbackPath}</pre>
              </div>
              <Field label="Payload mẫu RCS sẽ gửi">
                <textarea value={payloadText} readOnly rows={12} className="field-input min-h-72 resize-y font-mono text-sm" />
              </Field>
            </div>
          ) : (
            <div className="space-y-4">
              {schema ? (
                <>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                    {schema.summary}
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    {schema.fields.map((field) => (
                      <ApiFieldInput
                        key={field.name}
                        apiId={selectedApi.id}
                        field={field}
                        value={getFieldValue(selectedApi, formValues, field)}
                        onChange={(value) => updateFormValue(field.name, value)}
                        startScan={startScan}
                      />
                    ))}
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-white p-3">
                    <p className="mb-2 text-sm font-semibold text-slate-700">Dữ liệu sẽ gửi sang RCS</p>
                    <pre className="max-h-72 overflow-auto rounded-lg bg-slate-950 p-3 text-xs text-slate-100">{formatJson(formPayload)}</pre>
                  </div>
                  <button onClick={() => executeCatalogApi(selectedApi, formPayload)} disabled={loadingAction === selectedApi.id} className="primary-button">
                    {loadingAction === selectedApi.id ? <Loader2 className="h-5 w-5 animate-spin" /> : <Play className="h-5 w-5" />}
                    Gửi lệnh bằng form
                  </button>
                </>
              ) : (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  API này chưa có form riêng, kỹ thuật có thể dùng JSON nâng cao bên dưới.
                </div>
              )}

              <details className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <summary className="cursor-pointer text-sm font-semibold text-slate-700">JSON nâng cao cho kỹ thuật</summary>
                <div className="mt-3 space-y-3">
                  <Field label="Payload JSON">
                    <textarea
                      value={payloadText}
                      onChange={(event) => setPayloadTexts((current) => ({ ...current, [selectedApi.id]: event.target.value }))}
                      rows={12}
                      spellCheck={false}
                      className="field-input min-h-72 resize-y font-mono text-sm"
                    />
                  </Field>
                  <div className="grid gap-2 md:grid-cols-[1fr_auto]">
                    <button onClick={callUsingJson} disabled={loadingAction === selectedApi.id} className="secondary-button">
                      {loadingAction === selectedApi.id ? <Loader2 className="h-5 w-5 animate-spin" /> : <Settings2 className="h-5 w-5" />}
                      Gửi bằng JSON nâng cao
                    </button>
                    <button
                      onClick={() => setPayloadTexts((current) => ({ ...current, [selectedApi.id]: formatJson(selectedApi.defaultPayload) }))}
                      className="secondary-button md:w-auto"
                    >
                      Reset JSON mẫu
                    </button>
                  </div>
                </div>
              </details>
            </div>
          )}
        </Panel>

        <ResultPanel result={lastResult} />
      </div>
    </section>
  );
}

function ApiFieldInput({
  apiId,
  field,
  value,
  onChange,
  startScan,
}: {
  apiId: string;
  field: ApiFormField;
  value: string;
  onChange: (value: string) => void;
  startScan: (target: ScanTarget) => void;
}) {
  const input =
    field.type === "select" ? (
      <select value={value} onChange={(event) => onChange(event.target.value)} className="field-input">
        {(field.options ?? []).map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    ) : field.type === "textarea" ? (
      <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={4} className="field-input resize-y" placeholder={field.placeholder} />
    ) : (
      <input value={value} onChange={(event) => onChange(event.target.value)} type={field.type === "number" ? "number" : "text"} className="field-input" placeholder={field.placeholder} />
    );

  return (
    <div className={field.wide ? "md:col-span-2" : ""}>
      <Field label={field.label}>
        <div className="flex gap-2">
          <div className="flex-1">{input}</div>
          {field.qr && (
            <button
              onClick={() => startScan({ kind: "apiField", apiId, fieldName: field.name, label: field.label })}
              className="icon-button h-12 w-12 shrink-0 bg-slate-950 text-white hover:bg-slate-800"
              aria-label={`Quét ${field.label}`}
            >
              <QrCode className="h-5 w-5" />
            </button>
          )}
        </div>
        {field.helper && <span className="mt-1 block text-xs text-slate-500">{field.helper}</span>}
      </Field>
    </div>
  );
}

function RecentList({ recentActions }: { recentActions: RecentAction[] }) {
  if (recentActions.length === 0) return null;

  return (
    <Panel title="Lệnh gần đây" icon={<ClipboardList className="h-5 w-5" />}>
      <div className="divide-y divide-slate-100">
        {recentActions.map((action) => (
          <div key={action.id} className="py-3 first:pt-0 last:pb-0">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{action.title}</p>
                <p className="text-sm text-slate-600">{action.detail}</p>
                {action.taskCode && <p className="mt-1 font-mono text-xs text-slate-500">Task: {action.taskCode}</p>}
              </div>
              <span className="shrink-0 text-xs text-slate-400">{action.createdAt}</span>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function ResultPanel({ result }: { result: RcsEnvelope | null }) {
  if (!result) {
    return (
      <Panel title="Phản hồi RCS" icon={<Camera className="h-5 w-5" />}>
        <p className="text-sm text-slate-500">Chưa có phản hồi. Gửi lệnh hoặc kiểm tra task để xem kết quả tại đây.</p>
      </Panel>
    );
  }

  const ok = isRcsSuccess(result);
  return (
    <Panel title="Phản hồi RCS" icon={ok ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}>
      <div className={`rounded-lg border p-3 text-sm ${ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800"}`}>
        <p className="font-semibold">{getRcsCode(result) || (result.success ? "HTTP OK" : "ERROR")}</p>
        <p>{getRcsMessage(result) || `HTTP status: ${result.httpStatus ?? "unknown"}`}</p>
        {result.request?.path && <p className="mt-1 break-all font-mono text-xs">Path: {result.request.path}</p>}
      </div>
      <pre className="max-h-96 overflow-auto rounded-lg bg-slate-950 p-3 text-xs text-slate-100">{formatJson(result)}</pre>
    </Panel>
  );
}
