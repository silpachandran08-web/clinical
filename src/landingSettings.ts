import { prisma } from "./db/client";

export type LandingVariant = "classic" | "animated";

const SETTING_ID = "global";

export async function getLandingVariant(): Promise<LandingVariant> {
  const row = await prisma.landingPageSetting.findUnique({ where: { id: SETTING_ID } });
  return row?.variant === "animated" ? "animated" : "classic";
}

export async function setLandingVariant(variant: LandingVariant): Promise<void> {
  await prisma.landingPageSetting.upsert({
    where: { id: SETTING_ID },
    update: { variant },
    create: { id: SETTING_ID, variant },
  });
}
