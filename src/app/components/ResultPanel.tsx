import React from "react";
import { AlertCircle, Camera, CheckCircle2 } from "lucide-react";
import { Panel } from "@/app/components/ui/Panel";
import { formatJson, getRcsCode, getRcsMessage, isRcsSuccess } from "@/lib/rcsPayloadBuilder";
import type { RcsEnvelope } from "@/lib/rcsTypes";

export function ResultPanel({ result }: { result: RcsEnvelope | null }) {
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
