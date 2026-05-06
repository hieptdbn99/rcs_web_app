import React from "react";
import { getRcsApisByGroup, RCS_API_GROUPS, type RcsApiDefinition, type RcsApiGroup } from "@/lib/rcsApiCatalog";
import { API_FORM_SCHEMAS } from "@/lib/rcsFormSchemas";
import {
  buildPayloadFromForm,
  formatJson,
  getErrorMessage,
  getFieldValue,
  parseJsonObject,
  riskLabel,
  riskStyles,
} from "@/lib/rcsPayloadBuilder";
import { Panel, Field } from "@/app/components/ui/Panel";
import { ApiFieldInput } from "@/app/components/ui/ApiFieldInput";
import { ResultPanel } from "@/app/components/ResultPanel";
import type { JsonObject, RcsEnvelope, ScanTarget } from "@/lib/rcsTypes";

type Props = {
  group: RcsApiGroup;
  selectedByGroup: Partial<Record<RcsApiGroup, string>>;
  setSelectedByGroup: React.Dispatch<React.SetStateAction<Partial<Record<RcsApiGroup, string>>>>;
  payloadTexts: Record<string, string>;
  setPayloadTexts: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  apiFormValues: Record<string, Record<string, string>>;
  setApiFormValues: React.Dispatch<React.SetStateAction<Record<string, Record<string, string>>>>;
  startScan: (target: ScanTarget) => void;
  loadingAction: string | null;
  executeCatalogApi: (api: RcsApiDefinition, payload: JsonObject) => void;
  lastResult: RcsEnvelope | null;
  showMessage: (message: string, type?: "success" | "error" | "info") => void;
};

