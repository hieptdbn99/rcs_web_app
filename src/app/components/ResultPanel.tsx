import React from "react";
import { Panel } from "@/app/components/ui/Panel";
import { formatJson, getRcsCode, getRcsMessage, isRcsSuccess } from "@/lib/rcsPayloadBuilder";
import type { RcsEnvelope } from "@/lib/rcsTypes";

export function ResultPanel({ result }: { result: RcsEnvelope | null }) {
  if (!result) {
    return (
      <Panel title="Phản hồi RCS" mark="R">
        <p className="muted-text">Chưa có phản hồi. Gửi lệnh hoặc kiểm tra task để xem kết quả tại đây.</p>
      </Panel>
    );
  }

  const ok = isRcsSuccess(result);
  return (
    <Panel title="Phản hồi RCS" mark={ok ? "OK" : "!"}>
      <div className={`result-status ${ok ? "result-status-ok" : "result-status-error"}`}>
        <p className="result-code">{getRcsCode(result) || (result.success ? "HTTP OK" : "ERROR")}</p>
        <p>{getRcsMessage(result) || `HTTP status: ${result.httpStatus ?? "unknown"}`}</p>
        {result.request?.path && <p className="result-path">Path: {result.request.path}</p>}
      </div>
      <pre className="json-box json-box-tall">{formatJson(result)}</pre>
    </Panel>
  );
}
