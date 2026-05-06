import React from "react";
import { Panel } from "@/app/components/ui/Panel";
import type { RecentAction } from "@/lib/rcsTypes";

export function RecentList({ recentActions }: { recentActions: RecentAction[] }) {
  if (recentActions.length === 0) return null;

  return (
    <Panel title="Lệnh gần đây" mark="L">
      <div className="recent-list">
        {recentActions.map((action) => (
          <div key={action.id} className="recent-item">
            <div className="recent-row">
              <div>
                <p className="recent-title">{action.title}</p>
                <p className="recent-detail">{action.detail}</p>
                {action.taskCode && <p className="recent-task">Task: {action.taskCode}</p>}
              </div>
              <span className="recent-time">{action.createdAt}</span>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}
