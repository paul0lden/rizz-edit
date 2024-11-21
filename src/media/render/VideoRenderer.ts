import * as twgl from 'twgl.js';
import { mat4 } from 'gl-matrix';
import type { VideoClip } from '../../types';
import { Camera } from './Camera';

import videoVertexShader from './shaders/video.vertex.glsl?raw';
import videoFragmentShader from './shaders/video.fragment.glsl?raw';
import selectionVertexShader from './shaders/selection.vertex.glsl?raw';
import selectionFragmentShader from './shaders/selection.fragment.glsl?raw';
import { EventBus, EventBusManager } from '@/utils/thread';

export class VideoRenderer {
  private gl: WebGL2RenderingContext;
  private programInfo: twgl.ProgramInfo;
  private bufferInfo: twgl.BufferInfo;
  private bus: EventBus<any, any>;
  camera: Camera;
  //private clipData: 

  private selectionProgramInfo: twgl.ProgramInfo;
  private borderBufferInfo: twgl.BufferInfo;
  private handleBufferInfo: twgl.BufferInfo;

  constructor(gl: WebGL2RenderingContext) {
    this.bus = EventBusManager.getInstance('rizz-edit');

    this.gl = gl;
    gl.clearColor(0.1, 0.1, 0.1, 1.0);

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

  renderFrame(clips = [], selectedClipId) {

    this.gl.clear(this.gl.COLOR_BUFFER_BIT);

    clips.forEach((clip) => {
      if (!clip.texture) return;

      // todo get texture somehow
      //const video = videoRefs.current[clip.id];
      //if (!video) return;


      // todo adjust to set it from buffer instead of element
      twgl.setTextureFromElement(this.gl, clip.texture, video);

      const selectedClip = clips.find(
        (clip) => clip.id === selectedClipId
      );
      this.render(clip, selectedClip);
    });
  }
}
