import { mainFragmentShader, mainVertexShader, pickingFragmentShader } from "../shaders";
import { TimelineObject, Transform, Viewport } from "../types";
import { mat4, vec4 } from "gl-matrix";

export function createTransformMatrix(
  transform: Transform,
  canvasWidth: number,
  canvasHeight: number
): Float32Array {
  const matrix = new Float32Array(16);
  const { x, y, width, height, rotation, scale } = transform;

  // Convert to clip space coordinates (-1 to 1)
  const normalizedX = (x / canvasWidth) * 2 - 1;
  const normalizedY = (y / canvasHeight) * 2 - 1;
  const normalizedWidth = (width / canvasWidth) * 2;
  const normalizedHeight = (height / canvasHeight) * 2;

  // Start with identity matrix
  mat4.identity(matrix);

  // Apply transformations in order: scale -> rotate -> translate
  mat4.translate(matrix, matrix, [normalizedX, normalizedY, 0]);
  mat4.translate(matrix, matrix, [
    normalizedWidth / 2,
    normalizedHeight / 2,
    0,
  ]);
  mat4.rotateZ(matrix, matrix, (rotation * Math.PI) / 180);
  mat4.scale(matrix, matrix, [
    normalizedWidth * scale.x,
    normalizedHeight * scale.y,
    1,
  ]);
  mat4.translate(matrix, matrix, [-0.5, -0.5, 0]);

  return matrix;
}

export function invertTransform(transform: Transform) {
  const matrix = createTransformMatrix(transform, 1, 1);
  const invMatrix = new Float32Array(16);
  mat4.invert(invMatrix, matrix);
  return invMatrix;
}

export function transformPoint(
  point: { x: number; y: number },
  matrix: Float32Array
): { x: number; y: number } {
  const vec = new Float32Array([point.x, point.y, 0, 1]);
  const result = new Float32Array(4);
  vec4.transformMat4(result, vec, matrix);
  return {
    x: result[0] / result[3],
    y: result[1] / result[3],
  };
}

// Helper function to check if a clip is currently visible
export function isClipVisible(
  clip: TimelineObject,
  currentTime: number
): boolean {
  return (
    currentTime >= clip.startTime &&
    currentTime < clip.startTime + clip.duration
  );
}

// Helper function to create default transform
export function createDefaultTransform(
  width: number,
  height: number,
  canvasWidth: number,
  canvasHeight: number
): Transform {
  return {
    x: (canvasWidth - width) / 2,
    y: (canvasHeight - height) / 2,
    width,
    height,
    rotation: 0,
    scale: { x: 1, y: 1 },
  };
}

export function createViewProjectionMatrix(viewport: Viewport): Float32Array {
  const matrix = mat4.create();

  // Start with orthographic projection
  mat4.ortho(
    matrix,
    -viewport.width / 2,
    viewport.width / 2,
    -viewport.height / 2,
    viewport.height / 2,
    -1,
    1
  );

  // Apply viewport transform
  mat4.translate(matrix, matrix, [viewport.x, viewport.y, 0]);
  mat4.scale(matrix, matrix, [viewport.zoom, viewport.zoom, 1]);

  return matrix;
}

export function createModelMatrix(transform: Transform): Float32Array {
  const matrix = mat4.create();

  // Apply transformations in order: scale -> rotate -> translate
  mat4.translate(matrix, matrix, [transform.x, transform.y, 0]);
  mat4.translate(matrix, matrix, [
    transform.width / 2,
    transform.height / 2,
    0,
  ]);
  mat4.rotateZ(matrix, matrix, (transform.rotation * Math.PI) / 180);
  mat4.scale(matrix, matrix, [
    transform.width * transform.scale.x,
    transform.height * transform.scale.y,
    1,
  ]);
  mat4.translate(matrix, matrix, [-0.5, -0.5, 0]);

  return matrix;
}

export function worldToScreen(
  worldX: number,
  worldY: number,
  viewport: Viewport
): { x: number; y: number } {
  const x = (worldX - viewport.x) * viewport.zoom + viewport.width / 2;
  const y = (worldY - viewport.y) * viewport.zoom + viewport.height / 2;
  return { x, y };
}

export function screenToWorld(
  screenX: number,
  screenY: number,
  viewport: Viewport
): { x: number; y: number } {
  const x = (screenX - viewport.width / 2) / viewport.zoom + viewport.x;
  const y = (screenY - viewport.height / 2) / viewport.zoom + viewport.y;
  return { x, y };
}

export class TransformSystem {
    private gl: WebGL2RenderingContext;
    private mainProgram: WebGLProgram;
    private pickingProgram: WebGLProgram;
    private framebuffer: WebGLFramebuffer;
    private pickingTexture: WebGLTexture;
    private handleVAO: WebGLVertexArrayObject;
    private handleBuffer: WebGLBuffer;
    private handleInstanceBuffer: WebGLBuffer;
    private transformData: Float32Array;
    private readonly MAX_HANDLES = 100; // Maximum number of transform handles

    constructor(gl: WebGL2RenderingContext) {
        this.gl = gl;
        
        // Create shader programs
        this.mainProgram = this.createProgram(mainVertexShader, mainFragmentShader);
        this.pickingProgram = this.createProgram(mainVertexShader, pickingFragmentShader);
        
        // Initialize transform data array (16 floats per matrix * max handles)
        this.transformData = new Float32Array(16 * this.MAX_HANDLES);
        
        // Setup buffers and VAO
        this.setupBuffers();
        this.setupFramebuffer();
    }

