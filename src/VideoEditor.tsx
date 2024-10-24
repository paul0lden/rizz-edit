import React, { useEffect, useRef, useState } from "react";
import * as twgl from "twgl.js";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { Play, Pause } from "lucide-react";

// Vertex shader for video processing
const vertexShader = `#version 300 es
in vec4 position;
in vec2 texcoord;
out vec2 v_texCoord;

void main() {
    gl_Position = position * vec4(1, -1, 1, 1);
    v_texCoord = texcoord;
}`;

// Fragment shader with effects
const fragmentShader = `#version 300 es
precision highp float;

in vec2 v_texCoord;
out vec4 outColor;

uniform sampler2D u_texture;
uniform float u_brightness;
uniform float u_contrast;
uniform float u_saturation;

void main() {
    vec4 color = texture(u_texture, v_texCoord);
    
    // Brightness
    color.rgb += u_brightness;
    
    // Contrast
    color.rgb = (color.rgb - 0.5) * u_contrast + 0.5;
    
    // Saturation
    float luminance = dot(color.rgb, vec3(0.299, 0.587, 0.114));
    color.rgb = mix(vec3(luminance), color.rgb, u_saturation);
    
    outColor = color;
}`;

const VideoEditor = ({ onFileSelect }) => {
  const [loaded, setLoaded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoDimensions, setVideoDimensions] = useState({
    width: 1280,
    height: 720,
  });
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  const canvasRef = useRef(null);
  const videoRef = useRef(null);
  const glRef = useRef(null);
  const programInfoRef = useRef(null);
  const bufferInfoRef = useRef(null);
  const textureRef = useRef(null);
  const animationFrameRef = useRef(null);
  const ffmpegRef = useRef(new FFmpeg());

  // Initialize WebGL2
  useEffect(() => {
    const canvas = canvasRef.current;
    const gl = canvas.getContext("webgl2", { preserveDrawingBuffer: true });

    if (!gl) {
      console.error("WebGL2 not available");
      return;
    }

    glRef.current = gl;

    // Initialize TWGL program
    const programInfo = twgl.createProgramInfo(gl, [
      vertexShader,
      fragmentShader,
    ]);
    programInfoRef.current = programInfo;

    // Create buffers for a full-screen quad
    const arrays = {
      position: [-1, -1, 0, 1, -1, 0, -1, 1, 0, -1, 1, 0, 1, -1, 0, 1, 1, 0],
      texcoord: [0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1],
    };
    const bufferInfo = twgl.createBufferInfoFromArrays(gl, arrays);
    bufferInfoRef.current = bufferInfo;

    // Create initial texture
    const texture = twgl.createTexture(gl, {
      src: [0, 0, 0, 255],
      width: 1,
      height: 1,
      min: gl.LINEAR,
      mag: gl.LINEAR,
      wrap: gl.CLAMP_TO_EDGE,
    });
    textureRef.current = texture;

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const renderFrame = () => {
    const gl = glRef.current;
    const programInfo = programInfoRef.current;
    const bufferInfo = bufferInfoRef.current;

    if (!gl || !programInfo || !bufferInfo) return;

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    gl.useProgram(programInfo.program);
    twgl.setBuffersAndAttributes(gl, programInfo, bufferInfo);

    const uniforms = {
      u_texture: textureRef.current,
      u_brightness: 0,
      u_contrast: 1,
      u_saturation: 1,
    };

    twgl.setUniforms(programInfo, uniforms);
    twgl.drawBufferInfo(gl, bufferInfo);
  };

  const render = () => {
    const gl = glRef.current;
    const video = videoRef.current;

    if (!gl || !video) return;

    if (!video.paused) {
      twgl.setTextureFromElement(gl, textureRef.current, video);
    }

    renderFrame();
    animationFrameRef.current = requestAnimationFrame(render);
  };

  const togglePlayback = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
    setIsPlaying(!isPlaying);
  };


  return (
    <div className="flex flex-col items-center w-full max-w-4xl mx-auto p-4">
      <div className="relative h-full">
      <canvas
        ref={canvasRef}
        className="bg-gray-900 rounded-lg"
        style={{
          aspectRatio: `${videoDimensions.width}/${videoDimensions.height}`,
          width: "100%",
          maxHeight: "80vh",
          objectFit: "contain",
        }}
      />
        <div className="flex opacity-0 transition-opacity hover:opacity-100 w-full p-4 bg-blend-darken bg-stone-900 bg-opacity-25 absolute justify-center bottom-0">
      <button
        onClick={togglePlayback}
        className="rounded-full flex justify-center items-center p-4 bg-blue-500 text-white over:bg-blue-600"
        disabled={!videoRef.current || isExporting}
      >
        {isPlaying ? <Pause /> : <Play />}
      </button>
      </div>
      </div>

      <div className="w-full mt-4 space-y-4">

        {isExporting && (
          <div className="w-full">
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-blue-600 h-2.5 rounded-full"
                style={{ width: `${exportProgress}%` }}
              />
            </div>
            <p className="text-center mt-2">
              Exporting: {exportProgress.toFixed(1)}%
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoEditor;
