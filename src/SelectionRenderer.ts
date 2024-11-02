import * as twgl from 'twgl.js';
import { mat4 } from 'gl-matrix';
import { HandleType, VideoClip } from './types';

const selectionVertexShader = `#version 300 es
in vec4 a_position;

uniform mat4 u_projection;
uniform mat4 u_view;
uniform mat4 u_model;

void main() {
    gl_Position = u_projection * u_view * u_model * a_position;
}`;

const selectionFragmentShader = `#version 300 es
precision highp float;

out vec4 outColor;

uniform vec4 u_color;

void main() {
    outColor = u_color;
}`;

export class SelectionRenderer {
  private gl: WebGL2RenderingContext;
  private programInfo: twgl.ProgramInfo;
  private borderBufferInfo: twgl.BufferInfo;
  private handleBufferInfo: twgl.BufferInfo;

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;

    // Create shader program
    this.programInfo = twgl.createProgramInfo(gl, [
      selectionVertexShader,
      selectionFragmentShader
    ]);

    // Create border vertices (just the outline)
    const borderArrays = {
      a_position: {
        numComponents: 3,
        data: [
          -1, -1, 0,  // Bottom left
          1, -1, 0,  // Bottom right
          1, 1, 0,  // Top right
          -1, 1, 0,  // Top left
        ],
      },
      indices: [
        0, 1,  // Bottom
        1, 2,  // Right
        2, 3,  // Top
        3, 0,  // Left
      ],
    };

    // Create handle vertices (8 small squares)
    const handleSize = 0.02; // Size of the handle squares
    const handles = [];
    const handlePositions = [
      [-1, -1], // Bottom-left
      [0, -1], // Bottom-middle
      [1, -1], // Bottom-right
      [1, 0], // Middle-right
      [1, 1], // Top-right
      [0, 1], // Top-middle
      [-1, 1], // Top-left
      [-1, 0], // Middle-left
    ];

    handlePositions.forEach(([x, y]) => {
      handles.push(
        x - handleSize, y - handleSize, 0,
        x + handleSize, y - handleSize, 0,
        x + handleSize, y + handleSize, 0,
        x - handleSize, y + handleSize, 0,
      );
    });

    const handleArrays = {
      a_position: {
        numComponents: 3,
        data: handles,
      },
      indices: Array.from({ length: 8 }, (_, i) => {
        const base = i * 4;
        return [
          base, base + 1, base + 2,
          base, base + 2, base + 3,
        ];
      }).flat(),
    };

    this.borderBufferInfo = twgl.createBufferInfoFromArrays(gl, borderArrays);
    this.handleBufferInfo = twgl.createBufferInfoFromArrays(gl, handleArrays);
  }

  render(clip: VideoClip, camera: { projection: mat4; view: mat4 }) {
    const gl = this.gl;

    gl.useProgram(this.programInfo.program);

    // Enable blending for transparent effects
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // Create model matrix from transform
    const model = mat4.create();
    mat4.translate(model, model, clip.transform.translation);
    mat4.rotateX(model, model, clip.transform.rotation[0]);
    mat4.rotateY(model, model, clip.transform.rotation[1]);
    mat4.rotateZ(model, model, clip.transform.rotation[2]);
    mat4.scale(model, model, clip.transform.scale);

    const uniforms = {
      u_projection: camera.projection,
      u_view: camera.view,
      u_model: model,
      u_color: [0.2, 0.6, 1.0, 1.0], // Photoshop-like blue
    };

    // Draw border
    gl.lineWidth(1);
    twgl.setBuffersAndAttributes(gl, this.programInfo, this.borderBufferInfo);
    twgl.setUniforms(this.programInfo, uniforms);
    gl.drawElements(gl.LINES, 8, gl.UNSIGNED_SHORT, 0);

    // Draw handles
    twgl.setBuffersAndAttributes(gl, this.programInfo, this.handleBufferInfo);
    twgl.setUniforms(this.programInfo, {
      ...uniforms,
      u_color: [1, 1, 1, 1], // White fill for handles
    });
    gl.drawElements(gl.TRIANGLES, 48, gl.UNSIGNED_SHORT, 0);

    // Draw handle borders
    twgl.setUniforms(this.programInfo, {
      ...uniforms,
      u_color: [0.2, 0.6, 1.0, 1.0], // Blue border for handles
    });
    for (let i = 0; i < 8; i++) {
      const offset = i * 4;
      gl.drawArrays(gl.LINE_LOOP, offset, 4);
    }

    gl.disable(gl.BLEND);
  }
}

const handlePositions = [
  [1, 1], // TopRight
  [1, 0], // Right
  [1, -1], // BottomRight
  [0, -1], // Bottom
];

export function getHandleAtPosition(
  worldPos: vec2,
  clip: VideoClip,
  handleSize: number = 0.02
): HandleType {
  const [tx, ty] = clip.transform.translation;
  const [sx, sy] = clip.transform.scale;

  // Handle positions in world space
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

  // Check each handle
  for (const handle of handles) {
    const [hx, hy] = handle.pos;
    const worldX = tx + hx;
    const worldY = ty + hy;

    // Check if position is within handle bounds
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
