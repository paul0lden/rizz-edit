import React, { useEffect, useRef, useState } from "react";
import { TimelineObject, Transform } from "./types";

interface TransformControlsProps {
  selectedObject: TimelineObject | null;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  onTransformUpdate: (transform: Transform) => void;
  canvasDimensions: { width: number; height: number };
}

type DragMode =
  | "move"
  | "resize-nw"
  | "resize-ne"
  | "resize-sw"
  | "resize-se"
  | "rotate"
  | null;

const HANDLE_SIZE = 8;
const ROTATION_HANDLE_OFFSET = 20;

export const TransformControls: React.FC<TransformControlsProps> = ({
  selectedObject,
  canvasRef,
  onTransformUpdate,
  canvasDimensions,
}) => {
  const isDragging = useRef(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const initialTransform = useRef<Transform | null>(null);
  const dragMode = useRef<"move" | "resize" | "rotate" | null>(null);

  // Convert canvas coordinates to screen coordinates
  const canvasToScreen = (transform: Transform) => {
    if (!canvasRef.current) return { x: 0, y: 0, width: 0, height: 0 };

    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = rect.width / canvasDimensions.width;
    const scaleY = rect.height / canvasDimensions.height;

    return {
      x: transform.x * scaleX,
      y: transform.y * scaleY,
      width: transform.width * scaleX,
      height: transform.height * scaleY,
    };
  };

  // Screen coordinates to canvas coordinates
  const screenToCanvas = (x: number, y: number) => {
    if (!canvasRef.current) return { x: 0, y: 0 };

    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasDimensions.width / rect.width;
    const scaleY = canvasDimensions.height / rect.height;

    return {
      x: (x - rect.left) * scaleX,
      y: (y - rect.top) * scaleY,
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current || !initialTransform.current) return;

      const { x, y } = screenToCanvas(e.clientX, e.clientY);
      const startPos = dragStartPos.current;
      const deltaX = x - startPos.x;
      const deltaY = y - startPos.y;

      const newTransform = { ...initialTransform.current };

      switch (dragMode.current) {
        case "move":
          newTransform.x += deltaX;
          newTransform.y += deltaY;
          break;
        case "resize":
          newTransform.width += deltaX;
          newTransform.height += deltaY;
          break;
        case "rotate":
          const center = {
            x: newTransform.x + newTransform.width / 2,
            y: newTransform.y + newTransform.height / 2,
          };
          const angle = Math.atan2(y - center.y, x - center.x);
          newTransform.rotation = angle * (180 / Math.PI);
          break;
      }

      onTransformUpdate(newTransform);
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      dragMode.current = null;
      initialTransform.current = null;
    };

    if (isDragging.current) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [canvasDimensions, onTransformUpdate]);

  const screenTransform = canvasToScreen(selectedObject.transform);

  const handleMouseDown = (
    e: React.MouseEvent,
    mode: "move" | "resize" | "rotate"
  ) => {
    e.stopPropagation();
    isDragging.current = true;
    dragMode.current = mode;
    const { x, y } = screenToCanvas(e.clientX, e.clientY);
    dragStartPos.current = { x, y };
    initialTransform.current = { ...selectedObject.transform };
  };

  return (
    <div
      className="absolute inset-0 pointer-events-auto"
      style={{ cursor: isDragging.current ? "grabbing" : "grab" }}
    >
      {/* Main object frame */}
      <div
        className="absolute border-2 border-blue-500"
        style={{
          left: `${screenTransform.x}px`,
          top: `${screenTransform.y}px`,
          width: `${screenTransform.width}px`,
          height: `${screenTransform.height}px`,
          transform: `rotate(${selectedObject.transform.rotation}deg)`,
          cursor: isDragging.current ? "grabbing" : "move",
        }}
        onMouseDown={(e) => handleMouseDown(e, "move")}
      >
        {/* Resize handles */}
        <div
          className="absolute w-3 h-3 bg-white border-2 border-blue-500 rounded-full -top-1.5 -right-1.5 cursor-nw-resize"
          onMouseDown={(e) => handleMouseDown(e, "resize")}
        />
        <div
          className="absolute w-3 h-3 bg-white border-2 border-blue-500 rounded-full -bottom-1.5 -right-1.5 cursor-sw-resize"
          onMouseDown={(e) => handleMouseDown(e, "resize")}
        />
        <div
          className="absolute w-3 h-3 bg-white border-2 border-blue-500 rounded-full -bottom-1.5 -left-1.5 cursor-se-resize"
          onMouseDown={(e) => handleMouseDown(e, "resize")}
        />
        <div
          className="absolute w-3 h-3 bg-white border-2 border-blue-500 rounded-full -top-1.5 -left-1.5 cursor-ne-resize"
          onMouseDown={(e) => handleMouseDown(e, "resize")}
        />

        {/* Rotation handle */}
        <div
          className="absolute w-3 h-3 bg-white border-2 border-blue-500 rounded-full left-1/2 -top-8 -ml-1.5 cursor-pointer"
          onMouseDown={(e) => handleMouseDown(e, "rotate")}
        >
          <div className="absolute w-px h-6 bg-blue-500 left-1/2 bottom-full -ml-px" />
        </div>
      </div>
    </div>
  );
};

