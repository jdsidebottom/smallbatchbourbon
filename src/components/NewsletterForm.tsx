"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { track } from "@/lib/analytics";
import type { SubscribeSource } from "@/lib/newsletter";

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "success" }
  | { kind: "duplicate" }
  | { kind: "error"; message: string };

/**
 * Weekly Pour capture (PRD §15). Handles loading, success, duplicate,
 * invalid-email and provider-error states explicitly.
 */
export function NewsletterForm({
  source,
  cta = "Get The Weekly Pour",
  placeholder = "you@example.com",
  successMessage = "You're in. Check your inbox to confirm.",
}: {
  source: SubscribeSource;
  cta?: string;
  placeholder?: string;
  successMessage?: string;
}) {
  const inputId = useId();
  const statusId = useId();
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [state, setState] = useState<State>({ kind: "idle" });

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (state.kind === "loading") return;

    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(trimmed)) {
      setState({ kind: "error", message: "Enter a valid email address." });
      return;
    }

    setState({ kind: "loading" });
    track("newsletter_signup_attempt", { source });

    try {
      const response = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed, source, company }),
      });
      const body = (await response.json().catch(() => ({}))) as {
        code?: string;
        message?: string;
      };

      if (body.code === "subscribed") {
        setState({ kind: "success" });
        setEmail("");
        track("newsletter_signup_success", { source });
        return;
      }
      if (body.code === "duplicate") {
        setState({ kind: "duplicate" });
        setEmail("");
        return;
      }
      if (body.code === "invalid_email") {
        setState({ kind: "error", message: body.message ?? "Enter a valid email address." });
        return;
      }
      setState({
        kind: "error",
        message: body.message ?? "Signup isn't available right now. Please try again later.",
      });
    } catch {
      setState({
        kind: "error",
        message: "We couldn't reach the server. Check your connection and try again.",
      });
    }
  };

  const isDone = state.kind === "success" || state.kind === "duplicate";

  return (
    <form onSubmit={submit} noValidate className="w-full">
      <label htmlFor={inputId} className="sr-only">
        Email address
      </label>

      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          id={inputId}
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          placeholder={placeholder}
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            if (state.kind === "error") setState({ kind: "idle" });
          }}
          aria-describedby={statusId}
          aria-invalid={state.kind === "error"}
          disabled={state.kind === "loading"}
          className="min-h-[3rem] flex-1 rounded-full border border-ink-line bg-ink px-5 text-[16px] text-cream placeholder:text-cream-muted focus:border-amber disabled:opacity-60"
        />

        {/* Honeypot — hidden from people and assistive tech, visible to bots. */}
        <div aria-hidden="true" className="absolute h-px w-px overflow-hidden opacity-0">
          <input
            type="text"
            name="company"
            tabIndex={-1}
            autoComplete="off"
            value={company}
            onChange={(event) => setCompany(event.target.value)}
          />
        </div>

        <button
          type="submit"
          disabled={state.kind === "loading"}
          className="min-h-[3rem] rounded-full bg-amber px-7 text-sm font-semibold tracking-[0.12em] text-ink uppercase transition hover:bg-amber-glow disabled:opacity-70"
        >
          {state.kind === "loading" ? "Signing up…" : cta}
        </button>
      </div>

      <p
        id={statusId}
        role="status"
        aria-live="polite"
        className={`mt-3 min-h-[1.25rem] text-sm ${
          state.kind === "error" ? "text-verdict-walk" : isDone ? "text-verdict-steal" : "text-cream-muted"
        }`}
      >
        {state.kind === "success" && successMessage}
        {state.kind === "duplicate" && "You're already on the list."}
        {state.kind === "error" && state.message}
        {(state.kind === "idle" || state.kind === "loading") && (
          <>
            One email a week. No spam, unsubscribe anytime. See our{" "}
            <Link href="/privacy" className="underline underline-offset-4 hover:text-cream-dim">
              Privacy Policy
            </Link>
            .
          </>
        )}
      </p>
    </form>
  );
}
