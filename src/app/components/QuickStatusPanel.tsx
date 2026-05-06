import React from "react";
import { Panel } from "@/app/components/ui/Panel";
import { CodeInput } from "@/app/components/ui/CodeInput";
import type { ScanTarget } from "@/lib/rcsTypes";

type Props = {
  statusTaskCode: string;
  setStatusTaskCode: (value: string) => void;
  loading: boolean;
  startScan: (target: ScanTarget) => void;
  queryTaskStatus: () => void;
};

export function QuickStatusPanel(props: Props) {
  return (
    <Panel title="Tra cứu nhanh" mark="S">
      <CodeInput
        label="Mã task"
        value={props.statusTaskCode}
        onChange={props.setStatusTaskCode}
        scanTarget="statusTask"
        startScan={props.startScan}
        placeholder="robotTaskCode"
        mark="T"
      />
      <button type="button" onClick={props.queryTaskStatus} disabled={props.loading} className="secondary-button">
        {props.loading ? "Đang kiểm tra..." : "Kiểm tra task"}
      </button>
    </Panel>
  );
}
