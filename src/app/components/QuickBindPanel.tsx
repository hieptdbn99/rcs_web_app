import React from "react";
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
    <Panel title="Gắn / Bỏ gắn kệ" mark="K">
      {/* Bind / Unbind toggle */}
      <div className="segmented">
        <button
          type="button"
          onClick={() => props.setBindInvoke("BIND")}
          className={`segmented-button${isBind ? " segmented-button-active" : ""}`}
        >
          Gắn kệ
        </button>
        <button
          type="button"
          onClick={() => props.setBindInvoke("UNBIND")}
          className={`segmented-button${!isBind ? " segmented-button-active segmented-button-danger" : ""}`}
        >
          Bỏ gắn
        </button>
      </div>

      {/* Carrier / site inputs */}
      <div className="form-grid form-grid-2">
        <CodeInput
          label="Mã kệ"
          value={props.bindCarrierCode}
          onChange={props.setBindCarrierCode}
          scanTarget="bindCarrier"
          startScan={props.startScan}
          placeholder="Quét QR trên kệ"
          mark="K"
        />
        <CodeInput
          label="Vị trí"
          value={props.bindSiteCode}
          onChange={props.setBindSiteCode}
          scanTarget="bindSite"
          startScan={props.startScan}
          placeholder="Quét QR tại vị trí"
          mark="P"
        />
      </div>

      {/* Direction + carrier type (only for BIND) */}
      {isBind && (
        <div className="form-grid form-grid-2">
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
        className={`primary-button ${isBind ? "primary-button-warning" : "primary-button-danger"}`}
      >
        {props.loading ? "Đang gửi..." : isBind ? "Xác nhận gắn kệ" : "Xác nhận bỏ gắn"}
      </button>
    </Panel>
  );
}
