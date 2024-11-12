import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { List, Map } from "immutable";

import type { VideoClip } from "../types";
import { useCallback, useEffect, useRef, useState } from "react";
import { useEventBus } from "@/utils/useEventbus";

interface ClipStore {
  clips: List<VideoClip>;
  addClip: (file: File) => void;
}

export const useClips = () => {
  const [clips, setClips] = useState(List([]));
  const { on, off, emit } = useEventBus();
  const videoRefs = useRef(Map<number, HTMLVideoElement>());

  const handleAddClip = useCallback(async (file: File) => {
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

    const last = clips.last();

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

    videoRefs.current = videoRefs.current.set(clip.id, videoElement);

    setClips((prev) => {
      return prev.push(clip);
    });
  }, [clips]);

  useEffect(() => {
    on("addClip", handleAddClip);
    return () => {
      off("addClip", handleAddClip);
    };
  }, [on, off, handleAddClip]);

  return {
    clips,
  };
};