//export const TransformControls: React.FC<TransformControlsProps> = ({
//  selectedObject,
//  canvasRef,
//  onTransformUpdate,
//  canvasDimensions,
//}) => {
//  const [isDragging, setIsDragging] = useState(false);
//  const [dragMode, setDragMode] = useState<DragMode>(null);
//  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
//  const [initialTransform, setInitialTransform] = useState<Transform | null>(
//    null
//  );
//
//  const overlayRef = useRef<HTMLDivElement>(null);
//
//  // Convert canvas coordinates to screen coordinates
//  const canvasToScreen = (x: number, y: number) => {
//    if (!canvasRef.current) return { x: 0, y: 0 };
//    const rect = canvasRef.current.getBoundingClientRect();
//    const scaleX = rect.width / canvasDimensions.width;
//    const scaleY = rect.height / canvasDimensions.height;
//    return {
//      x: x * scaleX + rect.left,
//      y: y * scaleY + rect.top,
//    };
//  };
//
//  // Convert screen coordinates to canvas coordinates
//  const screenToCanvas = (x: number, y: number) => {
//    if (!canvasRef.current) return { x: 0, y: 0 };
//    const rect = canvasRef.current.getBoundingClientRect();
//    const scaleX = canvasDimensions.width / rect.width;
//    const scaleY = canvasDimensions.height / rect.height;
//    return {
//      x: (x - rect.left) * scaleX,
//      y: (y - rect.top) * scaleY,
//    };
//  };
//
//  // Get cursor style based on mouse position
//  const getCursorStyle = (e: React.MouseEvent) => {
//    if (!selectedObject) return "default";
//
//    const { x, y } = screenToCanvas(e.clientX, e.clientY);
//    const transform = selectedObject.transform;
//    const handleRadius = HANDLE_SIZE / 2;
//
//    // Check corners for resize handles
//    const corners = [
//      {
//        x: transform.x,
//        y: transform.y,
//        cursor: "nw-resize",
//        mode: "resize-nw",
//      },
//      {
//        x: transform.x + transform.width,
//        y: transform.y,
//        cursor: "ne-resize",
//        mode: "resize-ne",
//      },
//      {
//        x: transform.x,
//        y: transform.y + transform.height,
//        cursor: "sw-resize",
//        mode: "resize-sw",
//      },
//      {
//        x: transform.x + transform.width,
//        y: transform.y + transform.height,
//        cursor: "se-resize",
//        mode: "resize-se",
//      },
//    ];
//
//    // Check rotation handle
//    const centerTop = {
//      x: transform.x + transform.width / 2,
//      y: transform.y - ROTATION_HANDLE_OFFSET,
//    };
//    if (
//      Math.abs(x - centerTop.x) < handleRadius &&
//      Math.abs(y - centerTop.y) < handleRadius
//    ) {
//      return "pointer";
//    }
//
//    // Check resize handles
//    for (const corner of corners) {
//      if (
//        Math.abs(x - corner.x) < handleRadius &&
//        Math.abs(y - corner.y) < handleRadius
//      ) {
//        return corner.cursor;
//      }
//    }
//
//    // Check if inside object
//    if (
//      x >= transform.x &&
//      x <= transform.x + transform.width &&
//      y >= transform.y &&
//      y <= transform.y + transform.height
//    ) {
//      return "move";
//    }
//
//    return "default";
//  };
//
//  const handleMouseDown = (e: React.MouseEvent) => {
//    if (!selectedObject || !canvasRef.current) return;
//
//    const { x, y } = screenToCanvas(e.clientX, e.clientY);
//    const transform = selectedObject.transform;
//    const handleRadius = HANDLE_SIZE / 2;
//
//    setDragStart({ x, y });
//    setInitialTransform({ ...transform });
//    setIsDragging(true);
//
//    // Determine drag mode
//    const corners = [
//      { x: transform.x, y: transform.y, mode: "resize-nw" as const },
//      {
//        x: transform.x + transform.width,
//        y: transform.y,
//        mode: "resize-ne" as const,
//      },
//      {
//        x: transform.x,
//        y: transform.y + transform.height,
//        mode: "resize-sw" as const,
//      },
//      {
//        x: transform.x + transform.width,
//        y: transform.y + transform.height,
//        mode: "resize-se" as const,
//      },
//    ];
//
//    // Check rotation handle
//    const centerTop = {
//      x: transform.x + transform.width / 2,
//      y: transform.y - ROTATION_HANDLE_OFFSET,
//    };
//    if (
//      Math.abs(x - centerTop.x) < handleRadius &&
//      Math.abs(y - centerTop.y) < handleRadius
//    ) {
//      setDragMode("rotate");
//      return;
//    }
//
//    // Check resize handles
//    for (const corner of corners) {
//      if (
//        Math.abs(x - corner.x) < handleRadius &&
//        Math.abs(y - corner.y) < handleRadius
//      ) {
//        setDragMode(corner.mode);
//        return;
//      }
//    }
//
//    // Check if inside object
//    if (
//      x >= transform.x &&
//      x <= transform.x + transform.width &&
//      y >= transform.y &&
//      y <= transform.y + transform.height
//    ) {
//      setDragMode("move");
//      return;
//    }
//
//    setDragMode(null);
//  };
//
//  const handleMouseMove = (e: React.MouseEvent) => {
//    if (!isDragging || !initialTransform || !dragMode) return;
//
//    const { x, y } = screenToCanvas(e.clientX, e.clientY);
//    const deltaX = x - dragStart.x;
//    const deltaY = y - dragStart.y;
//
//    let newTransform: Transform = { ...initialTransform };
//
//    switch (dragMode) {
//      case "move":
//        newTransform.x += deltaX;
//        newTransform.y += deltaY;
//        break;
//
//      case "resize-nw":
//        newTransform.width -= deltaX;
//        newTransform.height -= deltaY;
//        newTransform.x += deltaX;
//        newTransform.y += deltaY;
//        break;
//
//      case "resize-ne":
//        newTransform.width += deltaX;
//        newTransform.height -= deltaY;
//        newTransform.y += deltaY;
//        break;
//
//      case "resize-sw":
//        newTransform.width -= deltaX;
//        newTransform.height += deltaY;
//        newTransform.x += deltaX;
//        break;
//
//      case "resize-se":
//        newTransform.width += deltaX;
//        newTransform.height += deltaY;
//        break;
//
//      case "rotate":
//        const center = {
//          x: initialTransform.x + initialTransform.width / 2,
//          y: initialTransform.y + initialTransform.height / 2,
//        };
//        const angle = Math.atan2(y - center.y, x - center.x);
//        newTransform.rotation = angle * (180 / Math.PI);
//        break;
//    }
//
//    // Ensure minimum size
//    newTransform.width = Math.max(20, newTransform.width);
//    newTransform.height = Math.max(20, newTransform.height);
//
//    // Keep object within canvas bounds
//    newTransform.x = Math.max(
//      0,
//      Math.min(newTransform.x, canvasDimensions.width - newTransform.width)
//    );
//    newTransform.y = Math.max(
//      0,
//      Math.min(newTransform.y, canvasDimensions.height - newTransform.height)
//    );
//
//    onTransformUpdate(newTransform);
//  };
//
//  const handleMouseUp = () => {
//    setIsDragging(false);
//    setDragMode(null);
//    setInitialTransform(null);
//  };
//
//  // Draw transform controls
//  const renderControls = () => {
//    if (!selectedObject || !canvasRef.current) return null;
//
//    const transform = selectedObject.transform;
//    const { x, y, width, height, rotation } = transform;
//
//    // Convert to screen coordinates
//    const topLeft = canvasToScreen(x, y);
//    const topRight = canvasToScreen(x + width, y);
//    const bottomLeft = canvasToScreen(x, y + height);
//    const bottomRight = canvasToScreen(x + width, y + height);
//    const center = canvasToScreen(x + width / 2, y + height / 2);
//    const rotationHandle = canvasToScreen(
//      x + width / 2,
//      y - ROTATION_HANDLE_OFFSET
//    );
//
//    return (
//      <>
//        {/* Outline */}
//        <div
//          className="absolute border-2 border-blue-500 pointer-events-none"
//          style={{
//            left: topLeft.x,
//            top: topLeft.y,
//            width: topRight.x - topLeft.x,
//            height: bottomLeft.y - topLeft.y,
//            transform: `rotate(${rotation}deg)`,
//            transformOrigin: `${center.x}px ${center.y}px`,
//          }}
//        />
//
//        {/* Corner handles */}
//        {[topLeft, topRight, bottomLeft, bottomRight].map((pos, i) => (
//          <div
//            key={i}
//            className="absolute w-2 h-2 bg-white border-2 border-blue-500 rounded-full cursor-pointer"
//            style={{
//              left: pos.x - HANDLE_SIZE / 2,
//              top: pos.y - HANDLE_SIZE / 2,
//              transform: `rotate(${rotation}deg)`,
//              transformOrigin: `${center.x}px ${center.y}px`,
//            }}
//          />
//        ))}
//
//        {/* Rotation handle */}
//        <div
//          className="absolute w-2 h-2 bg-white border-2 border-blue-500 rounded-full cursor-pointer"
//          style={{
//            left: rotationHandle.x - HANDLE_SIZE / 2,
//            top: rotationHandle.y - HANDLE_SIZE / 2,
//          }}
//        />
//      </>
//    );
//  };
//
//  return (
//    <div
//      ref={overlayRef}
//      className="absolute inset-0 pointer-events-none"
//      style={{
//        cursor: isDragging
//          ? dragMode === "rotate"
//            ? "grabbing"
//            : dragMode
//          : "default",
//      }}
//      onMouseDown={handleMouseDown}
//      onMouseMove={handleMouseMove}
//      onMouseUp={handleMouseUp}
//      onMouseLeave={handleMouseUp}
//    >
//      {renderControls()}
//    </div>
//  );
//};
