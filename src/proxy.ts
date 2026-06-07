// Refreshes the Supabase auth session on Adept routes. Scoped via `matcher`
// so the portfolio is unaffected. No-ops until Supabase env vars are set.
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function proxy(request: NextRequest) {
  if (!URL || !ANON) return NextResponse.next();

  let response = NextResponse.next({ request });
  const supabase = createServerClient(URL, ANON, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  await supabase.auth.getUser(); // refreshes the token + cookies
  return response;
}

export const config = {
  matcher: ["/adept/:path*"],
};
