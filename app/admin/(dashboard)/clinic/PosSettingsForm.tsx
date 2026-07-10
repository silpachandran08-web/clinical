"use client";

import { useState, useTransition } from "react";
import { savePosSettingsAction } from "@/lib/actions/billing";

const SAVED_PLACEHOLDER = "Saved — enter a new value to replace";

type Provider = "MANUAL" | "GEIDEA" | "NEOLEAP";

// What each acquirer calls its credentials and where the clinic gets them —
// shown as field labels/hints so the admin can match them to their
// onboarding pack without guessing.
const PROVIDER_INFO: Record<
  Exclude<Provider, "MANUAL">,
  { merchantIdLabel: string; secretLabel: string; usesApiKey: boolean; hint: string }
> = {
  GEIDEA: {
    merchantIdLabel: "Merchant Public Key",
    secretLabel: "API Password",
    usesApiKey: false,
    hint: "Get these from your Geidea merchant portal (merchant.geidea.net) → Settings → API credentials, or ask your Geidea account manager to enable ECR integration for your terminal.",
  },
  NEOLEAP: {
    merchantIdLabel: "Merchant ID",
    secretLabel: "API Secret",
    usesApiKey: true,
    hint: "Request ECR integration credentials from Neoleap merchant support (or your Al Rajhi business banking contact) — they issue the merchant ID, API key/secret, and register your terminal for API access.",
  },
};

export function PosSettingsForm({
  posProvider,
  posTerminalName,
  posMerchantId,
  posTerminalId,
  hasApiKey,
  hasApiSecret,
}: {
  posProvider: Provider;
  posTerminalName: string | null;
  posMerchantId: string | null;
  posTerminalId: string | null;
  hasApiKey: boolean;
  hasApiSecret: boolean;
}) {
  const [provider, setProvider] = useState<Provider>(posProvider);
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const info = provider === "MANUAL" ? null : PROVIDER_INFO[provider];

  function handleSubmit(formData: FormData) {
    setSaved(false);
    startTransition(async () => {
      await savePosSettingsAction(formData);
      setSaved(true);
    });
  }

  return (
    <form action={handleSubmit} className="stack">
      <label>
        Payment provider
        <select
          name="posProvider"
          value={provider}
          onChange={(e) => setProvider(e.target.value as Provider)}
        >
          <option value="MANUAL">Manual POS — any bank terminal, staff key in the result</option>
          <option value="GEIDEA">Geidea — amount pushed to the terminal automatically</option>
          <option value="NEOLEAP">Neoleap (Al Rajhi) — amount pushed to the terminal automatically</option>
        </select>
      </label>

      {info && (
        <>
          <p className="muted" style={{ fontSize: 12.5, margin: 0 }}>
            {info.hint}
          </p>
          <label>
            {info.merchantIdLabel}
            <input
              name="posMerchantId"
              defaultValue={posMerchantId ?? ""}
              autoComplete="off"
              data-1p-ignore
              data-lpignore="true"
              required
            />
          </label>
          {info.usesApiKey && (
            <label>
              API Key
              <input
                name="posApiKey"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                data-1p-ignore
                data-lpignore="true"
                placeholder={hasApiKey ? SAVED_PLACEHOLDER : ""}
                required={!hasApiKey}
              />
            </label>
          )}
          <label>
            {info.secretLabel}
            <input
              name="posApiSecret"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              data-1p-ignore
              data-lpignore="true"
              placeholder={hasApiSecret ? SAVED_PLACEHOLDER : ""}
              required={!hasApiSecret}
            />
          </label>
          <label>
            Terminal ID
            <input
              name="posTerminalId"
              defaultValue={posTerminalId ?? ""}
              autoComplete="off"
              placeholder="Printed on the device / its receipts, e.g. 10023456"
              required
            />
          </label>
        </>
      )}

      <label>
        Terminal name (optional)
        <input
          name="posTerminalName"
          defaultValue={posTerminalName ?? ""}
          placeholder='e.g. "Front desk mada terminal"'
        />
      </label>

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save payment settings"}
        </button>
        {saved && !pending && (
          <span style={{ color: "var(--success)", fontSize: 13, fontWeight: 500 }}>Saved.</span>
        )}
      </div>
    </form>
  );
}
