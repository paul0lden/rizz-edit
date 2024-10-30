export const vertexShader = `#version 300 es
in vec4 position;
in vec2 texcoord;
out vec2 v_texCoord;

void main() {
    gl_Position = position * vec4(1, -1, 1, 1);
    v_texCoord = texcoord;
}`;

export const fragmentShader = `#version 300 es
precision highp float;

in vec2 v_texCoord;
out vec4 outColor;

uniform sampler2D u_texture;
uniform float u_brightness;
uniform float u_contrast;
uniform float u_saturation;

// Helper function to adjust saturation
vec3 adjustSaturation(vec3 color, float saturation) {
    float luminance = dot(color, vec3(0.299, 0.587, 0.114));
    return mix(vec3(luminance), color, saturation);
}

void main() {
    vec4 color = texture(u_texture, v_texCoord);
    
    // Apply brightness
    vec3 rgb = color.rgb + u_brightness;
    
    // Apply contrast
    rgb = (rgb - 0.5) * u_contrast + 0.5;
    
    // Apply saturation
    rgb = adjustSaturation(rgb, u_saturation);
    
    // Clamp final color values
    outColor = vec4(clamp(rgb, 0.0, 1.0), color.a);
}`;
