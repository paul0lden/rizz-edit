import * as twgl from 'twgl.js';
import { mat4 } from 'gl-matrix';
import { VideoClip } from './types';

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

export class VideoRenderer {
    private gl: WebGL2RenderingContext;
    private programInfo: twgl.ProgramInfo;
    private bufferInfo: twgl.BufferInfo;

    constructor(gl: WebGL2RenderingContext) {
        this.gl = gl;
        
        // Create program using twgl
        this.programInfo = twgl.createProgramInfo(gl, [videoVertexShader, videoFragmentShader]);

        // Create a quad for video rendering
        const arrays = {
            a_position: {
                numComponents: 3,
                data: [
                    -1, -1, 0,
                     1, -1, 0,
                    -1,  1, 0,
                     1,  1, 0,
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

        this.bufferInfo = twgl.createBufferInfoFromArrays(gl, arrays);
    }

    render(clip: VideoClip, camera: { projection: mat4; view: mat4 }) {
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
            u_projection: camera.projection,
            u_view: camera.view,
            u_model: model,
            u_texture: clip.texture,
            u_brightness: clip.effects.brightness,
            u_contrast: clip.effects.contrast,
            u_saturation: clip.effects.saturation,
        };

        twgl.setBuffersAndAttributes(gl, this.programInfo, this.bufferInfo);
        twgl.setUniforms(this.programInfo, uniforms);
        twgl.drawBufferInfo(gl, this.bufferInfo);
    }
}
