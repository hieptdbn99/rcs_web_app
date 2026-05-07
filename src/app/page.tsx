"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { RCS_API_GROUPS, type RcsApiDefinition, type RcsApiGroup } from "@/lib/rcsApiCatalog";
import { groupMarks } from "@/lib/rcsFormSchemas";
import {
  getErrorMessage,
  getRcsCode,
  getRcsMessage,
  getTaskCode,
  isRcsSuccess,
  normalizeQrValue,
} from "@/lib/rcsPayloadBuilder";
import toast from "react-hot-toast";
import type {
  JsonObject,
  MainTab,
  MoveMode,
  RecentAction,
  RcsEnvelope,
  ScanTarget,
  ScannerControls,
  TaskGenerateFormState,
  TaskGenerateOption,
  TaskGenerateOptions,
  TaskGenerateRouteRow,
  TaskGenerateRouteType,
} from "@/lib/rcsTypes";
import { TopTab } from "@/app/components/ui/Panel";
import { QuickMovePanel } from "@/app/components/QuickMovePanel";
import { QuickBindPanel } from "@/app/components/QuickBindPanel";
import { QuickStatusPanel } from "@/app/components/QuickStatusPanel";
import { ResultPanel } from "@/app/components/ResultPanel";
import { RecentList } from "@/app/components/RecentList";
import { QrScannerModal } from "@/app/components/QrScannerModal";
import { ApiConsole } from "@/app/components/ApiConsole";
import { TaskGeneratePanel } from "@/app/components/TaskGeneratePanel";

// ─── Constants ────────────────────────────────────────────────────────────────

const RECENT_ACTIONS_KEY = "rcs_recent_actions";
const OPERATOR_TOKEN_KEY = "rcs_operator_token";
const TASK_GENERATE_KEY = "rcs_task_generate_form_v2";
const MAX_RECENT_ACTIONS = 10;
const DEFAULT_TASK_TYPE_CARRIER = "PF-LMR-COMMON";
const DEFAULT_TASK_TYPE_SITE = "PF-DETECT-CARRIER";

function createBrowserId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createTaskGenerateRoute(type: TaskGenerateRouteType = "SITE", code = ""): TaskGenerateRouteRow {
  return { id: createBrowserId(), type, code };
}

function createDefaultTaskGenerateForm(): TaskGenerateFormState {
  return {
    taskType: "RunTest",
    robotNo: "",
    routes: [createTaskGenerateRoute("SITE")],
  };
}

function createDefaultTaskGenerateOptions(): TaskGenerateOptions {
  return { SITE: [], CARRIER: [] };
}

function isTaskGenerateRouteType(value: unknown): value is TaskGenerateRouteType {
  return value === "SITE" || value === "CARRIER";
}

function normalizeTaskGenerateForm(value: unknown): TaskGenerateFormState {
  if (!value || typeof value !== "object" || Array.isArray(value)) return createDefaultTaskGenerateForm();
  const source = value as Partial<TaskGenerateFormState>;
  const routes = Array.isArray(source.routes)
    ? source.routes.map((route) => {
        const item = route as Partial<TaskGenerateRouteRow>;
        return createTaskGenerateRoute(isTaskGenerateRouteType(item.type) ? item.type : "SITE", typeof item.code === "string" ? item.code : "");
      })
    : [];
  return {
    taskType: typeof source.taskType === "string" ? source.taskType : "RunTest",
    robotNo: typeof source.robotNo === "string" ? source.robotNo : "",
    routes: routes.length ? routes : [createTaskGenerateRoute("SITE")],
  };
}

