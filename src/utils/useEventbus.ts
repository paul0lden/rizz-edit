import { useCallback, useEffect } from "react";
import { EventBusManager } from "./thread";
import { CHANNEL_NAME } from "@/globals";

// Enhanced type definitions
type EventMap = Record<string, any>;
type RequestMap = Record<string, { request: any; response: any }>;
type EventCallback<T> = (payload: T) => void;
type RequestCallback<TReq, TRes> = (payload: TReq) => Promise<TRes>;

export const useEventBus = <E extends EventMap, R extends RequestMap>(
  channelName: string = CHANNEL_NAME
) => {
  const bus = EventBusManager.getInstance<E>(channelName);

  useEffect(() => {
    return () => {
      EventBusManager.releaseInstance(channelName);
    };
  }, [channelName]);

  // Regular event methods
  const emit = useCallback(
    <K extends keyof E>(eventType: K, payload: E[K]): void => {
      bus.emit(eventType, payload);
    },
    [bus]
  );

  const on = useCallback(
    <K extends keyof E>(
      eventType: K,
      callback: EventCallback<E[K]>
    ): (() => void) => {
      return bus.on(eventType, callback);
    },
    [bus]
  );

  const off = useCallback(
    <K extends keyof E>(
      eventType: K,
      callback: EventCallback<E[K]>
    ): void => {
      bus.off(eventType, callback);
    },
    [bus]
  );

  // Request-response methods
  const request = useCallback(
    async <K extends keyof R>(
      type: K,
      payload: R[K]["request"]
    ): Promise<R[K]["response"]> => {
      return bus.request(type, payload);
    },
    [bus]
  );

  const onRequest = useCallback(
    <K extends keyof R>(
      type: K,
      handler: RequestCallback<R[K]["request"], R[K]["response"]>
    ): (() => void) => {
      return bus.onRequest(type, handler);
    },
    [bus]
  );

  return {
    emit,
    on,
    off,
    request,
    onRequest,
  };
};
