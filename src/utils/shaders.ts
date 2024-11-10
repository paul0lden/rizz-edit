export const mainVertexShader = `#version 300 es
in vec4 a_position;
in vec2 a_texcoord;
in vec4 a_color;
in mat4 a_transform; // instanced transform matrix

uniform mat4 u_projection;
uniform mat4 u_view;

out vec2 v_texcoord;
out vec4 v_color;
out vec4 v_worldPos;

void main() {
    mat4 modelView = u_view * a_transform;
    gl_Position = u_projection * modelView * a_position;
    v_texcoord = a_texcoord;
    v_color = a_color;
    v_worldPos = a_transform * a_position;
}`;

export const mainFragmentShader = `#version 300 es
precision highp float;

in vec2 v_texcoord;
in vec4 v_color;
in vec4 v_worldPos;

uniform sampler2D u_texture;
uniform float u_time;
uniform bool u_isControl;
uniform vec4 u_id; // used for picking

out vec4 outColor;

void main() {
    if (u_isControl) {
        outColor = v_color;
    } else {
        vec4 texColor = texture(u_texture, v_texcoord);
        outColor = texColor * v_color;
    }
}`;

export const pickingFragmentShader = `#version 300 es
precision highp float;

in vec2 v_texcoord;
in vec4 v_worldPos;

uniform vec4 u_id;
out vec4 outColor;

void main() {
    outColor = u_id; // Output object ID for picking
}`;
