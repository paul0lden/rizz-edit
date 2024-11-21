import { ClipMeta } from "@/types";

export type EventMap = {
  addFiles: { files: File[] };
  addClips: ClipMeta[];
  removeClip: { id: string };
};

type RequestMap = Record<string, { request: any; response: any }>;
export type EventCallback<T> = (payload: T) => void;
type RequestCallback<TReq, TRes> = (payload: TReq) => Promise<TRes>;

export type BusEventCallback<TEventName extends keyof EventMap> = EventCallback<
  EventMap[TEventName]
>;

interface EventMessage<K extends keyof EventMap> {
  type: K;
  payload: EventMap[K];
}

interface RequestOptions {
  echo?: {
    repeat?: number;
    delay?: number;
  };
}

interface RequestMessage<K extends keyof RequestMap> {
  type: K;
  payload: RequestMap[K]["request"];
  requestId: string;
  isRequest: true;
  options?: RequestOptions;
}

interface ResponseMessage<K extends keyof RequestMap> {
  type: K;
  payload: RequestMap[K]["response"];
  requestId: string;
  isResponse: true;
}

type BusMessage<E extends EventMap, R extends RequestMap> =
  | EventMessage<keyof E>
  | RequestMessage<keyof R>
  | ResponseMessage<keyof R>;

export class EventBus<E extends EventMap, R extends RequestMap> {
  private channel: BroadcastChannel;
  private listeners: Map<keyof E, Set<EventCallback<any>>>;
  private requestHandlers: Map<keyof R, RequestCallback<any, any>>;
  private pendingRequests: Map<
    string,
    {
      resolve: (value: any) => void;
      reject: (reason: any) => void;
      echoTimeouts?: number[];
    }
  >;

  constructor(channelName: string = "app-events") {
    this.channel = new BroadcastChannel(channelName);
    this.listeners = new Map();
    this.requestHandlers = new Map();
    this.pendingRequests = new Map();

    this.channel.onmessage = (event: MessageEvent<BusMessage<E, R>>) => {
      const message = event.data;
      if (this.isRequestMessage(message)) {
        this.handleRequest(message);
      } else if (this.isResponseMessage(message)) {
        this.handleResponse(message);
      } else {
        this.handleEvent(message.type, message.payload);
      }
    };
  }

  private isRequestMessage(
    message: BusMessage<E, R>
  ): message is RequestMessage<keyof R> {
    return "isRequest" in message;
  }

  private isResponseMessage(
    message: BusMessage<E, R>
  ): message is ResponseMessage<keyof R> {
    return "isResponse" in message;
  }

  private handleEvent<K extends keyof E>(type: K, payload: E[K]): void {
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

  private async handleRequest(message: RequestMessage<keyof R>): Promise<void> {
    const handler = this.requestHandlers.get(message.type);
    if (!handler) return;

    try {
      const response = await handler(message.payload);
      this.channel.postMessage({
        type: message.type,
        payload: response,
        requestId: message.requestId,
        isResponse: true,
      });
    } catch (error) {
      console.error(`Error handling request ${String(message.type)}:`, error);
    }
  }

  private handleResponse(message: ResponseMessage<keyof R>): void {
    const pending = this.pendingRequests.get(message.requestId);
    if (pending) {
      if (pending.echoTimeouts) {
        pending.echoTimeouts.forEach((timeoutId) => clearTimeout(timeoutId));
      }
      pending.resolve(message.payload);
      this.pendingRequests.delete(message.requestId);
    }
  }

  on<K extends keyof E>(
    eventType: K,
    callback: EventCallback<E[K]>
  ): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)?.add(callback);
    return () => {
      this.off(eventType, callback);
    };
  }

  off<K extends keyof E>(eventType: K, callback: EventCallback<E[K]>): void {
    if (this.listeners.has(eventType)) {
      this.listeners.get(eventType)?.delete(callback);
      if (this.listeners.get(eventType)?.size === 0) {
        this.listeners.delete(eventType);
      }
    }
  }

  emit<K extends keyof E>(eventType: K, payload: E[K]): void {
    this.handleEvent(eventType, payload);
    this.channel.postMessage({
      type: eventType,
      payload,
    });
  }

  onRequest<K extends keyof R>(
    type: K,
    handler: RequestCallback<R[K]["request"], R[K]["response"]>
  ): () => void {
    this.requestHandlers.set(type, handler);
    return () => {
      this.requestHandlers.delete(type);
    };
  }

  request<K extends keyof R>(
    type: K,
    payload: R[K]["request"],
    options?: RequestOptions
  ): Promise<R[K]["response"]> {
    const requestId = crypto.randomUUID();
    const echoRepeat = options?.echo?.repeat ?? 3;
    const echoDelay = options?.echo?.delay ?? 100;

    const promise = new Promise<R[K]["response"]>((resolve, reject) => {
      const echoTimeouts: number[] = [];

      for (let i = 1; i < echoRepeat; i++) {
        const timeoutId = window.setTimeout(() => {
          this.channel.postMessage({
            type,
            payload,
            requestId,
            isRequest: true,
            options,
          });
        }, echoDelay * i) as unknown as number;

        echoTimeouts.push(timeoutId);
      }

      this.pendingRequests.set(requestId, { resolve, reject, echoTimeouts });

      setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          echoTimeouts.forEach((timeoutId) => clearTimeout(timeoutId));
          this.pendingRequests.delete(requestId);
          reject(new Error(`Request ${String(type)} timed out`));
        }
      }, 5000);
    });

    this.channel.postMessage({
      type,
      payload,
      requestId,
      isRequest: true,
      options,
    });

    return promise;
  }

  destroy(): void {
    for (const { echoTimeouts } of this.pendingRequests.values()) {
      if (echoTimeouts) {
        echoTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
      }
    }

    this.listeners.clear();
    this.requestHandlers.clear();
    this.pendingRequests.clear();
    this.channel.close();
  }
}

export class EventBusManager {
  private static instances = new Map<
    string,
    {
      bus: EventBus<any, any>;
      refCount: number;
      __type?: any;
    }
  >();

  static getInstance<E extends EventMap, R extends RequestMap>(
    channelName: string,
    _typeValidator?: E
  ): EventBus<E, R> {
    const existing = this.instances.get(channelName);

    if (existing) {
      existing.refCount++;
      return existing.bus as EventBus<E, R>;
    }

    const newBus = new EventBus<E, R>(channelName);
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
