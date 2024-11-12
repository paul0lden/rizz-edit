import { useEffect, useState } from "react";
import { useEventBus } from "@/utils/useEventbus";

export const usePlaybackState = () => {
  const [isPlaying, setPlaying] = useState(false);
  const { on, off, emit } = useEventBus();

  useEffect(() => {
    on('togglePlay', (state) => {
      setPlaying(state)
    })
    return () => {
      off('togglePlay', console.log)
    }
  }, [on, off])

  return {
    isPlaying,
    togglePlay: () => {
      emit('togglePlay', !isPlaying)
    },
  }
}
