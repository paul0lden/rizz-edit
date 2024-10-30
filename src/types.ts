export interface Transform {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  scale: {
    x: number;
    y: number;
  };
}

export interface BaseClip {
  id: number;
  startTime: number;
  duration: number;
  transform: Transform;
}

export interface VideoClip extends BaseClip {
  type: "video";
  file: File;
  fileName: string;
  width: number;
  height: number;
  texture?: WebGLTexture;
  effects: {
    brightness: number;
    contrast: number;
    saturation: number;
  };
}

export interface ShaderClip extends BaseClip {
  type: "shader";
  shaderType: "gradient" | "noise" | "custom";
  fragmentShader: string;
  uniforms: Record<string, number | number[]>;
}

export type TimelineObject = VideoClip | ShaderClip;

export interface TimelineTrack {
  id: number;
  items: TimelineObject[];
}

export interface Viewport {
  x: number;
  y: number;
  zoom: number;
  width: number;
  height: number;
}

export interface DragState {
  isDragging: boolean;
  objectId: number | null;
  startPos: vec2 | null;
  startTransform: Transform | null;
}
