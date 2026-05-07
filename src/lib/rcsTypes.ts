import type { RcsApiGroup } from "@/lib/rcsApiCatalog";

// ─── Tab / Mode ───────────────────────────────────────────────────────────────

export type MainTab = "quick" | "taskGenerate" | RcsApiGroup;
export type MoveMode = "carrier-to-site" | "site-to-site";
export type TaskGenerateRouteType = "SITE" | "CARRIER";

// ─── QR Scan targets ──────────────────────────────────────────────────────────

export type QuickScanTarget =
  | "carrier"
  | "source"
  | "destination"
  | "bindCarrier"
  | "bindSite"
  | "statusTask";

export type ApiFieldScanTarget = {
  kind: "apiField";
  apiId: string;
  fieldName: string;
  label: string;
};

export type TaskGenerateRouteScanTarget = {
  kind: "taskGenerateRoute";
  rowId: string;
  label: string;
};

export type TaskGenerateRobotScanTarget = {
  kind: "taskGenerateRobot";
  label: string;
};

export type ScanTarget = QuickScanTarget | ApiFieldScanTarget | TaskGenerateRouteScanTarget | TaskGenerateRobotScanTarget;

// ─── Scanner controls ─────────────────────────────────────────────────────────

export type ScannerControls = { stop: () => void };

// ─── API Form ─────────────────────────────────────────────────────────────────

export type ApiFormField = {
  name: string;
  label: string;
  type?: "text" | "number" | "select" | "textarea";
  placeholder?: string;
  helper?: string;
  options?: ReadonlyArray<{ label: string; value: string }>;
  qr?: boolean;
  wide?: boolean;
};

export type ApiFormSchema = {
  summary: string;
  fields: ApiFormField[];
};

// ─── Generic ──────────────────────────────────────────────────────────────────

export type JsonObject = Record<string, unknown>;

// ─── Task Generate ───────────────────────────────────────────────────────────

export type TaskGenerateRouteRow = {
  id: string;
  type: TaskGenerateRouteType;
  code: string;
};

export type TaskGenerateFormState = {
  taskType: string;
  robotNo: string;
  routes: TaskGenerateRouteRow[];
};

// ─── RCS API Response envelope ────────────────────────────────────────────────

export type RcsEnvelope = {
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

// ─── Recent action log ────────────────────────────────────────────────────────

export type RecentAction = {
  id: string;
  title: string;
  detail: string;
  code?: string;
  taskCode?: string;
  createdAt: string;
};
