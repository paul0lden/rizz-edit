import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { List, Map } from "immutable";

import type { VideoClip } from "../types";

interface ClipStore {
  clips: List<VideoClip>;
  addClip: (file: File) => void;
}

export const useClips = create<ClipStore>()(
  persist(
    (set, get) => {
      let videoRefs = Map<number, HTMLVideoElement>();

      return {
        clips: List([]),
        addClip: async (file) => {
          const videoElement = document.createElement("video");
          videoElement.src = URL.createObjectURL(file);
          videoElement.playsInline = true;
          videoElement.muted = true;
          videoElement.preload = "auto";

          await new Promise<void>((resolve) => {
            videoElement.onloadedmetadata = () => resolve();
          });

          await videoElement.play();
          videoElement.pause();
          videoElement.currentTime = 0;

          const aspectRatio =
            videoElement.videoWidth / videoElement.videoHeight;
          const scale = 0.5 / Math.max(1, aspectRatio);

          const last = get().clips.last();

          const clip: VideoClip = {
            id: Date.now(),
            file,
            fileName: file.name,
            duration: videoElement.duration,
            startTime: last ? last.startTime + last.duration : 0,
            transform: {
              translation: [0, 0, 0],
              rotation: [0, 0, 0],
              scale: [scale * aspectRatio, scale, 1],
            },
            effects: {
              brightness: 0,
              contrast: 1,
              saturation: 1,
            },
          };

          videoRefs = videoRefs.set(clip.id, videoElement)

          set({ clips: get().clips.push(clip) });
        },
      };
    },
    {
      name: "clips",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
