import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/adept/supabase/server";
import { supabaseConfigured } from "@/lib/adept/supabase/client";

export default async function AppDashboard() {
  if (!supabaseConfigured) {
    return (
      <main className="mx-auto max-w-2xl px-5 py-24 text-center">
        <h1 className="text-2xl font-bold">Adept isn&apos;t configured yet</h1>
        <p className="mt-3 text-[#aab0bd]">
          Add the Supabase environment variables to enable accounts.
        </p>
      </main>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/adept/login");

  return (
    <main className="mx-auto max-w-3xl px-5 py-16 sm:px-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-[#6d8bff]">your dashboard</div>
          <h1 className="mt-1 text-2xl font-bold">Welcome back</h1>
          <p className="mt-1 text-sm text-[#aab0bd]">{user.email}</p>
        </div>
        <form action="/adept/auth/signout" method="post">
          <button className="rounded-lg border border-white/[0.12] px-4 py-2 text-sm text-[#aab0bd] hover:border-[#6d8bff] hover:text-white">
            Sign out
          </button>
        </form>
      </div>

      <div className="mt-10 rounded-2xl border border-dashed border-white/[0.12] p-10 text-center">
        <p className="text-[#aab0bd]">
          Your topics will live here. The learning experience lands in the next phase.
        </p>
        <Link
          href="/tutor"
          className="mt-4 inline-block rounded-xl bg-[#6d8bff] px-5 py-2.5 text-sm font-semibold text-[#0a0c11] hover:-translate-y-0.5"
        >
          Try the demo meanwhile →
        </Link>
      </div>
    </main>
  );
}
