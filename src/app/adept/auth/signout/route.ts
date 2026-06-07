import { NextResponse } from "next/server";
import { createClient } from "@/lib/adept/supabase/server";
import { supabaseConfigured } from "@/lib/adept/supabase/client";

export async function POST(request: Request) {
  const { origin } = new URL(request.url);
  if (supabaseConfigured) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  return NextResponse.redirect(`${origin}/adept`, { status: 303 });
}
