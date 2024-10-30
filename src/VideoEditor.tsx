import React, { useState } from 'react';
import { Play, Pause } from 'lucide-react';
import { ViewportControls } from './Viewport';
import { TransformControls } from './TransformControls';
import { TimelineObject, Transform, Viewport } from './types';

interface VideoEditorProps {
  isPlaying: boolean;
  onPlayPause: () => void;
  selectedObject: TimelineObject | null;
  onObjectTransform: (transform: Transform) => void;
  initialViewport: { width: number; height: number };
}

const VideoEditor: React.FC<VideoEditorProps> = ({
  isPlaying,
  onPlayPause,
  selectedObject,
  onObjectTransform,
  initialViewport,
}) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [viewport, setViewport] = useState<Viewport>({
    x: 0,
    y: 0,
    zoom: 1,
    width: initialViewport.width,
    height: initialViewport.height,
  });

  return (
    <div className="flex flex-col items-center w-full h-[80vh]">
      <div className="relative w-full h-full">
        <ViewportControls
          viewport={viewport}
          onViewportChange={setViewport}
        >
          {/* WebGL Canvas */}
          <canvas
            id="mainCanvas"
            ref={canvasRef}
            width={initialViewport.width}
            height={initialViewport.height}
            className="bg-gray-900"
          />

          {/* Transform Controls */}
          {selectedObject && (
            <TransformControls
              selectedObject={selectedObject}
              canvasRef={canvasRef}
              onTransformUpdate={onObjectTransform}
              viewport={viewport}
            />
          )}
        </ViewportControls>

        {/* Playback Controls (fixed position) */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
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
