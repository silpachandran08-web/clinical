import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionToken, type UserRole } from "@/lib/auth";

const ROLE_HOME: Record<UserRole, string> = {
  CLINIC_ADMIN: "/admin",
  RECEPTIONIST: "/receptionist",
  DOCTOR: "/doctor",
  NURSE: "/nurse",
  LAB: "/lab",
};

const ROLE_FOR_PREFIX: Record<string, UserRole> = {
  "/admin": "CLINIC_ADMIN",
  "/receptionist": "RECEPTIONIST",
  "/doctor": "DOCTOR",
  "/nurse": "NURSE",
  "/lab": "LAB",
};

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/login" || pathname === "/register") {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const secret = process.env.SESSION_SECRET;
  const session = secret ? await verifySessionToken(token, secret) : null;

  if (pathname === "/") {
    // Logged-in visitors get bounced straight to their dashboard; everyone
    // else sees the public marketing landing page.
    if (session) {
      return NextResponse.redirect(new URL(ROLE_HOME[session.role], request.url));
    }
    return NextResponse.next();
  }

  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  for (const [prefix, requiredRole] of Object.entries(ROLE_FOR_PREFIX)) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      if (session.role !== requiredRole) {
        return NextResponse.redirect(new URL(ROLE_HOME[session.role], request.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/admin/:path*", "/receptionist/:path*", "/doctor/:path*", "/nurse/:path*", "/lab/:path*"],
};
