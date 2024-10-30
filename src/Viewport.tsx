import React, { useEffect, useRef, useState } from 'react';
import { Viewport } from './types';

interface ViewportControlsProps {
  viewport: Viewport;
  onViewportChange: (viewport: Viewport) => void;
  children: React.ReactNode;
}

export const ViewportControls: React.FC<ViewportControlsProps> = ({
  viewport,
  onViewportChange,
  children
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isPanning = useRef(false);
  const lastPanPosition = useRef({ x: 0, y: 0 });

  const handleWheel = (e: WheelEvent) => {
    e.preventDefault();

    const delta = e.deltaY * -0.01;
    const zoom = Math.min(Math.max(viewport.zoom * (1 + delta), 0.1), 5);
    
    // Get mouse position relative to container
    const container = containerRef.current!;
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Calculate new viewport position to zoom towards mouse
    const newViewport = {
      ...viewport,
      zoom,
      x: viewport.x - (x - viewport.width / 2) * (zoom / viewport.zoom - 1),
      y: viewport.y - (y - viewport.height / 2) * (zoom / viewport.zoom - 1),
    };

    onViewportChange(newViewport);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || e.button === 2) { // Middle or right mouse button
      e.preventDefault();
      isPanning.current = true;
      lastPanPosition.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning.current) return;

    const dx = e.clientX - lastPanPosition.current.x;
    const dy = e.clientY - lastPanPosition.current.y;

    const newViewport = {
      ...viewport,
      x: viewport.x + dx / viewport.zoom,
      y: viewport.y + dy / viewport.zoom,
    };

    lastPanPosition.current = { x: e.clientX, y: e.clientY };
    onViewportChange(newViewport);
  };

  const handleMouseUp = () => {
    isPanning.current = false;
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, [viewport]);

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden w-full h-full bg-gray-800"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div
        className="absolute"
        style={{
          transform: `translate(${viewport.width/2}px, ${viewport.height/2}px) 
                     scale(${viewport.zoom}) 
                     translate(${-viewport.x}px, ${-viewport.y}px)`,
          transformOrigin: '0 0',
        }}
      >
        {/* Grid background */}
        <div className="absolute inset-0 pointer-events-none">
          <svg
            width="100%"
            height="100%"
            xmlns="http://www.w3.org/2000/svg"
            className="absolute inset-0"
          >
            <defs>
              <pattern
                id="grid"
                width="50"
                height="50"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 50 0 L 0 0 0 50"
                  fill="none"
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth="1"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>
        
        {children}

        {/* Viewport indicator */}
        <div
          className="absolute border-2 border-blue-500 pointer-events-none"
          style={{
            left: viewport.x - viewport.width / 2 / viewport.zoom,
            top: viewport.y - viewport.height / 2 / viewport.zoom,
            width: viewport.width / viewport.zoom,
            height: viewport.height / viewport.height,
          }}
        />
      </div>
    </div>
  );
};
