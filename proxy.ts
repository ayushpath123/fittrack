import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

const authRoutes = ["/login", "/signup"];

export default withAuth(
  function middleware(req) {
    const isAuthenticated = !!req.nextauth.token;
    const isAuthRoute = authRoutes.some((route) => req.nextUrl.pathname.startsWith(route));

    if (isAuthenticated && isAuthRoute) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    return NextResponse.next();
  },
  {
    pages: {
      signIn: "/login",
    },
  }
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/meals/:path*",
    "/workout/:path*",
    "/weight/:path*",
    "/calendar/:path*",
    "/analytics/:path*",
    "/weekly/:path*",
    "/settings/:path*",
    "/verify-phone",
    "/onboarding",
    "/api/meals/:path*",
    "/api/workout/:path*",
    "/api/weight/:path*",
    "/api/settings/:path*",
    "/api/analytics/:path*",
    "/api/export",
    "/api/import",
    "/api/hydration",
    "/api/hydration/:path*",
    "/api/food/:path*",
    "/api/food/from-barcode",
    "/api/ai/:path*",
  ],
};
