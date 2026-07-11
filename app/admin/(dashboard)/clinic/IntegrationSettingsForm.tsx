"use client";

import { useState, useTransition } from "react";
import { saveIntegrationConfigAction, testIntegrationListDoctorsAction } from "@/lib/actions/integration";
import type { IntegrationConfigFormInput } from "@/src/integrationHandlers";
import type { CustomApiConfig } from "@/src/integrations/customApiConfig";

const SAVED_PLACEHOLDER = "Saved — enter a new value to replace";

type AuthType = "NONE" | "API_KEY" | "BEARER" | "BASIC";
type Capability = keyof CustomApiConfig["endpoints"];
type HttpMethod = "GET" | "POST";

interface EndpointFormState {
  method: HttpMethod;
  path: string;
  listPath: string;
  mapping: Record<string, string>;
}

const CAPABILITIES: Capability[] = [
  "listDoctors",
  "checkAvailability",
  "bookSlot",
  "cancelAppointment",
  "getPatientAppointments",
];

const CAPABILITY_LABELS: Record<Capability, string> = {
  listDoctors: "List Doctors",
  checkAvailability: "Check Availability",
  bookSlot: "Book Appointment",
  cancelAppointment: "Cancel Appointment",
  getPatientAppointments: "Get Patient Appointments",
};

// The fields our AI/booking logic actually reads back out of each response
// — fixed, not freeform, so a clinic admin can't accidentally map a field
// we never look at or forget one we require.
const CAPABILITY_FIELDS: Record<Capability, string[]> = {
  listDoctors: ["doctorId", "doctorName", "departmentName"],
  checkAvailability: ["slotId", "doctorId", "doctorName", "startsAt", "endsAt"],
  bookSlot: ["appointmentId", "doctorName", "startsAt"],
  cancelAppointment: [],
  getPatientAppointments: ["appointmentId", "doctorName", "startsAt"],
};

function emptyEndpoint(capability: Capability): EndpointFormState {
  return {
    method: capability === "bookSlot" || capability === "cancelAppointment" ? "POST" : "GET",
    path: "",
    listPath: "",
    mapping: Object.fromEntries(CAPABILITY_FIELDS[capability].map((f) => [f, ""])),
  };
}

function endpointFromSaved(saved: CustomApiConfig["endpoints"][Capability] | undefined, capability: Capability): EndpointFormState {
  if (!saved) return emptyEndpoint(capability);
  const mapping = Object.fromEntries(CAPABILITY_FIELDS[capability].map((f) => [f, saved.responseMapping[f] ?? ""]));
  return { method: saved.method, path: saved.path, listPath: saved.listPath ?? "", mapping };
}

