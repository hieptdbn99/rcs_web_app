import React from "react";
import { CheckCircle2, Loader2, MapPin, Package, Unlink } from "lucide-react";
import { Panel, Field } from "@/app/components/ui/Panel";
import { CodeInput } from "@/app/components/ui/CodeInput";
import type { ScanTarget } from "@/lib/rcsTypes";

type Props = {
  bindCarrierCode: string;
  setBindCarrierCode: (value: string) => void;
  bindSiteCode: string;
  setBindSiteCode: (value: string) => void;
  bindDirection: string;
  setBindDirection: (value: string) => void;
  bindInvoke: "BIND" | "UNBIND";
  setBindInvoke: (value: "BIND" | "UNBIND") => void;
  carrierType: string;
  setCarrierType: (value: string) => void;
  loading: boolean;
  startScan: (target: ScanTarget) => void;
  executeBind: () => void;
};

export function QuickBindPanel(props: Props) {
  const isBind = props.bindInvoke === "BIND";

  return (
    <Panel title="Gắn / Bỏ gắn kệ" icon={<Package className="h-5 w-5" />}>
      {/* Bind / Unbind toggle */}
      <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-100 p-1">
        <button
          type="button"
          onClick={() => props.setBindInvoke("BIND")}
          className={`rounded-md px-3 py-3 text-sm font-semibold transition ${
            isBind ? "bg-white text-slate-950 shadow-sm" : "text-slate-600 active:bg-slate-200"
          }`}
        >
          Gắn kệ
        </button>
        <button
          type="button"
          onClick={() => props.setBindInvoke("UNBIND")}
          className={`rounded-md px-3 py-3 text-sm font-semibold transition ${
            !isBind ? "bg-white text-red-600 shadow-sm" : "text-slate-600 active:bg-slate-200"
          }`}
        >
          Bỏ gắn
        </button>
      </div>

      {/* Carrier / site inputs */}
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
          label="Vị trí"
          value={props.bindSiteCode}
          onChange={props.setBindSiteCode}
          scanTarget="bindSite"
          startScan={props.startScan}
          placeholder="Quét QR tại vị trí"
          icon={<MapPin className="h-5 w-5" />}
        />
      </div>

      {/* Direction + carrier type (only for BIND) */}
      {isBind && (
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Góc kệ">
            <select suppressHydrationWarning value={props.bindDirection} onChange={(e) => props.setBindDirection(e.target.value)} className="field-input">
              <option value="0">0 độ</option>
              <option value="90">90 độ</option>
              <option value="180">180 độ</option>
              <option value="-90">-90 độ</option>
              <option value="360">360 độ</option>
            </select>
          </Field>
          <Field label="Loại kệ">
            <input suppressHydrationWarning value={props.carrierType} onChange={(e) => props.setCarrierType(e.target.value)} className="field-input" />
          </Field>
        </div>
      )}

      <button
        type="button"
        onClick={props.executeBind}
        disabled={!props.bindCarrierCode.trim() || !props.bindSiteCode.trim() || props.loading}
        className={`primary-button ${
          isBind
            ? "bg-amber-600 hover:bg-amber-500 active:bg-amber-400 disabled:bg-amber-300"
            : "bg-red-600 hover:bg-red-500 active:bg-red-400 disabled:bg-red-300"
        }`}
      >
        {props.loading ? <Loader2 className="h-5 w-5 animate-spin" /> : isBind ? <CheckCircle2 className="h-5 w-5" /> : <Unlink className="h-5 w-5" />}
        {isBind ? "Xác nhận gắn kệ" : "Xác nhận bỏ gắn"}
      </button>
    </Panel>
  );
}
