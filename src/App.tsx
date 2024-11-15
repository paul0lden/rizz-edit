import { useState, useRef, useEffect, useCallback } from "react";
import * as twgl from "twgl.js";
import { Play, Pause } from "lucide-react";

import { VideoClip } from "./types";
import { TransformSystem } from "./utils/transform";
import { VideoTimeline } from "./components/Timeline";
import VideoEditor from "./components/Editor";

import { usePlaybackState } from "./store/playback";
import useShortcutManager from "./utils/shortcutsManager";
import { useMediaWorker } from "./media/useMediaWorker";

function App() {
  // review those as well, extract
  const [selectedClipId, setSelectedClipId] = useState<number | null>(null);
  const [clipsList, setClipsList] = useState<VideoClip[]>([]);

  // review all of thsose
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<WebGL2RenderingContext | null>(null);
  const transformSystemRef = useRef<TransformSystem | null>(null);
  const videoRefs = useRef<{ [key: number]: HTMLVideoElement }>({});
  const clipsRef = useRef<VideoClip[]>([]);
  const currentTimeRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(0);
  const needsRenderRef = useRef(false);
  const { isPlaying, togglePlay } = usePlaybackState();

  // should not be usedd
  useEffect(() => {
    clipsRef.current = clipsList;
  }, [clipsList]);

  // go off to component
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    //const gl = canvas.getContext("webgl2");
    //if (!gl) {
    //  console.error("WebGL 2 not available");
    //  return;
    //}

    // Initialize all systems
    glRef.current = null;
    //videoRendererRef.current = new VideoRenderer(gl);
    //transformSystemRef.current = new TransformSystem(gl);

    //gl.clearColor(0.1, 0.1, 0.1, 1.0);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  // extract

  // belongs to renderer
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
        }

        clipsRef.current.forEach((clip) => {
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

  // shared state should use store
  useEffect(() => {
    const videos = videoRefs.current;

    if (isPlaying) {
      Object.values(videos).forEach((video) => {
        if (video.paused) {
          video.play().catch(console.error);
        }
      });
    } else {
      Object.values(videos).forEach((video) => {
        if (!video.paused) {
          video.pause();
        }
      });
    }
  }, [isPlaying]);

  // shared - should be handled by timeline
  const handleAddClip = useCallback(async (file: File) => {
    const gl = glRef.current;

    if (!gl) return;

    try {
      const videoElement = document.createElement("video");
      videoElement.src = URL.createObjectURL(file);
      videoElement.playsInline = true;
      videoElement.muted = true;
      videoElement.preload = "auto";

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

      const cameraPos = videoRendererRef.current?.getCameraPosition();
      const aspectRatio = videoElement.videoWidth / videoElement.videoHeight;
      const scale = 0.5 / Math.max(1, aspectRatio);

      const newClip: VideoClip = {
        id: Date.now(),
        file,
        fileName: file.name,
        duration: videoElement.duration,
        startTime: clipsRef.current.reduce(
          (total, clip) => Math.max(total, clip.startTime + clip.duration),
          0
        ),
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
        texture,
      };

      videoRefs.current[newClip.id] = videoElement;

      setClipsList((prev) => {
        const updated = [...prev, newClip];
        clipsRef.current = updated;
        return updated;
      });

      needsRenderRef.current = true;
    } catch (error) {
      console.error("Error adding clip:", error);
    }
  }, []);

  // shared - should be handled by timeline
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

  useMediaWorker({
    canvasRef: canvasRef,
  });
  useShortcutManager();

  return (
    <div className="flex flex-col gap-6 p-4 w-lvw h-lvh dark:bg-gray-950">
      <div className="relative w-full aspect-video">
        <VideoEditor
          canvasRef={canvasRef}
          clipsRef={clipsRef}
          setClipsList={setClipsList}
          needsRenderRef={needsRenderRef}
          setSelectedClipId={setSelectedClipId}
        />
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
          <button
            onClick={() => {
              //setIsPlaying(!isPlaying)
              togglePlay();
            }}
            className="rounded-full flex justify-center items-center p-4 bg-blue-500 text-white hover:bg-blue-600"
          >
            {isPlaying ? <Pause /> : <Play />}
          </button>
        </div>
      </div>
      <VideoTimeline
        currentTime={currentTimeRef.current}
        onTimeUpdate={handleTimeUpdate}
        selectedClipId={selectedClipId}
        onClipSelect={setSelectedClipId}
      />
    </div>
  );
}

export default App;
