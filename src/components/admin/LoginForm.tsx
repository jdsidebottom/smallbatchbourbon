"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/browser";

export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reveal, setReveal] = useState(false);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPending(true);
    setError(null);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError) {
      // Deliberately generic in production: never reveal whether an address has
      // an account. In development the real provider message is shown, because
      // "wrong password" and "project misconfigured" are otherwise
      // indistinguishable while setting the site up.
      setError(
        process.env.NODE_ENV === "development"
          ? `${signInError.message} (${signInError.code ?? signInError.status ?? "no code"})`
          : "Those credentials weren't accepted.",
      );
      setPending(false);
      return;
    }

    router.replace(next);
    router.refresh();
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-xs tracking-[0.14em] text-cream-muted uppercase">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="mt-2 min-h-12 w-full rounded-lg border border-ink-line bg-ink-card px-4 text-[16px] text-cream focus:border-amber"
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="block text-xs tracking-[0.14em] text-cream-muted uppercase"
        >
          Password
        </label>
        <div className="relative">
          <input
            id="password"
            type={reveal ? "text" : "password"}
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-2 min-h-12 w-full rounded-lg border border-ink-line bg-ink-card px-4 pr-20 text-[16px] text-cream focus:border-amber"
          />
          <button
            type="button"
            onClick={() => setReveal((value) => !value)}
            aria-pressed={reveal}
            className="absolute top-2 right-1 min-h-12 px-3 text-xs tracking-[0.1em] text-cream-muted uppercase transition hover:text-amber"
          >
            {reveal ? "Hide" : "Show"}
          </button>
        </div>
        {password.length > 0 && (
          <p className="mt-1.5 text-xs text-cream-muted">
            {password.length} characters
            {password !== password.trim() && (
              <span className="text-verdict-maybe"> · has a leading or trailing space</span>
            )}
          </p>
        )}
      </div>

      {error && (
        <p role="alert" className="text-sm text-verdict-walk">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="min-h-12 w-full rounded-full bg-amber text-sm font-semibold tracking-[0.12em] text-ink uppercase transition hover:bg-amber-glow disabled:opacity-70"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
