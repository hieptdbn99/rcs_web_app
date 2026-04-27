"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { Bot } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { RCS_API_GROUPS, type RcsApiDefinition, type RcsApiGroup } from "@/lib/rcsApiCatalog";
import { groupIcons } from "@/lib/rcsFormSchemas";
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
const MAX_RECENT_ACTIONS = 10;
const DEFAULT_TASK_TYPE_CARRIER = "PF-LMR-COMMON";
const DEFAULT_TASK_TYPE_SITE = "PF-DETECT-CARRIER";

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
          toast.success(`Đã quét: ${value}`);
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
  }, [applyScanValue, scanTarget, stopScanner]);

  // ─── Helpers ─────────────────────────────────────────────────────────────

  const saveRecentAction = (action: Omit<RecentAction, "id" | "createdAt">) => {
    const next = [
      { ...action, id: crypto.randomUUID(), createdAt: new Date().toLocaleString("vi-VN") },
      ...recentActions,
    ].slice(0, MAX_RECENT_ACTIONS);
    setRecentActions(next);
    window.localStorage.setItem(RECENT_ACTIONS_KEY, JSON.stringify(next));
  };

  const callRcsAction = async (apiId: string, payload: JsonObject): Promise<RcsEnvelope> => {
    const response = await fetch(`/api/rcs/actions/${apiId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payload }),
    });
    const data = (await response.json()) as RcsEnvelope;
    setLastResult(data);
    if (!response.ok || !data.success) {
      throw new Error(data.error ?? getRcsMessage(data) ?? "RCS request failed");
    }
    return data;
  };

  // ─── Quick actions ───────────────────────────────────────────────────────

  const executeMoveTask = async () => {
    if (!moveReady) {
      toast.error("Vui lòng quét hoặc nhập đủ mã trước khi gửi lệnh.");
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
        toast.success("Đã gửi lệnh robot thành công.");
        saveRecentAction({ title: "Chuyển kệ", detail: `${fromText} -> ${toText}`, code: getRcsCode(result), taskCode });
      } else {
        toast.error(getRcsMessage(result) ?? "RCS trả về lỗi nghiệp vụ.");
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
        toast.success(isBind ? "Đã gắn kệ vào vị trí trên RCS." : "Đã bỏ gắn kệ khỏi vị trí trên RCS.");
        saveRecentAction({
          title: isBind ? "Gắn kệ" : "Bỏ gắn kệ",
          detail: `${bindCarrierCode.trim()} tại ${bindSiteCode.trim()}`,
          code: getRcsCode(result),
        });
      } else {
        toast.error(getRcsMessage(result) ?? "RCS trả về lỗi nghiệp vụ.");
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
      const result = await callRcsAction("task-query", { robotTaskCode: statusTaskCode.trim() });
      if (isRcsSuccess(result)) {
        toast.success("Đã lấy trạng thái task.");
      } else {
        toast.error(getRcsMessage(result) ?? "Không lấy được trạng thái.");
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
      if (!window.confirm(`API này có thể ảnh hưởng vận hành robot/khu vực.\n\nTiếp tục gọi ${api.title}?`)) return;
    }
    setLoadingAction(api.id);
    try {
      const result = await callRcsAction(api.id, payload);
      if (isRcsSuccess(result)) {
        toast.success(`Đã gọi ${api.title}.`);
        saveRecentAction({ title: api.title, detail: api.endpoint, code: getRcsCode(result), taskCode: getTaskCode(result) });
      } else {
        toast.error(getRcsMessage(result) ?? "RCS trả về lỗi nghiệp vụ.");
      }
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoadingAction(null);
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen bg-[#f4f6f8] text-slate-950">
      <Toaster position="top-center" toastOptions={{ duration: 2800 }} />

      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col">
        {/* Header */}
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

          {/* Tab navigation */}
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

        {/* Main content */}
        <div className="flex-1 px-4 py-5 md:px-8 md:py-8">
          {activeTab === "quick" ? (
            <section className="grid gap-5 lg:grid-cols-[1fr_360px]">
              <div className="space-y-5">
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
