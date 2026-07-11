import { getLandingVariant } from "@/src/landingSettings";
import LandingAnimated from "./LandingAnimated";
import LandingClassic from "./LandingClassic";

export default async function Page() {
  const variant = await getLandingVariant();
  return variant === "animated" ? <LandingAnimated /> : <LandingClassic />;
}