function normalizeTaskGenerateOption(value: unknown): TaskGenerateOption | null {
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

function normalizeTaskGenerateOptionList(value: unknown): TaskGenerateOption[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const options: TaskGenerateOption[] = [];
  for (const item of value) {
    const option = normalizeTaskGenerateOption(item);
    if (!option || seen.has(option.value)) continue;
    seen.add(option.value);
    options.push(option);
  }
  return options;
}

function normalizeTaskGenerateOptions(value: unknown): TaskGenerateOptions {
  if (!value || typeof value !== "object" || Array.isArray(value)) return createDefaultTaskGenerateOptions();
  const source = value as Record<string, unknown>;
  return {
    SITE: normalizeTaskGenerateOptionList(source.SITE),
    CARRIER: normalizeTaskGenerateOptionList(source.CARRIER),
  };
}

function getTaskGenerateRobotCodes(robotNo: string): string[] {
  return robotNo.split(",").map((item) => item.trim()).filter(Boolean);
}

function buildTaskGeneratePayload(form: TaskGenerateFormState): JsonObject {
  const payload: JsonObject = {
    targetRoute: form.routes.map((route) => ({
      type: route.type,
      code: route.code.trim(),
      extra: {},
    })),
    taskType: form.taskType.trim(),
    deadline: "",
    extra: {},
    interrupt: "",
    liftCode: "",
    groupCode: "",
    robotTaskCode: "",
  };

  const robotCodes = getTaskGenerateRobotCodes(form.robotNo);
  if (robotCodes.length > 0) {
    payload.robotType = "ROBOTS";
    payload.robotCode = robotCodes;
  }

  return payload;
}

async function loadTaskGenerateFormFromFile(): Promise<{ form: TaskGenerateFormState | null; options: TaskGenerateOptions }> {
  const response = await fetch("/api/task-generate/form", { cache: "no-store" });
  const data = (await response.json().catch(() => null)) as { success?: boolean; form?: unknown; options?: unknown; error?: string } | null;
  if (!response.ok || !data?.success) {
    throw new Error(data?.error ?? "Không đọc được file Task generate.");
  }
  return {
    form: data.form ? normalizeTaskGenerateForm(data.form) : null,
    options: normalizeTaskGenerateOptions(data.options),
  };
}

async function saveTaskGenerateFormToFile(
  form: TaskGenerateFormState,
  rememberOptions = false,
): Promise<{ form: TaskGenerateFormState; options: TaskGenerateOptions }> {
  const response = await fetch("/api/task-generate/form", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ form, rememberOptions }),
  });
  const data = (await response.json().catch(() => null)) as { success?: boolean; form?: unknown; options?: unknown; error?: string } | null;
  if (!response.ok || !data?.success) {
    throw new Error(data?.error ?? "Không lưu được file Task generate.");
  }
  return {
    form: normalizeTaskGenerateForm(data.form),
    options: normalizeTaskGenerateOptions(data.options),
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Home() {
  // ── Tab ──────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<MainTab>("quick");

  // ── API Console state ─────────────────────────────────────────────────────
  const [selectedByGroup, setSelectedByGroup] = useState<Partial<Record<RcsApiGroup, string>>>({});
  const [payloadTexts, setPayloadTexts] = useState<Record<string, string>>({});
  const [apiFormValues, setApiFormValues] = useState<Record<string, Record<string, string>>>({});

  // ── Quick Move state ──────────────────────────────────────────────────────
  const [moveMode, setMoveMode] = useState<MoveMode>("carrier-to-site");
  const [carrierCode, setCarrierCode] = useState("");
  const [sourceCode, setSourceCode] = useState("");
  const [destinationCode, setDestinationCode] = useState("");
  const [taskType, setTaskType] = useState(DEFAULT_TASK_TYPE_CARRIER);
  const [priority, setPriority] = useState("10");
  const [carrierType, setCarrierType] = useState("66");

  // ── Quick Bind state ──────────────────────────────────────────────────────
  const [bindCarrierCode, setBindCarrierCode] = useState("");
  const [bindSiteCode, setBindSiteCode] = useState("");
  const [bindDirection, setBindDirection] = useState("0");
  const [bindInvoke, setBindInvoke] = useState<"BIND" | "UNBIND">("BIND");

  // ── Quick Status state ────────────────────────────────────────────────────
  const [statusTaskCode, setStatusTaskCode] = useState("");

  // ── Task Generate state ──────────────────────────────────────────────────
  const [taskGenerateForm, setTaskGenerateForm] = useState<TaskGenerateFormState>(() => {
    if (typeof window === "undefined") return createDefaultTaskGenerateForm();
    const saved = window.localStorage.getItem(TASK_GENERATE_KEY);
    if (!saved) return createDefaultTaskGenerateForm();
    try {
      return normalizeTaskGenerateForm(JSON.parse(saved));
    } catch {
      window.localStorage.removeItem(TASK_GENERATE_KEY);
      return createDefaultTaskGenerateForm();
    }
  });
  const [taskGenerateOptions, setTaskGenerateOptions] = useState<TaskGenerateOptions>(createDefaultTaskGenerateOptions);

  // ── Shared ────────────────────────────────────────────────────────────────
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<RcsEnvelope | null>(null);
  const [operatorToken, setOperatorToken] = useState(() => {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem(OPERATOR_TOKEN_KEY) ?? "";
  });

  // ── Scanner ───────────────────────────────────────────────────────────────
  const [scanTarget, setScanTarget] = useState<ScanTarget | null>(null);
  const [scannerError, setScannerError] = useState("");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scannerControlsRef = useRef<ScannerControls | null>(null);

  // ── Recent actions (persisted) ────────────────────────────────────────────
  const [recentActions, setRecentActions] = useState<RecentAction[]>(() => {
    if (typeof window === "undefined") return [];
    const saved = window.localStorage.getItem(RECENT_ACTIONS_KEY);
    if (!saved) return [];
    try {
      return JSON.parse(saved) as RecentAction[];
    } catch {
      window.localStorage.removeItem(RECENT_ACTIONS_KEY);
      return [];
    }
  });

  // ─── Derived ────────────────────────────────────────────────────────────

  const moveReady = useMemo(() => {
    if (moveMode === "carrier-to-site") return carrierCode.trim() && destinationCode.trim();
    return sourceCode.trim() && destinationCode.trim();
  }, [carrierCode, destinationCode, moveMode, sourceCode]);

  const taskGeneratePayload = useMemo(() => buildTaskGeneratePayload(taskGenerateForm), [taskGenerateForm]);

  const showMessage = useCallback((message: string, type: "success" | "error" | "info" = "info") => {
    if (type === "success") {
      toast.success(message);
    } else if (type === "error") {
      toast.error(message);
    } else {
      toast(message);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(TASK_GENERATE_KEY, JSON.stringify(taskGenerateForm));
  }, [taskGenerateForm]);

  useEffect(() => {
    let mounted = true;
    loadTaskGenerateFormFromFile()
      .then((savedState) => {
        if (!mounted) return;
        if (savedState.form) setTaskGenerateForm(savedState.form);
        setTaskGenerateOptions(savedState.options);
      })
      .catch((error: unknown) => {
        if (mounted) showMessage(getErrorMessage(error), "error");
      });
    return () => {
      mounted = false;
    };
  }, [showMessage]);

  // ─── Scanner callbacks ───────────────────────────────────────────────────

  const stopScanner = useCallback(() => {
    scannerControlsRef.current?.stop();
    scannerControlsRef.current = null;
    setScanTarget(null);
  }, []);

  const applyScanValue = useCallback((target: ScanTarget, value: string) => {
    if (typeof target !== "string") {
      if (target.kind === "apiField") {
        setApiFormValues((current) => ({
          ...current,
          [target.apiId]: { ...(current[target.apiId] ?? {}), [target.fieldName]: value },
        }));
      }
      if (target.kind === "taskGenerateRoute") {
        setTaskGenerateForm((current) => ({
          ...current,
          routes: current.routes.map((route) => (route.id === target.rowId ? { ...route, code: value } : route)),
        }));
      }
      if (target.kind === "taskGenerateRobot") {
        setTaskGenerateForm((current) => ({ ...current, robotNo: value }));
      }
      return;
    }
    if (target === "carrier") setCarrierCode(value);
    if (target === "source") setSourceCode(value);
    if (target === "destination") setDestinationCode(value);
    if (target === "bindCarrier") setBindCarrierCode(value);
    if (target === "bindSite") setBindSiteCode(value);
    if (target === "statusTask") setStatusTaskCode(value);
  }, []);

  // Cleanup scanner on unmount
  useEffect(() => stopScanner, [stopScanner]);

  // Start scanner when a target is selected
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
          showMessage(`Đã quét: ${value}`, "success");
          stopScanner();
        }
        if (error && error.name !== "NotFoundException") setScannerError(error.message);
      })
      .then((controls) => { scannerControlsRef.current = controls; })
      .catch((error: unknown) => { setScannerError(getErrorMessage(error)); });

    return () => {
      mounted = false;
      stopScanner();
    };
  }, [applyScanValue, scanTarget, showMessage, stopScanner]);

  // ─── Helpers ─────────────────────────────────────────────────────────────

  const saveRecentAction = (action: Omit<RecentAction, "id" | "createdAt">) => {
    const next = [
      { ...action, id: createBrowserId(), createdAt: new Date().toLocaleString("vi-VN") },
      ...recentActions,
    ].slice(0, MAX_RECENT_ACTIONS);
    setRecentActions(next);
    window.localStorage.setItem(RECENT_ACTIONS_KEY, JSON.stringify(next));
  };

  const updateOperatorToken = () => {
    const value = window.prompt("Nhập token API vận hành RCS. Để trống rồi OK để xóa token đã lưu.", operatorToken);
    if (value === null) return;

    const trimmed = value.trim();
    setOperatorToken(trimmed);
    if (trimmed) {
      window.localStorage.setItem(OPERATOR_TOKEN_KEY, trimmed);
      showMessage("Đã lưu token API trên thiết bị này.", "success");
    } else {
      window.localStorage.removeItem(OPERATOR_TOKEN_KEY);
      showMessage("Đã xóa token API trên thiết bị này.", "info");
    }
  };

  const setTaskGenerateTaskType = (value: string) => {
    setTaskGenerateForm((current) => ({ ...current, taskType: value }));
  };

  const setTaskGenerateRobotNo = (value: string) => {
    setTaskGenerateForm((current) => ({ ...current, robotNo: value }));
  };

  const updateTaskGenerateRoute = (rowId: string, patch: Partial<Pick<TaskGenerateRouteRow, "type" | "code">>) => {
    setTaskGenerateForm((current) => ({
      ...current,
      routes: current.routes.map((route) => (route.id === rowId ? { ...route, ...patch } : route)),
    }));
  };

  const addTaskGenerateRoute = () => {
    setTaskGenerateForm((current) => ({
      ...current,
      routes: [...current.routes, createTaskGenerateRoute("SITE")],
    }));
  };

  const removeTaskGenerateRoute = (rowId: string) => {
    setTaskGenerateForm((current) => {
      if (current.routes.length <= 1) return current;
      return { ...current, routes: current.routes.filter((route) => route.id !== rowId) };
    });
  };

  const resetTaskGenerateForm = () => {
    if (!window.confirm("Xóa form task generate đang lưu trên trình duyệt này?")) return;
    const nextForm = createDefaultTaskGenerateForm();
    setTaskGenerateForm(nextForm);
    window.localStorage.setItem(TASK_GENERATE_KEY, JSON.stringify(nextForm));
    saveTaskGenerateFormToFile(nextForm)
      .then((savedState) => {
        setTaskGenerateForm(savedState.form);
        setTaskGenerateOptions(savedState.options);
        showMessage("Đã reset và lưu file Task generate.", "info");
      })
      .catch((error: unknown) => showMessage(getErrorMessage(error), "error"));
  };

  const callRcsAction = async (apiId: string, payload: JsonObject): Promise<RcsEnvelope> => {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (operatorToken.trim()) {
      headers["X-RCS-Operator-Token"] = operatorToken.trim();
    }

    const response = await fetch(`/api/rcs/actions/${apiId}`, {
      method: "POST",
      headers,
      body: JSON.stringify({ payload }),
    });
    const data = (await response.json().catch(() => ({ error: "Response is not JSON" }))) as RcsEnvelope;
    setLastResult(data);
    if (!response.ok || !data.success) {
      const authMessage =
        response.status === 401
          ? "Token API không đúng hoặc chưa được nhập. Bấm nút Token API ở góc trên để nhập lại."
          : undefined;
      throw new Error(authMessage ?? data.error ?? getRcsMessage(data) ?? "RCS request failed");
    }
    return data;
  };

  // ─── Quick actions ───────────────────────────────────────────────────────

  const executeMoveTask = async () => {
    if (!moveReady) {
      showMessage("Vui lòng quét hoặc nhập đủ mã trước khi gửi lệnh.", "error");
      return;
    }
    const fromText = moveMode === "carrier-to-site" ? carrierCode.trim() : sourceCode.trim();
    const toText = destinationCode.trim();
    if (!window.confirm(`Gửi robot thực hiện lệnh?\n\nTừ: ${fromText}\nĐến: ${toText}`)) return;

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
        showMessage("Đã gửi lệnh robot thành công.", "success");
        saveRecentAction({ title: "Chuyển kệ", detail: `${fromText} -> ${toText}`, code: getRcsCode(result), taskCode });
      } else {
        showMessage(getRcsMessage(result) ?? "RCS trả về lỗi nghiệp vụ.", "error");
      }
    } catch (error: unknown) {
      showMessage(getErrorMessage(error), "error");
    } finally {
      setLoadingAction(null);
    }
  };

  const executeBind = async () => {
    if (!bindCarrierCode.trim() || !bindSiteCode.trim()) {
      showMessage("Vui lòng quét hoặc nhập đủ mã kệ và vị trí hiện tại.", "error");
      return;
    }
    const isBind = bindInvoke === "BIND";
    const confirmMsg = isBind
      ? `Gắn kệ vào vị trí này trên RCS?\n\nKệ: ${bindCarrierCode.trim()}\nVị trí: ${bindSiteCode.trim()}\nGóc: ${bindDirection} độ`
      : `Bỏ gắn kệ khỏi vị trí này trên RCS?\n\nKệ: ${bindCarrierCode.trim()}\nVị trí: ${bindSiteCode.trim()}`;
    if (!window.confirm(confirmMsg)) return;

    setLoadingAction("bind");
    try {
      const payload: Record<string, unknown> = {
        slotCategory: "SITE",
        slotCode: bindSiteCode.trim(),
        carrierCategory: "POD",
        carrierCode: bindCarrierCode.trim(),
        invoke: bindInvoke,
        extra: null,
      };
      if (isBind) {
        payload.carrierType = carrierType.trim() || undefined;
        payload.carrierDir = Number(bindDirection);
      }

      const result = await callRcsAction("site-bind", payload);
      if (isRcsSuccess(result)) {
        showMessage(isBind ? "Đã gắn kệ vào vị trí trên RCS." : "Đã bỏ gắn kệ khỏi vị trí trên RCS.", "success");
        saveRecentAction({
          title: isBind ? "Gắn kệ" : "Bỏ gắn kệ",
          detail: `${bindCarrierCode.trim()} tại ${bindSiteCode.trim()}`,
          code: getRcsCode(result),
        });
      } else {
        showMessage(getRcsMessage(result) ?? "RCS trả về lỗi nghiệp vụ.", "error");
      }
    } catch (error: unknown) {
      showMessage(getErrorMessage(error), "error");
    } finally {
      setLoadingAction(null);
    }
  };

  const queryTaskStatus = async () => {
    if (!statusTaskCode.trim()) {
      showMessage("Vui lòng nhập hoặc quét mã task.", "error");
      return;
    }
    setLoadingAction("status");
    try {
      const result = await callRcsAction("task-query", { robotTaskCode: statusTaskCode.trim() });
      if (isRcsSuccess(result)) {
        showMessage("Đã lấy trạng thái task.", "success");
      } else {
        showMessage(getRcsMessage(result) ?? "Không lấy được trạng thái.", "error");
      }
    } catch (error: unknown) {
      showMessage(getErrorMessage(error), "error");
    } finally {
      setLoadingAction(null);
    }
  };

  const executeTaskGenerate = async () => {
    const taskTypeText = taskGenerateForm.taskType.trim();
    const robotCodes = getTaskGenerateRobotCodes(taskGenerateForm.robotNo);
    const routes = taskGenerateForm.routes.map((route, index) => ({
      index: index + 1,
      type: route.type,
      code: route.code.trim(),
    }));
    const emptyRoute = routes.find((route) => !route.code);

    if (!taskTypeText) {
      showMessage("Vui lòng nhập TaskType.", "error");
      return;
    }
    if (emptyRoute) {
      showMessage(`Vui lòng nhập Value cho route số ${emptyRoute.index}.`, "error");
      return;
    }
    if (routes.length === 0) {
      showMessage("Vui lòng thêm ít nhất một route.", "error");
      return;
    }

    const routeText = routes.map((route) => `${route.index}. ${route.type}: ${route.code}`).join("\n");
    const robotText = robotCodes.length ? robotCodes.join(", ") : "(không chỉ định)";
    if (!window.confirm(`Gửi task generate?\n\nTaskType: ${taskTypeText}\nRobotNo: ${robotText}\n\nRoute:\n${routeText}`)) return;

    const executedForm: TaskGenerateFormState = {
      taskType: taskTypeText,
      robotNo: taskGenerateForm.robotNo.trim(),
      routes: taskGenerateForm.routes.map((route) => ({ ...route, code: route.code.trim() })),
    };
    const executedPayload = buildTaskGeneratePayload(executedForm);

    setLoadingAction("task-generate");
    try {
      const savedState = await saveTaskGenerateFormToFile(executedForm, true);
      setTaskGenerateForm(savedState.form);
      setTaskGenerateOptions(savedState.options);
      const result = await callRcsAction("task-submit", executedPayload);
      const taskCode = getTaskCode(result);
      if (isRcsSuccess(result)) {
        showMessage("Đã gửi task generate thành công.", "success");
        saveRecentAction({
          title: "Task generate",
          detail: `${taskTypeText} - ${routes.length} route`,
          code: getRcsCode(result),
          taskCode,
        });
      } else {
        showMessage(getRcsMessage(result) ?? "RCS trả về lỗi nghiệp vụ.", "error");
      }
    } catch (error: unknown) {
      showMessage(getErrorMessage(error), "error");
    } finally {
      setLoadingAction(null);
    }
  };

  const executeCatalogApi = async (api: RcsApiDefinition, payload: JsonObject) => {
    if (api.direction === "callback") {
      showMessage("Đây là callback để RCS gọi vào web, không phải API gọi sang RCS.", "info");
      return;
    }
    if (api.risk === "danger") {
      if (!window.confirm(`API này có thể ảnh hưởng vận hành robot/khu vực.\n\nTiếp tục gọi ${api.title}?`)) return;
    }
    setLoadingAction(api.id);
    try {
      const result = await callRcsAction(api.id, payload);
      if (isRcsSuccess(result)) {
        showMessage(`Đã gọi ${api.title}.`, "success");
        saveRecentAction({ title: api.title, detail: api.endpoint, code: getRcsCode(result), taskCode: getTaskCode(result) });
      } else {
        showMessage(getRcsMessage(result) ?? "RCS trả về lỗi nghiệp vụ.", "error");
      }
    } catch (error: unknown) {
      showMessage(getErrorMessage(error), "error");
    } finally {
      setLoadingAction(null);
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <main className="app-main">
      <div className="app-shell">
        {/* Header */}
        <header className="app-header">
          <div className="header-row">
            <div className="brand-row">
              <div className="brand-mark" aria-hidden="true">RCS</div>
              <div>
                <h1 className="brand-title">RCS Worker Panel</h1>
                <p className="brand-subtitle">Vận hành nhanh và console API RCS-2000</p>
              </div>
            </div>
            <div className="header-actions">
              <button
                type="button"
                onClick={updateOperatorToken}
                className={`token-button${operatorToken ? " token-button-saved" : ""}`}
                title="Nhập token để gọi API điều khiển RCS nếu server yêu cầu"
              >
                {operatorToken ? "Token API đã lưu" : "Token API"}
              </button>
              <div className="branch-badge">
                Branch dev
              </div>
            </div>
          </div>

          {/* Tab navigation */}
          <nav className="top-tabs">
            <TopTab active={activeTab === "quick"} mark={groupMarks.quick} label="Nhanh" onClick={() => setActiveTab("quick")} />
            <TopTab
              active={activeTab === "taskGenerate"}
              mark={groupMarks.taskGenerate}
              label="Task generate"
              onClick={() => setActiveTab("taskGenerate")}
            />
            {RCS_API_GROUPS.map((group) => (
              <TopTab
                key={group.id}
                active={activeTab === group.id}
                mark={groupMarks[group.id]}
                label={group.title}
                onClick={() => setActiveTab(group.id)}
              />
            ))}
          </nav>
        </header>

        {/* Main content */}
        <div className="content">
          {activeTab === "quick" ? (
            <section className="quick-layout">
              <div className="stack">
                <QuickMovePanel
                  moveMode={moveMode}
                  setMoveMode={(mode) => {
                    setMoveMode(mode);
                    setTaskType(mode === "carrier-to-site" ? DEFAULT_TASK_TYPE_CARRIER : DEFAULT_TASK_TYPE_SITE);
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
                  bindInvoke={bindInvoke}
                  setBindInvoke={setBindInvoke}
                  carrierType={carrierType}
                  setCarrierType={setCarrierType}
                  loading={loadingAction === "bind"}
                  startScan={setScanTarget}
                  executeBind={executeBind}
                />
              </div>
              <aside className="stack">
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
          ) : activeTab === "taskGenerate" ? (
            <section className="quick-layout">
              <div className="stack">
                <TaskGeneratePanel
                  form={taskGenerateForm}
                  routeOptions={taskGenerateOptions}
                  payloadPreview={taskGeneratePayload}
                  loading={loadingAction === "task-generate"}
                  setTaskType={setTaskGenerateTaskType}
                  setRobotNo={setTaskGenerateRobotNo}
                  updateRoute={updateTaskGenerateRoute}
                  addRoute={addTaskGenerateRoute}
                  removeRoute={removeTaskGenerateRoute}
                  resetForm={resetTaskGenerateForm}
                  startScan={setScanTarget}
                  executeTaskGenerate={executeTaskGenerate}
                />
              </div>
              <aside className="stack">
                <ResultPanel result={lastResult} />
                <RecentList recentActions={recentActions} />
              </aside>
            </section>
          ) : (
            <ApiConsole
              group={activeTab as RcsApiGroup}
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
              showMessage={showMessage}
            />
          )}
        </div>
      </div>

      {/* QR Scanner modal */}
      {scanTarget && (
        <QrScannerModal
          scanTarget={scanTarget}
          videoRef={videoRef}
          scannerError={scannerError}
          onClose={stopScanner}
        />
      )}
    </main>
  );
}
