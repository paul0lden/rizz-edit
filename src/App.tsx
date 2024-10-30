import { useState, useRef, useEffect, useCallback } from "react";
import * as twgl from "twgl.js";
import { mat4 } from "gl-matrix";
import { VideoTimeline } from "./VideoTimeline";
import { DragState, Transform, VideoClip } from "./types";
import { TransformSystem } from "./utils/transform";
import { screenToWorld } from "./utils/coordinates";
import { VideoRenderer } from "./VideoRenderer";
import { Play, Pause } from "lucide-react";
import { vec2 } from "gl-matrix";
import { Camera } from "./Camera";

//function App() {
//  const [clips, setClips] = useState<VideoClip[]>([]);
//  const [isPlaying, setIsPlaying] = useState(false);
//  const [selectedClipId, setSelectedClipId] = useState<number | null>(null);
//
//  const currentTimeRef = useRef(0);
//  const glRef = useRef<WebGL2RenderingContext | null>(null);
//  const transformSystemRef = useRef<TransformSystem | null>(null);
//  const videoRendererRef = useRef<VideoRenderer | null>(null);
//  const videoRefs = useRef<{ [key: number]: HTMLVideoElement }>({});
//  const canvasRef = useRef<HTMLCanvasElement | null>(null);
//  const animationFrameRef = useRef<number | null>(null);
//
//  const cameraRef = useRef<Camera>();
//  const isDraggingRef = useRef(false);
//  const lastMousePosRef = useRef<vec2>();
//  const frameRequestRef = useRef<number>();
//  const needsRenderRef = useRef(false);
//
//  const clipsRef = useRef<VideoClip[]>([]);
//
//  useEffect(() => {
//    clipsRef.current = clips;
//  }, [clips]);
//
//  const [dragState, setDragState] = useState<DragState>({
//    isDragging: false,
//    objectId: null,
//    startPos: null,
//    startTransform: null,
//  });
//
//  const dragStateRef = useRef({
//    isDragging: false,
//    objectId: null as number | null,
//    startPos: null as vec2 | null,
//    startTransform: null as Transform | null,
//  });
//
//  // Initialize WebGL systems
//  useEffect(() => {
//    if (canvasRef.current && !glRef.current) {
//      const gl = canvasRef.current.getContext("webgl2");
//      if (gl) {
//        glRef.current = gl;
//        transformSystemRef.current = new TransformSystem(gl);
//        videoRendererRef.current = new VideoRenderer(gl);
//
//        // Set clear color
//        gl.clearColor(0.1, 0.1, 0.1, 1.0);
//      }
//    }
//  }, []);
//  useEffect(() => {
//    if (canvasRef.current && !cameraRef.current) {
//      cameraRef.current = new Camera(
//        canvasRef.current.width,
//        canvasRef.current.height
//      );
//    }
//  }, []);
//
//  const render = useCallback(() => {
//    //const gl = glRef.current;
//    //const videoRenderer = videoRendererRef.current;
//    //const transformSystem = transformSystemRef.current;
//    //const camera = cameraRef.current;
//    //
//    //if (!gl || !videoRenderer || !transformSystem || !camera) return;
//    //
//    //gl.clear(gl.COLOR_BUFFER_BIT);
//    //
//    //const projection = camera.getProjectionMatrix();
//    //const view = camera.getViewMatrix();
//    //
//    //// Render videos
//    //clips.forEach((clip) => {
//    //  if (clip.texture) {
//    //    const video = videoRefs.current[clip.id];
//    //    if (video) {
//    //      if (!video.paused) {
//    //        twgl.setTextureFromElement(gl, clip.texture, video);
//    //      }
//    //      videoRenderer.render(clip, { projection, view });
//    //    }
//    //  }
//    //});
//    //
//    //// Render transform controls
//    //if (selectedClipId !== null) {
//    //  transformSystem.render({ projection, view });
//    //}
//    //
//    //needsRenderRef.current = false;
//    //
//    const gl = glRef.current;
//    const videoRenderer = videoRendererRef.current;
//    const transformSystem = transformSystemRef.current;
//    const camera = cameraRef.current;
//
//    if (!gl || !videoRenderer || !transformSystem || !camera) return;
//
//    gl.clear(gl.COLOR_BUFFER_BIT);
//
//    const projection = camera.getProjectionMatrix();
//    const view = camera.getViewMatrix();
//
//    // Render videos using clipsRef
//    clipsRef.current.forEach((clip) => {
//      if (clip.texture) {
//        const video = videoRefs.current[clip.id];
//        if (video) {
//          if (!video.paused) {
//            twgl.setTextureFromElement(gl, clip.texture, video);
//          }
//          videoRenderer.render(clip, { projection, view });
//        }
//      }
//    });
//
//    if (selectedClipId !== null) {
//      transformSystem.render({ projection, view });
//    }
//
//    needsRenderRef.current = false;
//  }, [selectedClipId]);
//
//  const requestRender = useCallback(() => {
//    if (!needsRenderRef.current) {
//      needsRenderRef.current = true;
//      frameRequestRef.current = requestAnimationFrame(() => {
//        render();
//        // If video is playing, continue animation loop
//        if (isPlaying) {
//          requestRender();
//        }
//      });
//    }
//  }, [render, isPlaying]);
//
//  const handleAddClip = useCallback(async (file: File) => {
//    const video = document.createElement("video");
//    video.src = URL.createObjectURL(file);
//
//    try {
//      await new Promise<void>((resolve, reject) => {
//        video.onloadedmetadata = () => resolve();
//        video.onerror = () => reject();
//      });
//
//      const gl = glRef.current;
//      if (!gl) return;
//
//      // Calculate scale to fit video nicely in view
//      const aspectRatio = video.videoWidth / video.videoHeight;
//      const baseScale = 0.5; // Videos will take up half the view height
//      const scale = baseScale / Math.max(1, aspectRatio);
//
//      const newClip: VideoClip = {
//        id: Date.now(),
//        file,
//        fileName: file.name,
//        duration: video.duration,
//        transform: {
//          translation: [0, 0, 0], // Centered at origin
//          rotation: [0, 0, 0],
//          scale: [scale * aspectRatio, scale, 1],
//        },
//        effects: {
//          brightness: 0,
//          contrast: 1,
//          saturation: 1,
//        },
//      };
//
//      // Create and set up video element
//      const videoElement = document.createElement("video");
//      videoElement.src = URL.createObjectURL(file);
//      videoElement.playsInline = true;
//      videoElement.muted = true;
//      videoElement.loop = true;
//      videoElement.preload = "auto";
//
//      // Create texture
//      newClip.texture = twgl.createTexture(gl, {
//        src: [255, 255, 255, 255],
//        width: 1,
//        height: 1,
//        min: gl.LINEAR,
//        mag: gl.LINEAR,
//        wrap: gl.CLAMP_TO_EDGE,
//      });
//
//      // Store video element reference
//      videoRefs.current[newClip.id] = videoElement;
//
//      // Add clip to state
//      setClips((prevClips) => [...prevClips, newClip]);
//
//      // Initial texture update
//      await videoElement.play();
//      twgl.setTextureFromElement(gl, newClip.texture!, videoElement);
//      videoElement.pause();
//      videoElement.currentTime = 0;
//    } catch (error) {
//      console.error("Error adding clip:", error);
//    }
//  }, []);
//
//  const handleMouseDown = useCallback((e: React.MouseEvent) => {
//    const canvas = canvasRef.current;
//    const camera = cameraRef.current;
//    if (!canvas || !camera) return;
//
//    if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
//      // Middle button or shift+left click for canvas panning
//      isDraggingRef.current = true;
//      lastMousePosRef.current = vec2.fromValues(e.clientX, e.clientY);
//      e.preventDefault();
//      return;
//    }
//
//    if (e.button === 0) {
//      // Left click for object dragging
//      const worldPos = screenToWorld(e.clientX, e.clientY, canvas, camera);
//
//      // Check if we hit any clip
//      for (let i = clipsRef.current.length - 1; i >= 0; i--) {
//        const clip = clipsRef.current[i];
//
//        const halfWidth = clip.transform.scale[0];
//        const halfHeight = clip.transform.scale[1];
//        const [tx, ty] = clip.transform.translation;
//
//        if (
//          worldPos[0] >= tx - halfWidth &&
//          worldPos[0] <= tx + halfWidth &&
//          worldPos[1] >= ty - halfHeight &&
//          worldPos[1] <= ty + halfHeight
//        ) {
//          // Hit! Start dragging this object
//          dragStateRef.current = {
//            isDragging: true,
//            objectId: clip.id,
//            startPos: worldPos,
//            startTransform: { ...clip.transform },
//          };
//          setSelectedClipId(clip.id);
//          e.preventDefault();
//          return;
//        }
//      }
//    }
//  }, []);
//
//  const handleMouseMove = useCallback((e: React.MouseEvent) => {
//    const canvas = canvasRef.current;
//    const camera = cameraRef.current;
//    if (!canvas || !camera) return;
//
//    if (isDraggingRef.current) {
//      // Handle canvas panning
//      const currentPos = vec2.fromValues(e.clientX, e.clientY);
//      const delta = vec2.create();
//      vec2.subtract(delta, currentPos, lastMousePosRef.current!);
//
//      const scale = 1 / 400;
//      camera.pan(delta[0] * scale, -delta[1] * scale);
//      lastMousePosRef.current = currentPos;
//      requestRender();
//      return;
//    }
//
//    const dragState = dragStateRef.current;
//    if (dragState.isDragging && dragState.objectId !== null) {
//      // Handle object dragging
//      const worldPos = screenToWorld(e.clientX, e.clientY, canvas, camera);
//      const delta = vec2.create();
//      vec2.subtract(delta, worldPos, dragState.startPos!);
//
//      // Update clip position directly without state update
//      const clips = clipsRef.current;
//      for (let i = 0; i < clips.length; i++) {
//        if (clips[i].id === dragState.objectId) {
//          clips[i].transform = {
//            ...clips[i].transform,
//            translation: [
//              dragState.startTransform!.translation[0] + delta[0],
//              dragState.startTransform!.translation[1] + delta[1],
//              0,
//            ],
//          };
//          break;
//        }
//      }
//
//      // Request render without state update
//      requestRender();
//    }
//  }, []);
//
//  const handleMouseUp = useCallback((e: React.MouseEvent) => {
//    const dragState = dragStateRef.current;
//    isDraggingRef.current = false;
//
//    if (dragState.isDragging) {
//      // Update state once at the end of drag
//      setClips([...clipsRef.current]);
//      dragStateRef.current = {
//        isDragging: false,
//        objectId: null,
//        startPos: null,
//        startTransform: null,
//      };
//    }
//  }, []);
//
//  const handleWheel = useCallback(
//    (e: WheelEvent) => {
//      if (!cameraRef.current) return;
//
//      const scale = 1 / 200;
//      if (e.shiftKey) {
//        cameraRef.current.pan(e.deltaY * scale, 0);
//      } else {
//        cameraRef.current.pan(0, e.deltaY * scale);
//      }
//      e.preventDefault();
//
//      // Request a render
//      requestRender();
//    },
//    [requestRender]
//  );
//
//  useEffect(() => {
//    const canvas = canvasRef.current;
//    if (!canvas) return;
//
//    canvas.addEventListener("wheel", handleWheel, { passive: false });
//    return () => {
//      canvas.removeEventListener("wheel", handleWheel);
//    };
//  }, [handleWheel]);
//
//  //const renderFrame = useCallback(() => {
//  //  const gl = glRef.current;
//  //  const videoRenderer = videoRendererRef.current;
//  //  const transformSystem = transformSystemRef.current;
//  //  const camera = cameraRef.current;
//  //
//  //  if (!gl || !videoRenderer || !transformSystem || !camera) return;
//  //
//  //  gl.clear(gl.COLOR_BUFFER_BIT);
//  //
//  //  const projection = camera.getProjectionMatrix();
//  //  const view = camera.getViewMatrix();
//  //
//  //  // Render videos
//  //  clips.forEach((clip) => {
//  //    if (clip.texture) {
//  //      const video = videoRefs.current[clip.id];
//  //      if (video) {
//  //        if (!video.paused) {
//  //          twgl.setTextureFromElement(gl, clip.texture, video);
//  //        }
//  //        videoRenderer.render(clip, { projection, view });
//  //      }
//  //    }
//  //  });
//  //
//  //  // Render transform controls
//  //  if (selectedClipId !== null) {
//  //    transformSystem.render({ projection, view });
//  //  }
//  //
//  //  animationFrameRef.current = requestAnimationFrame(renderFrame);
//  //}, [clips, selectedClipId]);
//
//  // Animation loop
//  //useEffect(() => {
//  //  // Play/pause all videos
//  //  clips.forEach((clip) => {
//  //    const video = videoRefs.current[clip.id];
//  //    if (video) {
//  //      if (isPlaying) {
//  //        video.play().catch(console.error);
//  //      } else {
//  //        video.pause();
//  //      }
//  //    }
//  //  });
//  //}, [isPlaying, clips]);
//  //useEffect(() => {
//  //  const animate = () => {
//  //    if (isPlaying) {
//  //      clips.forEach((clip) => {
//  //        const video = videoRefs.current[clip.id];
//  //        if (video) {
//  //          video.play().catch(console.error);
//  //        }
//  //      });
//  //    } else {
//  //      clips.forEach((clip) => {
//  //        const video = videoRefs.current[clip.id];
//  //        if (video) {
//  //          video.pause();
//  //        }
//  //      });
//  //    }
//  //
//  //    renderFrame();
//  //    animationFrameRef.current = requestAnimationFrame(animate);
//  //  };
//  //
//  //  animate();
//  //  return () => {
//  //    if (animationFrameRef.current) {
//  //      cancelAnimationFrame(animationFrameRef.current);
//  //    }
//  //  };
//  //}, [isPlaying, clips, renderFrame]);
//  //
//  useEffect(() => {
//    if (isPlaying) {
//      // Start render loop when playing
//      requestRender();
//
//      // Start video playback
//      clips.forEach((clip) => {
//        const video = videoRefs.current[clip.id];
//        if (video) {
//          video.play().catch(console.error);
//        }
//      });
//    } else {
//      // Pause videos
//      clips.forEach((clip) => {
//        const video = videoRefs.current[clip.id];
//        if (video) {
//          video.pause();
//        }
//      });
//    }
//
//    return () => {
//      if (frameRequestRef.current) {
//        cancelAnimationFrame(frameRequestRef.current);
//      }
//    };
//  }, [isPlaying, clips, requestRender]);
//
//  // Clean up on unmount
//  useEffect(() => {
//    return () => {
//      if (frameRequestRef.current) {
//        cancelAnimationFrame(frameRequestRef.current);
//      }
//    };
//  }, []);
//
//  return (
//    <div className="flex flex-col gap-6 p-4">
//      <div className="relative w-full aspect-video">
//        <canvas
//          ref={canvasRef}
//          className={`w-full h-full bg-gray-900 rounded-lg
//                        ${
//                          isDraggingRef.current
//                            ? "cursor-grabbing"
//                            : dragState.isDragging
//                              ? "cursor-move"
//                              : "cursor-grab"
//                        }`}
//          onMouseDown={handleMouseDown}
//          onMouseMove={handleMouseMove}
//          onMouseUp={handleMouseUp}
//          onMouseLeave={handleMouseUp}
//          onContextMenu={(e) => e.preventDefault()}
//          width={1920}
//          height={1080}
//        />
//
//        {/* Playback controls */}
//        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
//          <button
//            onClick={() => setIsPlaying(!isPlaying)}
//            className="rounded-full flex justify-center items-center p-4 bg-blue-500 text-white hover:bg-blue-600"
//          >
//            {isPlaying ? <Pause /> : <Play />}
//          </button>
//        </div>
//      </div>
//
//      <VideoTimeline
//        clips={clips}
//        currentTime={currentTimeRef.current}
//        onAddClip={handleAddClip}
//        onTimeUpdate={(time) => {
//          currentTimeRef.current = time;
//          clips.forEach((clip) => {
//            const video = videoRefs.current[clip.id];
//            if (video) {
//              video.currentTime = Math.max(0, time);
//            }
//          });
//        }}
//        selectedClipId={selectedClipId}
//      />
//    </div>
//  );
//}

