import React, { useState } from "react";
import { FFmpeg } from "@ffmpeg/ffmpeg";

const VideoMetadata = ({ file }) => {
  const [metadata, setMetadata] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  React.useEffect(() => {
    if (!file) return;

  console.dir(file)

    const extractMetadata = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Basic metadata from File API
        const basicMetadata = {
          name: file.name,
          size: formatFileSize(file.size),
          type: file.type,
          lastModified: new Date(file.lastModified).toLocaleString(),
        };

        // Create video element for media metadata
        const video = document.createElement("video");
        video.src = URL.createObjectURL(file);

        const mediaMetadata = await new Promise((resolve) => {
          video.onloadedmetadata = () => {
            resolve({
              duration: formatDuration(video.duration),
              width: video.videoWidth,
              height: video.videoHeight,
              aspectRatio: (video.videoWidth / video.videoHeight).toFixed(2),
            });
          };
        });

        // Get detailed metadata using FFmpeg
        const ffmpeg = new FFmpeg();
        await ffmpeg.load({
          coreURL:
            "https://unpkg.com/@ffmpeg/core-mt@0.12.6/dist/umd/ffmpeg-core.js",
          wasmURL:
            "https://unpkg.com/@ffmpeg/core-mt@0.12.6/dist/umd/ffmpeg-core.wasm",
          workerURL:
            "https://unpkg.com/@ffmpeg/core-mt@0.12.6/dist/umd/ffmpeg-core.worker.js",
        });

        await ffmpeg.writeFile(
          "input",
          new Uint8Array(await file.arrayBuffer())
        );
        await ffmpeg.exec(["-i", "input"]);

        // Combine all metadata
        setMetadata({
          ...basicMetadata,
          ...mediaMetadata,
        });
      } catch (err) {
        setError(err.message);
        console.error("Error extracting metadata:", err);
      } finally {
        setIsLoading(false);
      }
    };

    extractMetadata();
  }, [file]);

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDuration = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  if (isLoading) {
    return (
      <div className="w-full max-w-md p-4 bg-white rounded-lg shadow-md animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-2/3"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-md p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-600">Error loading metadata: {error}</p>
      </div>
    );
  }


  return (
    <div className="w-full max-w-md bg-white rounded-lg shadow-md overflow-hidden">

        <p className="text-gray-500">No video selected</p>
        <div className="flex gap-4">
          <button
            onClick={() => exportVideo("mp4")}
            className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
            disabled={!videoRef.current || isExporting}
          >
            Export MP4
          </button>
          <button
            onClick={() => exportVideo("webm")}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            disabled={!videoRef.current || isExporting}
          >
            Export WebM
          </button>
        </div>
      <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800">Video Metadata</h3>
      </div>

      <div className="p-4 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-2">
            <MetadataItem label="File Name" value={metadata.name} />
            <MetadataItem label="File Size" value={metadata.size} />
            <MetadataItem label="Duration" value={metadata.duration} />
            <MetadataItem label="Type" value={metadata.type} />
          </div>

          <div className="space-y-2">
            <MetadataItem
              label="Dimensions"
              value={`${metadata.width}×${metadata.height}`}
            />
            <MetadataItem label="Aspect Ratio" value={metadata.aspectRatio} />
            <MetadataItem label="Last Modified" value={metadata.lastModified} />
          </div>
        </div>

      </div>

    </div>
  );
};

const MetadataItem = ({ label, value }) => (
  <div className="text-sm">
    <span className="text-gray-500">{label}:</span>
    <span className="ml-2 text-gray-900 font-medium">{value}</span>
  </div>
);

export default VideoMetadata;
