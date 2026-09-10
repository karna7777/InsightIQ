"use client";

import { useEffect, useState } from "react";

export type Async<T> =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: T };

/**
 * Fetch-on-mount (and on dependency change) with loading/error/ready states and
 * a `reload()`. Centralizes the one place we intentionally set loading state at
 * the start of an effect, so panels stay declarative and lint-clean.
 */
export function useAsyncData<T>(
  fetcher: () => Promise<T>,
  deps: unknown[],
): { state: Async<T>; reload: () => void } {
  const [state, setState] = useState<Async<T>>({ status: "loading" });
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;
    // Intentional: show loading again whenever deps change (e.g. measure switch).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState({ status: "loading" });
    fetcher()
      .then((data) => {
        if (!cancelled) setState({ status: "ready", data });
      })
      .catch((err) => {
        if (!cancelled)
          setState({
            status: "error",
            message: err instanceof Error ? err.message : "Request failed.",
          });
      });
    return () => {
      cancelled = true;
    };
    // `fetcher` is recreated each render on purpose; `deps` + `nonce` drive refetches.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  return { state, reload: () => setNonce((n) => n + 1) };
}
