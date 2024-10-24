import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';

const TimelineEditor = ({ onTimelineUpdate }) => {
    const [clips, setClips] = useState([]);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [selectedClip, setSelectedClip] = useState(null);
    const timelineRef = useRef(null);

    useEffect(() => {
        // Update total duration when clips change
        const totalDuration = clips.reduce((total, clip) => total + clip.duration, 0);
        setDuration(totalDuration);
        onTimelineUpdate(clips);
    }, [clips]);

    const handleAddClip = async (file) => {
        // Create video element to get duration and dimensions
        const video = document.createElement('video');
        video.src = URL.createObjectURL(file);
        
        await new Promise((resolve) => {
            video.onloadedmetadata = () => {
                const newClip = {
                    id: Date.now(),
                    file,
                    fileName: file.name,
                    duration: video.duration,
                    width: video.videoWidth,
                    height: video.videoHeight,
                    startTime: duration, // Add to end of timeline
                    src: video.src
                };
                
                setClips(prevClips => [...prevClips, newClip]);
                resolve();
            };
        });
    };

    const removeClip = (clipId) => {
        setClips(prevClips => {
            const updatedClips = prevClips.filter(clip => clip.id !== clipId);
            // Recalculate start times
            let currentStart = 0;
            return updatedClips.map(clip => {
                const updatedClip = { ...clip, startTime: currentStart };
                currentStart += clip.duration;
                return updatedClip;
            });
        });
    };

    const handleTimelineClick = (e) => {
        if (!timelineRef.current) return;
        
        const rect = timelineRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percentage = x / rect.width;
        const newTime = percentage * duration;
        setCurrentTime(Math.max(0, Math.min(newTime, duration)));
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const getClipStyle = (clip) => {
        const startPercent = (clip.startTime / duration) * 100;
        const widthPercent = (clip.duration / duration) * 100;
        return {
            left: `${startPercent}%`,
            width: `${widthPercent}%`
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
                        onChange={(e) => handleAddClip(e.target.files[0])}
                    />
                </label>
            </div>

            {/* Timeline ruler */}
            <div className="relative h-8 bg-gray-700 rounded">
                {/* Time markers */}
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

            {/* Timeline editor */}
            <div
                ref={timelineRef}
                className="relative h-24 bg-gray-700 rounded cursor-pointer"
                onClick={handleTimelineClick}
            >
                {/* Clips */}
                {clips.map((clip) => (
                    <motion.div
                        key={clip.id}
                        className={`absolute top-0 h-full rounded ${
                            selectedClip?.id === clip.id ? 'bg-blue-600' : 'bg-blue-500'
                        } cursor-move`}
                        style={getClipStyle(clip)}
                        drag="x"
                        dragConstraints={timelineRef}
                        dragElastic={0}
                        onDragStart={() => {
                            setIsDragging(true);
                            setSelectedClip(clip);
                        }}
                        onDragEnd={() => setIsDragging(false)}
                    >
                        <div className="p-2 text-white text-sm truncate">
                            {clip.fileName}
                        </div>
                        <button
                            className="absolute top-2 right-2 text-white hover:text-red-500"
                            onClick={() => removeClip(clip.id)}
                        >
                            ×
                        </button>
                    </motion.div>
                ))}

                {/* Playhead */}
                <div
                    className="absolute top-0 w-px h-full bg-red-500"
                    style={{ left: `${(currentTime / duration) * 100}%` }}
                >
                    <div className="w-3 h-3 bg-red-500 rounded-full -translate-x-1/2" />
                </div>
            </div>

            {/* Timeline controls */}
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

export default TimelineEditor;
