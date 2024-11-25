import { useEffect, useState, useCallback } from "react";
import { EventBus } from "./thread"; // your event bus implementation
import { useEventBus } from "./useEventbus";

type SyncStateEvents<T> = {
  stateUpdated: { data: Partial<T> };
};

type SyncStateRequests<T> = {
  getState: {
    request: void;
    response: T;
  };
};

export function useSyncState<T>({
  requestName,
  subName,
  defaultValue,
}: {
  subName: string;
  requestName: string;
  defaultValue: T;
}) {
  const bus = useEventBus();
  const [state, setState] = useState<T>(defaultValue);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    const initializeState = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const initialState = await bus.request(requestName, undefined);

        if (mounted) {
          setState(initialState);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err : new Error('Failed to fetch initial state'));
          setState(defaultValue);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    const handleUpdate = (update: { data: Partial<T> }) => {
      setState(currentState => ({
        ...currentState,
        ...update.data
      }));
    };

    initializeState();

    const unsubscribe = bus.on(subName, handleUpdate);

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [subName, requestName, bus, defaultValue]);

  const updateState = useCallback((update: Partial<T>) => {
    bus.emit(requestName, { data: update });
  }, [bus, requestName]);

  return {
    state,
    updateState,
    isLoading,
    error,
  };
}
