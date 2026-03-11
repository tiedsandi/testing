
import { useState, useEffect, useCallback, useRef } from "react";
import type {
  FetchState,
  FetchError,
  UseFetchOptions,
  UseFetchReturn,
} from "./useFetch.types";

const INITIAL_STATE = <T>(): FetchState<T> => ({
  data: null,
  status: "idle",
  error: null,
});

function useFetch<T>(url: string, options: UseFetchOptions = {}): UseFetchReturn<T> {
  const { immediate = true, ...fetchOptions } = options;

  const [state, setState] = useState<FetchState<T>>(INITIAL_STATE<T>);

  // Ref untuk AbortController agar bisa di-cancel
  const abortControllerRef = useRef<AbortController | null>(null);

  // Ref untuk track apakah component masih mounted
  const isMountedRef = useRef(true);

  // Fungsi fetch utama — dibungkus useCallback agar stabil
  const execute = useCallback(async (): Promise<void> => {
    // Cancel request sebelumnya kalau ada
    abortControllerRef.current?.abort();

    // Buat AbortController baru untuk request ini
    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Set status loading
    setState((prev) => ({
      ...prev,
      status: "loading",
      error: null,
    }));

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
      });

      // Handle HTTP error (4xx, 5xx)
      if (!response.ok) {
        const fetchError: FetchError = {
          message: `Fetch failed with status ${response.status}: ${response.statusText}`,
          statusCode: response.status,
        };
        throw fetchError;
      }

      // Parse JSON response
      const data: T = await response.json();

      // Hanya update state kalau component masih mounted
      if (isMountedRef.current) {
        setState({
          data,
          status: "success",
          error: null,
        });
      }
    } catch (err: unknown) {
      // Jangan update state kalau request di-cancel (component unmount)
      if (err instanceof DOMException && err.name === "AbortError") {
        return;
      }

      if (!isMountedRef.current) return;

      // Normalize semua jenis error ke FetchError
      let fetchError: FetchError;

      if (isFetchError(err)) {
        fetchError = err;
      } else if (err instanceof Error) {
        fetchError = {
          message: err.message,
          originalError: err,
        };
      } else {
        fetchError = {
          message: "Terjadi kesalahan yang tidak diketahui.",
          originalError: err,
        };
      }

      setState({
        data: null,
        status: "error",
        error: fetchError,
      });
    }
  }, [url, JSON.stringify(fetchOptions)]); // eslint-disable-line

  // Reset ke initial state
  const reset = useCallback((): void => {
    abortControllerRef.current?.abort();
    setState(INITIAL_STATE<T>());
  }, []);

  // Auto-fetch saat mount kalau `immediate` true
  useEffect(() => {
    isMountedRef.current = true;

    if (immediate) {
      execute();
    }

    return () => {
      isMountedRef.current = false;
      abortControllerRef.current?.abort();
    };
  }, [execute, immediate]);

  // Derived booleans — convenience
  const isIdle    = state.status === "idle";
  const isLoading = state.status === "loading";
  const isSuccess = state.status === "success";
  const isError   = state.status === "error";

  return {
    ...state,
    isIdle,
    isLoading,
    isSuccess,
    isError,
    execute,
    reset,
  };
}

// Type guard untuk FetchError
function isFetchError(err: unknown): err is FetchError {
  return (
    typeof err === "object" &&
    err !== null &&
    "message" in err &&
    typeof (err as FetchError).message === "string"
  );
}

export default useFetch;