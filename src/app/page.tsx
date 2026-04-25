"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import {
  AlertCircle,
  Bot,
  Camera,
  CheckCircle2,
  ClipboardList,
  Loader2,
  MapPin,
  Package,
  Play,
  QrCode,
  RotateCw,
  Settings2,
  Square,
  X,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

type AppTab = "worker" | "bind" | "status" | "advanced";
type MoveMode = "carrier-to-site" | "site-to-site";
type ScanTarget = "carrier" | "source" | "destination" | "bindCarrier" | "bindSite" | "statusTask";
type JsonObject = Record<string, unknown>;
type ScannerControls = { stop: () => void };

type RcsEnvelope = {
  success?: boolean;
  error?: string;
  rcsResponse?: {
    code?: string;
    message?: string;
    data?: JsonObject | null;
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

const scanLabels: Record<ScanTarget, string> = {
  carrier: "Quét QR mã kệ",
  source: "Quét QR vị trí lấy",
  destination: "Quét QR vị trí đích",
  bindCarrier: "Quét QR mã kệ cần gắn",
  bindSite: "Quét QR vị trí hiện tại",
  statusTask: "Quét QR mã task",
};

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}

function normalizeQrValue(rawValue: string) {
  const value = rawValue.trim();

  try {
    const parsed = JSON.parse(value) as JsonObject;
    const fields = ["carrierCode", "siteCode", "robotTaskCode", "code", "id", "value", "text"];
    for (const field of fields) {
      const candidate = parsed[field];
      if (typeof candidate === "string" && candidate.trim()) {
        return candidate.trim();
      }
    }
  } catch {
    // Not JSON, continue with URL/plain text parsing.
  }

  try {
    const url = new URL(value);
    const fields = ["carrierCode", "siteCode", "robotTaskCode", "code", "id", "value"];
    for (const field of fields) {
      const candidate = url.searchParams.get(field);
      if (candidate?.trim()) {
        return candidate.trim();
      }
    }
  } catch {
    // Not a URL.
  }

  return value;
}

function isRcsSuccess(result?: RcsEnvelope) {
  const code = result?.rcsResponse?.code;
  return Boolean(result?.success && (code === "SUCCESS" || code === "0"));
}

function getTaskCode(result?: RcsEnvelope) {
  const data = result?.rcsResponse?.data;
  const code = data?.robotTaskCode ?? data?.taskCode;
  return typeof code === "string" ? code : undefined;
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<AppTab>("worker");
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
  const [customTaskType, setCustomTaskType] = useState("CUSTOM_TASK");
  const [customJson, setCustomJson] = useState(
    '{\n  "targetRoute": [\n    {\n      "seq": 0,\n      "type": "CARRIER",\n      "code": "RACK_01"\n    },\n    {\n      "seq": 1,\n      "type": "SITE",\n      "code": "STATION_A"\n    }\n  ],\n  "initPriority": 10,\n  "interrupt": 0\n}'
  );
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
  const scannerRef = useRef<BrowserMultiFormatReader | null>(null);
  const scannerControlsRef = useRef<ScannerControls | null>(null);

  const moveReady = useMemo(() => {
    if (moveMode === "carrier-to-site") {
      return carrierCode.trim() && destinationCode.trim();
    }
    return sourceCode.trim() && destinationCode.trim();
  }, [carrierCode, destinationCode, moveMode, sourceCode]);

  const stopScanner = useCallback(() => {
    scannerControlsRef.current?.stop();
    scannerControlsRef.current = null;
    scannerRef.current = null;
    setScanTarget(null);
  }, []);

  const applyScanValue = useCallback((target: ScanTarget, value: string) => {
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
    scannerRef.current = reader;

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
    ].slice(0, 8);

    setRecentActions(next);
    window.localStorage.setItem("rcs_recent_actions", JSON.stringify(next));
  };

  const postJson = async (url: string, body: JsonObject) => {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await response.json()) as RcsEnvelope;
    setLastResult(data);

    if (!response.ok || !data.success) {
      throw new Error(data.error || data.rcsResponse?.message || "RCS request failed");
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
      extraParams: {
        initPriority: Number(priority) || 10,
        interrupt: 0,
        extra: moveMode === "site-to-site" ? { carrierInfo: [{ carrierType }] } : undefined,
      },
    };

    setLoadingAction("move");
    try {
      const result = await postJson("/api/robot", payload);
      const taskCode = getTaskCode(result);

      if (isRcsSuccess(result)) {
        toast.success("Đã gửi lệnh robot thành công.");
        saveRecentAction({
          title: "Chuyển kệ",
          detail: `${fromText} -> ${toText}`,
          code: result.rcsResponse?.code,
          taskCode,
        });
      } else {
        toast.error(result.rcsResponse?.message || "RCS trả về lỗi nghiệp vụ.");
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
      const result = await postJson("/api/carrier/bind", {
        carrierCode: bindCarrierCode.trim(),
        siteCode: bindSiteCode.trim(),
        carrierDir: Number(bindDirection),
        carrierType: carrierType.trim() || undefined,
      });

      if (isRcsSuccess(result)) {
        toast.success("Đã gắn kệ vào vị trí trên RCS.");
        saveRecentAction({
          title: "Gắn kệ",
          detail: `${bindCarrierCode.trim()} tại ${bindSiteCode.trim()}`,
          code: result.rcsResponse?.code,
        });
      } else {
        toast.error(result.rcsResponse?.message || "RCS trả về lỗi nghiệp vụ.");
      }
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoadingAction(null);
    }
  };

  const executeCustomJsonTask = async () => {
    let parsedJson: JsonObject;
    try {
      parsedJson = JSON.parse(customJson) as JsonObject;
      if (!parsedJson || typeof parsedJson !== "object" || Array.isArray(parsedJson)) {
        toast.error("Payload JSON phải là object.");
        return;
      }
    } catch (error: unknown) {
      toast.error(`JSON không hợp lệ: ${getErrorMessage(error)}`);
      return;
    }

    setLoadingAction("custom");
    try {
      const { targetRoute, ...extraParams } = parsedJson;
      const result = await postJson("/api/robot", {
        taskType: customTaskType.trim(),
        targetRoute: Array.isArray(targetRoute) ? targetRoute : [],
        extraParams,
      });

      if (isRcsSuccess(result)) {
        toast.success("Đã gửi JSON task thành công.");
      } else {
        toast.error(result.rcsResponse?.message || "RCS trả về lỗi nghiệp vụ.");
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
      const result = await postJson("/api/rcs/task/query", {
        robotTaskCode: statusTaskCode.trim(),
      });

      if (isRcsSuccess(result)) {
        toast.success("Đã lấy trạng thái task.");
      } else {
        toast.error(result.rcsResponse?.message || "Không lấy được trạng thái.");
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

      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur md:px-8">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-950 text-white">
                <Bot className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-lg font-semibold leading-tight md:text-2xl">RCS Worker Panel</h1>
                <p className="text-xs text-slate-500 md:text-sm">Quét QR, gắn kệ, gọi robot từ điện thoại</p>
              </div>
            </div>
            <div className="hidden rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700 md:block">
              Mobile ready
            </div>
          </div>

          <nav className="mt-3 grid grid-cols-4 gap-2">
            <TabButton active={activeTab === "worker"} icon={<Play />} label="Chạy" onClick={() => setActiveTab("worker")} />
            <TabButton active={activeTab === "bind"} icon={<Package />} label="Gắn kệ" onClick={() => setActiveTab("bind")} />
            <TabButton active={activeTab === "status"} icon={<ClipboardList />} label="Kết quả" onClick={() => setActiveTab("status")} />
            <TabButton active={activeTab === "advanced"} icon={<Settings2 />} label="API" onClick={() => setActiveTab("advanced")} />
          </nav>
        </header>

        <div className="flex-1 px-4 py-5 md:px-8 md:py-8">
          {activeTab === "worker" && (
            <section className="space-y-5">
              <Panel title="Lệnh điều phối robot" icon={<Bot className="h-5 w-5" />}>
                <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-100 p-1">
                  <button
                    onClick={() => {
                      setMoveMode("carrier-to-site");
                      setTaskType("PF-LMR-COMMON");
                    }}
                    className={`rounded-md px-3 py-3 text-sm font-semibold ${moveMode === "carrier-to-site" ? "bg-white text-slate-950 shadow-sm" : "text-slate-600"}`}
                  >
                    Kệ {"->"} Trạm
                  </button>
                  <button
                    onClick={() => {
                      setMoveMode("site-to-site");
                      setTaskType("PF-DETECT-CARRIER");
                    }}
                    className={`rounded-md px-3 py-3 text-sm font-semibold ${moveMode === "site-to-site" ? "bg-white text-slate-950 shadow-sm" : "text-slate-600"}`}
                  >
                    Vị trí {"->"} Vị trí
                  </button>
                </div>

                {moveMode === "carrier-to-site" ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    <CodeInput
                      label="Mã kệ"
                      value={carrierCode}
                      onChange={setCarrierCode}
                      scanTarget="carrier"
                      startScan={setScanTarget}
                      placeholder="VD: RACK_01"
                      icon={<Package className="h-5 w-5" />}
                    />
                    <CodeInput
                      label="Vị trí đích"
                      value={destinationCode}
                      onChange={setDestinationCode}
                      scanTarget="destination"
                      startScan={setScanTarget}
                      placeholder="VD: STATION_A"
                      icon={<MapPin className="h-5 w-5" />}
                    />
                  </div>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    <CodeInput
                      label="Vị trí lấy"
                      value={sourceCode}
                      onChange={setSourceCode}
                      scanTarget="source"
                      startScan={setScanTarget}
                      placeholder="VD: SITE_A"
                      icon={<MapPin className="h-5 w-5" />}
                    />
                    <CodeInput
                      label="Vị trí đích"
                      value={destinationCode}
                      onChange={setDestinationCode}
                      scanTarget="destination"
                      startScan={setScanTarget}
                      placeholder="VD: SITE_B"
                      icon={<MapPin className="h-5 w-5" />}
                    />
                  </div>
                )}

                <div className="grid gap-3 md:grid-cols-3">
                  <Field label="Task type">
                    <input value={taskType} onChange={(event) => setTaskType(event.target.value)} className="field-input font-mono" />
                  </Field>
                  <Field label="Ưu tiên">
                    <input value={priority} onChange={(event) => setPriority(event.target.value)} inputMode="numeric" className="field-input" />
                  </Field>
                  <Field label="Loại kệ">
                    <input value={carrierType} onChange={(event) => setCarrierType(event.target.value)} className="field-input" />
                  </Field>
                </div>

                <button
                  onClick={executeMoveTask}
                  disabled={!moveReady || loadingAction === "move"}
                  className="primary-button"
                >
                  {loadingAction === "move" ? <Loader2 className="h-5 w-5 animate-spin" /> : <Play className="h-5 w-5" />}
                  Gửi lệnh robot
                </button>
              </Panel>

              <RecentList recentActions={recentActions} />
            </section>
          )}

          {activeTab === "bind" && (
            <section className="space-y-5">
              <Panel title="Gắn kệ vào vị trí hiện tại" icon={<Package className="h-5 w-5" />}>
                <div className="grid gap-3 md:grid-cols-2">
                  <CodeInput
                    label="Mã kệ"
                    value={bindCarrierCode}
                    onChange={setBindCarrierCode}
                    scanTarget="bindCarrier"
                    startScan={setScanTarget}
                    placeholder="Quét QR trên kệ"
                    icon={<Package className="h-5 w-5" />}
                  />
                  <CodeInput
                    label="Vị trí hiện tại"
                    value={bindSiteCode}
                    onChange={setBindSiteCode}
                    scanTarget="bindSite"
                    startScan={setScanTarget}
                    placeholder="Quét QR tại vị trí"
                    icon={<MapPin className="h-5 w-5" />}
                  />
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <Field label="Góc kệ">
                    <select value={bindDirection} onChange={(event) => setBindDirection(event.target.value)} className="field-input">
                      <option value="0">0 độ</option>
                      <option value="90">90 độ</option>
                      <option value="180">180 độ</option>
                      <option value="-90">-90 độ</option>
                      <option value="360">360 độ</option>
                    </select>
                  </Field>
                  <Field label="Loại kệ">
                    <input value={carrierType} onChange={(event) => setCarrierType(event.target.value)} className="field-input" />
                  </Field>
                </div>

                <button
                  onClick={executeBind}
                  disabled={!bindCarrierCode.trim() || !bindSiteCode.trim() || loadingAction === "bind"}
                  className="primary-button bg-amber-600 hover:bg-amber-500 disabled:bg-amber-300"
                >
                  {loadingAction === "bind" ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
                  Xác nhận gắn kệ
                </button>
              </Panel>
            </section>
          )}

          {activeTab === "status" && (
            <section className="space-y-5">
              <Panel title="Theo dõi kết quả" icon={<ClipboardList className="h-5 w-5" />}>
                <CodeInput
                  label="Mã task"
                  value={statusTaskCode}
                  onChange={setStatusTaskCode}
                  scanTarget="statusTask"
                  startScan={setScanTarget}
                  placeholder="robotTaskCode"
                  icon={<ClipboardList className="h-5 w-5" />}
                />
                <button onClick={queryTaskStatus} disabled={loadingAction === "status"} className="secondary-button">
                  {loadingAction === "status" ? <Loader2 className="h-5 w-5 animate-spin" /> : <RotateCw className="h-5 w-5" />}
                  Kiểm tra trạng thái
                </button>
              </Panel>

              <ResultPanel result={lastResult} />
              <RecentList recentActions={recentActions} />
            </section>
          )}

          {activeTab === "advanced" && (
            <section className="space-y-5">
              <Panel title="Test API nâng cao" icon={<Settings2 className="h-5 w-5" />}>
                <Field label="Task type">
                  <input value={customTaskType} onChange={(event) => setCustomTaskType(event.target.value)} className="field-input font-mono" />
                </Field>
                <Field label="Payload JSON">
                  <textarea
                    value={customJson}
                    onChange={(event) => setCustomJson(event.target.value)}
                    rows={14}
                    spellCheck={false}
                    className="field-input min-h-72 resize-y font-mono text-sm"
                  />
                </Field>
                <button onClick={executeCustomJsonTask} disabled={loadingAction === "custom"} className="primary-button">
                  {loadingAction === "custom" ? <Loader2 className="h-5 w-5 animate-spin" /> : <Play className="h-5 w-5" />}
                  Gửi JSON
                </button>
              </Panel>
            </section>
          )}
        </div>
      </div>

      {scanTarget && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/70 p-0 md:items-center md:justify-center md:p-6">
          <div className="w-full rounded-t-2xl bg-white p-4 shadow-2xl md:max-w-lg md:rounded-2xl">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">{scanLabels[scanTarget]}</h2>
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

function TabButton({ active, icon, label, onClick }: { active: boolean; icon: React.ReactElement; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-lg px-2 py-2 text-xs font-semibold transition md:flex-row md:text-sm ${
        active ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
      }`}
    >
      <span className="[&>svg]:h-4 [&>svg]:w-4">{icon}</span>
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
        <p className="font-semibold">{result.rcsResponse?.code || (result.success ? "OK" : "ERROR")}</p>
        <p>{result.error || result.rcsResponse?.message || "Không có message."}</p>
      </div>
      <pre className="max-h-96 overflow-auto rounded-lg bg-slate-950 p-3 text-xs text-slate-100">{JSON.stringify(result, null, 2)}</pre>
    </Panel>
  );
}