export function IntegrationSettingsForm({
  initialConfig,
  hasApiKey,
  hasBearerToken,
  hasBasicPassword,
}: {
  initialConfig: CustomApiConfig | null;
  hasApiKey: boolean;
  hasBearerToken: boolean;
  hasBasicPassword: boolean;
}) {
  const [baseUrl, setBaseUrl] = useState(initialConfig?.baseUrl ?? "");
  const [authType, setAuthType] = useState<AuthType>(initialConfig?.auth.type ?? "NONE");
  const [headerName, setHeaderName] = useState(
    initialConfig?.auth.type === "API_KEY" ? initialConfig.auth.headerName : "X-API-Key"
  );
  const [apiKey, setApiKey] = useState("");
  const [bearerToken, setBearerToken] = useState("");
  const [username, setUsername] = useState(initialConfig?.auth.type === "BASIC" ? initialConfig.auth.username : "");
  const [password, setPassword] = useState("");

  const [endpoints, setEndpoints] = useState<Record<Capability, EndpointFormState>>(() =>
    Object.fromEntries(
      CAPABILITIES.map((c) => [c, endpointFromSaved(initialConfig?.endpoints[c], c)])
    ) as Record<Capability, EndpointFormState>
  );

  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [testing, startTest] = useTransition();
  const [testResult, setTestResult] = useState<{ raw: unknown; mapped: unknown; error: string | null } | null>(null);

  function updateEndpoint(capability: Capability, patch: Partial<EndpointFormState>) {
    setEndpoints((prev) => ({ ...prev, [capability]: { ...prev[capability], ...patch } }));
  }

  function updateMapping(capability: Capability, field: string, theirPath: string) {
    setEndpoints((prev) => ({
      ...prev,
      [capability]: { ...prev[capability], mapping: { ...prev[capability].mapping, [field]: theirPath } },
    }));
  }

  function buildInput(): IntegrationConfigFormInput {
    const auth: IntegrationConfigFormInput["auth"] =
      authType === "NONE"
        ? { type: "NONE" }
        : authType === "API_KEY"
          ? { type: "API_KEY", headerName, apiKey: apiKey || undefined }
          : authType === "BEARER"
            ? { type: "BEARER", token: bearerToken || undefined }
            : { type: "BASIC", username, password: password || undefined };

    return {
      baseUrl,
      auth,
      endpoints: Object.fromEntries(
        CAPABILITIES.map((c) => [
          c,
          {
            method: endpoints[c].method,
            path: endpoints[c].path,
            listPath: endpoints[c].listPath || undefined,
            responseMapping: Object.fromEntries(Object.entries(endpoints[c].mapping).filter(([, v]) => v.trim())),
          },
        ])
      ) as IntegrationConfigFormInput["endpoints"],
    };
  }

  function handleSave() {
    setSaved(false);
    setError(null);
    startTransition(async () => {
      try {
        await saveIntegrationConfigAction(buildInput());
        setSaved(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save");
      }
    });
  }

  function handleTestListDoctors() {
    setTestResult(null);
    startTest(async () => {
      const result = await testIntegrationListDoctorsAction(buildInput());
      setTestResult(result);
    });
  }

  return (
    <div className="stack">
      <div className="stack">
        <label>
          Base URL
          <input
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="https://api.yourclinicsystem.com"
          />
        </label>

        <label>
          Authentication
          <select value={authType} onChange={(e) => setAuthType(e.target.value as AuthType)}>
            <option value="NONE">None</option>
            <option value="API_KEY">API Key (custom header)</option>
            <option value="BEARER">Bearer token</option>
            <option value="BASIC">Basic auth (username/password)</option>
          </select>
        </label>

        {authType === "API_KEY" && (
          <>
            <label>
              Header name
              <input value={headerName} onChange={(e) => setHeaderName(e.target.value)} placeholder="X-API-Key" />
            </label>
            <label>
              API key
              <input
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                data-1p-ignore
                data-lpignore="true"
                placeholder={hasApiKey ? SAVED_PLACEHOLDER : ""}
              />
            </label>
          </>
        )}

        {authType === "BEARER" && (
          <label>
            Bearer token
            <input
              value={bearerToken}
              onChange={(e) => setBearerToken(e.target.value)}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              data-1p-ignore
              data-lpignore="true"
              placeholder={hasBearerToken ? SAVED_PLACEHOLDER : ""}
            />
          </label>
        )}

        {authType === "BASIC" && (
          <>
            <label>
              Username
              <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="off" />
            </label>
            <label>
              Password
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                data-1p-ignore
                data-lpignore="true"
                placeholder={hasBasicPassword ? SAVED_PLACEHOLDER : ""}
              />
            </label>
          </>
        )}
      </div>

      <h3 style={{ margin: "8px 0 0" }}>Capabilities</h3>
      <p className="muted" style={{ fontSize: 12.5, margin: 0 }}>
        For each capability, tell us the endpoint on your system and which field in your JSON response corresponds
        to each field we need — this is how your data gets normalized so the AI can understand it.
      </p>

      {CAPABILITIES.map((capability) => (
        <details key={capability} className="card" style={{ margin: 0 }}>
          <summary style={{ cursor: "pointer", fontWeight: 600 }}>{CAPABILITY_LABELS[capability]}</summary>
          <div className="stack" style={{ marginTop: 10 }}>
            <div style={{ display: "flex", gap: 10 }}>
              <label style={{ flex: "0 0 120px" }}>
                Method
                <select
                  value={endpoints[capability].method}
                  onChange={(e) => updateEndpoint(capability, { method: e.target.value as HttpMethod })}
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                </select>
              </label>
              <label style={{ flex: 1 }}>
                Path
                <input
                  value={endpoints[capability].path}
                  onChange={(e) => updateEndpoint(capability, { path: e.target.value })}
                  placeholder="/api/doctors"
                />
              </label>
            </div>

            {CAPABILITY_FIELDS[capability].length > 0 && (
              <label>
                List path (optional)
                <input
                  value={endpoints[capability].listPath}
                  onChange={(e) => updateEndpoint(capability, { listPath: e.target.value })}
                  placeholder="Leave blank if the response is a plain array, e.g. data.items"
                />
              </label>
            )}

            {CAPABILITY_FIELDS[capability].map((field) => (
              <div key={field} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span className="muted" style={{ flex: "0 0 140px", fontSize: 13 }}>
                  {field}
                </span>
                <input
                  style={{ flex: 1 }}
                  value={endpoints[capability].mapping[field] ?? ""}
                  onChange={(e) => updateMapping(capability, field, e.target.value)}
                  placeholder="dot-path in their JSON, e.g. data.doctor.id"
                />
              </div>
            ))}
          </div>
        </details>
      ))}

      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <button type="button" onClick={handleSave} disabled={pending}>
          {pending ? "Saving…" : "Save integration settings"}
        </button>
        <button type="button" onClick={handleTestListDoctors} disabled={testing}>
          {testing ? "Testing…" : "Test connection (List Doctors)"}
        </button>
        {saved && !pending && <span style={{ color: "var(--success)", fontSize: 13, fontWeight: 500 }}>Saved.</span>}
        {error && <span style={{ color: "var(--danger, #c0392b)", fontSize: 13 }}>{error}</span>}
      </div>

      {testResult && (
        <div className="stack">
          {testResult.error ? (
            <p style={{ color: "var(--danger, #c0392b)", fontSize: 13 }}>{testResult.error}</p>
          ) : (
            <>
              <div>
                <strong style={{ fontSize: 13 }}>Mapped result (what the AI will see)</strong>
                <pre style={{ fontSize: 12, overflowX: "auto" }}>{JSON.stringify(testResult.mapped, null, 2)}</pre>
              </div>
              <div>
                <strong style={{ fontSize: 13 }}>Raw response</strong>
                <pre style={{ fontSize: 12, overflowX: "auto" }}>{JSON.stringify(testResult.raw, null, 2)}</pre>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
