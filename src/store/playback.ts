import { create } from "zustand";
import { List, Map } from "immutable";

import type { VideoClip } from "../types";

interface ClipStore {
  playbackPosition: number;
  setPlaybackPosition: (position: number) => void;
}

export const useClips = create<ClipStore>()(
  (set, get) => {
    const videoRefs = Map<number, HTMLVideoElement>();

    return {
      playbackPosition: 0, // in ms 
      setPlaybackPosition: async (number) => {
      },
    };
  },
);
