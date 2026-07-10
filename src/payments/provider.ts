// POS terminal provider abstraction. Each acquirer (Geidea, Neoleap) exposes
// a "cloud ECR" API: the till pushes an amount to the physical terminal, the
// patient taps their card on the device, and the till polls until the
// acquirer reports approved/declined. Card data never touches our servers —
// it stays between the terminal and the acquirer — so PCI scope stays light.

import type { Clinic } from "@prisma/client";
import { GeideaTerminal } from "./geidea";
import { NeoleapTerminal } from "./neoleap";

/** Normalized outcome across acquirers. */
export type TerminalChargeStatus = "PENDING" | "PAID" | "FAILED";

export interface TerminalChargeResult {
  /** The acquirer's transaction id — persist it to poll later. */
  providerTxnId: string;
  status: TerminalChargeStatus;
  /** Approval code / RRN once approved, shown on the receipt. */
  reference?: string;
  /** Human-readable decline reason when FAILED. */
  failureReason?: string;
}

export interface PosTerminalProvider {
  /** Push a sale to the physical terminal; returns immediately with PENDING (awaiting card tap) or a final state. */
  pushSale(params: {
    amount: number;
    currency: "SAR";
    /** Our idempotency/reconciliation key, e.g. the Payment row id. */
    merchantRef: string;
  }): Promise<TerminalChargeResult>;
  /** Ask the acquirer what happened to a previously pushed sale. */
  checkStatus(providerTxnId: string): Promise<TerminalChargeResult>;
}

export interface PosCredentials {
  merchantId: string;
  apiKey: string | null;
  apiSecret: string;
  terminalId: string;
}

/**
 * A clinic is "configured" when it picked a real provider AND entered the
 * credentials that provider needs. The Billing tab uses this to decide
 * whether to show the Charge-on-POS button.
 */
export function isPosConfigured(
  clinic: Pick<Clinic, "posProvider" | "posMerchantId" | "posApiKey" | "posApiSecret" | "posTerminalId">
): boolean {
  if (clinic.posProvider === "MANUAL") return false;
  if (!clinic.posMerchantId || !clinic.posApiSecret || !clinic.posTerminalId) return false;
  if (clinic.posProvider === "NEOLEAP" && !clinic.posApiKey) return false;
  return true;
}

export function getPosProvider(
  clinic: Pick<Clinic, "posProvider" | "posMerchantId" | "posApiKey" | "posApiSecret" | "posTerminalId">
): PosTerminalProvider {
  if (!isPosConfigured(clinic)) {
    throw new Error(
      "POS terminal is not configured. Ask the clinic admin to enter the acquirer credentials under Admin → Clinic profile → Payments & POS terminal."
    );
  }
  const creds: PosCredentials = {
    merchantId: clinic.posMerchantId!,
    apiKey: clinic.posApiKey,
    apiSecret: clinic.posApiSecret!,
    terminalId: clinic.posTerminalId!,
  };
  switch (clinic.posProvider) {
    case "GEIDEA":
      return new GeideaTerminal(creds);
    case "NEOLEAP":
      return new NeoleapTerminal(creds);
    default:
      throw new Error(`Unsupported POS provider: ${clinic.posProvider}`);
  }
}
