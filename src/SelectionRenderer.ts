// SelectionRenderer.ts
import * as twgl from 'twgl.js';
import { mat4 } from 'gl-matrix';
import { VideoClip } from './types';

const selectionVertexShader = `#version 300 es
in vec4 a_position;

uniform mat4 u_projection;
uniform mat4 u_view;
uniform mat4 u_model;
uniform float u_borderWidth;

void main() {
    // Add border width to the vertex position
    vec4 position = a_position;
    position.xy *= 1.0 + u_borderWidth * 2.0;
    gl_Position = u_projection * u_view * u_model * position;
}`;

const selectionFragmentShader = `#version 300 es
precision highp float;

out vec4 outColor;

uniform vec4 u_borderColor;

void main() {
    outColor = u_borderColor;
}`;

export class SelectionRenderer {
  private gl: WebGL2RenderingContext;
  private programInfo: twgl.ProgramInfo;
  private bufferInfo: twgl.BufferInfo;

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;

    // Create shader program for selection border
    this.programInfo = twgl.createProgramInfo(gl, [
      selectionVertexShader,
      selectionFragmentShader
    ]);

    // Create a wireframe rectangle for the border
    const arrays = {
      a_position: {
        numComponents: 3,
        data: [
          // Outer rectangle
          -1, -1, 0,
          1, -1, 0,
          1, 1, 0,
          -1, 1, 0,
        ],
      },
      indices: [
        0, 1, 1, 2, 2, 3, 3, 0, // Border lines
      ],
    };

    this.bufferInfo = twgl.createBufferInfoFromArrays(gl, arrays);
  }

  render(clip: VideoClip, camera: { projection: mat4; view: mat4 }) {
    const gl = this.gl;
    
    gl.useProgram(this.programInfo.program);

    // Save WebGL state
    const previousLineWidth = gl.getParameter(gl.LINE_WIDTH);
    
    // Set line parameters
    gl.lineWidth(2);  // You might need to adjust this value

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
        u_borderColor: [0.0, 1.0, 1.0, 1.0],  // Bright cyan for better visibility
        u_borderWidth: 0.02,
    };

    // Enable necessary GL state
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    twgl.setBuffersAndAttributes(gl, this.programInfo, this.bufferInfo);
    twgl.setUniforms(this.programInfo, uniforms);
    
    // Draw the selection border
    gl.drawElements(gl.LINES, 8, gl.UNSIGNED_SHORT, 0);

    // Restore previous state
    gl.lineWidth(previousLineWidth);
    gl.disable(gl.BLEND);
  }
}
