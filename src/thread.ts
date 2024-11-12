type EventMap = Record<string, any>;
type EventCallback<T> = (payload: T) => void;
interface EventMessage<K extends keyof EventMap> {
  type: K;
  payload: EventMap[K];
}

export class EventBus<T extends EventMap> {
  private channel: BroadcastChannel;
  private listeners: Map<keyof T, Set<EventCallback<any>>>;

  constructor(channelName: string = "app-events") {
    this.channel = new BroadcastChannel(channelName);
    this.listeners = new Map();

    // Handle messages from other threads
    this.channel.onmessage = (event: MessageEvent<EventMessage<keyof T>>) => {
      this.handleEvent(event.data.type, event.data.payload);
    };
  }

  private handleEvent<K extends keyof T>(type: K, payload: T[K]): void {
    if (this.listeners.has(type)) {
      this.listeners.get(type)?.forEach((callback) => {
        try {
          callback(payload);
        } catch (error) {
          console.error(`Error in event listener for ${String(type)}:`, error);
        }
      });
    }
  }

  on<K extends keyof T>(
    eventType: K,
    callback: EventCallback<T[K]>
  ): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)?.add(callback);
    return () => {
      this.off(eventType, callback);
    };
  }

  off<K extends keyof T>(eventType: K, callback: EventCallback<T[K]>): void {
    if (this.listeners.has(eventType)) {
      this.listeners.get(eventType)?.delete(callback);
      if (this.listeners.get(eventType)?.size === 0) {
        this.listeners.delete(eventType);
      }
    }
  }

  emit<K extends keyof T>(eventType: K, payload: T[K]): void {
    // Handle the event locally first
    this.handleEvent(eventType, payload);

    // Then broadcast to other threads
    this.channel.postMessage({
      type: eventType,
      payload,
    });
  }

  destroy(): void {
    this.listeners.clear();
    this.channel.close();
  }
}

export class EventBusManager {
  private static instances = new Map<
    string,
    {
      bus: EventBus<any>;
      refCount: number;
      __type?: any;
    }
  >();

  static getInstance<T extends Record<string, any>>(
    channelName: string,
    _typeValidator?: T
  ): EventBus<T> {
    const existing = this.instances.get(channelName);

    if (existing) {
      existing.refCount++;
      return existing.bus as EventBus<T>;
    }

    const newBus = new EventBus<T>(channelName);
    this.instances.set(channelName, {
      bus: newBus,
      refCount: 1,
      __type: _typeValidator,
    });

    return newBus;
  }

  static releaseInstance(channelName: string): void {
    const instance = this.instances.get(channelName);
    if (!instance) return;

    instance.refCount--;
    if (instance.refCount <= 0) {
      instance.bus.destroy();
      this.instances.delete(channelName);
    }
  }

  static getInstanceCount(channelName: string): number {
    return this.instances.get(channelName)?.refCount ?? 0;
  }
}
