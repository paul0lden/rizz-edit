import { vec2, mat4 } from "gl-matrix";
import { Camera } from "../Camera";

export function screenToWorld(
  screenX: number,
  screenY: number,
  canvas: HTMLCanvasElement,
  camera: Camera,
): vec2 {
  // Convert screen coordinates to clip space (-1 to 1)
  const rect = canvas.getBoundingClientRect();
  const x = ((screenX - rect.left) / rect.width) * 2 - 1;
  const y = -(((screenY - rect.top) / rect.height) * 2 - 1);

  // Create inverse view-projection matrix
  const viewProj = mat4.multiply(
    mat4.create(),
    camera.getProjectionMatrix(),
    camera.getViewMatrix()
  );
  const invViewProj = mat4.invert(mat4.create(), viewProj);

  // Transform to world space
  const worldPos = vec2.fromValues(
    x * invViewProj[0] + invViewProj[12],
    y * invViewProj[5] + invViewProj[13]
  );

  return worldPos;
}