function App() {
  // Keep React state minimal
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedClipId, setSelectedClipId] = useState<number | null>(null);

  // Use refs for everything that needs frequent updates
  //const clipsRef = useRef<VideoClip[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<WebGL2RenderingContext | null>(null);
  const cameraRef = useRef<Camera | null>(null);
  const videoRendererRef = useRef<VideoRenderer | null>(null);
  const transformSystemRef = useRef<TransformSystem | null>(null);
  const videoRefs = useRef<{ [key: number]: HTMLVideoElement }>({});
  const animationFrameRef = useRef<number | null>(null);
  const needsRenderRef = useRef(false);
  const rafRef = useRef<number | null>(null);
    const lastFrameTimeRef = useRef<number>(0);

  //const [clipsList, setClipsList] = useState<VideoClip[]>([]);
  const [clipsList, setClipsList] = useState<VideoClip[]>([]);
  const clipsRef = useRef<VideoClip[]>([]);
  const currentTimeRef = useRef(0);
  const timeUpdateRef = useRef<number | null>(null);

  useEffect(() => {
    console.log("Clips state updated:", clipsList);
    clipsRef.current = clipsList;
  }, [clipsList]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Initialize WebGL
    const gl = canvas.getContext("webgl2");
    if (!gl) {
      console.error("WebGL 2 not available");
      return;
    }
    glRef.current = gl;

    // Initialize Camera
    cameraRef.current = new Camera(canvas.width, canvas.height);

    // Initialize Video Renderer
    videoRendererRef.current = new VideoRenderer(gl);

    // Initialize Transform System
    transformSystemRef.current = new TransformSystem(gl);

    // Set clear color
    gl.clearColor(0.1, 0.1, 0.1, 1.0);

    console.log("WebGL systems initialized"); // Debug log

    // Cleanup
    return () => {
      // Cleanup WebGL resources if needed
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

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
            
            // Wait for metadata
            await new Promise<void>((resolve) => {
                videoElement.onloadedmetadata = () => resolve();
            });

            // Create optimized texture
            const texture = twgl.createTexture(gl, {
                src: [255, 255, 255, 255],
                width: 1,
                height: 1,
                min: gl.LINEAR,
                mag: gl.LINEAR,
                wrap: gl.CLAMP_TO_EDGE,
            });

            // Wait for first frame
            await videoElement.play();
            videoElement.pause();
            videoElement.currentTime = 0;

            // Update texture with first frame
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


  const handleTimeUpdate = useCallback((time: number) => {
    currentTimeRef.current = time;

    // Update video elements
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

  // Drag state management
  const dragState = useRef({
    mode: "none" as "none" | "pan" | "drag",
    clipId: null as number | null,
    startPos: vec2.create(),
    startTransform: null as Transform | null,
    currentPos: vec2.create(),
  });

const renderFrame = useCallback(() => {
        const gl = glRef.current;
        const videoRenderer = videoRendererRef.current;
        const camera = cameraRef.current;

        if (!gl || !videoRenderer || !camera) return;

        gl.clear(gl.COLOR_BUFFER_BIT);

        const projection = camera.getProjectionMatrix();
        const view = camera.getViewMatrix();

        // Track which textures were updated this frame
        const updatedTextures = new Set<WebGLTexture>();

        // Render only visible clips
        clipsRef.current.forEach(clip => {
            if (!clip.texture) return;

            const video = videoRefs.current[clip.id];
            if (!video) return;

            // Check if clip is currently active
            const clipTime = currentTimeRef.current - clip.startTime;
            if (clipTime < 0 || clipTime > clip.duration) return;

            // Update texture only if playing and not already updated
            if (isPlaying && !updatedTextures.has(clip.texture)) {
                twgl.setTextureFromElement(gl, clip.texture, video);
                updatedTextures.add(clip.texture);
            }

            videoRenderer.render(clip, { projection, view });
        });
    }, [isPlaying]);

  //useEffect(() => {
  //  if (!glRef.current || !cameraRef.current) {
  //    console.log("Waiting for initialization...");
  //    return;
  //  }
  //
  //  console.log("Starting render loop");
  //
  //  const animate = () => {
  //    if (needsRenderRef.current) {
  //      renderFrame();
  //    }
  //    animationFrameRef.current = requestAnimationFrame(animate);
  //  };
  //
  //  animate();
  //
  //  return () => {
  //    if (animationFrameRef.current) {
  //      cancelAnimationFrame(animationFrameRef.current);
  //    }
  //  };
  //}, [renderFrame]);

  const updateMousePosition = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    const camera = cameraRef.current;
    if (!canvas || !camera) return;

    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);

    vec2.set(dragState.current.currentPos, x, y);
    return { x, y };
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const pos = updateMousePosition(e);
      if (!pos) return;

      if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
        dragState.current = {
          ...dragState.current,
          mode: "pan",
          startPos: vec2.fromValues(pos.x, pos.y),
        };
        e.preventDefault();
        return;
      }

      if (e.button === 0) {
        // Hit test
        for (let i = clipsRef.current.length - 1; i >= 0; i--) {
          const clip = clipsRef.current[i];
          const [tx, ty] = clip.transform.translation;
          const [sx, sy] = clip.transform.scale;

          if (
            pos.x >= tx - sx &&
            pos.x <= tx + sx &&
            pos.y >= ty - sy &&
            pos.y <= ty + sy
          ) {
            dragState.current = {
              mode: "drag",
              clipId: clip.id,
              startPos: vec2.fromValues(pos.x, pos.y),
              startTransform: { ...clip.transform },
              currentPos: vec2.fromValues(pos.x, pos.y),
            };
            setSelectedClipId(clip.id);
            e.preventDefault();
            return;
          }
        }
      }
    },
    [updateMousePosition]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
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
      }
    },
    [updateMousePosition]
  );

  const handleMouseUp = useCallback(() => {
    dragState.current.mode = "none";
    dragState.current.clipId = null;
    dragState.current.startTransform = null;
  }, []);

  // Video playback control
  useEffect(() => {
        const animate = (now: number) => {
            if (!lastFrameTimeRef.current) {
                lastFrameTimeRef.current = now;
            }
            
            const deltaTime = (now - lastFrameTimeRef.current) / 1000;
            lastFrameTimeRef.current = now;

            // Update time if playing
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

                // Update video times
                clipsRef.current.forEach(clip => {
                    const video = videoRefs.current[clip.id];
                    if (video) {
                        const clipTime = currentTimeRef.current - clip.startTime;
                        if (clipTime >= 0 && clipTime < clip.duration) {
                            // Only update if time difference is significant
                            if (Math.abs(video.currentTime - clipTime) > 0.1) {
                                video.currentTime = clipTime;
                            }
                        }
                    }
                });
            }

            // Only render if needed
            if (needsRenderRef.current || isPlaying) {
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
    }, [isPlaying]);

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

  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="relative w-full aspect-video">
        <canvas
          ref={canvasRef}
          className={`w-full h-full bg-gray-900 rounded-lg 
                        ${
                          dragState.current.mode === "pan"
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
        onClipSelect={(id) => {
          setSelectedClipId(id);
        }}
      />
    </div>
  );
}

export default App;
