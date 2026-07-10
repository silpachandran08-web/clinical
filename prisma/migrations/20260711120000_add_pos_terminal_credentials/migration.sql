-- Terminal-API credentials on Clinic (from the acquirer's merchant onboarding
-- pack) + provider tracking on Payment so PENDING terminal charges can be
-- polled to completion.

ALTER TABLE "Clinic"
  ADD COLUMN "posMerchantId" TEXT,
  ADD COLUMN "posApiKey" TEXT,
  ADD COLUMN "posApiSecret" TEXT,
  ADD COLUMN "posTerminalId" TEXT;

ALTER TABLE "Payment"
  ADD COLUMN "provider" "PosProvider" NOT NULL DEFAULT 'MANUAL',
  ADD COLUMN "providerTxnId" TEXT,
  ADD COLUMN "failureReason" TEXT;
