import React, { useCallback, useRef } from "react";
import { Play, Pause } from "lucide-react";
import { HandleType, Transform } from "../../types";
import { vec2 } from "gl-matrix";
import { useEventBus } from "@/utils/useEventbus";

const VideoEditor: React.FC<any> = ({ canvasRef }) => {
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
    const rect = event.currentTarget.getBoundingClientRect();

    emit(eventName, {
      pointerX: event.clientX,
      pointerY: event.clientY,
      width: rect.width,
      height: rect.height,
      containerX: rect.x,
      containerY: rect.y,
    });
  };

  const handlePointerDown = (event) => {
    handlePointerEvent(event, 'pointerDown')
  }
  const handlePointerUp = (event) => {
    canvasRef.current.
      handlePointerEvent(event, 'pointerUp')
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
      onPointerDown={(event) =>
        emit("pointerDown", { x: event.clientX, y: event.clientY })
      }
      onPointerMove={(event) =>
        emit("pointerMove", { x: event.clientX, y: event.clientY })
      }
      onPointerUp={(event) =>
        emit("pointerUp", {
          x: event.clientX,
          y: event.clientY,
          canvasX: event.currentTarget.getBoundingClientRect(),
        })
      }
      onPointerLeave={(event) =>
        emit("pointerLeave", { x: event.clientX, y: event.clientY })
      }
      onContextMenu={(e) => e.preventDefault()}
    />
  );
};

export default VideoEditor;
