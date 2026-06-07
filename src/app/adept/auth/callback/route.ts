// OAuth / email-confirm callback: exchanges the code for a session, then redirects.
import { NextResponse } from "next/server";
import { createClient } from "@/lib/adept/supabase/server";
import { supabaseConfigured } from "@/lib/adept/supabase/client";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") || "/adept/app";

  if (code && supabaseConfigured) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }
  return NextResponse.redirect(`${origin}/adept/login`);
}
