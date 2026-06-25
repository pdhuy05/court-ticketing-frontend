import { NextRequest, NextResponse } from "next/server";

const FALLBACK_DEV_ONLY_PATH = "/__set-ADMIN_PORTAL_PATH-in-env__";

const RAW_PORTAL_PATH = process.env.ADMIN_PORTAL_PATH || FALLBACK_DEV_ONLY_PATH;
const ADMIN_PORTAL_PATH = RAW_PORTAL_PATH.startsWith("/")
  ? RAW_PORTAL_PATH.replace(/\/+$/, "")
  : `/${RAW_PORTAL_PATH.replace(/\/+$/, "")}`;

const REAL_ADMIN_PREFIX = "/admin";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === REAL_ADMIN_PREFIX || pathname.startsWith(`${REAL_ADMIN_PREFIX}/`)) {
    const url = request.nextUrl.clone();
    url.pathname = "/__blocked__/admin-route-not-found";
    return NextResponse.rewrite(url);
  }

  if (pathname === ADMIN_PORTAL_PATH || pathname.startsWith(`${ADMIN_PORTAL_PATH}/`)) {
    const rest = pathname.slice(ADMIN_PORTAL_PATH.length); 
    const url = request.nextUrl.clone();
    url.pathname = `${REAL_ADMIN_PREFIX}${rest}`;
    const response = NextResponse.rewrite(url);

    response.cookies.set("admin_base", ADMIN_PORTAL_PATH, {
      path: "/",
      sameSite: "lax",
      httpOnly: false,
    });
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|assets/).*)"],
};