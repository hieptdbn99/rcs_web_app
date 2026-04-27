import React from "react";
import { ClipboardList, Loader2, RotateCw } from "lucide-react";
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
    <Panel title="Tra cứu nhanh" icon={<ClipboardList className="h-5 w-5" />}>
      <CodeInput
        label="Mã task"
        value={props.statusTaskCode}
        onChange={props.setStatusTaskCode}
        scanTarget="statusTask"
        startScan={props.startScan}
        placeholder="robotTaskCode"
        icon={<ClipboardList className="h-5 w-5" />}
      />
      <button type="button" onClick={props.queryTaskStatus} disabled={props.loading} className="secondary-button">
        {props.loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <RotateCw className="h-5 w-5" />}
        Kiểm tra task
      </button>
    </Panel>
  );
}
