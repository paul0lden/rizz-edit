import { vec2 } from "gl-matrix";
import { MP4Demuxer } from "./media/mp4_pull_demuxer";

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

export interface ClipMeta {
  id: string;
  startTime: number;
  duration: number;
  name: string;
  effects: {
    brightness: number;
    contrast: number;
    saturation: number;
  };
}

export interface VideoMeta {
  width: number;
  height: number;
  duration: number;
  frameCount: number;
  frameRate: number;
  codec: string;
  bitrate: number;
}

export interface Clip extends ClipMeta {
  buffer: ArrayBuffer,
  demuxer: MP4Demuxer;
  width: number;
  height: number;
  texture?: WebGLTexture;
  transform: Transform;
  framerate: number,
}

export interface ShaderClip extends ClipMeta, ClipMeta {
  type: "shader";
  shaderType: "gradient" | "noise" | "custom";
  fragmentShader: string;
  uniforms: Record<string, number | number[]>;
}

export type TimelineObject = Clip | ShaderClip;

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

export enum HandleType {
  TopLeft,
  Top,
  TopRight,
  Right,
  BottomRight,
  Bottom,
  BottomLeft,
  Left,
  None
}

export type TransformMode = "none" | "pan" | "drag" | "stretch";
