import React, { useCallback, useRef } from "react";
import { Play, Pause } from "lucide-react";
import { HandleType, Transform } from "../../types";
import { vec2 } from "gl-matrix";
import { getHandleAtPosition } from "./misc";

const VideoEditor: React.FC<any> = ({
  canvasRef,
  selectedClipId,
  clipsRef,
  setClipsList,
  needsRenderRef,
  setSelectedClipId,
  videoRendererRef,
}) => {
  const dragState = useRef({
    mode: "none" as "none" | "pan" | "drag" | "stretch",
    clipId: null as number | null,
    startPos: vec2.create(),
    startTransform: null as Transform | null,
    currentPos: vec2.create(),
    activeHandle: HandleType.None,
  });

  // Mouse position update helper
  const updateMousePosition = useCallback(
    (e: React.MouseEvent) => {
      const canvas = canvasRef.current;
      const cameraPos = videoRendererRef.current.getCameraPosition();
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const aspectRatio = canvas.width / canvas.height;

      // Convert screen coordinates to normalized device coordinates (-1 to 1)
      const normalizedX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const normalizedY = -(((e.clientY - rect.top) / rect.height) * 2 - 1);

      // Apply aspect ratio correction to X coordinate
      const worldX = normalizedX * aspectRatio + cameraPos[0];
      const worldY = normalizedY + cameraPos[1];

      vec2.set(dragState.current.currentPos, worldX, worldY);
      return { x: worldX, y: worldY };
    },
    [canvasRef, videoRendererRef]
  );

  // Mouse event handlers
  const handleMouseDown = useCallback(
    (e: React.PointerEvent) => {
      canvasRef.current?.setPointerCapture(e.pointerId);

      const pos = updateMousePosition(e);
      if (!pos) return;

      // Handle middle button or shift+left click for panning
      if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
        dragState.current = {
          mode: "pan",
          clipId: null,
          startPos: vec2.fromValues(pos.x, pos.y),
          startTransform: null,
          currentPos: vec2.fromValues(pos.x, pos.y),
          activeHandle: HandleType.None,
        };
        e.preventDefault();
        return;
      }

      // Handle left click
      if (e.button === 0) {
        if (selectedClipId !== null) {
          const selectedClip = clipsRef.current.find(
            (clip) => clip.id === selectedClipId
          );
          if (selectedClip) {
            const handle = getHandleAtPosition(
              vec2.fromValues(pos.x, pos.y),
              selectedClip
            );
            if (handle !== HandleType.None) {
              dragState.current = {
                mode: "stretch",
                clipId: selectedClipId,
                startPos: vec2.fromValues(pos.x, pos.y),
                startTransform: { ...selectedClip.transform },
                currentPos: vec2.fromValues(pos.x, pos.y),
                activeHandle: handle,
              };
              e.preventDefault();
              return;
            }
          }
        }

        let hitClip = false;

        // Hit test all clips in reverse order (top to bottom)
        for (let i = clipsRef.current.length - 1; i >= 0; i--) {
          const clip = clipsRef.current[i];
          const [tx, ty] = clip.transform.translation;
          const [sx, sy] = clip.transform.scale;

          // Check if click is inside clip bounds
          if (
            pos.x >= tx - sx &&
            pos.x <= tx + sx &&
            pos.y >= ty - sy &&
            pos.y <= ty + sy
          ) {
            hitClip = true;

            // Only update if selecting a different clip
            if (selectedClipId !== clip.id) {
              dragState.current = {
                mode: "drag",
                clipId: clip.id,
                startPos: vec2.fromValues(pos.x, pos.y),
                startTransform: { ...clip.transform },
                currentPos: vec2.fromValues(pos.x, pos.y),
                activeHandle: HandleType.None,
              };
              setSelectedClipId(clip.id);
            } else {
              // If clicking the same clip, start dragging
              dragState.current = {
                mode: "drag",
                clipId: clip.id,
                startPos: vec2.fromValues(pos.x, pos.y),
                startTransform: { ...clip.transform },
                currentPos: vec2.fromValues(pos.x, pos.y),
                activeHandle: HandleType.None,
              };
            }
            break;
          }
        }

        // If we didn't hit any clip, deselect
        if (!hitClip) {
          dragState.current = {
            mode: "none",
            clipId: null,
            startPos: vec2.create(),
            startTransform: null,
            currentPos: vec2.create(),
            activeHandle: HandleType.None,
          };
          setSelectedClipId(null);
          needsRenderRef.current = true;
        }
      }

      e.preventDefault();
    },
    [
      selectedClipId,
      updateMousePosition,
      canvasRef,
      clipsRef,
      needsRenderRef,
      setSelectedClipId,
    ]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const pos = updateMousePosition(e);
      if (!pos) return;

      const state = dragState.current;

      if (state.mode === "pan") {
        const camera = videoRendererRef.current.camera;
        if (!camera) return;

        const dx = pos.x - state.startPos[0];
        const dy = pos.y - state.startPos[1];
        camera.pan(dx * 0.5, dy * 0.5);
        vec2.set(state.startPos, pos.x, pos.y);
        needsRenderRef.current = true;
      } else if (
        state.mode === "drag" &&
        state.clipId !== null &&
        state.startTransform
      ) {
        const clip = clipsRef.current.find((c) => c.id === state.clipId);
        if (!clip) return;

        const dx = pos.x - state.startPos[0];
        const dy = pos.y - state.startPos[1];

        clip.transform.translation = [
          state.startTransform.translation[0] + dx,
          state.startTransform.translation[1] + dy,
          0,
        ];
        needsRenderRef.current = true;
      } else if (
        state.mode === "stretch" &&
        state.clipId !== null &&
        state.startTransform
      ) {
        const clip = clipsRef.current.find((c) => c.id === state.clipId);
        if (!clip) return;

        // Get the original position and dimensions
        const [tx, ty] = state.startTransform.translation;
        const [origWidth, origHeight] = state.startTransform.scale;

        switch (state.activeHandle) {
          case HandleType.TopRight: {
            // Already working - our reference
            const fixedCornerX = tx - origWidth;
            const fixedCornerY = ty - origHeight;
            const newWidth = Math.abs(pos.x - fixedCornerX);
            const newHeight = Math.abs(pos.y - fixedCornerY);
            clip.transform.scale = [newWidth / 2, newHeight / 2, 1];
            break;
          }
          case HandleType.Right: {
            // Already working
            const fixedEdgeX = tx - origWidth;
            const newWidth = Math.abs(pos.x - fixedEdgeX);
            clip.transform.scale = [newWidth / 2, origHeight, 1];
            break;
          }
          case HandleType.Top: {
            // Already working
            const fixedEdgeY = ty - origHeight;
            const newHeight = Math.abs(pos.y - fixedEdgeY);
            clip.transform.scale = [origWidth, newHeight / 2, 1];
            break;
          }
          case HandleType.BottomRight: {
            // Already working
            const fixedCornerX = tx - origWidth;
            const fixedCornerY = ty + origHeight;
            const newWidth = Math.abs(pos.x - fixedCornerX);
            const newHeight = Math.abs(pos.y - fixedCornerY);
            clip.transform.scale = [newWidth / 2, newHeight / 2, 1];
            break;
          }
          case HandleType.TopLeft: {
            // Fixed point is bottom-right corner
            const fixedCornerX = tx + origWidth;
            const fixedCornerY = ty - origHeight;
            const newWidth = Math.abs(pos.x - fixedCornerX);
            const newHeight = Math.abs(pos.y - fixedCornerY);
            clip.transform.scale = [newWidth / 2, newHeight / 2, 1];
            break;
          }
          case HandleType.Left: {
            // Fixed point is right edge
            const fixedEdgeX = tx + origWidth;
            const newWidth = Math.abs(pos.x - fixedEdgeX);
            clip.transform.scale = [newWidth / 2, origHeight, 1];
            break;
          }

          case HandleType.BottomLeft: {
            // Fixed point is top-right corner
            const fixedCornerX = tx + origWidth;
            const fixedCornerY = ty + origHeight;
            const newWidth = Math.abs(pos.x - fixedCornerX);
            const newHeight = Math.abs(pos.y - fixedCornerY);
            clip.transform.scale = [newWidth / 2, newHeight / 2, 1];
            break;
          }
          case HandleType.Bottom: {
            // Fixed point is top edge
            const fixedEdgeY = ty + origHeight;
            const newHeight = Math.abs(pos.y - fixedEdgeY);
            clip.transform.scale = [origWidth, newHeight / 2, 1];
            break;
          }
        }

        needsRenderRef.current = true;
      }
    },
    [updateMousePosition, clipsRef]
  );

  const handleMouseUp = useCallback((e: React.PointerEvent) => {
    canvasRef.current?.releasePointerCapture(e.pointerId);

    if (dragState.current.mode === "drag") {
      setClipsList([...clipsRef.current]);
    }
    dragState.current = {
      mode: "none",
      clipId: null,
      startPos: vec2.create(),
      startTransform: null,
      currentPos: vec2.create(),
      activeHandle: HandleType.None,
    };
  }, []);

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
      onPointerDown={handleMouseDown}
      onPointerMove={handleMouseMove}
      onPointerUp={handleMouseUp}
      onPointerLeave={handleMouseUp}
      onContextMenu={(e) => e.preventDefault()}
    />
  );
};

export default VideoEditor;
