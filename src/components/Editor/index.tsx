import React, { RefObject, useRef } from "react";
import { Play, Pause } from "lucide-react";
import { HandleType, Transform } from "../../types";
import { vec2 } from "gl-matrix";
import { useEventBus } from "@/utils/useEventbus";

const VideoEditor: React.FC<{
  canvasRef: RefObject<HTMLCanvasElement>
}> = ({ canvasRef }) => {
  const dragState = useRef({
    mode: "none" as "none" | "pan" | "drag" | "stretch",
    clipId: null as number | null,
    startPos: vec2.create(),
    startTransform: null as Transform | null,
    currentPos: vec2.create(),
    activeHandle: HandleType.None,
  });
  const { emit } = useEventBus();

  const handlePointerEvent = (
    event: React.PointerEvent<HTMLCanvasElement>,
    eventName: string
  ) => {
    const rect = canvasRef.current?.getBoundingClientRect();

    emit(eventName, {
      pointerX: event.clientX,
      pointerY: event.clientY,
      width: rect?.width,
      height: rect?.height,
      containerX: rect?.x,
      containerY: rect?.y,
      shiftKey: event.shiftKey,
      button: event.button,
    });
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    canvasRef.current?.setPointerCapture(event.pointerId);
    handlePointerEvent(event, 'pointerDown')
  }
  const handlePointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    canvasRef.current?.releasePointerCapture(event.pointerId);
    handlePointerEvent(event, 'pointerUp')
  }
  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    handlePointerEvent(event, 'pointerMove')
  }
  const handlePointerLeave = (event: React.PointerEvent<HTMLCanvasElement>) => {
    handlePointerEvent(event, 'pointerLeave')
  }

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
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onContextMenu={(e) => e.preventDefault()}
    />
  );
};

export default VideoEditor;
