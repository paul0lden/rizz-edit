import React, { useRef } from "react";
import { motion } from "framer-motion";
import type { VideoClip } from "../../types";
import { Plus, X, Video, Box, Code, Settings } from "lucide-react";
import { useClips } from "../../store/clips";

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

interface VideoTimelineProps {
  clips: VideoClip[];
  currentTime: number;
  onAddClip: (file: File) => void;
  onTimeUpdate: (time: number) => void;
  selectedClipId: number | null;
  onClipSelect: (id: number | null) => void;
}

export const VideoTimeline: React.FC<VideoTimelineProps> = ({
  currentTime,
  onTimeUpdate,
  selectedClipId,
  onClipSelect,
}) => {
  const store = useClips();
  const timelineRef = useRef<HTMLDivElement>(null);
  const duration = store.clips.reduce(
    (max, clip) => Math.max(max, clip.startTime + clip.duration),
    0
  );

  const handleTimelineClick = (e: React.MouseEvent) => {
    if (!timelineRef.current) return;

    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const newTime = (x / rect.width) * duration;
    onTimeUpdate(Math.max(0, Math.min(newTime, duration)));
  };

  return (
    <div className="bg-gray-800 p-4 rounded-lg">
      <div className="flex justify-between mb-4">
        <div>
          <label className="cursor-pointer bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded">
            Add Video
            <input
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) =>
                e.target.files?.[0] && store.addClip(e.target.files[0])
              }
            />
          </label>
        </div>
        <div className="text-white">
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>
      </div>

      <div
        ref={timelineRef}
        className="relative h-20 bg-gray-700 rounded cursor-pointer"
        onClick={handleTimelineClick}
      >
        {store.clips.map((clip) => (
          <div
            key={clip.id}
            className={`absolute h-full rounded transition-colors ${
              selectedClipId === clip.id ? "bg-blue-600" : "bg-blue-500"
            }`}
            style={{
              left: `${(clip.startTime / duration) * 100}%`,
              width: `${(clip.duration / duration) * 100}%`,
            }}
            onClick={(e) => {
              e.stopPropagation();
              onClipSelect(clip.id);
            }}
          >
            <div className="p-2 text-white text-sm truncate">
              {clip.fileName}
            </div>
          </div>
        ))}

        {/* Playhead */}
        <div
          className="absolute top-0 w-0.5 h-full bg-red-500 pointer-events-none"
          style={{ left: `${(currentTime / duration) * 100}%` }}
        >
          <div className="w-3 h-3 bg-red-500 rounded-full -translate-x-1/2" />
        </div>
      </div>
    </div>
  );
};
