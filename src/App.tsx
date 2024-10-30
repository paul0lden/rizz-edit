import { useState, useRef, useEffect, useCallback } from 'react';
import './App.css';
import VideoEditor from './VideoEditor';
import VideoTimeline from './VideoTimeline';
import * as twgl from 'twgl.js';
import { fragmentShader, vertexShader } from './shaders';

export interface VideoClip {
  id: number;
  file: File;
  fileName: string;
  duration: number;
  width: number;
  height: number;
  startTime: number;
  texture?: WebGLTexture;
  effects: {
    brightness: number;
    contrast: number;
    saturation: number;
  };
}

function App() {
  const [clips, setClips] = useState<VideoClip[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const currentTimeRef = useRef(0);
  const canvasDimensionsRef = useRef({
    width: 1280,
    height: 720,
  });

  const videoRefs = useRef<{ [key: number]: HTMLVideoElement }>({});
  const glRef = useRef<WebGL2RenderingContext | null>(null);
  const programInfoRef = useRef<twgl.ProgramInfo | null>(null);
  const bufferInfoRef = useRef<twgl.BufferInfo | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Initialize WebGL
  useEffect(() => {
    const canvas = document.querySelector('#mainCanvas') as HTMLCanvasElement;
    if (!canvas || glRef.current) return;
    
    canvasRef.current = canvas;
    const gl = canvas.getContext('webgl2', { 
      preserveDrawingBuffer: true,
      alpha: false,
      depth: false,
      stencil: false,
      antialias: false
    });

    if (!gl) {
      console.error('WebGL2 not available');
      return;
    }

    glRef.current = gl;
    
    const programInfo = twgl.createProgramInfo(gl, [vertexShader, fragmentShader]);
    programInfoRef.current = programInfo;

    const arrays = {
      position: new Float32Array([-1, -1, 0, 1, -1, 0, -1, 1, 0, -1, 1, 0, 1, -1, 0, 1, 1, 0]),
      texcoord: new Float32Array([0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1])
    };
    bufferInfoRef.current = twgl.createBufferInfoFromArrays(gl, arrays);

    canvas.width = canvasDimensionsRef.current.width;
    canvas.height = canvasDimensionsRef.current.height;
    gl.viewport(0, 0, canvas.width, canvas.height);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const getCurrentClip = useCallback((time: number) => {
    return clips.find(clip => 
      time >= clip.startTime && time < clip.startTime + clip.duration
    ) || null;
  }, [clips]);

  const renderFrame = useCallback(() => {
    const gl = glRef.current;
    const programInfo = programInfoRef.current;
    const bufferInfo = bufferInfoRef.current;

    if (!gl || !programInfo || !bufferInfo) return;

    const currentClip = getCurrentClip(currentTimeRef.current);
    if (!currentClip?.texture) return;

    const video = videoRefs.current[currentClip.id];
    if (!video) return;

    // When paused, only update the texture if the video frame has actually changed
    if (!isPlaying && video.currentTime === video.lastRenderedTime) {
      return;
    }

    // Update texture
    twgl.setTextureFromElement(gl, currentClip.texture, video);
    video.lastRenderedTime = video.currentTime;

    // Render frame
    gl.useProgram(programInfo.program);
    twgl.setBuffersAndAttributes(gl, programInfo, bufferInfo);

    const uniforms = {
      u_texture: currentClip.texture,
      u_brightness: currentClip.effects.brightness,
      u_contrast: currentClip.effects.contrast,
      u_saturation: currentClip.effects.saturation,
    };

    twgl.setUniforms(programInfo, uniforms);
    twgl.drawBufferInfo(gl, bufferInfo);
  }, [getCurrentClip, isPlaying]);

  // Separate time update from render loop
  useEffect(() => {
    let lastTime = performance.now();
    let frameId: number;

    const updateLoop = () => {
      if (isPlaying) {
        const now = performance.now();
        const deltaTime = (now - lastTime) / 1000;
        lastTime = now;

        const totalDuration = clips.reduce((total, clip) => total + clip.duration, 0);
        
        // Update time
        currentTimeRef.current += deltaTime;
        if (currentTimeRef.current >= totalDuration) {
          currentTimeRef.current = 0;
          setIsPlaying(false);
          Object.values(videoRefs.current).forEach(video => {
            video.pause();
            video.currentTime = 0;
          });
        } else {
          // Update current video time
          const currentClip = getCurrentClip(currentTimeRef.current);
          if (currentClip) {
            const video = videoRefs.current[currentClip.id];
            if (video) {
              const clipTime = currentTimeRef.current - currentClip.startTime;
              if (Math.abs(video.currentTime - clipTime) > 0.1) {
                video.currentTime = clipTime;
              }
            }
          }
        }
      }

      // Always render frame, even when paused
      renderFrame();
      frameId = requestAnimationFrame(updateLoop);
    };

    frameId = requestAnimationFrame(updateLoop);
    return () => cancelAnimationFrame(frameId);
  }, [isPlaying, clips, getCurrentClip, renderFrame]);

  // Handle play/pause transitions
  useEffect(() => {
    const currentClip = getCurrentClip(currentTimeRef.current);
    if (!currentClip) return;

    const video = videoRefs.current[currentClip.id];
    if (!video) return;

    if (isPlaying) {
      // Ensure video is at the correct time before playing
      const clipTime = currentTimeRef.current - currentClip.startTime;
      video.currentTime = clipTime;
      video.play().catch(console.error);
    } else {
      video.pause();
    }
  }, [isPlaying, getCurrentClip]);

  const handleAddClip = useCallback(async (file: File) => {
    const video = document.createElement('video');
    video.src = URL.createObjectURL(file);
    
    try {
      await video.play();
      video.pause();
      
      const gl = glRef.current;
      if (!gl) return;

      const newClip: VideoClip = {
        id: Date.now(),
        file,
        fileName: file.name,
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight,
        startTime: clips.reduce((total, clip) => total + clip.duration, 0),
        effects: {
          brightness: 0,
          contrast: 1,
          saturation: 1,
        }
      };

      const videoElement = document.createElement('video');
      videoElement.src = URL.createObjectURL(file);
      videoElement.playsInline = true;
      videoElement.muted = true;
      videoElement.preload = 'auto';
      
      await videoElement.play();
      videoElement.pause();
      videoElement.currentTime = 0;
      // Add custom property for frame tracking
      videoElement.lastRenderedTime = 0;
      
      videoRefs.current[newClip.id] = videoElement;

      newClip.texture = twgl.createTexture(gl, {
        src: [0, 0, 0, 255],
        width: 1,
        height: 1,
        min: gl.LINEAR,
        mag: gl.LINEAR,
        wrap: gl.CLAMP_TO_EDGE,
      });

      setClips(prevClips => [...prevClips, newClip]);

      if (clips.length === 0) {
        canvasDimensionsRef.current = {
          width: video.videoWidth,
          height: video.videoHeight,
        };
        
        if (canvasRef.current && gl) {
          canvasRef.current.width = video.videoWidth;
          canvasRef.current.height = video.videoHeight;
          gl.viewport(0, 0, video.videoWidth, video.videoHeight);
        }
      }
    } catch (error) {
      console.error('Error adding clip:', error);
    }
  }, [clips]);

  const handleSeek = useCallback((newTime: number) => {
    currentTimeRef.current = newTime;
    const clip = getCurrentClip(newTime);
    if (clip) {
      const video = videoRefs.current[clip.id];
      if (video) {
        const clipTime = newTime - clip.startTime;
        video.currentTime = clipTime;
        // Force a new render after seeking
        video.lastRenderedTime = undefined;
      }
    }
  }, [getCurrentClip]);

  return (
    <div className="flex flex-col gap-6 p-4">
      <VideoEditor
        isPlaying={isPlaying}
        onPlayPause={() => setIsPlaying(!isPlaying)}
        canvasDimensions={canvasDimensionsRef.current}
      />
      <VideoTimeline
        clips={clips}
        currentTime={currentTimeRef.current}
        onAddClip={handleAddClip}
        onUpdateClip={useCallback((clipId: number, effects: VideoClip['effects']) => {
          setClips(prevClips =>
            prevClips.map(clip =>
              clip.id === clipId ? { ...clip, effects: { ...clip.effects, ...effects } } : clip
            )
          );
        }, [])}
        onTimeUpdate={handleSeek}
      />
    </div>
  );
}

export default App;
