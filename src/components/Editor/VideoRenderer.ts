import * as twgl from 'twgl.js';
import { mat4 } from 'gl-matrix';
import type { VideoClip } from '../../types';
import { Camera } from './Camera';

const videoVertexShader = `#version 300 es
in vec4 a_position;
in vec2 a_texcoord;

uniform mat4 u_projection;
uniform mat4 u_view;
uniform mat4 u_model;

out vec2 v_texcoord;

void main() {
    gl_Position = u_projection * u_view * u_model * a_position;
    v_texcoord = a_texcoord;
}`;

const videoFragmentShader = `#version 300 es
precision highp float;

in vec2 v_texcoord;
out vec4 outColor;

uniform sampler2D u_texture;
uniform float u_brightness;
uniform float u_contrast;
uniform float u_saturation;

void main() {
    vec4 color = texture(u_texture, v_texcoord);
    
    // Apply effects
    color.rgb += u_brightness;
    color.rgb = (color.rgb - 0.5) * u_contrast + 0.5;
    float luminance = dot(color.rgb, vec3(0.299, 0.587, 0.114));
    color.rgb = mix(vec3(luminance), color.rgb, u_saturation);
    
    outColor = color;
}`;

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

export class VideoRenderer {
  private gl: WebGL2RenderingContext;
  private programInfo: twgl.ProgramInfo;
  private bufferInfo: twgl.BufferInfo;
  camera: Camera;
  //private clipData: 

  private selectionProgramInfo: twgl.ProgramInfo;
  private borderBufferInfo: twgl.BufferInfo;
  private handleBufferInfo: twgl.BufferInfo;

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;

    // Create program using twgl
    this.programInfo = twgl.createProgramInfo(gl, [videoVertexShader, videoFragmentShader]);
    this.selectionProgramInfo = twgl.createProgramInfo(gl, [
      selectionVertexShader,
      selectionFragmentShader
    ]);

    // Create a quad for video rendering
    const arrays = {
      a_position: {
        numComponents: 3,
        data: [
          -1, -1, 0,
          1, -1, 0,
          -1, 1, 0,
          1, 1, 0,
        ],
      },
      a_texcoord: {
        numComponents: 2,
        data: [
          0, 1,
          1, 1,
          0, 0,
          1, 0,
        ],
      },
      indices: [0, 1, 2, 2, 1, 3],
    };

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

    this.camera = new Camera(gl.canvas.width, gl.canvas.height)

    this.bufferInfo = twgl.createBufferInfoFromArrays(gl, arrays);
  }

  public getCameraPosition() {
    return this.camera.getPosition();
  }

  render(clip: VideoClip, selected: VideoClip) {
    const gl = this.gl;

    gl.useProgram(this.programInfo.program);

    // Create model matrix from transform
    const model = mat4.create();
    mat4.translate(model, model, clip.transform.translation);
    mat4.rotateX(model, model, clip.transform.rotation[0]);
    mat4.rotateY(model, model, clip.transform.rotation[1]);
    mat4.rotateZ(model, model, clip.transform.rotation[2]);
    mat4.scale(model, model, clip.transform.scale);

    const uniforms = {
      u_projection: this.camera.getProjectionMatrix(),
      u_view: this.camera.getViewMatrix(),
      u_model: model,
      u_texture: clip.texture,
      u_brightness: clip.effects.brightness,
      u_contrast: clip.effects.contrast,
      u_saturation: clip.effects.saturation,
    };

    twgl.setBuffersAndAttributes(gl, this.programInfo, this.bufferInfo);
    twgl.setUniforms(this.programInfo, uniforms);
    twgl.drawBufferInfo(gl, this.bufferInfo);

    const borderUniforms = {
      u_projection: this.camera.getProjectionMatrix(),
      u_view: this.camera.getViewMatrix(),
      u_model: model,
      u_color: [0.2, 0.6, 1.0, 1.0], // photoshop-like blue
    };

    if (clip.id === selected?.id) {
      gl.useProgram(this.selectionProgramInfo.program)
      // Draw border
      gl.lineWidth(1);
      twgl.setBuffersAndAttributes(
        gl,
        this.selectionProgramInfo,
        this.borderBufferInfo,
      );
      twgl.setUniforms(this.selectionProgramInfo, borderUniforms);
      gl.drawElements(gl.LINES, 8, gl.UNSIGNED_SHORT, 0);

      // Draw handles
      twgl.setBuffersAndAttributes(gl, this.selectionProgramInfo, this.handleBufferInfo);
      twgl.setUniforms(this.selectionProgramInfo, {
        ...borderUniforms,
        u_color: [1, 1, 1, 1], // White fill for handles
      });
      gl.drawElements(gl.TRIANGLES, 48, gl.UNSIGNED_SHORT, 0);

      // Draw handle borders
      twgl.setUniforms(this.selectionProgramInfo, {
        ...borderUniforms,
        u_color: [0.2, 0.6, 1.0, 1.0], // Blue border for handles
      });
      for (let i = 0; i < 8; i++) {
        const offset = i * 4;
        gl.drawArrays(gl.LINE_LOOP, offset, 4);
      }

      gl.disable(gl.BLEND);
    }
  }
}
