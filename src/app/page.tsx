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
import type { JsonObject, MainTab, MoveMode, RecentAction, RcsEnvelope, ScanTarget, ScannerControls } from "@/lib/rcsTypes";
import { TopTab } from "@/app/components/ui/Panel";
import { QuickMovePanel } from "@/app/components/QuickMovePanel";
import { QuickBindPanel } from "@/app/components/QuickBindPanel";
import { QuickStatusPanel } from "@/app/components/QuickStatusPanel";
import { ResultPanel } from "@/app/components/ResultPanel";
import { RecentList } from "@/app/components/RecentList";
import { QrScannerModal } from "@/app/components/QrScannerModal";
import { ApiConsole } from "@/app/components/ApiConsole";

// ─── Constants ────────────────────────────────────────────────────────────────

const RECENT_ACTIONS_KEY = "rcs_recent_actions";
const OPERATOR_TOKEN_KEY = "rcs_operator_token";
const MAX_RECENT_ACTIONS = 10;
const DEFAULT_TASK_TYPE_CARRIER = "PF-LMR-COMMON";
const DEFAULT_TASK_TYPE_SITE = "PF-DETECT-CARRIER";
type NoticeType = "success" | "error" | "info";

function createBrowserId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
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

  // ── Shared ────────────────────────────────────────────────────────────────
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<RcsEnvelope | null>(null);
  const [operatorToken, setOperatorToken] = useState(() => {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem(OPERATOR_TOKEN_KEY) ?? "";
  });
  const [notice, setNotice] = useState<{ id: string; message: string; type: NoticeType } | null>(null);

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

  const showMessage = useCallback((message: string, type: NoticeType = "info") => {
    setNotice({ id: createBrowserId(), message, type });
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 3200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  // ─── Scanner callbacks ───────────────────────────────────────────────────

  const stopScanner = useCallback(() => {
    scannerControlsRef.current?.stop();
    scannerControlsRef.current = null;
    setScanTarget(null);
  }, []);

  const applyScanValue = useCallback((target: ScanTarget, value: string) => {
    if (typeof target !== "string") {
      setApiFormValues((current) => ({
        ...current,
        [target.apiId]: { ...(current[target.apiId] ?? {}), [target.fieldName]: value },
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
      {notice && (
        <div className={`app-toast app-toast-${notice.type}`} role="status" aria-live="polite" key={notice.id}>
          {notice.message}
        </div>
      )}

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
