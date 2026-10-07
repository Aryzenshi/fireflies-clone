"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { errorMessage } from "@/lib/api";

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  /** true while a background refresh is running and stale data is on screen */
  refreshing: boolean;
  error: string | null;
  reload: (options?: { quiet?: boolean }) => Promise<void>;
  setData: (updater: T | ((current: T | null) => T | null)) => void;
}

/**
 * Minimal data-fetching hook with loading / error / refresh state.
 * Keeps request ordering safe by ignoring out-of-date responses.
 */
export function useAsyncData<T>(
  loader: () => Promise<T>,
  deps: ReadonlyArray<unknown>,
  options: { enabled?: boolean } = {},
): AsyncState<T> {
  const enabled = options.enabled ?? true;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loaderRef = useRef(loader);
  loaderRef.current = loader;
  const requestId = useRef(0);

  const run = useCallback(async (quiet: boolean) => {
    const id = ++requestId.current;
    if (quiet) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const result = await loaderRef.current();
      if (id !== requestId.current) return;
      setData(result);
      setError(null);
    } catch (caught) {
      if (id !== requestId.current) return;
      setError(errorMessage(caught));
    } finally {
      if (id === requestId.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    void run(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, run, ...deps]);

  const reload = useCallback(
    async (options_?: { quiet?: boolean }) => {
      await run(options_?.quiet ?? true);
    },
    [run],
  );

  const update = useCallback((updater: T | ((current: T | null) => T | null)) => {
    setData((current) => (typeof updater === "function" ? (updater as (c: T | null) => T | null)(current) : updater));
  }, []);

  return { data, loading, refreshing, error, reload, setData: update };
}
