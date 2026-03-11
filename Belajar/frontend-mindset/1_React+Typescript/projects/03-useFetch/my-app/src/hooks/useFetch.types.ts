export type FetchStatus = "idle" | "loading" | "success" | "error";

export interface FetchState<T> {
  data: T | null;
  status: FetchStatus;
  error: FetchError | null;
}

export interface FetchError {
  message: string;
  statusCode?: number;
  originalError?: unknown;
}

export interface UseFetchOptions extends Omit<RequestInit, "signal"> {
  // Apakah langsung fetch saat hook dipanggil, atau tunggu trigger manual
  immediate?: boolean;
}

export interface UseFetchReturn<T> extends FetchState<T> {
  // Derived boolean states — convenience shorthand
  isIdle: boolean;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;

  // Trigger fetch atau refetch
  execute: () => Promise<void>;
  // Reset ke state awal
  reset: () => void;
}