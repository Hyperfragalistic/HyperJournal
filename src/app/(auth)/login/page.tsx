"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [mode, setMode] = useState<"password" | "magic">("password");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (mode === "password") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } else {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/dashboard` },
      });
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      setMagicLinkSent(true);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-hl-bg flex items-center justify-center p-4">
      {/* Background gradient */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-hl-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-hl-secondary/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-hl flex items-center justify-center">
              <span className="text-hl-bg font-bold text-lg">HJ</span>
            </div>
            <span className="text-2xl font-bold hl-gradient-text">HyperJournal</span>
          </div>
          <p className="text-hl-text-muted text-sm">
            Hyperliquid trading journal &amp; AI coach
          </p>
        </div>

        {/* Card */}
        <div className="hl-card p-8">
          <h1 className="text-xl font-semibold mb-6 text-center">Sign in</h1>

          {magicLinkSent ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 rounded-full bg-hl-primary/10 border border-hl-primary/30 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-hl-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-hl-text font-medium">Check your email</p>
              <p className="text-hl-text-muted text-sm mt-1">
                We sent a magic link to <strong className="text-hl-primary">{email}</strong>
              </p>
              <button
                onClick={() => setMagicLinkSent(false)}
                className="mt-4 text-sm text-hl-text-muted hover:text-hl-primary transition-colors"
              >
                Try a different email
              </button>
            </div>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              {error && (
                <div className="bg-hl-red/10 border border-hl-red/30 text-hl-red text-sm rounded-lg px-4 py-3">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm text-hl-text-muted mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="trader@example.com"
                  className="w-full bg-hl-bg-2 border border-hl-border rounded-lg px-4 py-2.5 text-hl-text placeholder:text-hl-text-dim focus:outline-none focus:border-hl-primary transition-colors"
                />
              </div>

              {mode === "password" && (
                <div>
                  <label className="block text-sm text-hl-text-muted mb-1.5">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full bg-hl-bg-2 border border-hl-border rounded-lg px-4 py-2.5 text-hl-text placeholder:text-hl-text-dim focus:outline-none focus:border-hl-primary transition-colors"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className={cn(
                  "w-full py-2.5 rounded-lg font-medium text-sm transition-all",
                  "bg-hl-primary text-hl-bg hover:bg-hl-secondary",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  "shadow-hl hover:shadow-hl-strong"
                )}
              >
                {loading
                  ? "Signing in..."
                  : mode === "password"
                  ? "Sign in"
                  : "Send magic link"}
              </button>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-hl-border" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-hl-bg-card px-2 text-hl-text-dim">or</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setMode(mode === "password" ? "magic" : "password")}
                className="w-full py-2.5 rounded-lg font-medium text-sm border border-hl-border text-hl-text-muted hover:border-hl-primary hover:text-hl-primary transition-all"
              >
                {mode === "password" ? "Use magic link instead" : "Use password instead"}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-sm text-hl-text-muted mt-4">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-hl-primary hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
