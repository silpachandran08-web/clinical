import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { env } from "@/src/config/env";
import { LANDING_ADMIN_COOKIE_NAME, verifyGateToken } from "@/lib/landingAdminAuth";
import { PasswordForm } from "../../PasswordForm";
import LandingAnimated from "../../../LandingAnimated";
import LandingClassic from "../../../LandingClassic";

export default async function LandingPreviewPage({
  params,
}: {
  params: Promise<{ variant: string }>;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get(LANDING_ADMIN_COOKIE_NAME)?.value;
  const authorized = await verifyGateToken(token, env.sessionSecret);

  if (!authorized) {
    return <PasswordForm />;
  }

  const { variant } = await params;
  if (variant === "animated") return <LandingAnimated />;
  if (variant === "classic") return <LandingClassic />;
  notFound();
}
