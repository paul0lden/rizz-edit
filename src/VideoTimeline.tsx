import React from "react";
import { motion } from "framer-motion";
import type { VideoClip } from "./App";

interface VideoTimelineProps {
  clips: VideoClip[];
  currentTime: number;
  onAddClip: (file: File) => void;
  onUpdateClip: (clipId: number, effects: VideoClip["effects"]) => void;
  onTimeUpdate: (time: number) => void;
}

const VideoTimeline: React.FC<VideoTimelineProps> = ({
  clips,
  currentTime,
  onAddClip,
  onUpdateClip,
  onTimeUpdate,
}) => {
  const timelineRef = React.useRef<HTMLDivElement>(null);
  const [selectedClip, setSelectedClip] = React.useState<VideoClip | null>(
    null
  );

  const duration = clips.reduce((total, clip) => total + clip.duration, 0);

  const handleTimelineClick = (e: React.MouseEvent) => {
    if (!timelineRef.current) return;

    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    onTimeUpdate(Math.max(0, Math.min(percentage * duration, duration)));
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getClipStyle = (clip: VideoClip) => {
    const startPercent = (clip.startTime / duration) * 100;
    const widthPercent = (clip.duration / duration) * 100;
    return {
      left: `${startPercent}%`,
      width: `${widthPercent}%`,
    };
  };

  return (
    <div className="w-full bg-gray-800 rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white text-lg font-semibold">Timeline</h3>
        <label className="cursor-pointer bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded">
          Add Clip
          <input
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(e) => e.target.files && onAddClip(e.target.files[0])}
          />
        </label>
      </div>

      <div className="relative h-8 bg-gray-700 rounded">
        {Array.from({ length: Math.ceil(duration) }).map((_, i) => (
          <div
            key={i}
            className="absolute h-2 w-px bg-gray-500"
            style={{ left: `${(i / duration) * 100}%` }}
          >
            <span className="absolute -top-5 left-1/2 transform -translate-x-1/2 text-xs text-gray-400">
              {formatTime(i)}
            </span>
          </div>
        ))}
      </div>

      <div
        ref={timelineRef}
        className="relative h-24 bg-gray-700 rounded cursor-pointer"
        onClick={handleTimelineClick}
      >
        {clips.map((clip) => (
          <motion.div
            key={clip.id}
            className={`absolute top-0 h-full rounded ${
              selectedClip?.id === clip.id ? "bg-blue-600" : "bg-blue-500"
            } cursor-pointer`}
            style={getClipStyle(clip)}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedClip(clip);
            }}
          >
            <div className="p-2 text-white text-sm truncate">
              {clip.fileName}
            </div>

            {selectedClip?.id === clip.id && (
              <div className="absolute bottom-full left-0 mb-2 p-2 bg-gray-800 rounded shadow-lg">
                <div className="space-y-2">
                  <div>
                    <label className="text-white text-sm">Brightness</label>
                    <input
                      type="range"
                      min="-1"
                      max="1"
                      step="0.1"
                      value={clip.effects.brightness}
                      onChange={(e) =>
                        onUpdateClip(clip.id, {
                          ...clip.effects,
                          brightness: parseFloat(e.target.value),
                        })
                      }
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="text-white text-sm">Contrast</label>
                    <input
                      type="range"
                      min="0"
                      max="2"
                      step="0.1"
                      value={clip.effects.contrast}
                      onChange={(e) =>
                        onUpdateClip(clip.id, {
                          ...clip.effects,
                          contrast: parseFloat(e.target.value),
                        })
                      }
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="text-white text-sm">Saturation</label>
                    <input
                      type="range"
                      min="0"
                      max="2"
                      step="0.1"
                      value={clip.effects.saturation}
                      onChange={(e) =>
                        onUpdateClip(clip.id, {
                          ...clip.effects,
                          saturation: parseFloat(e.target.value),
                        })
                      }
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        ))}

        <div
          className="absolute top-0 w-px h-full bg-red-500"
          style={{ left: `${(currentTime / duration) * 100}%` }}
        >
          <div className="w-3 h-3 bg-red-500 rounded-full -translate-x-1/2" />
        </div>
      </div>

      <div className="flex items-center justify-between text-white">
        <span>{formatTime(currentTime)}</span>
        <div className="space-x-2">
          {clips.length === 0 && (
            <p className="text-gray-400 italic">Add clips to begin editing</p>
          )}
        </div>
        <span>{formatTime(duration)}</span>
      </div>
    </div>
  );
};

export default VideoTimeline;
