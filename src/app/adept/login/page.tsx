"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient, supabaseConfigured } from "@/lib/adept/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  if (!supabaseConfigured) {
    return (
      <main className="mx-auto max-w-md px-5 py-24 text-center">
        <h1 className="text-2xl font-bold">Almost there</h1>
        <p className="mt-3 text-[#aab0bd]">
          Adept needs Supabase configured. Add the project keys to enable sign-in.
        </p>
      </main>
    );
  }

  async function google() {
    setErr(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/adept/auth/callback?next=/adept/app` },
    });
    if (error) setErr(error.message);
  }

  async function email_(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    setBusy(true);
    const supabase = createClient();
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/adept/auth/callback?next=/adept/app` },
        });
        if (error) throw error;
        setMsg("Check your email to confirm your account, then sign in.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push("/adept/app");
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-md px-5 py-20 sm:py-24">
      <h1 className="text-3xl font-bold tracking-tight">
        {mode === "signin" ? "Welcome back" : "Create your account"}
      </h1>
      <p className="mt-2 text-[#aab0bd]">Learn anything, with progress that follows you.</p>

      <button
        onClick={google}
        className="mt-7 flex w-full items-center justify-center gap-3 rounded-xl border border-white/[0.12] bg-white/[0.03] px-4 py-3 font-medium transition-colors hover:border-[#6d8bff]"
      >
        <span className="text-lg">🇬</span> Continue with Google
      </button>

      <div className="my-6 flex items-center gap-3 text-xs text-[#6b7280]">
        <span className="h-px flex-1 bg-white/[0.08]" /> or <span className="h-px flex-1 bg-white/[0.08]" />
      </div>

      <form onSubmit={email_} className="space-y-3">
        <input
          type="email"
          required
          placeholder="you@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-xl border border-white/[0.1] bg-white/[0.03] px-4 py-3 text-sm outline-none focus:border-[#6d8bff]"
        />
        <input
          type="password"
          required
          minLength={6}
          placeholder="password (6+ chars)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-xl border border-white/[0.1] bg-white/[0.03] px-4 py-3 text-sm outline-none focus:border-[#6d8bff]"
        />
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-[#6d8bff] px-4 py-3 font-semibold text-[#0a0c11] transition-transform enabled:hover:-translate-y-0.5 disabled:opacity-50"
        >
          {busy ? "…" : mode === "signin" ? "Sign in" : "Sign up"}
        </button>
      </form>

      {err && <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{err}</p>}
      {msg && <p className="mt-4 rounded-lg border border-[#6d8bff]/30 bg-[#6d8bff]/10 p-3 text-sm text-[#aab8ff]">{msg}</p>}

      <button
        onClick={() => {
          setMode(mode === "signin" ? "signup" : "signin");
          setErr(null);
          setMsg(null);
        }}
        className="mt-6 text-sm text-[#aab0bd] hover:text-white"
      >
        {mode === "signin" ? "New here? Create an account" : "Already have an account? Sign in"}
      </button>
    </main>
  );
}
