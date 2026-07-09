"use client";

import { useEffect, useState, useTransition } from "react";
import { saveWhatsAppCredentialsAction } from "@/lib/actions/clinic";

const SAVED_PLACEHOLDER = "Saved — enter a new value to replace";

export function WhatsAppCredentialsForm({
  phoneNumberId,
  hasAccessToken,
  hasAppSecret,
  verifyToken,
}: {
  phoneNumberId: string | null;
  hasAccessToken: boolean;
  hasAppSecret: boolean;
  verifyToken: string;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");

  useEffect(() => {
    setWebhookUrl(`${window.location.origin}/api/webhook`);
  }, []);

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await saveWhatsAppCredentialsAction(formData);
      setIsEditing(false);
    });
  }

  function copyToken() {
    navigator.clipboard.writeText(verifyToken).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div>
      <p className="muted" style={{ fontSize: 12.5, marginBottom: 16 }}>
        Get these from developers.facebook.com → your app → Use cases → Connect with customers
        through WhatsApp.
      </p>

      <form action={handleSubmit} className="stack">
        <label>
          Phone Number ID
          <input name="phoneNumberId" defaultValue={phoneNumberId ?? ""} disabled={!isEditing} />
        </label>
        <label>
          Access Token
          <input
            name="accessToken"
            type="password"
            placeholder={hasAccessToken ? SAVED_PLACEHOLDER : "e.g. EAAG..."}
            disabled={!isEditing}
          />
        </label>
        <label>
          App Secret
          <input
            name="appSecret"
            type="password"
            placeholder={hasAppSecret ? SAVED_PLACEHOLDER : "From App settings → Basic"}
            disabled={!isEditing}
          />
        </label>

        {isEditing ? (
          <button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save changes"}
          </button>
        ) : (
          <button type="button" className="secondary" onClick={() => setIsEditing(true)} style={{ alignSelf: "flex-start" }}>
            Edit
          </button>
        )}
      </form>

      <hr className="divider" />

      <label style={{ marginBottom: 6 }}>Verify token — paste into Meta's webhook config</label>
      <div style={{ display: "flex", gap: 8 }}>
        <input value={verifyToken} readOnly style={{ fontFamily: "monospace", fontSize: 12.5 }} />
        <button type="button" className="secondary" onClick={copyToken} style={{ flexShrink: 0 }}>
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      <label style={{ marginTop: 14, marginBottom: 6 }}>Webhook callback URL</label>
      <input value={webhookUrl} readOnly style={{ fontFamily: "monospace", fontSize: 12.5 }} />
    </div>
  );
}