export function ApiConsole({
  group,
  selectedByGroup,
  setSelectedByGroup,
  payloadTexts,
  setPayloadTexts,
  apiFormValues,
  setApiFormValues,
  startScan,
  loadingAction,
  executeCatalogApi,
  lastResult,
  showMessage,
}: Props) {
  const apis = getRcsApisByGroup(group);
  const selectedApi = apis.find((api) => api.id === selectedByGroup[group]) ?? apis[0];
  const groupInfo = RCS_API_GROUPS.find((item) => item.id === group);

  if (!selectedApi) return null;

  const payloadText = payloadTexts[selectedApi.id] ?? formatJson(selectedApi.defaultPayload);
  const schema = API_FORM_SCHEMAS[selectedApi.id];
  const formValues = apiFormValues[selectedApi.id] ?? {};
  const formPayload = schema
    ? buildPayloadFromForm(
        selectedApi,
        Object.fromEntries(schema.fields.map((field) => [field.name, getFieldValue(selectedApi, formValues, field)])),
      )
    : selectedApi.defaultPayload;

  const updateFormValue = (fieldName: string, value: string) => {
    setApiFormValues((current) => ({
      ...current,
      [selectedApi.id]: { ...(current[selectedApi.id] ?? {}), [fieldName]: value },
    }));
  };

  const callUsingJson = () => {
    try {
      executeCatalogApi(selectedApi, parseJsonObject(payloadText));
    } catch (error: unknown) {
      showMessage(getErrorMessage(error), "error");
    }
  };

  return (
    <section className="api-layout">
      {/* API list sidebar */}
      <aside className="api-sidebar">
        <div>
          <h2 className="section-title">{groupInfo?.title}</h2>
          <p className="muted-text">{groupInfo?.description}</p>
        </div>

        <div className="api-list">
          {apis.map((api) => (
            <button
              type="button"
              key={api.id}
              onClick={() => setSelectedByGroup((current) => ({ ...current, [group]: api.id }))}
              className={`api-list-item${selectedApi.id === api.id ? " api-list-item-active" : ""}`}
            >
              <div className="api-list-item-head">
                <p className="api-list-title">{api.title}</p>
                <span className={`risk-badge ${riskStyles(api.risk)}`}>
                  {riskLabel(api.risk)}
                </span>
              </div>
              <p className="api-workflow">{api.workflow}</p>
              <p className="api-description">{api.description}</p>
            </button>
          ))}
        </div>
      </aside>

      {/* API detail + form */}
      <div className="api-detail">
        <Panel
          title={selectedApi.title}
          mark={selectedApi.direction === "callback" ? "CB" : "API"}
        >
          {/* Meta */}
          <div className="api-meta">
            <div>
              <p className="body-text">{selectedApi.description}</p>
              <p className="endpoint-text">{selectedApi.endpoint}</p>
            </div>
            <div className="api-meta-badges">
              <span className={`risk-badge ${riskStyles(selectedApi.risk)}`}>
                {riskLabel(selectedApi.risk)}
              </span>
              <span className="plain-badge">
                {selectedApi.direction === "callback" ? "RCS gọi vào web" : "Web gọi sang RCS"}
              </span>
            </div>
          </div>

          {/* Notes */}
          {selectedApi.notes?.map((note) => (
            <div key={note} className="notice notice-warning">
              <span className="notice-mark" aria-hidden="true">!</span>
              <span>{note}</span>
            </div>
          ))}

          {/* Callback info vs. action form */}
          {selectedApi.direction === "callback" ? (
            <div className="stack">
              <div className="notice notice-info notice-block">
                Cấu hình RCS gọi về endpoint local này trên máy chạy web:
                <pre className="inline-code-box">{selectedApi.localCallbackPath}</pre>
              </div>
              <Field label="Payload mẫu RCS sẽ gửi">
                <textarea suppressHydrationWarning value={payloadText} readOnly rows={12} className="field-input field-textarea field-textarea-large field-input-code" />
              </Field>
            </div>
          ) : (
            <div className="stack">
              {/* Form fields */}
              {schema ? (
                <>
                  <div className="summary-box">{schema.summary}</div>
                  <div className="form-grid form-grid-2">
                    {schema.fields.map((field) => (
                      <ApiFieldInput
                        key={field.name}
                        apiId={selectedApi.id}
                        field={field}
                        value={getFieldValue(selectedApi, formValues, field)}
                        onChange={(value) => updateFormValue(field.name, value)}
                        startScan={startScan}
                      />
                    ))}
                  </div>
                  <div className="preview-box">
                    <p className="preview-title">Dữ liệu sẽ gửi sang RCS</p>
                    <pre className="json-box">{formatJson(formPayload)}</pre>
                  </div>
                  <button
                    type="button"
                    onClick={() => executeCatalogApi(selectedApi, formPayload)}
                    disabled={loadingAction === selectedApi.id}
                    className="primary-button"
                  >
                    {loadingAction === selectedApi.id ? "Đang gửi..." : "Gửi lệnh bằng form"}
                  </button>
                </>
              ) : (
                <div className="notice notice-warning notice-block">
                  API này chưa có form riêng, kỹ thuật có thể dùng JSON nâng cao bên dưới.
                </div>
              )}

              {/* Advanced JSON */}
              <details className="details-box">
                <summary className="details-summary">JSON nâng cao cho kỹ thuật</summary>
                <div className="details-body">
                  <Field label="Payload JSON">
                    <textarea
                      suppressHydrationWarning
                      value={payloadText}
                      onChange={(event) =>
                        setPayloadTexts((current) => ({ ...current, [selectedApi.id]: event.target.value }))
                      }
                      rows={12}
                      spellCheck={false}
                      className="field-input field-textarea field-textarea-large field-input-code"
                    />
                  </Field>
                  <div className="button-row">
                    <button type="button" onClick={callUsingJson} disabled={loadingAction === selectedApi.id} className="secondary-button">
                      {loadingAction === selectedApi.id ? "Đang gửi..." : "Gửi bằng JSON nâng cao"}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setPayloadTexts((current) => ({ ...current, [selectedApi.id]: formatJson(selectedApi.defaultPayload) }))
                      }
                      className="secondary-button button-auto"
                    >
                      Reset JSON mẫu
                    </button>
                  </div>
                </div>
              </details>
            </div>
          )}
        </Panel>

        <ResultPanel result={lastResult} />
      </div>
    </section>
  );
}
