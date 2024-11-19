import { useRef } from "react";
import { Play, Pause } from "lucide-react";

import { VideoTimeline } from "./components/Timeline";
import VideoEditor from "./components/Editor";

import { usePlaybackState } from "./store/playback";
import useShortcutManager from "./utils/shortcutsManager";
import { useMediaWorker } from "./media/useMediaWorker";

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { isPlaying, togglePlay } = usePlaybackState();


  useMediaWorker({
    canvasRef: canvasRef,
  });
  useShortcutManager();

  return (
    <div className="flex flex-col gap-6 p-4 w-lvw h-lvh dark:bg-gray-950">
      <div className="relative w-full aspect-video">
        <VideoEditor
          canvasRef={canvasRef}
        />
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
          <button
            onClick={() => {
              //setIsPlaying(!isPlaying)
              togglePlay();
            }}
            className="rounded-full flex justify-center items-center p-4 bg-blue-500 text-white hover:bg-blue-600"
          >
            {isPlaying ? <Pause /> : <Play />}
          </button>
        </div>
      </div>
      <VideoTimeline />
    </div>
  );
}

export default App;
