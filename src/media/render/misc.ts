import { vec2 } from 'gl-matrix';
import { HandleType, VideoClip } from '../../types';

export function getHandleAtPosition(
  worldPos: vec2,
  clip: VideoClip,
  handleSize: number = 0.02
): HandleType {
  const [tx, ty] = clip.transform.translation;
  const [sx, sy] = clip.transform.scale;

  const handles = [
    { pos: [-sx, sy], type: HandleType.TopLeft },
    { pos: [0, sy], type: HandleType.Top },
    { pos: [sx, sy], type: HandleType.TopRight },
    { pos: [sx, 0], type: HandleType.Right },
    { pos: [sx, -sy], type: HandleType.BottomRight },
    { pos: [0, -sy], type: HandleType.Bottom },
    { pos: [-sx, -sy], type: HandleType.BottomLeft },
    { pos: [-sx, 0], type: HandleType.Left },
  ];

  for (const handle of handles) {
    const [hx, hy] = handle.pos;
    const worldX = tx + hx;
    const worldY = ty + hy;

    if (
      worldPos[0] >= worldX - handleSize * 2 &&
      worldPos[0] <= worldX + handleSize * 2 &&
      worldPos[1] >= worldY - handleSize * 2 &&
      worldPos[1] <= worldY + handleSize * 2
    ) {
      return handle.type;
    }
  }

  return HandleType.None;
}
