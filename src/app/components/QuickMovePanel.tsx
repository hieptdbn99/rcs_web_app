import React from "react";
import { Bot, Loader2, MapPin, Package, Play } from "lucide-react";
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
    <Panel title="Chạy robot nhanh" icon={<Bot className="h-5 w-5" />}>
      {/* Mode toggle */}
      <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-100 p-1">
        <button
          type="button"
          onClick={() => props.setMoveMode("carrier-to-site")}
          className={`rounded-md px-3 py-3 text-sm font-semibold transition ${
            props.moveMode === "carrier-to-site" ? "bg-white text-slate-950 shadow-sm" : "text-slate-600 active:bg-slate-200"
          }`}
        >
          Kệ {"->"} Trạm
        </button>
        <button
          type="button"
          onClick={() => props.setMoveMode("site-to-site")}
          className={`rounded-md px-3 py-3 text-sm font-semibold transition ${
            props.moveMode === "site-to-site" ? "bg-white text-slate-950 shadow-sm" : "text-slate-600 active:bg-slate-200"
          }`}
        >
          Vị trí {"->"} Vị trí
        </button>
      </div>

      {/* Source / carrier inputs */}
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

      {/* Extra params */}
      <div className="grid gap-3 md:grid-cols-3">
        <Field label="Task type">
          <input suppressHydrationWarning value={props.taskType} onChange={(e) => props.setTaskType(e.target.value)} className="field-input font-mono" />
        </Field>
        <Field label="Ưu tiên">
          <input suppressHydrationWarning value={props.priority} onChange={(e) => props.setPriority(e.target.value)} inputMode="numeric" className="field-input" />
        </Field>
        <Field label="Loại kệ">
          <input suppressHydrationWarning value={props.carrierType} onChange={(e) => props.setCarrierType(e.target.value)} className="field-input" />
        </Field>
      </div>

      <button type="button" onClick={props.executeMoveTask} disabled={!props.moveReady || props.loading} className="primary-button">
        {props.loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Play className="h-5 w-5" />}
        Gửi lệnh robot
      </button>
    </Panel>
  );
}
