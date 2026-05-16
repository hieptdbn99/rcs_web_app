import React from "react";
import { Field, Panel } from "@/app/components/ui/Panel";
import { CodeInput } from "@/app/components/ui/CodeInput";
import type { ScanTarget } from "@/lib/rcsTypes";

type CancelType = "CANCEL" | "DROP";

type Props = {
  cancelTaskCode: string;
  setCancelTaskCode: (value: string) => void;
  cancelType: CancelType;
  setCancelType: (value: CancelType) => void;
  loading: boolean;
  startScan: (target: ScanTarget) => void;
  executeCancelTask: () => void;
};

export function QuickCancelPanel(props: Props) {
  return (
    <Panel title="Hủy task nhanh" mark="X">
      <CodeInput
        label="Mã task cần hủy"
        value={props.cancelTaskCode}
        onChange={props.setCancelTaskCode}
        scanTarget="cancelTask"
        startScan={props.startScan}
        placeholder="robotTaskCode"
        mark="T"
      />
      <Field label="Kiểu hủy">
        <select
          suppressHydrationWarning
          value={props.cancelType}
          onChange={(event) => props.setCancelType(event.target.value as CancelType)}
          className="field-input"
        >
          <option value="CANCEL">Hủy mềm (CANCEL)</option>
          <option value="DROP">Can thiệp thủ công (DROP)</option>
        </select>
      </Field>
      <button
        type="button"
        onClick={props.executeCancelTask}
        disabled={props.loading}
        className="primary-button primary-button-danger"
      >
        {props.loading ? "Đang hủy..." : "Hủy task"}
      </button>
    </Panel>
  );
}
