import { useState, useCallback, useEffect, useRef } from "react";
import { AxiosError } from "axios";
import { getErrorMessage } from "@/utils/toast";

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface UseApiResult<T> extends UseApiState<T> {
  refetch: () => Promise<void>;
  setData: (data: T | null) => void;
}

/**
 * Generic hook for API calls with loading and error states
 * Performance optimized: uses ref to store latest apiCall function to prevent unnecessary re-renders
 */
export const useApi = <T>(
  apiCall: () => Promise<T>,
  immediate = true,
): UseApiResult<T> => {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: immediate,
    error: null,
  });

  // Use ref to store the latest apiCall function without causing re-renders
  const apiCallRef = useRef(apiCall);
  useEffect(() => {
    apiCallRef.current = apiCall;
  }, [apiCall]);

  // Track if component is mounted to prevent state updates after unmount
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const refetch = useCallback(async () => {
    if (!isMountedRef.current) return;
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const result = await apiCallRef.current();
      // Only update state if component is still mounted
      if (isMountedRef.current) {
        setState({ data: result, loading: false, error: null });
      }
    } catch (err) {
      // Only update state if component is still mounted
      if (isMountedRef.current) {
        const error = err as AxiosError;
        const message = getErrorMessage(error);
        setState({ data: null, loading: false, error: message });
      }
    }
  }, []);

  // Auto-fetch on mount with cleanup
  useEffect(() => {
    if (immediate) {
      (async () => {
        if (!isMountedRef.current) return;
        setState((prev) => ({ ...prev, loading: true, error: null }));
        try {
          const result = await apiCallRef.current();
          if (isMountedRef.current) {
            setState({ data: result, loading: false, error: null });
          }
        } catch (err) {
          if (isMountedRef.current) {
            const error = err as AxiosError;
            const message = getErrorMessage(error);
            setState({ data: null, loading: false, error: message });
          }
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [immediate]);

  const setData = useCallback((data: T | null) => {
    setState((prev) => ({ ...prev, data }));
  }, []);

  return {
    ...state,
    refetch,
    setData,
  };
};

/**
 * Hook for managing mutations (POST, PUT, DELETE)
 */
export const useMutation = <TData, TResponse>(
  mutationFn: (data: TData) => Promise<TResponse>,
) => {
  const [state, setState] = useState({
    loading: false,
    error: null as string | null,
  });

  const mutate = useCallback(
    async (data: TData) => {
      setState({ loading: true, error: null });
      try {
        const result = await mutationFn(data);
        setState({ loading: false, error: null });
        return result;
      } catch (err) {
        const error = err as AxiosError;
        const message = getErrorMessage(error);
        setState({ loading: false, error: message });
        throw err;
      }
    },
    [mutationFn],
  );

  return {
    ...state,
    mutate,
  };
};
