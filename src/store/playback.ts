import { useEffect, useRef, useState } from "react";
import { EventBus, EventBusManager } from '../utils/thread';
import { useEventBus } from "@/utils/useEventbus";
import { CHANNEL_NAME } from "@/globals";

class PlaybackManager {
  private isPlaying: boolean = false;
  private startTime: number = 0;
  private currentTime: number = 0;
  private animationFrame: number | null = null;
  private bus: EventBus<any>;
  public static instance: PlaybackManager | null = null;

  private constructor() {
    this.bus = EventBusManager.getInstance(CHANNEL_NAME);
  }

  static getInstance() {
    if (!PlaybackManager.instance) {
      PlaybackManager.instance = new PlaybackManager();
    }
    return PlaybackManager.instance
  }

  private update = (timestamp: number) => {
    if (!this.isPlaying) return;

    if (this.startTime === 0) {
      this.startTime = timestamp;
    }

    this.currentTime = timestamp - this.startTime;

    this.bus.emit('playbackTime', {
      time: this.currentTime
    })

    this.animationFrame = requestAnimationFrame(this.update);
  }

  play() {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.animationFrame = requestAnimationFrame(this.update);
  }

  pause() {
    this.isPlaying = false;
    if (this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }

  reset() {
    this.pause();
    this.startTime = 0;
    this.currentTime = 0;
  }

  getCurrentTime(): number {
    return this.currentTime;
  }
}

export default PlaybackManager;

export const usePlaybackState = () => {
  const [isPlaying, setPlaying] = useState(false);
  const { on, off, emit } = useEventBus();

  const playbackRef = useRef<PlaybackManager>(PlaybackManager.getInstance())

  useEffect(() => {
    on('togglePlay', (state) => {
      if (state) {
        playbackRef.current.play();
      } else {
        playbackRef.current.pause();
      }
      setPlaying(state);
    })
    return () => {
      off('togglePlay', console.log);
    }
  }, [on, off])

  return {
    isPlaying,
    togglePlay: () => {
      emit('togglePlay', !isPlaying)
    },
  }
}
