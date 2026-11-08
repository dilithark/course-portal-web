"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, errorMessage } from "./api";

/** GETs `path` (null = skip) and exposes data/error/loading plus a reload function. */
export function useApi<T>(path: string | null) {
  const [state, setState] = useState<{ data?: T; error?: string; loading: boolean }>({ loading: !!path });
  const current = useRef(path);

  const reload = useCallback(async () => {
    if (!path) return;
    current.current = path;
    try {
      const data = await api<T>(path);
      if (current.current === path) setState({ data, loading: false });
    } catch (e) {
      if (current.current === path) setState((s) => ({ ...s, error: errorMessage(e), loading: false }));
    }
  }, [path]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { ...state, reload };
}

/** Runs a mutation with pending/error state. Resolves to the result, or undefined on failure. */
export function useAction() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const run = useCallback(async <R,>(fn: () => Promise<R>): Promise<R | undefined> => {
    setPending(true);
    setError("");
    try {
      return await fn();
    } catch (e) {
      setError(errorMessage(e));
      return undefined;
    } finally {
      setPending(false);
    }
  }, []);
  return { run, pending, error, setError };
}

export const formObject = (f: HTMLFormElement) => Object.fromEntries(new FormData(f)) as Record<string, string>;

/** Current time, refreshed every `ms` — keeps render pure while relative times stay fresh. */
export function useNow(ms = 30_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}
