export const initGL = (canvas?: OffscreenCanvas) => {
  if (!canvas) return;

  const gl = canvas.getContext("webgl2");
  if (!gl) {
    console.error("WebGL 2 not available");
    return;
  }

  return gl
};
