"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Cloudflare Turnstile widget.
 *
 * Rendered explicitly rather than via the `cf-turnstile` class so the token can
 * be handed back to the form and the widget reset between submits — tokens are
 * single-use, so a form that submits twice without a reset gets
 * `timeout-or-duplicate` on the second try and blames the visitor for it.
 *
 * `appearance: "interaction-only"` keeps the widget invisible unless Cloudflare
 * actually wants an interaction, which is the common case. That is why the form
 * waits for a token instead of gating its submit button on one: there is
 * usually nothing on screen to explain why the button would be disabled.
 */

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "error-callback"?: () => void;
          "expired-callback"?: () => void;
          theme?: "light" | "dark" | "auto";
          appearance?: "always" | "execute" | "interaction-only";
          action?: string;
size?: "normal" | "flexible" | "compact";
        },
      ) => string | undefined;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
  }
}

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

/** Loads the Turnstile script once per document, however many widgets mount. */
let scriptPromise: Promise<void> | null = null;

function loadTurnstile(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.turnstile) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("turnstile script failed")));
      return;
    }

    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => {
      // Let a later mount retry rather than caching the failure forever.
      scriptPromise = null;
      reject(new Error("turnstile script failed"));
    };
    document.head.appendChild(script);
  });

  return scriptPromise;
}

export type TurnstileHandle = {
  /**
   * Resolves with a token, or `null` if Turnstile could not produce one within
   * `timeoutMs`. Callers decide what a `null` means; the newsletter form
   * surfaces it as a retryable error rather than dropping the signup.
   */
  getToken: (timeoutMs?: number) => Promise<string | null>;
  reset: () => void;
};

export function useTurnstile(action: string) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | undefined>(undefined);
  const tokenRef = useRef<string | null>(null);
  const waitersRef = useRef<Array<(token: string | null) => void>>([]);
  const [siteKey] = useState(() => process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "");

  const settle = useCallback((token: string | null) => {
    tokenRef.current = token;
    if (token !== null) {
      for (const resolve of waitersRef.current) resolve(token);
      waitersRef.current = [];
    }
  }, []);

  useEffect(() => {
    if (!siteKey) return;
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;

    loadTurnstile()
      .then(() => {
        if (cancelled || !window.turnstile || !containerRef.current) return;
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          action,
          theme: "dark",
          appearance: "interaction-only",
          size: "flexible",
          callback: (token) => settle(token),
          "error-callback": () => settle(null),
          "expired-callback": () => settle(null),
        });
      })
      .catch(() => {
        // Script blocked (an ad blocker, a captive network). getToken will time
        // out and the form reports a retryable error.
      });

    return () => {
      cancelled = true;
      const id = widgetIdRef.current;
      if (id && window.turnstile) window.turnstile.remove(id);
      widgetIdRef.current = undefined;
      // Nobody is going to resolve these once the widget is gone.
      for (const resolve of waitersRef.current) resolve(null);
      waitersRef.current = [];
    };
  }, [siteKey, action, settle]);

  const getToken = useCallback(
    (timeoutMs = 8000): Promise<string | null> => {
      if (!siteKey) return Promise.resolve(null);
      if (tokenRef.current) return Promise.resolve(tokenRef.current);

      return new Promise<string | null>((resolve) => {
        let done = false;
        const finish = (token: string | null) => {
          if (done) return;
          done = true;
          resolve(token);
        };
        waitersRef.current.push(finish);
        window.setTimeout(() => finish(null), timeoutMs);
      });
    },
    [siteKey],
  );

  const reset = useCallback(() => {
    tokenRef.current = null;
    const id = widgetIdRef.current;
    if (id && window.turnstile) window.turnstile.reset(id);
  }, []);

  return {
    /** `false` when no site key is configured — the form then skips verification. */
    enabled: Boolean(siteKey),
    containerRef,
    getToken,
    reset,
  };
}

/** The mount point. Renders nothing at all when Turnstile is not configured. */
export function TurnstileContainer({
  containerRef,
  enabled,
}: {
  containerRef: React.RefObject<HTMLDivElement | null>;
  enabled: boolean;
}) {
  if (!enabled) return null;
  return <div ref={containerRef} className="mt-3 empty:mt-0" />;
}
