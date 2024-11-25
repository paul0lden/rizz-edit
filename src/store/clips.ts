import { List } from "immutable";

import type { ClipMeta } from "@/types";
import { useCallback, useEffect, useState } from "react";
import { useEventBus } from "@/utils/useEventbus";
import { BusEventCallback } from "@/utils/thread";

interface ClipStore {
  clips: List<ClipMeta>;
  addFiles: BusEventCallback<"addFiles">;
}

export const useClips = (): ClipStore => {
  const [clips, setClips] = useState(List<ClipMeta>([]));
  const { on, off, emit, request } = useEventBus();

  const handleAddClips = useCallback<BusEventCallback<'addClips'>>(
    async (clips) => {
      setClips((prev) => {
        return prev.push(
          ...clips
        )
      });
    },
    []
  );

  useEffect(() => {
    const response = request('getClips', null)
    response.then(handleAddClips)
  }, [])

  useEffect(() => {
    on("addClips", handleAddClips);
    return () => {
      off("addClips", handleAddClips);
    };
  }, [on, off, handleAddClips]);

  const addFiles: ClipStore['addFiles'] = (params) => {
    emit("addFiles", params);
  };

  return {
    clips,
    addFiles,
  };
};
