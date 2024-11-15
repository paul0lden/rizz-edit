import React, { useCallback, useRef } from "react";
import { Play, Pause } from "lucide-react";
import { HandleType, Transform } from "../../types";
import { vec2 } from "gl-matrix";

const VideoEditor: React.FC<any> = ({
  canvasRef,
}) => {
  const dragState = useRef({
    mode: "none" as "none" | "pan" | "drag" | "stretch",
    clipId: null as number | null,
    startPos: vec2.create(),
    startTransform: null as Transform | null,
    currentPos: vec2.create(),
    activeHandle: HandleType.None,
  });

  return (
    <canvas
      ref={canvasRef}
      className={`w-full h-full bg-gray-900 rounded-lg 
            ${dragState.current.mode === "pan"
          ? "cursor-grabbing"
          : dragState.current.mode === "drag"
            ? "cursor-move"
            : "cursor-grab"
        }`}
      width={1920}
      height={1080}
      onPointerDown={console.log}
      onPointerMove={console.log}
      onPointerUp={console.log}
      onPointerLeave={console.log}
      onContextMenu={(e) => e.preventDefault()}
    />
  );
};

export default VideoEditor;
