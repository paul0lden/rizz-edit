import { List } from "immutable";

import type { VideoClip } from "@/types";
import { useCallback, useEffect, useState } from "react";
import { useEventBus } from "@/utils/useEventbus";
import { EventMap } from "@/utils/thread";

interface ClipStore {
  clips: List<Partial<VideoClip>>;
  addClip: EventMap['addClip'];
}

export const useClips = (): ClipStore => {
  const [clips, setClips] = useState(List<Partial<VideoClip>>([]));
  const { on, off, emit, request } = useEventBus();

  const handleAddClip = useCallback<ClipStore["addClip"]>(
    async ({ files, id }) => {
      setClips((prev) => {
        return prev.push(
          ...files.map((file) => ({
            id,
            fileName: file.name,
            startTime: 0,
            effects: {
              brightness: 0,
              contrast: 1,
              saturation: 1,
            },
          }))
        );
      });
    },
    []
  );

  useEffect(() => {
    //console.log('clips', clips);
    //setClips((prev) => prev.push(...clips))
    setTimeout(() => {
      const aboba = request('getClips', null)
      aboba.then(console.log)
    }, 1000)



  }, [])

  useEffect(() => {
    on("addClip", handleAddClip);
    return () => {
      off("addClip", handleAddClip);
    };
  }, [on, off, handleAddClip]);

  const addClip: ClipStore['addClip'] = (params) => {
    emit("addClip", params);
  };

  return {
    clips,
    addClip,
  };
};
