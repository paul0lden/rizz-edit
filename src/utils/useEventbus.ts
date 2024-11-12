import { useCallback, useEffect } from "react";
import { EventBusManager } from "./thread";

type EventMap = Record<any, any>
type EventCallback<T> = () => any

export const useEventBus = (channelName: string = "rizz-edit") => {
  const bus = EventBusManager.getInstance(channelName);

  useEffect(() => {
    return () => {
      EventBusManager.releaseInstance(channelName);
    };
  }, [channelName]);

  const emit = useCallback(
    <K extends keyof EventMap>(eventType: K, payload: EventMap[K]): void => {
      bus.emit(eventType, payload);
    },
    [bus]
  );

  const on = useCallback(
    <K extends keyof EventMap>(
      eventType: K,
      callback: EventCallback<EventMap[K]>
    ): (() => void) => {
      return bus.on(eventType, callback);
    },
    [bus]
  );

  const off = useCallback(
    <K extends keyof EventMap>(
      eventType: K,
      callback: EventCallback<EventMap[K]>
    ): void => {
      bus.off(eventType, callback);
    },
    [bus]
  );

  return {
    emit,
    on,
    off,
  };
};
