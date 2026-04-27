import React from "react";
import { Cpu, Loader2, Play, Settings2, ShieldAlert } from "lucide-react";
import toast from "react-hot-toast";
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
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <section className="grid gap-5 lg:grid-cols-[360px_1fr]">
      {/* API list sidebar */}
      <aside className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold">{groupInfo?.title}</h2>
          <p className="text-sm text-slate-500">{groupInfo?.description}</p>
        </div>

        <div className="space-y-2">
          {apis.map((api) => (
            <button
              type="button"
              key={api.id}
              onClick={() => setSelectedByGroup((current) => ({ ...current, [group]: api.id }))}
              className={`w-full rounded-xl border p-3 text-left transition ${
                selectedApi.id === api.id
                  ? "border-slate-950 bg-white shadow-sm"
                  : "border-slate-200 bg-white hover:border-slate-400 active:bg-slate-50"
              }`}
            >
              <div className="mb-1 flex items-start justify-between gap-2">
                <p className="font-semibold">{api.title}</p>
                <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${riskStyles(api.risk)}`}>
                  {riskLabel(api.risk)}
                </span>
              </div>
              <p className="text-xs font-medium text-slate-500">{api.workflow}</p>
              <p className="mt-1 line-clamp-2 text-sm text-slate-600">{api.description}</p>
            </button>
          ))}
        </div>
      </aside>

      {/* API detail + form */}
      <div className="space-y-5">
        <Panel
          title={selectedApi.title}
          icon={selectedApi.direction === "callback" ? <Cpu className="h-5 w-5" /> : <Settings2 className="h-5 w-5" />}
        >
          {/* Meta */}
          <div className="grid gap-3 md:grid-cols-[1fr_auto]">
            <div>
              <p className="text-sm text-slate-600">{selectedApi.description}</p>
              <p className="mt-2 break-all rounded-lg bg-slate-100 px-3 py-2 font-mono text-xs text-slate-700">{selectedApi.endpoint}</p>
            </div>
            <div className="flex flex-wrap items-start gap-2 md:justify-end">
              <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${riskStyles(selectedApi.risk)}`}>
                {riskLabel(selectedApi.risk)}
              </span>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                {selectedApi.direction === "callback" ? "RCS gọi vào web" : "Web gọi sang RCS"}
              </span>
            </div>
          </div>

          {/* Notes */}
          {selectedApi.notes?.map((note) => (
            <div key={note} className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{note}</span>
            </div>
          ))}

          {/* Callback info vs. action form */}
          {selectedApi.direction === "callback" ? (
            <div className="space-y-3">
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
                Cấu hình RCS gọi về endpoint local này trên máy chạy web:
                <pre className="mt-2 overflow-auto rounded bg-white p-2 font-mono text-xs text-blue-900">{selectedApi.localCallbackPath}</pre>
              </div>
              <Field label="Payload mẫu RCS sẽ gửi">
                <textarea suppressHydrationWarning value={payloadText} readOnly rows={12} className="field-input min-h-72 resize-y font-mono text-sm" />
              </Field>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Form fields */}
              {schema ? (
                <>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">{schema.summary}</div>
                  <div className="grid gap-3 md:grid-cols-2">
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
                  <div className="rounded-lg border border-slate-200 bg-white p-3">
                    <p className="mb-2 text-sm font-semibold text-slate-700">Dữ liệu sẽ gửi sang RCS</p>
                    <pre className="max-h-72 overflow-auto rounded-lg bg-slate-950 p-3 text-xs text-slate-100">{formatJson(formPayload)}</pre>
                  </div>
                  <button
                    type="button"
                    onClick={() => executeCatalogApi(selectedApi, formPayload)}
                    disabled={loadingAction === selectedApi.id}
                    className="primary-button"
                  >
                    {loadingAction === selectedApi.id ? <Loader2 className="h-5 w-5 animate-spin" /> : <Play className="h-5 w-5" />}
                    Gửi lệnh bằng form
                  </button>
                </>
              ) : (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  API này chưa có form riêng, kỹ thuật có thể dùng JSON nâng cao bên dưới.
                </div>
              )}

              {/* Advanced JSON */}
              <details className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <summary className="cursor-pointer text-sm font-semibold text-slate-700">JSON nâng cao cho kỹ thuật</summary>
                <div className="mt-3 space-y-3">
                  <Field label="Payload JSON">
                    <textarea
                      suppressHydrationWarning
                      value={payloadText}
                      onChange={(event) =>
                        setPayloadTexts((current) => ({ ...current, [selectedApi.id]: event.target.value }))
                      }
                      rows={12}
                      spellCheck={false}
                      className="field-input min-h-72 resize-y font-mono text-sm"
                    />
                  </Field>
                  <div className="grid gap-2 md:grid-cols-[1fr_auto]">
                    <button type="button" onClick={callUsingJson} disabled={loadingAction === selectedApi.id} className="secondary-button">
                      {loadingAction === selectedApi.id ? <Loader2 className="h-5 w-5 animate-spin" /> : <Settings2 className="h-5 w-5" />}
                      Gửi bằng JSON nâng cao
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setPayloadTexts((current) => ({ ...current, [selectedApi.id]: formatJson(selectedApi.defaultPayload) }))
                      }
                      className="secondary-button md:w-auto"
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
