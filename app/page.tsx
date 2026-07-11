import { getLandingVariant } from "@/src/landingSettings";
import LandingAnimated from "./LandingAnimated";
import LandingBento from "./LandingBento";
import LandingClassic from "./LandingClassic";

export default async function Page() {
  const variant = await getLandingVariant();
  if (variant === "animated") return <LandingAnimated />;
  if (variant === "bento") return <LandingBento />;
  return <LandingClassic />;
}
