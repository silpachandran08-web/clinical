// Neoleap (Al Rajhi Bank's payments arm) cloud ECR adapter.
//
// Auth: API key + secret headers issued with the merchant's ECR integration
// agreement (requested via Neoleap merchant support / the ECR-POS form on
// neoleap.com.sa). Endpoint paths follow their ECR integration spec; if the
// clinic's agreement specifies a different base URL, override it with the
// NEOLEAP_API_BASE env var (no code change needed).

import type { PosCredentials, PosTerminalProvider, TerminalChargeResult, TerminalChargeStatus } from "./provider";

const API_BASE = process.env.NEOLEAP_API_BASE || "https://api.neoleap.com.sa";

export class NeoleapTerminal implements PosTerminalProvider {
  constructor(private creds: PosCredentials) {}

  async pushSale(params: { amount: number; currency: "SAR"; merchantRef: string }): Promise<TerminalChargeResult> {
    const res = await this.request("POST", "/ecr/v1/purchases", {
      merchantId: this.creds.merchantId,
      terminalId: this.creds.terminalId,
      // Neoleap's ECR spec takes minor units (halalas).
      amount: Math.round(params.amount * 100),
      currency: params.currency,
      reference: params.merchantRef,
    });
    return normalize(res, params.merchantRef);
  }

  async checkStatus(providerTxnId: string): Promise<TerminalChargeResult> {
    const res = await this.request("GET", `/ecr/v1/purchases/${encodeURIComponent(providerTxnId)}`);
    return normalize(res, providerTxnId);
  }

  private async request(method: string, path: string, body?: unknown) {
    let res: Response;
    try {
      res = await fetch(`${API_BASE}${path}`, {
        method,
        headers: {
          "x-api-key": this.creds.apiKey ?? "",
          "x-api-secret": this.creds.apiSecret,
          "Content-Type": "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(15_000),
      });
    } catch {
      throw new Error("Could not reach Neoleap — check the clinic's internet connection and try again.");
    }
    if (res.status === 401 || res.status === 403) {
      throw new Error("Neoleap rejected the credentials — re-check the API key/secret in Admin → Clinic profile.");
    }
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      const detail = (data.message as string) || (data.error as string);
      throw new Error(`Neoleap error (${res.status})${detail ? `: ${detail}` : ""}`);
    }
    return data;
  }
}

/** Map Neoleap's response shape onto our normalized result. */
function normalize(data: Record<string, unknown>, fallbackTxnId: string): TerminalChargeResult {
  const txn = (data.purchase ?? data.transaction ?? data) as Record<string, unknown>;
  const providerTxnId = String(txn.transactionId ?? txn.purchaseId ?? txn.id ?? fallbackTxnId);
  const rawStatus = String(txn.status ?? txn.result ?? "").toLowerCase();

  let status: TerminalChargeStatus = "PENDING";
  if (["approved", "paid", "success", "completed"].some((s) => rawStatus.includes(s))) status = "PAID";
  else if (["declined", "failed", "cancelled", "canceled", "expired", "reversed", "timeout"].some((s) => rawStatus.includes(s)))
    status = "FAILED";

  return {
    providerTxnId,
    status,
    reference: (txn.approvalCode as string) ?? (txn.authCode as string) ?? (txn.rrn as string) ?? undefined,
    failureReason:
      status === "FAILED" ? ((txn.responseMessage as string) ?? (data.message as string) ?? "Declined by Neoleap") : undefined,
  };
}
