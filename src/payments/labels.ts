// Display names only — importable from client components (no server deps).

import type { PosProvider } from "@prisma/client";

export const POS_PROVIDER_LABELS: Record<PosProvider, string | null> = {
  MANUAL: null,
  GEIDEA: "Geidea",
  NEOLEAP: "Neoleap (Al Rajhi)",
};
