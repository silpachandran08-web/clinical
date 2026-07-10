// Geidea cloud ECR adapter (largest PSP in KSA; all their terminals run mada).
//
// Auth follows Geidea's gateway convention: HTTP Basic with
// `merchantPublicKey:apiPassword`. The ECR endpoint paths below follow the
// integration pack Geidea issues at merchant onboarding; if the clinic's pack
// specifies a different base URL, override it with the GEIDEA_API_BASE env
// var (no code change needed).

import type { PosCredentials, PosTerminalProvider, TerminalChargeResult, TerminalChargeStatus } from "./provider";

const API_BASE = process.env.GEIDEA_API_BASE || "https://api.ksamerchant.geidea.net";

export class GeideaTerminal implements PosTerminalProvider {
  constructor(private creds: PosCredentials) {}

  private get authHeader() {
    return `Basic ${Buffer.from(`${this.creds.merchantId}:${this.creds.apiSecret}`).toString("base64")}`;
  }

  async pushSale(params: { amount: number; currency: "SAR"; merchantRef: string }): Promise<TerminalChargeResult> {
    const res = await this.request("POST", "/ecr/api/v1/payment/sale", {
      terminalId: this.creds.terminalId,
      amount: params.amount.toFixed(2),
      currency: params.currency,
      merchantReferenceId: params.merchantRef,
    });
    return normalize(res, params.merchantRef);
  }

  async checkStatus(providerTxnId: string): Promise<TerminalChargeResult> {
    const res = await this.request("GET", `/ecr/api/v1/payment/status/${encodeURIComponent(providerTxnId)}`);
    return normalize(res, providerTxnId);
  }

  private async request(method: string, path: string, body?: unknown) {
    let res: Response;
    try {
      res = await fetch(`${API_BASE}${path}`, {
        method,
        headers: {
          Authorization: this.authHeader,
          "Content-Type": "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(15_000),
      });
    } catch {
      throw new Error("Could not reach Geidea — check the clinic's internet connection and try again.");
    }
    if (res.status === 401 || res.status === 403) {
      throw new Error("Geidea rejected the credentials — re-check the Merchant Public Key and API Password in Admin → Clinic profile.");
    }
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      const detail =
        (data.detailedResponseMessage as string) || (data.responseMessage as string) || (data.message as string);
      throw new Error(`Geidea error (${res.status})${detail ? `: ${detail}` : ""}`);
    }
    return data;
  }
}

/** Map Geidea's response shape onto our normalized result. */
function normalize(data: Record<string, unknown>, fallbackTxnId: string): TerminalChargeResult {
  const order = (data.order ?? data.transaction ?? data) as Record<string, unknown>;
  const providerTxnId = String(order.transactionId ?? order.orderId ?? order.id ?? fallbackTxnId);
  const rawStatus = String(order.status ?? order.detailedStatus ?? data.responseMessage ?? "").toLowerCase();

  let status: TerminalChargeStatus = "PENDING";
  if (["paid", "approved", "success", "captured", "completed"].some((s) => rawStatus.includes(s))) status = "PAID";
  else if (["declined", "failed", "cancelled", "canceled", "expired", "reversed", "voided"].some((s) => rawStatus.includes(s)))
    status = "FAILED";

  return {
    providerTxnId,
    status,
    reference: (order.authorizationCode as string) ?? (order.rrn as string) ?? undefined,
    failureReason:
      status === "FAILED"
        ? ((order.detailedResponseMessage as string) ?? (data.responseMessage as string) ?? "Declined by Geidea")
        : undefined,
  };
}
