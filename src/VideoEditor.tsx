import React from "react";
import { Play, Pause } from "lucide-react";

interface VideoEditorProps {
  isPlaying: boolean;
  onPlayPause: () => void;
  canvasDimensions: {
    width: number;
    height: number;
  };
}

const VideoEditor: React.FC<VideoEditorProps> = ({
  isPlaying,
  onPlayPause,
  canvasDimensions,
}) => {
  return (
    <div className="flex flex-col items-center w-full max-w-4xl mx-auto">
      <div className="relative w-full">
        <canvas
          id="mainCanvas"
          className="bg-gray-900 rounded-lg"
          width={canvasDimensions.width}
          height={canvasDimensions.height}
          style={{
            aspectRatio: `${canvasDimensions.width}/${canvasDimensions.height}`,
            width: "100%",
            maxHeight: "80vh",
            objectFit: "contain",
          }}
        />
        <div className="flex opacity-0 transition-opacity hover:opacity-100 w-full p-4 bg-blend-darken bg-stone-900 bg-opacity-25 absolute justify-center bottom-0">
          <button
            onClick={onPlayPause}
            className="rounded-full flex justify-center items-center p-4 bg-blue-500 text-white hover:bg-blue-600"
          >
            {isPlaying ? <Pause /> : <Play />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default VideoEditor;
