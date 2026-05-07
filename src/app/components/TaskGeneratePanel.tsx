import React from "react";
import { Panel, Field } from "@/app/components/ui/Panel";
import { Plus, Trash2 } from "lucide-react";
import { CodeInput } from "@/app/components/ui/CodeInput";
import { formatJson } from "@/lib/rcsPayloadBuilder";
import type {
  JsonObject,
  ScanTarget,
  TaskGenerateFormState,
  TaskGenerateOptions,
  TaskGenerateRouteRow,
  TaskGenerateRouteType,
} from "@/lib/rcsTypes";

type Props = {
  form: TaskGenerateFormState;
  routeOptions: TaskGenerateOptions;
  payloadPreview: JsonObject;
  loading: boolean;
  setTaskType: (value: string) => void;
  setRobotNo: (value: string) => void;
  updateRoute: (rowId: string, patch: Partial<Pick<TaskGenerateRouteRow, "type" | "code">>) => void;
  addRoute: () => void;
  removeRoute: (rowId: string) => void;
  resetForm: () => void;
  startScan: (target: ScanTarget) => void;
  executeTaskGenerate: () => void;
};

export function TaskGeneratePanel({
  form,
  routeOptions,
  payloadPreview,
  loading,
  setTaskType,
  setRobotNo,
  updateRoute,
  addRoute,
  removeRoute,
  resetForm,
  startScan,
  executeTaskGenerate,
}: Props) {
  return (
    <Panel title="Task generate" mark="G">
      <div className="summary-box">
        Nhập TaskType, RobotNo và danh sách điểm/kệ theo thứ tự robot cần đi qua. Dữ liệu form tự lưu trên trình duyệt này.
      </div>

      <div className="form-grid form-grid-2">
        <Field label="TaskType">
          <input
            suppressHydrationWarning
            value={form.taskType}
            onChange={(event) => setTaskType(event.target.value)}
            className="field-input field-input-code"
            placeholder="RunTest"
          />
        </Field>
        <CodeInput
          label="RobotNo"
          value={form.robotNo}
          onChange={setRobotNo}
          scanTarget={{ kind: "taskGenerateRobot", label: "RobotNo" }}
          startScan={startScan}
          placeholder="VD: 730"
          mark="R"
        />
      </div>

      <div className="task-route-head">
        <div>
          <h3 className="subsection-title">Target route</h3>
          <p className="muted-text">Type chọn SITE hoặc CARRIER, Value là mã điểm hoặc mã rack.</p>
        </div>
        <button type="button" onClick={addRoute} className="secondary-button small-button button-auto">
          <Plus size={16} /> Add Route
        </button>
      </div>

      <div className="task-route-list">
        {form.routes.map((route, index) => {
          const selectedOptionValue = routeOptions[route.type].some((option) => option.value === route.code) ? route.code : "";
          return (
            <div key={route.id} className="task-route-row">
              <div className="route-index">{index + 1}</div>
              <div className="task-route-fields">
                <Field label="Type">
                  <select
                    suppressHydrationWarning
                    value={route.type}
                    onChange={(event) => updateRoute(route.id, { type: event.target.value as TaskGenerateRouteType })}
                    className="field-input"
                  >
                    <option value="SITE">SITE</option>
                    <option value="CARRIER">CARRIER</option>
                  </select>
                </Field>
                <Field label="Value">
                  <div className="route-value-box">
                    <select
                      suppressHydrationWarning
                      value={selectedOptionValue}
                      onChange={(event) => {
                        if (event.target.value) updateRoute(route.id, { code: event.target.value });
                      }}
                      className="field-input route-value-select"
                    >
                      <option value="">Chọn value đã execute</option>
                      {routeOptions[route.type].map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.name}
                        </option>
                      ))}
                    </select>
                    <div className="input-row">
                      <div className="input-grow">
                        <input
                          suppressHydrationWarning
                          value={route.code}
                          onChange={(event) => updateRoute(route.id, { code: event.target.value })}
                          className="field-input field-input-code"
                          placeholder={route.type === "SITE" ? "VD: 0030692AA0017019" : "VD: 100001"}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => startScan({ kind: "taskGenerateRoute", rowId: route.id, label: `route ${index + 1}` })}
                        className="icon-button scan-button"
                        aria-label={`Quét route ${index + 1}`}
                      >
                        QR
                      </button>
                    </div>
                  </div>
                </Field>
              </div>
              <div className="route-actions">
                {index > 0 && (
                  <button
                    type="button"
                    onClick={() => removeRoute(route.id)}
                    className="secondary-button small-button button-auto"
                    title="Xóa route"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="button-row">
        <button type="button" onClick={executeTaskGenerate} disabled={loading} className="primary-button">
          {loading ? "Đang gửi..." : "Execute"}
        </button>
        <button type="button" onClick={resetForm} className="secondary-button button-auto">
          Reset form
        </button>
      </div>

      <div className="preview-box">
        <p className="preview-title">Payload sẽ gửi sang RCS</p>
        <pre className="json-box">{formatJson(payloadPreview)}</pre>
      </div>
    </Panel>
  );
}
