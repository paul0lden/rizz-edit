import { Clip, HandleType, Transform } from "@/types";

// Mouse position update helper
const updateMousePosition = () => {
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
};

// Mouse event handlers
const handleMouseDown = (e: React.PointerEvent) => {
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
};

const handleMouseMove = (e: React.MouseEvent) => {
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
};

const handleMouseUp = (e: React.PointerEvent) => {
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
};

type Vec2 = [number, number];

type PointerState = {
  mode: "none" | "pan" | "drag" | "stretch";
  clipId: string | null;
  startPos: Vec2;
  startTransform: Transform | null;
  currentPos: Vec2;
  activeHandle: HandleType;
};

type PointerEventArgs = {
  pointerX: number;
  pointerY: number;
  width: number;
  height: number;
  containerX: number;
  containerY: number;
  button?: number;
  shiftKey?: boolean;
};

// Helper function to convert screen coordinates to world coordinates
const getWorldPosition = (
  args: PointerEventArgs,
  cameraPosition: Vec2,
  canvasAspectRatio: number
): { x: number; y: number } => {
  // Convert screen coordinates to normalized device coordinates (-1 to 1)
  const normalizedX =
    ((args.pointerX - args.containerX) / args.width) * 2 - 1;
  const normalizedY =
    -(((args.pointerY - args.containerY) / args.height) * 2 - 1);

  // Apply aspect ratio correction to X coordinate
  const worldX = normalizedX * canvasAspectRatio + cameraPosition[0];
  const worldY = normalizedY + cameraPosition[1];

  return { x: worldX, y: worldY };
};

// Pan callback
const handlePan = (
  pos: { x: number; y: number },
  startPos: Vec2,
  camera: { pan: (dx: number, dy: number) => void }
): void => {
  const dx = pos.x - startPos[0];
  const dy = pos.y - startPos[1];
  camera.pan(dx * 0.5, dy * 0.5);
};

// Drag callback
const handleDrag = (
  pos: { x: number; y: number },
  clip: Clip,
  startPos: Vec2,
  startTransform: Transform
): void => {
  const dx = pos.x - startPos[0];
  const dy = pos.y - startPos[1];

  clip.transform.x = startTransform.x + dx;
  clip.transform.y = startTransform.y + dy;
};

// Stretch callback
const handleStretch = (
  pos: { x: number; y: number },
  clip: Clip,
  startTransform: Transform,
  activeHandle: HandleType
): void => {
  const { x: tx, y: ty } = startTransform;
  const { x: origWidth, y: origHeight } = startTransform.scale;

  switch (activeHandle) {
    case HandleType.TopRight: {
      const fixedCornerX = tx - origWidth;
      const fixedCornerY = ty - origHeight;
      const newWidth = Math.abs(pos.x - fixedCornerX);
      const newHeight = Math.abs(pos.y - fixedCornerY);
      clip.transform.scale = { x: newWidth / 2, y: newHeight / 2 };
      break;
    }
    case HandleType.Right: {
      const fixedEdgeX = tx - origWidth;
      const newWidth = Math.abs(pos.x - fixedEdgeX);
      clip.transform.scale = { x: newWidth / 2, y: origHeight };
      break;
    }
    case HandleType.Top: {
      const fixedEdgeY = ty - origHeight;
      const newHeight = Math.abs(pos.y - fixedEdgeY);
      clip.transform.scale = { x: origWidth, y: newHeight / 2 };
      break;
    }
    case HandleType.BottomRight: {
      const fixedCornerX = tx - origWidth;
      const fixedCornerY = ty + origHeight;
      const newWidth = Math.abs(pos.x - fixedCornerX);
      const newHeight = Math.abs(pos.y - fixedCornerY);
      clip.transform.scale = { x: newWidth / 2, y: newHeight / 2 };
      break;
    }
    case HandleType.TopLeft: {
      const fixedCornerX = tx + origWidth;
      const fixedCornerY = ty - origHeight;
      const newWidth = Math.abs(pos.x - fixedCornerX);
      const newHeight = Math.abs(pos.y - fixedCornerY);
      clip.transform.scale = { x: newWidth / 2, y: newHeight / 2 };
      break;
    }
    case HandleType.Left: {
      const fixedEdgeX = tx + origWidth;
      const newWidth = Math.abs(pos.x - fixedEdgeX);
      clip.transform.scale = { x: newWidth / 2, y: origHeight };
      break;
    }
    case HandleType.BottomLeft: {
      const fixedCornerX = tx + origWidth;
      const fixedCornerY = ty + origHeight;
      const newWidth = Math.abs(pos.x - fixedCornerX);
      const newHeight = Math.abs(pos.y - fixedCornerY);
      clip.transform.scale = { x: newWidth / 2, y: newHeight / 2 };
      break;
    }
    case HandleType.Bottom: {
      const fixedEdgeY = ty + origHeight;
      const newHeight = Math.abs(pos.y - fixedEdgeY);
      clip.transform.scale = { x: origWidth, y: newHeight / 2 };
      break;
    }
  }
};

