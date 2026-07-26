import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware() {
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: ["/dashboard/:path*", "/profile/:path*", "/change-password/:path*", "/invoices/:path*", "/company-settings/:path*", "/customers/:path*", "/products/:path*", "/settings/:path*"],
};
