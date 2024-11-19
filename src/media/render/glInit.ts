import { EventBusManager } from "@/utils/thread";
import { VideoRenderer } from "./VideoRenderer";

export const initCanvas = (canvas?: OffscreenCanvas) => {
  const bus = EventBusManager.getInstance('rizz-edit')

  if (!canvas) return;

  const gl = canvas.getContext("webgl2");
  if (!gl) {
    console.error("WebGL 2 not available");
    return;
  }

  const renderer = new VideoRenderer(gl);
  renderer.renderFrame()

  // process clip when added || might be async and not here
  bus.on('clip', console.log)

  bus.onRequest('gl', async () => gl)
};
