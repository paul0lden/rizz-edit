import { useState, useRef, useEffect, useCallback } from "react";
import * as twgl from "twgl.js";
import { mat4, vec2 } from "gl-matrix";
import { VideoTimeline } from "./VideoTimeline";
import { HandleType, Transform, VideoClip } from "./types";
import { TransformSystem } from "./utils/transform";
import { VideoRenderer } from "./VideoRenderer";
import { getHandleAtPosition, SelectionRenderer } from './SelectionRenderer';
import { Play, Pause } from "lucide-react";
import { Camera } from "./Camera";

function App() {
  // State
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedClipId, setSelectedClipId] = useState<number | null>(null);
  const [clipsList, setClipsList] = useState<VideoClip[]>([]);

  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<WebGL2RenderingContext | null>(null);
  const cameraRef = useRef<Camera | null>(null);
  const videoRendererRef = useRef<VideoRenderer | null>(null);
  const transformSystemRef = useRef<TransformSystem | null>(null);
  const selectionRendererRef = useRef<SelectionRenderer | null>(null);
  const videoRefs = useRef<{ [key: number]: HTMLVideoElement }>({});
  const clipsRef = useRef<VideoClip[]>([]);
  const currentTimeRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(0);
  const needsRenderRef = useRef(false);

  // Drag state
  const dragState = useRef({
    mode: "none" as "none" | "pan" | "drag" | "stretch",
    clipId: null as number | null,
    startPos: vec2.create(),
    startTransform: null as Transform | null,
    currentPos: vec2.create(),
    activeHandle: HandleType.None,
  });

  // Sync clips with ref
  useEffect(() => {
    clipsRef.current = clipsList;
  }, [clipsList]);

  // Initialize WebGL and renderers
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl2");
    if (!gl) {
      console.error("WebGL 2 not available");
      return;
    }

    // Initialize all systems
    glRef.current = gl;
    cameraRef.current = new Camera(canvas.width, canvas.height);
    videoRendererRef.current = new VideoRenderer(gl);
    transformSystemRef.current = new TransformSystem(gl);

    try {
      selectionRendererRef.current = new SelectionRenderer(gl);
      console.log('SelectionRenderer initialized');
    } catch (error) {
      console.error('SelectionRenderer initialization failed:', error);
    }

    gl.clearColor(0.1, 0.1, 0.1, 1.0);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  // Render frame function
  const renderFrame = useCallback(() => {
    const gl = glRef.current;
    const videoRenderer = videoRendererRef.current;
    const selectionRenderer = selectionRendererRef.current;
    const camera = cameraRef.current;

    if (!gl || !videoRenderer || !camera || !selectionRenderer) return;

    gl.clear(gl.COLOR_BUFFER_BIT);

    const projection = camera.getProjectionMatrix();
    const view = camera.getViewMatrix();

    // Render all clips
    clipsRef.current.forEach(clip => {
      if (!clip.texture) return;

      const video = videoRefs.current[clip.id];
      if (!video) return;

      if (isPlaying) {
        twgl.setTextureFromElement(gl, clip.texture, video);
      }

      videoRenderer.render(clip, { projection, view });
    });

    // Render selection if needed
    if (selectedClipId !== null) {
      const selectedClip = clipsRef.current.find(clip => clip.id === selectedClipId);
      if (selectedClip) {
        selectionRenderer.render(selectedClip, { projection, view });
      }
    }
  }, [isPlaying, selectedClipId]);

  // Mouse position update helper
  const updateMousePosition = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    const camera = cameraRef.current;
    if (!canvas || !camera) return;

    const rect = canvas.getBoundingClientRect();
    const aspectRatio = canvas.width / canvas.height;

    // Convert screen coordinates to normalized device coordinates (-1 to 1)
    const normalizedX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const normalizedY = -(((e.clientY - rect.top) / rect.height) * 2 - 1);

    // Apply aspect ratio correction to X coordinate
    const worldX = normalizedX * aspectRatio + camera.getPosition()[0];
    const worldY = normalizedY + camera.getPosition()[1];

    vec2.set(dragState.current.currentPos, worldX, worldY);
    return { x: worldX, y: worldY };
  }, []);

  // Mouse event handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
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
      };
      e.preventDefault();
      return;
    }

    // Handle left click
    if (e.button === 0) {

      if (selectedClipId !== null) {
        const selectedClip = clipsRef.current.find(clip => clip.id === selectedClipId);
        if (selectedClip) {
          const handle = getHandleAtPosition(vec2.fromValues(pos.x, pos.y), selectedClip);
          if (handle !== HandleType.None) {
            dragState.current = {
              mode: "stretch",
              clipId: selectedClipId,
              startPos: vec2.fromValues(pos.x, pos.y),
              startTransform: { ...selectedClip.transform },
              currentPos: vec2.fromValues(pos.x, pos.y),
              activeHandle: handle
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
        };
        setSelectedClipId(null);
        needsRenderRef.current = true;
      }
    }

    e.preventDefault();
  }, [selectedClipId, updateMousePosition]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const pos = updateMousePosition(e);
    if (!pos) return;

    const state = dragState.current;

    if (state.mode === "pan") {
      const camera = cameraRef.current;
      if (!camera) return;

      const dx = pos.x - state.startPos[0];
      const dy = pos.y - state.startPos[1];
      camera.pan(dx * 0.5, dy * 0.5);
      vec2.set(state.startPos, pos.x, pos.y);
      needsRenderRef.current = true;
    } else if (state.mode === "drag" && state.clipId !== null && state.startTransform) {
      const clip = clipsRef.current.find(c => c.id === state.clipId);
      if (!clip) return;

      const dx = pos.x - state.startPos[0];
      const dy = pos.y - state.startPos[1];

      clip.transform.translation = [
        state.startTransform.translation[0] + dx,
        state.startTransform.translation[1] + dy,
        0,
      ];
      needsRenderRef.current = true;
    } else if (state.mode === "stretch" && state.clipId !== null && state.startTransform) {
      const clip = clipsRef.current.find(c => c.id === state.clipId);
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
  }, [updateMousePosition]);

  const handleMouseUp = useCallback(() => {
    if (dragState.current.mode === "drag") {
      setClipsList([...clipsRef.current]);
    }
    dragState.current = {
      mode: "none",
      clipId: null,
      startPos: vec2.create(),
      startTransform: null,
      currentPos: vec2.create(),
    };
  }, []);

  // Animation loop
  useEffect(() => {
    const animate = (now: number) => {
      if (!lastFrameTimeRef.current) {
        lastFrameTimeRef.current = now;
      }

      const deltaTime = (now - lastFrameTimeRef.current) / 1000;
      lastFrameTimeRef.current = now;

      if (isPlaying) {
        currentTimeRef.current += deltaTime;

        const totalDuration = clipsRef.current.reduce(
          (max, clip) => Math.max(max, clip.startTime + clip.duration),
          0
        );

        if (currentTimeRef.current >= totalDuration) {
          currentTimeRef.current = 0;
          setIsPlaying(false);
        }

        clipsRef.current.forEach(clip => {
          const video = videoRefs.current[clip.id];
          if (video) {
            const clipTime = currentTimeRef.current - clip.startTime;
            if (clipTime >= 0 && clipTime < clip.duration) {
              if (Math.abs(video.currentTime - clipTime) > 0.1) {
                video.currentTime = clipTime;
              }
            }
          }
        });
      }
      // Always render if anything needs updating
      if (needsRenderRef.current || isPlaying || selectedClipId !== null) {
        renderFrame();
        needsRenderRef.current = false;
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [isPlaying, renderFrame, selectedClipId]);

  // Handle video playback state
  useEffect(() => {
    const videos = videoRefs.current;

    if (isPlaying) {
      Object.values(videos).forEach(video => {
        if (video.paused) {
          video.play().catch(console.error);
        }
      });
    } else {
      Object.values(videos).forEach(video => {
        if (!video.paused) {
          video.pause();
        }
      });
    }
  }, [isPlaying]);

  // Add clip handler
  const handleAddClip = useCallback(async (file: File) => {
    const gl = glRef.current;
    const camera = cameraRef.current;

    if (!gl || !camera) return;

    try {
      const videoElement = document.createElement('video');
      videoElement.src = URL.createObjectURL(file);
      videoElement.playsInline = true;
      videoElement.muted = true;
      videoElement.preload = 'auto';

      await new Promise<void>((resolve) => {
        videoElement.onloadedmetadata = () => resolve();
      });

      const texture = twgl.createTexture(gl, {
        src: [255, 255, 255, 255],
        width: 1,
        height: 1,
        min: gl.LINEAR,
        mag: gl.LINEAR,
        wrap: gl.CLAMP_TO_EDGE,
      });

      await videoElement.play();
      videoElement.pause();
      videoElement.currentTime = 0;

      twgl.setTextureFromElement(gl, texture, videoElement);

      const cameraPos = camera.getPosition();
      const aspectRatio = videoElement.videoWidth / videoElement.videoHeight;
      const scale = 0.5 / Math.max(1, aspectRatio);

      const newClip: VideoClip = {
        id: Date.now(),
        file,
        fileName: file.name,
        duration: videoElement.duration,
        startTime: clipsRef.current.reduce((total, clip) =>
          Math.max(total, clip.startTime + clip.duration), 0),
        transform: {
          translation: [cameraPos[0], cameraPos[1], 0],
          rotation: [0, 0, 0],
          scale: [scale * aspectRatio, scale, 1],
        },
        effects: {
          brightness: 0,
          contrast: 1,
          saturation: 1,
        },
        texture
      };

      videoRefs.current[newClip.id] = videoElement;

      setClipsList(prev => {
        const updated = [...prev, newClip];
        clipsRef.current = updated;
        return updated;
      });

      needsRenderRef.current = true;
    } catch (error) {
      console.error('Error adding clip:', error);
    }
  }, []);

  // Time update handler
  const handleTimeUpdate = useCallback((time: number) => {
    currentTimeRef.current = time;
    clipsRef.current.forEach((clip) => {
      const video = videoRefs.current[clip.id];
      if (video) {
        const clipTime = Math.max(0, time - clip.startTime);
        if (Math.abs(video.currentTime - clipTime) > 0.1) {
          video.currentTime = clipTime;
        }
      }
    });
    needsRenderRef.current = true;
  }, []);

  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="relative w-full aspect-video">
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
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onContextMenu={(e) => e.preventDefault()}
        />
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="rounded-full flex justify-center items-center p-4 bg-blue-500 text-white hover:bg-blue-600"
          >
            {isPlaying ? <Pause /> : <Play />}
          </button>
        </div>
      </div>
      <VideoTimeline
        clips={clipsList}
        currentTime={currentTimeRef.current}
        onAddClip={handleAddClip}
        onTimeUpdate={handleTimeUpdate}
        selectedClipId={selectedClipId}
        onClipSelect={setSelectedClipId}
      />
    </div>
  );
}

export default App;
