import { useCallback, useEffect, useState } from "react";
import { EventBus, EventBusManager } from "../utils/thread";
import { useEventBus } from "@/utils/useEventbus";
import { CHANNEL_NAME } from "@/globals";

export class PlaybackManager {
  private isPlaying: boolean = false;
  private startTime: number = 0;
  private currentTime: number = 0;
  private pausedTime: number = 0;
  private animationFrame: number | null = null;
  private bus: EventBus<any, any>;
  public static instance: PlaybackManager | null = null;

  private constructor() {
    this.bus = EventBusManager.getInstance(CHANNEL_NAME);
  }

  static getInstance() {
    if (!PlaybackManager.instance) {
      PlaybackManager.instance = new PlaybackManager();
    }
    return PlaybackManager.instance;
  }

  private update = (timestamp: number) => {
    if (!this.isPlaying) return;

    if (this.startTime === 0) {
      this.startTime = timestamp;
    }

    // Calculate elapsed time since last play, accounting for accumulated paused time
    this.currentTime = timestamp - this.startTime - this.pausedTime;

    this.bus.emit("playbackTime", {
      time: this.currentTime,
    });

    this.animationFrame = requestAnimationFrame(this.update);
  };

  play() {
    if (this.isPlaying) return;

    this.isPlaying = true;

    // When resuming, we need to account for the time spent paused
    if (this.currentTime > 0) {
      const now = performance.now();
      this.pausedTime +=
        now - (this.startTime + this.currentTime + this.pausedTime);
    }

    this.animationFrame = requestAnimationFrame(this.update);
  }

  pause() {
    if (!this.isPlaying) return;

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
    this.pausedTime = 0;
  }

  getCurrentTime(): number {
    return this.currentTime;
  }
}

export const usePlaybackState = () => {
  const [isPlaying, setPlaying] = useState(false);
  const { on, off, emit } = useEventBus();

  const handlePlay = () => {
    setPlaying(true);
  };
  const handlePause = () => {
    setPlaying(false);
  };

  useEffect(() => {
    const offPlay = on("play", handlePlay);
    const offPause = on("pause", handlePause);
    return () => {
      offPlay();
      offPause();
    };
  }, [on, off]);

  const togglePlay = useCallback(() => {
    if (isPlaying) emit("pause", null);
    else emit("play", null);
  }, [isPlaying, emit]);

  return {
    isPlaying,
    togglePlay,
  };
};
