import { cookies } from "next/headers";
import { env } from "@/src/config/env";
import { LANDING_ADMIN_COOKIE_NAME, verifyGateToken } from "@/lib/landingAdminAuth";
import { getLandingVariant } from "@/src/landingSettings";
import { setLandingVariantAction, landingLogoutAction } from "@/lib/actions/landingAdmin";
import { PasswordForm } from "./PasswordForm";

const OPTIONS = [
  {
    id: "classic" as const,
    label: "Classic",
    description: "The current CSS-only design — simple hero, feature grid, no motion libraries.",
  },
  {
    id: "animated" as const,
    label: "Animated",
    description: "GSAP scroll animations, Framer Motion, and Lenis smooth scroll — the newer, more dynamic design.",
  },
  {
    id: "bento" as const,
    label: "Bento",
    description: "Bold bento-grid layout, hard black borders, violet accent — clean neo-SaaS style, minimal animation.",
  },
  {
    id: "glass" as const,
    label: "Glass",
    description: "Glassmorphism on a dark glowing gradient — frosted panels, cyan/violet accents, futuristic and clean.",
  },
];

export default async function LandingAdminPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(LANDING_ADMIN_COOKIE_NAME)?.value;
  const authorized = await verifyGateToken(token, env.sessionSecret);

  if (!authorized) {
    return <PasswordForm />;
  }

  const activeVariant = await getLandingVariant();

  return (
    <div className="container" style={{ maxWidth: 720, marginTop: 60 }}>
      <div className="page-header">
        <h1>Landing page admin</h1>
        <form action={landingLogoutAction}>
          <button type="submit" className="secondary">
            Lock
          </button>
        </form>
      </div>
      <p className="muted" style={{ marginBottom: 24 }}>
        Choose which design is shown at the public homepage ("/"). Changes apply immediately.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {OPTIONS.map((opt) => (
          <div
            key={opt.id}
            className="card"
            style={{
              margin: 0,
              borderColor: activeVariant === opt.id ? "var(--accent)" : undefined,
              borderWidth: activeVariant === opt.id ? 2 : undefined,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
              <div>
                <h2 className="card-title-icon" style={{ margin: 0 }}>
                  {opt.label}
                  {activeVariant === opt.id && (
                    <span className="badge" style={{ marginLeft: 8 }}>
                      Live
                    </span>
                  )}
                </h2>
                <p className="muted" style={{ marginTop: 8, marginBottom: 16 }}>
                  {opt.description}
                </p>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <a
                href={`/landing_page/preview/${opt.id}`}
                target="_blank"
                rel="noreferrer"
                className="btn-link"
              >
                Preview →
              </a>
              {activeVariant !== opt.id && (
                <form action={setLandingVariantAction}>
                  <input type="hidden" name="variant" value={opt.id} />
                  <button type="submit">Make live</button>
                </form>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
