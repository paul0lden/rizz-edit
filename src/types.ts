export interface Effect {
  brightness: number;
  contrast: number;
  saturation: number;
}

export interface VideoClip {
  id: number;
  file: File;
  fileName: string;
  duration: number;
  width: number;
  height: number;
  startTime: number;
  texture?: WebGLTexture;
  effects: Effect;
}
