import { withAuth } from "next-auth/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";

const authRoutes = ["/login", "/signup"];

export default withAuth(
  async function middleware(req) {
    const supabaseResponse = await updateSession(req as NextRequest);

    const isAuthenticated = !!req.nextauth.token;
    const isAuthRoute = authRoutes.some((route) => req.nextUrl.pathname.startsWith(route));

    if (isAuthenticated && isAuthRoute) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    return supabaseResponse;
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
    "/api/workout-templates",
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
