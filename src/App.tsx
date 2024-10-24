import { useEffect, useRef, useState } from "react";
import "./App.css";

import { FFmpeg } from "@ffmpeg/ffmpeg";

import VideoEditor from "./VideoEditor";
import VideoMetadata from "./VideoMetadata";
import VideoTimeline from "./VideoTimeline";

function App() {
  const [selectedFile, setSelectedFile] = useState(null);

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

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target?.files?.[0];
    if (!file) return;
    if (!videoRef.current) return;

    // Stop existing playback
    if (videoRef.current) {
      videoRef.current.pause();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }

    // Create new video element
    const video = document.createElement("video");
    video.src = URL.createObjectURL(file);
    video.playsInline = true;
    video.muted = true;
    video.loop = true;

    video.onloadedmetadata = () => {
      // Update dimensions
      setVideoDimensions({
        width: video.videoWidth,
        height: video.videoHeight,
      });

      // Update canvas size
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Store video element
      videoRef.current = video;

      // Start render loop
      setIsPlaying(false);
      render();

      // Force initial render
      const gl = glRef.current;
      video.currentTime = 0;
      video.play().then(() => {
        video.pause();
        twgl.setTextureFromElement(gl, textureRef.current, video);
        renderFrame();
      });
    };
  };


  const exportVideo = async (format = "mp4") => {
    if (!videoRef.current || !canvasRef.current) return;
    setIsExporting(true);

    try {
      const stream = canvasRef.current.captureStream();
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "video/webm;codecs=vp9",
      });

      const chunks = [];
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);

      mediaRecorder.onstop = async () => {
        const webmBlob = new Blob(chunks, { type: "video/webm" });
        const ffmpeg = ffmpegRef.current;

        const webmBuffer = await webmBlob.arrayBuffer();
        await ffmpeg.writeFile("input.webm", new Uint8Array(webmBuffer));

        const outputFilename = `output.${format}`;
        const ffmpegArgs = [
          "-i",
          "input.webm",
          ...(format === "mp4"
            ? [
                "-c:v",
                "libx264",
                "-preset",
                "fast",
                "-crf",
                "22",
                "-threads",
                "4",
              ]
            : ["-c:v", "vp9", "-b:v", "2M", "-threads", "4"]),
          outputFilename,
        ];

        await ffmpeg.exec(ffmpegArgs);
        const data = await ffmpeg.readFile(outputFilename);

        const url = URL.createObjectURL(
          new Blob([data.buffer], { type: `video/${format}` })
        );
        const a = document.createElement("a");
        a.href = url;
        a.download = `edited_video.${format}`;
        a.click();

        setIsExporting(false);
        setExportProgress(0);
      };

      mediaRecorder.start();

      videoRef.current.currentTime = 0;
      videoRef.current.play();

      setTimeout(() => {
        mediaRecorder.stop();
        videoRef.current.pause();
      }, videoRef.current.duration * 1000);
    } catch (error) {
      console.error("Export error:", error);
      setIsExporting(false);
      setExportProgress(0);
    }
  };


  // Initialize FFmpeg
  useEffect(() => {
    const initFFmpeg = async () => {
      const ffmpeg = ffmpegRef.current;
      ffmpeg.on("progress", ({ progress }) => {
        setExportProgress(progress * 100);
      });

      try {
        const baseURL = "https://unpkg.com/@ffmpeg/core-mt@0.12.6/dist/umd";
        await ffmpeg.load({
          coreURL: baseURL + "/ffmpeg-core.js",
          wasmURL: baseURL + "/ffmpeg-core.wasm",
          workerURL: baseURL + "/ffmpeg-core.worker.js",
        });
        setLoaded(true);
      } catch (error) {
        console.error("FFmpeg loading error:", error);
      }
    };

    initFFmpeg();
  }, []);



  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="flex">
        <VideoEditor />
        <VideoMetadata file={selectedFile} />
      </div>
      <VideoTimeline onTimelineUpdate={() => {}} />
    </div>
  );
}

export default App;
