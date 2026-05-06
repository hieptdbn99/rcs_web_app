import React from "react";
import { Panel, Field } from "@/app/components/ui/Panel";
import { CodeInput } from "@/app/components/ui/CodeInput";
import type { MoveMode, ScanTarget } from "@/lib/rcsTypes";

type Props = {
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
};

export function QuickMovePanel(props: Props) {
  return (
    <Panel title="Chạy robot nhanh" mark="R">
      {/* Mode toggle */}
      <div className="segmented">
        <button
          type="button"
          onClick={() => props.setMoveMode("carrier-to-site")}
          className={`segmented-button${props.moveMode === "carrier-to-site" ? " segmented-button-active" : ""}`}
        >
          Kệ {"->"} Trạm
        </button>
        <button
          type="button"
          onClick={() => props.setMoveMode("site-to-site")}
          className={`segmented-button${props.moveMode === "site-to-site" ? " segmented-button-active" : ""}`}
        >
          Vị trí {"->"} Vị trí
        </button>
      </div>

      {/* Source / carrier inputs */}
      {props.moveMode === "carrier-to-site" ? (
        <div className="form-grid form-grid-2">
          <CodeInput
            label="Mã kệ"
            value={props.carrierCode}
            onChange={props.setCarrierCode}
            scanTarget="carrier"
            startScan={props.startScan}
            placeholder="VD: RACK_01"
            mark="K"
          />
          <CodeInput
            label="Vị trí đích"
            value={props.destinationCode}
            onChange={props.setDestinationCode}
            scanTarget="destination"
            startScan={props.startScan}
            placeholder="VD: STATION_A"
            mark="P"
          />
        </div>
      ) : (
        <div className="form-grid form-grid-2">
          <CodeInput
            label="Vị trí lấy"
            value={props.sourceCode}
            onChange={props.setSourceCode}
            scanTarget="source"
            startScan={props.startScan}
            placeholder="VD: SITE_A"
            mark="P"
          />
          <CodeInput
            label="Vị trí đích"
            value={props.destinationCode}
            onChange={props.setDestinationCode}
            scanTarget="destination"
            startScan={props.startScan}
            placeholder="VD: SITE_B"
            mark="P"
          />
        </div>
      )}

      {/* Extra params */}
      <div className="form-grid form-grid-3">
        <Field label="Task type">
          <input suppressHydrationWarning value={props.taskType} onChange={(e) => props.setTaskType(e.target.value)} className="field-input field-input-code" />
        </Field>
        <Field label="Ưu tiên">
          <input suppressHydrationWarning value={props.priority} onChange={(e) => props.setPriority(e.target.value)} inputMode="numeric" className="field-input" />
        </Field>
        <Field label="Loại kệ">
          <input suppressHydrationWarning value={props.carrierType} onChange={(e) => props.setCarrierType(e.target.value)} className="field-input" />
        </Field>
      </div>

      <button type="button" onClick={props.executeMoveTask} disabled={!props.moveReady || props.loading} className="primary-button">
        {props.loading ? "Đang gửi..." : "Gửi lệnh robot"}
      </button>
    </Panel>
  );
}