    private setupBuffers() {
        const gl = this.gl;

        // Create and bind VAO
        this.handleVAO = gl.createVertexArray()!;
        gl.bindVertexArray(this.handleVAO);

        // Create and populate vertex buffer
        this.handleBuffer = gl.createBuffer()!;
        gl.bindBuffer(gl.ARRAY_BUFFER, this.handleBuffer);

        // Handle geometry (simple quad)
        const vertices = new Float32Array([
            // positions (XY),   texcoords (UV)
            -0.5, -0.5,         0.0, 0.0,    // bottom left
             0.5, -0.5,         1.0, 0.0,    // bottom right
            -0.5,  0.5,         0.0, 1.0,    // top left
             0.5,  0.5,         1.0, 1.0,    // top right
        ]);
        
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

        // Set up vertex attributes
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 16, 0); // position
        gl.enableVertexAttribArray(1);
        gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 16, 8); // texcoord

        // Create and set up instance buffer for transforms
        this.handleInstanceBuffer = gl.createBuffer()!;
        gl.bindBuffer(gl.ARRAY_BUFFER, this.handleInstanceBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.transformData, gl.DYNAMIC_DRAW);

        // Set up instance attributes (mat4)
        for (let i = 0; i < 4; i++) {
            const loc = 2 + i; // Starting from attribute location 2
            gl.enableVertexAttribArray(loc);
            gl.vertexAttribPointer(loc, 4, gl.FLOAT, false, 64, i * 16);
            gl.vertexAttribDivisor(loc, 1); // This is an instanced attribute
        }

        // Initialize transform data with identity matrices
        for (let i = 0; i < this.MAX_HANDLES; i++) {
            const offset = i * 16;
            mat4.identity(this.transformData.subarray(offset, offset + 16));
        }

        // Upload initial data
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.transformData);

        // Unbind VAO
        gl.bindVertexArray(null);
    }

    private setupFramebuffer() {
        const gl = this.gl;
        
        this.framebuffer = gl.createFramebuffer()!;
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
        
        this.pickingTexture = gl.createTexture()!;
        gl.bindTexture(gl.TEXTURE_2D, this.pickingTexture);
        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            gl.canvas.width,
            gl.canvas.height,
            0,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            null
        );
        
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        
        gl.framebufferTexture2D(
            gl.FRAMEBUFFER,
            gl.COLOR_ATTACHMENT0,
            gl.TEXTURE_2D,
            this.pickingTexture,
            0
        );
        
        // Reset bindings
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.bindTexture(gl.TEXTURE_2D, null);
    }

    public updateTransform(handleId: number, transform: mat4) {
        if (handleId >= this.MAX_HANDLES) return;

        const gl = this.gl;
        const offset = handleId * 16;

        // Update local data
        this.transformData.set(transform, offset);

        // Update GPU buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.handleInstanceBuffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, offset * 4, 
            this.transformData.subarray(offset, offset + 16));
    }

    public render(camera: { projection: mat4; view: mat4 }) {
        const gl = this.gl;
        
        gl.useProgram(this.mainProgram);
        gl.bindVertexArray(this.handleVAO);

        // Set uniforms
        const projectionLoc = gl.getUniformLocation(this.mainProgram, 'u_projection');
        const viewLoc = gl.getUniformLocation(this.mainProgram, 'u_view');
        
        gl.uniformMatrix4fv(projectionLoc, false, camera.projection);
        gl.uniformMatrix4fv(viewLoc, false, camera.view);

        // Draw instances
        gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, 8); // 8 handles per transform gizmo
    }

    public pick(x: number, y: number): number {
        const gl = this.gl;
        
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        
        gl.useProgram(this.pickingProgram);
        gl.bindVertexArray(this.handleVAO);
        
        // Set uniforms same as main render
        const projectionLoc = gl.getUniformLocation(this.pickingProgram, 'u_projection');
        const viewLoc = gl.getUniformLocation(this.pickingProgram, 'u_view');
        
        gl.uniformMatrix4fv(projectionLoc, false, mat4.create());
        gl.uniformMatrix4fv(viewLoc, false, mat4.create());
        
        // Draw for picking
        gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, 8);
        
        // Read pixel
        const pixel = new Uint8Array(4);
        gl.readPixels(x, gl.canvas.height - y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
        
        // Reset framebuffer
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        
        return pixel[0] + (pixel[1] << 8);
    }

    private createProgram(vertexSource: string, fragmentSource: string): WebGLProgram {
        const gl = this.gl;
        const program = gl.createProgram()!;
        
        const vs = gl.createShader(gl.VERTEX_SHADER)!;
        gl.shaderSource(vs, vertexSource);
        gl.compileShader(vs);
        
        const fs = gl.createShader(gl.FRAGMENT_SHADER)!;
        gl.shaderSource(fs, fragmentSource);
        gl.compileShader(fs);
        
        gl.attachShader(program, vs);
        gl.attachShader(program, fs);
        gl.linkProgram(program);
        
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            throw new Error('Program link failed: ' + gl.getProgramInfoLog(program));
        }
        
        return program;
    }
}

