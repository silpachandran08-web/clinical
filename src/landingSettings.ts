import { prisma } from "./db/client";

export type LandingVariant = "classic" | "animated" | "bento";

const VALID_VARIANTS: LandingVariant[] = ["classic", "animated", "bento"];

const SETTING_ID = "global";

export async function getLandingVariant(): Promise<LandingVariant> {
  const row = await prisma.landingPageSetting.findUnique({ where: { id: SETTING_ID } });
  return VALID_VARIANTS.includes(row?.variant as LandingVariant) ? (row!.variant as LandingVariant) : "classic";
}

export async function setLandingVariant(variant: LandingVariant): Promise<void> {
  await prisma.landingPageSetting.upsert({
    where: { id: SETTING_ID },
    update: { variant },
    create: { id: SETTING_ID, variant },
  });
}
