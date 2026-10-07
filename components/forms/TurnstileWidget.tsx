"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";

import { CONTACT_ACTION } from "@/lib/contact/turnstile-action";

interface TurnstileApi {
  render: (
    container: HTMLElement,
    options: Record<string, unknown>
  ) => string;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT_ID = "cf-turnstile-script";
const SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

let scriptPromise: Promise<TurnstileApi> | null = null;

/* Loads the Turnstile script once per page lifetime, shared by every widget mount. */
function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) {
    return Promise.resolve(window.turnstile);
  }

  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const existing = document.getElementById(SCRIPT_ID);
      const script =
        existing instanceof HTMLScriptElement
          ? existing
          : Object.assign(document.createElement("script"), {
              id: SCRIPT_ID,
              src: SCRIPT_SRC,
              async: true,
              defer: true,
            });

      script.addEventListener("load", () => {
        if (window.turnstile) {
          resolve(window.turnstile);
        } else {
          reject(new Error("Turnstile failed to initialise"));
        }
      });

      script.addEventListener("error", () => {
        // Allow a later mount to retry the download.
        scriptPromise = null;
        script.remove();
        reject(new Error("Turnstile script failed to load"));
      });

      if (!existing) {
        document.head.appendChild(script);
      }
    });
  }

  return scriptPromise;
}

export interface TurnstileHandle {
  /** Discard the current token and issue a fresh challenge. Tokens are single-use. */
  reset: () => void;
}

interface TurnstileWidgetProps {
  siteKey: string;
  onToken: (token: string) => void;
  /** Token expired, errored or was cleared: the form must not submit with the old one. */
  onTokenCleared: () => void;
  /** The widget itself could not load or run (blocked script, bad site key, hostname). */
  onUnavailable: (reason: string) => void;
}

/*
 * Explicitly rendered Cloudflare Turnstile widget.
 *
 * Why explicit render: the implicit `.cf-turnstile` mode only scans the DOM when the script
 * first loads, so a widget mounted later (client-side navigation to /contact, or "send
 * another enquiry") never rendered and the form had no token. Explicit render also gives us
 * reset(), which a single-use token needs after every submit attempt.
 */
const TurnstileWidget = forwardRef<TurnstileHandle, TurnstileWidgetProps>(
  function TurnstileWidget(
    { siteKey, onToken, onTokenCleared, onUnavailable },
    ref
  ) {
    const containerRef = useRef<HTMLDivElement>(null);
    const widgetIdRef = useRef<string | null>(null);

    // Latest callbacks without re-rendering the widget when the parent re-renders.
    const callbacks = useRef({ onToken, onTokenCleared, onUnavailable });
    callbacks.current = { onToken, onTokenCleared, onUnavailable };

    useImperativeHandle(ref, () => ({
      reset() {
        if (widgetIdRef.current && window.turnstile) {
          window.turnstile.reset(widgetIdRef.current);
        }
        callbacks.current.onTokenCleared();
      },
    }));

    useEffect(() => {
      let cancelled = false;

      loadTurnstile()
        .then((turnstile) => {
          if (cancelled || !containerRef.current) {
            return;
          }

          widgetIdRef.current = turnstile.render(containerRef.current, {
            sitekey: siteKey,
            theme: "light",
            // "flexible" has a 300 px minimum, wider than the form on a 320 px phone,
            // which pushed the whole contact page past its gutter. Compact (150 px) there.
            size: containerRef.current.offsetWidth < 300 ? "compact" : "flexible",
            action: CONTACT_ACTION,
            callback: (token: string) => callbacks.current.onToken(token),
            "expired-callback": () => callbacks.current.onTokenCleared(),
            "timeout-callback": () => callbacks.current.onTokenCleared(),
            "error-callback": (code: string) => {
              callbacks.current.onTokenCleared();
              callbacks.current.onUnavailable(String(code));
              // Returning true tells Turnstile we handled it (no console rethrow).
              return true;
            },
          });
        })
        .catch((error: unknown) => {
          if (!cancelled) {
            callbacks.current.onUnavailable(
              error instanceof Error ? error.message : "load-failed"
            );
          }
        });

      return () => {
        cancelled = true;

        if (widgetIdRef.current && window.turnstile) {
          window.turnstile.remove(widgetIdRef.current);
        }

        widgetIdRef.current = null;
      };
    }, [siteKey]);

    return <div ref={containerRef} className="min-h-[65px]" />;
  }
);

export default TurnstileWidget;
