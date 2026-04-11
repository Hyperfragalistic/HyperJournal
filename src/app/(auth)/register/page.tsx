"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName },
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // Update display_name in profile
    const { data: { session } } = await supabase.auth.getSession();
    if (session && displayName) {
      await supabase
        .from("profiles")
        .update({ display_name: displayName })
        .eq("id", session.user.id);
    }

    setSuccess(true);
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-hl-bg flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-hl-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-hl-secondary/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-hl flex items-center justify-center">
              <span className="text-hl-bg font-bold text-lg">HJ</span>
            </div>
            <span className="text-2xl font-bold hl-gradient-text">HyperJournal</span>
          </div>
          <p className="text-hl-text-muted text-sm">Start your trading journey</p>
        </div>

        <div className="hl-card p-8">
          <h1 className="text-xl font-semibold mb-6 text-center">Create account</h1>

          {success ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 rounded-full bg-hl-green/10 border border-hl-green/30 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-hl-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-hl-text font-medium">Account created!</p>
              <p className="text-hl-text-muted text-sm mt-1">Check your email to confirm your account</p>
              <Link
                href="/login"
                className="mt-4 inline-block text-sm text-hl-primary hover:underline"
              >
                Back to sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              {error && (
                <div className="bg-hl-red/10 border border-hl-red/30 text-hl-red text-sm rounded-lg px-4 py-3">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm text-hl-text-muted mb-1.5">Display name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="TraderJoe"
                  className="w-full bg-hl-bg-2 border border-hl-border rounded-lg px-4 py-2.5 text-hl-text placeholder:text-hl-text-dim focus:outline-none focus:border-hl-primary transition-colors"
                />
              </div>

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

              <div>
                <label className="block text-sm text-hl-text-muted mb-1.5">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  placeholder="Min. 8 characters"
                  className="w-full bg-hl-bg-2 border border-hl-border rounded-lg px-4 py-2.5 text-hl-text placeholder:text-hl-text-dim focus:outline-none focus:border-hl-primary transition-colors"
                />
              </div>

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
                {loading ? "Creating account..." : "Create account"}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-sm text-hl-text-muted mt-4">
          Already have an account?{" "}
          <Link href="/login" className="text-hl-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