// Main event handlers
export const onPointerDown = (
  args: PointerEventArgs,
  {
    clips,
    selectedClipId,
    getHandleAtPosition,
    cameraPosition,
    canvasAspectRatio,
    onClipSelect,
  }: {
    clips: Clip[];
    selectedClipId: string | null;
    getHandleAtPosition: (pos: Vec2, clip: Clip) => HandleType;
    cameraPosition: Vec2;
    canvasAspectRatio: number;
    onClipSelect: (clipId: string | null) => void;
  }
): PointerState => {
  const pos = getWorldPosition(args, cameraPosition, canvasAspectRatio);

  // Handle middle button or shift+left click for panning
  if (args.button === 1 || (args.button === 0 && args.shiftKey)) {
    return {
      mode: "pan",
      clipId: null,
      startPos: [pos.x, pos.y],
      startTransform: null,
      currentPos: [pos.x, pos.y],
      activeHandle: HandleType.None,
    };
  }

  // Handle left click
  if (args.button === 0) {
    if (selectedClipId !== null) {
      const selectedClip = clips.find((clip) => clip.id === selectedClipId);
      if (selectedClip) {
        const handle = getHandleAtPosition([pos.x, pos.y], selectedClip);
        if (handle !== HandleType.None) {
          return {
            mode: "stretch",
            clipId: selectedClipId,
            startPos: [pos.x, pos.y],
            startTransform: { ...selectedClip.transform },
            currentPos: [pos.x, pos.y],
            activeHandle: handle,
          };
        }
      }
    }

    // Hit test all clips in reverse order
    for (let i = clips.length - 1; i >= 0; i--) {
      const clip = clips[i];
      const { x: tx, y: ty } = clip.transform;
      const { x: sx, y: sy } = clip.transform.scale;

      if (
        pos.x >= tx - sx &&
        pos.x <= tx + sx &&
        pos.y >= ty - sy &&
        pos.y <= ty + sy
      ) {
        onClipSelect(clip.id);
        return {
          mode: "drag",
          clipId: clip.id,
          startPos: [pos.x, pos.y],
          startTransform: { ...clip.transform },
          currentPos: [pos.x, pos.y],
          activeHandle: HandleType.None,
        };
      }
    }

    // If we didn't hit any clip, deselect
    onClipSelect(null);
  }

  return {
    mode: "none",
    clipId: null,
    startPos: [0, 0],
    startTransform: null,
    currentPos: [0, 0],
    activeHandle: HandleType.None,
  };
};

export const onPointerMove = (
  args: PointerEventArgs,
  state: PointerState,
  {
    clips,
    camera,
    cameraPosition,
    canvasAspectRatio,
  }: {
    clips: Clip[];
    camera: { pan: (dx: number, dy: number) => void };
    cameraPosition: Vec2;
    canvasAspectRatio: number;
  }
): void => {
  const pos = getWorldPosition(args, cameraPosition, canvasAspectRatio);

  if (state.mode === "pan") {
    handlePan(pos, state.startPos, camera);
  } else if (state.mode === "drag" && state.clipId && state.startTransform) {
    const clip = clips.find((c) => c.id === state.clipId);
    if (clip) {
      handleDrag(pos, clip, state.startPos, state.startTransform);
    }
  } else if (state.mode === "stretch" && state.clipId && state.startTransform) {
    const clip = clips.find((c) => c.id === state.clipId);
    if (clip) {
      handleStretch(pos, clip, state.startTransform, state.activeHandle);
    }
  }
};

export const onPointerUp = (
  args: PointerEventArgs,
  state: PointerState,
  onClipsUpdate?: (clips: Clip[]) => void,
  clips?: Clip[]
): PointerState => {
  if (state.mode === "drag" && clips && onClipsUpdate) {
    onClipsUpdate([...clips]);
  }

  return {
    mode: "none",
    clipId: null,
    startPos: [0, 0],
    startTransform: null,
    currentPos: [0, 0],
    activeHandle: HandleType.None,
  };
};

