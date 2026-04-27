import React from "react";
import { ClipboardList } from "lucide-react";
import { Panel } from "@/app/components/ui/Panel";
import type { RecentAction } from "@/lib/rcsTypes";

export function RecentList({ recentActions }: { recentActions: RecentAction[] }) {
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
