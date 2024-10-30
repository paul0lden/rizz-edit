import { mat4, vec2 } from "gl-matrix";

export class Camera {
  private position: vec2;
  private aspect: number;

  constructor(width: number, height: number) {
    this.position = vec2.fromValues(0, 0);
    this.aspect = width / height;
  }

  pan(dx: number, dy: number): void {
    // Invert movement for natural feel
    this.position[0] -= dx;
    this.position[1] -= dy;
  }

  getPosition(): vec2 {
    return vec2.clone(this.position);
  }

  setPosition(x: number, y: number): void {
    vec2.set(this.position, x, y);
  }

  getProjectionMatrix(): mat4 {
    const projection = mat4.create();
    mat4.ortho(projection, -this.aspect, this.aspect, -1, 1, -1, 1);
    return projection;
  }

  getViewMatrix(): mat4 {
    const view = mat4.create();
    mat4.translate(view, view, [-this.position[0], -this.position[1], 0]);
    return view;
  }
}
