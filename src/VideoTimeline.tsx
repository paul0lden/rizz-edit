import React, { useRef } from "react";
import { motion } from "framer-motion";
import type { VideoClip } from "./App";
import { Plus, X, Video, Box, Code, Settings } from "lucide-react";
//
//interface SettingsDialogProps {
//  isOpen: boolean;
//  onClose: () => void;
//  canvasDimensions: { width: number; height: number };
//  onUpdateDimensions: (dimensions: { width: number; height: number }) => void;
//}
//
//const SettingsDialog: React.FC<SettingsDialogProps> = ({
//  isOpen,
//  onClose,
//  canvasDimensions,
//  onUpdateDimensions,
//}) => {
//  const [width, setWidth] = React.useState(canvasDimensions.width);
//  const [height, setHeight] = React.useState(canvasDimensions.height);
//
//  if (!isOpen) return null;
//
//  const handleSubmit = (e: React.FormEvent) => {
//    e.preventDefault();
//    onUpdateDimensions({ width, height });
//    onClose();
//  };
//
//  return (
//    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
//      <div className="bg-gray-800 rounded-lg p-6 w-96">
//        <div className="flex justify-between items-center mb-4">
//          <h3 className="text-lg font-semibold text-white">Canvas Settings</h3>
//          <button
//            onClick={onClose}
//            className="text-gray-400 hover:text-white"
//          >
//            <X size={20} />
//          </button>
//        </div>
//
//        <form onSubmit={handleSubmit} className="space-y-4">
//          <div>
//            <label className="block text-sm font-medium text-gray-300 mb-1">
//              Canvas Width
//            </label>
//            <input
//              type="number"
//              value={width}
//              onChange={(e) => setWidth(Number(e.target.value))}
//              className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
//            />
//          </div>
//
//          <div>
//            <label className="block text-sm font-medium text-gray-300 mb-1">
//              Canvas Height
//            </label>
//            <input
//              type="number"
//              value={height}
//              onChange={(e) => setHeight(Number(e.target.value))}
//              className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
//            />
//          </div>
//
//          <div className="flex justify-end space-x-2">
//            <button
//              type="button"
//              onClick={onClose}
//              className="px-4 py-2 text-gray-300 hover:text-white"
//            >
//              Cancel
//            </button>
//            <button
//              type="submit"
//              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded"
//            >
//              Apply
//            </button>
//          </div>
//        </form>
//      </div>
//    </div>
//  );
//};
//
//interface TimelineToolbarProps {
//  onAddVideo: () => void;
//  onAddShader: (type: 'gradient' | 'noise' | 'custom') => void;
//  onOpenSettings: () => void;
//}
//
//const TimelineToolbar: React.FC<TimelineToolbarProps> = ({
//  onAddVideo,
//  onAddShader,
//  onOpenSettings,
//}) => {
//  return (
//    <div className="flex items-center space-x-2 bg-gray-800 p-2 rounded-t-lg">
//      <SettingsDialog isOpen={false} onClose={console.log} canvasDimensions={{ width: 200, height: 400}} onUpdateDimensions={console.log} />
//      <div className="flex items-center space-x-2">
//        <button
//          onClick={onAddVideo}
//          className="flex items-center space-x-1 px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded"
//        >
//          <Video size={16} />
//          <span>Add Video</span>
//        </button>
//
//        <div className="relative group">
//          <button className="flex items-center space-x-1 px-3 py-1 bg-purple-500 hover:bg-purple-600 text-white rounded">
//            <Box size={16} />
//            <span>Add Shader</span>
//            <Plus size={16} />
//          </button>
//
//          <div className="absolute hidden group-hover:block top-full left-0 mt-1 bg-gray-800 rounded shadow-lg z-10">
//            <button
//              onClick={() => onAddShader('gradient')}
//              className="block w-full px-4 py-2 text-left text-white hover:bg-gray-700"
//            >
//              Gradient
//            </button>
//            <button
//              onClick={() => onAddShader('noise')}
//              className="block w-full px-4 py-2 text-left text-white hover:bg-gray-700"
//            >
//              Noise
//            </button>
//            <button
//              onClick={() => onAddShader('custom')}
//              className="block w-full px-4 py-2 text-left text-white hover:bg-gray-700 flex items-center"
//            >
//              <Code size={16} className="mr-2" />
//              Custom Shader
//            </button>
//          </div>
//        </div>
//      </div>
//
//      <div className="flex-1"></div>
//
//      <button
//        onClick={onOpenSettings}
//        className="p-2 hover:bg-gray-700 rounded"
//      >
//        <Settings size={20} className="text-white" />
//      </button>
//    </div>
//  );
//};
//
//interface VideoTimelineProps {
//  clips: VideoClip[];
//  currentTime: number;
//  onAddClip: (file: File) => void;
//  onUpdateClip: (clipId: number, effects: VideoClip["effects"]) => void;
//  onTimeUpdate: (time: number) => void;
//}
//
//const VideoTimeline: React.FC<VideoTimelineProps> = ({
//  clips,
//  currentTime,
//  onAddClip,
//  onUpdateClip,
//  onTimeUpdate,
//}) => {
//  const timelineRef = React.useRef<HTMLDivElement>(null);
//  const [selectedClip, setSelectedClip] = React.useState<VideoClip | null>(
//    null
//  );
//
//  const duration = clips.reduce((total, clip) => total + clip.duration, 0);
//
//  const handleTimelineClick = (e: React.MouseEvent) => {
//    if (!timelineRef.current) return;
//
//    const rect = timelineRef.current.getBoundingClientRect();
//    const x = e.clientX - rect.left;
//    const percentage = x / rect.width;
//    onTimeUpdate(Math.max(0, Math.min(percentage * duration, duration)));
//  };
//
//  const formatTime = (seconds: number) => {
//    const mins = Math.floor(seconds / 60);
//    const secs = Math.floor(seconds % 60);
//    return `${mins}:${secs.toString().padStart(2, "0")}`;
//  };
//
//  const getClipStyle = (clip: VideoClip) => {
//    const startPercent = (clip.startTime / duration) * 100;
//    const widthPercent = (clip.duration / duration) * 100;
//    return {
//      left: `${startPercent}%`,
//      width: `${widthPercent}%`,
//    };
//  };
//
//  return (
//    <div className="w-full bg-gray-800 rounded-lg p-4 space-y-4">
//      <div className="flex items-center justify-between mb-4">
//        <h3 className="text-white text-lg font-semibold">Timeline</h3>
//        <label className="cursor-pointer bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded">
//          Add Clip
//          <input
//            type="file"
//            accept="video/*"
//            className="hidden"
//            onChange={(e) => e.target.files && onAddClip(e.target.files[0])}
//          />
//
//        </label>
//      <TimelineToolbar onAddVideo={console.log} onAddShader={console.log} onOpenSettings={console.log} />
//      </div>
//
//      <div className="relative h-8 bg-gray-700 rounded">
//        {Array.from({ length: Math.ceil(duration) }).map((_, i) => (
//          <div
//            key={i}
//            className="absolute h-2 w-px bg-gray-500"
//            style={{ left: `${(i / duration) * 100}%` }}
//          >
//            <span className="absolute -top-5 left-1/2 transform -translate-x-1/2 text-xs text-gray-400">
//              {formatTime(i)}
//            </span>
//          </div>
//        ))}
//      </div>
//
//      <div
//        ref={timelineRef}
//        className="relative h-24 bg-gray-700 rounded cursor-pointer"
//        onClick={handleTimelineClick}
//      >
//        {clips.map((clip) => (
//          <motion.div
//            key={clip.id}
//            className={`absolute top-0 h-full rounded ${
//              selectedClip?.id === clip.id ? "bg-blue-600" : "bg-blue-500"
//            } cursor-pointer`}
//            style={getClipStyle(clip)}
//            onClick={(e) => {
//              e.stopPropagation();
//              setSelectedClip(clip);
//            }}
//          >
//            <div className="p-2 text-white text-sm truncate">
//              {clip.fileName}
//            </div>
//
//            {selectedClip?.id === clip.id && (
//              <div className="absolute bottom-full left-0 mb-2 p-2 bg-gray-800 rounded shadow-lg">
//                <div className="space-y-2">
//                  <div>
//                    <label className="text-white text-sm">Brightness</label>
//                    <input
//                      type="range"
//                      min="-1"
//                      max="1"
//                      step="0.1"
//                      value={clip.effects.brightness}
//                      onChange={(e) =>
//                        onUpdateClip(clip.id, {
//                          ...clip.effects,
//                          brightness: parseFloat(e.target.value),
//                        })
//                      }
//                      className="w-full"
//                    />
//                  </div>
//                  <div>
//                    <label className="text-white text-sm">Contrast</label>
//                    <input
//                      type="range"
//                      min="0"
//                      max="2"
//                      step="0.1"
//                      value={clip.effects.contrast}
//                      onChange={(e) =>
//                        onUpdateClip(clip.id, {
//                          ...clip.effects,
//                          contrast: parseFloat(e.target.value),
//                        })
//                      }
//                      className="w-full"
//                    />
//                  </div>
//                  <div>
//                    <label className="text-white text-sm">Saturation</label>
//                    <input
//                      type="range"
//                      min="0"
//                      max="2"
//                      step="0.1"
//                      value={clip.effects.saturation}
//                      onChange={(e) =>
//                        onUpdateClip(clip.id, {
//                          ...clip.effects,
//                          saturation: parseFloat(e.target.value),
//                        })
//                      }
//                      className="w-full"
//                    />
//                  </div>
//                </div>
//              </div>
//            )}
//          </motion.div>
//        ))}
//
//        <div
//          className="absolute top-0 w-px h-full bg-red-500"
//          style={{ left: `${(currentTime / duration) * 100}%` }}
//        >
//          <div className="w-3 h-3 bg-red-500 rounded-full -translate-x-1/2" />
//        </div>
//      </div>
//
//      <div className="flex items-center justify-between text-white">
//        <span>{formatTime(currentTime)}</span>
//        <div className="space-x-2">
//          {clips.length === 0 && (
//            <p className="text-gray-400 italic">Add clips to begin editing</p>
//          )}
//        </div>
//        <span>{formatTime(duration)}</span>
//      </div>
//    </div>
//  );
//};
//
//export default VideoTimeline;
//
interface VideoTimelineProps {
  clips: VideoClip[];
  currentTime: number;
  onAddClip: (file: File) => void;
  onTimeUpdate: (time: number) => void;
  selectedClipId: number | null;
  onClipSelect: (id: number | null) => void;
}

export const VideoTimeline: React.FC<VideoTimelineProps> = ({
  clips,
  currentTime,
  onAddClip,
  onTimeUpdate,
  selectedClipId,
  onClipSelect,
}) => {
  const timelineRef = useRef<HTMLDivElement>(null);
  const duration = clips.reduce(
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
                e.target.files?.[0] && onAddClip(e.target.files[0])
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
        {clips.map((clip) => (
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

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
