// =====================================================================
// libscatbee.js -> Helper Matriks, Mesh Parametrik & Shader Cat-Bee
// =====================================================================

export class Mat4 {
  static identity() { return [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]; }
  static multiply(a, b) {
    const o = new Array(16).fill(0);
    for (let c = 0; c < 4; c++)
      for (let r = 0; r < 4; r++)
        for (let k = 0; k < 4; k++) o[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k];
    return o;
  }
  static translate(x, y, z) { const m = Mat4.identity(); m[12] = x; m[13] = y; m[14] = z; return m; }
  static scale(s) { const m = Mat4.identity(); m[0] = m[5] = m[10] = s; return m; }
  static rotX(t) { const m = Mat4.identity(), c = Math.cos(t), s = Math.sin(t); m[5] = c; m[6] = s; m[9] = -s; m[10] = c; return m; }
  static rotY(t) { const m = Mat4.identity(), c = Math.cos(t), s = Math.sin(t); m[0] = c; m[2] = -s; m[8] = s; m[10] = c; return m; }
  static rotZ(t) { const m = Mat4.identity(), c = Math.cos(t), s = Math.sin(t); m[0] = c; m[1] = s; m[4] = -s; m[5] = c; return m; }
  static rotateAxis(axis, t) {
    const l = Math.hypot(axis[0], axis[1], axis[2]);
    const x = axis[0] / l, y = axis[1] / l, z = axis[2] / l;
    const c = Math.cos(t), s = Math.sin(t), k = 1 - c;
    const m = Mat4.identity();
    m[0] = k * x * x + c;     m[4] = k * x * y - s * z;  m[8] = k * x * z + s * y;
    m[1] = k * x * y + s * z; m[5] = k * y * y + c;     m[9] = k * y * z - s * x;
    m[2] = k * x * z - s * y; m[6] = k * y * z + s * x; m[10] = k * z * z + c;
    return m;
  }
  static perspective(fov, asp, n, f) {
    const t = 1 / Math.tan(fov / 2), m = new Array(16).fill(0);
    m[0] = t / asp; m[5] = t; m[10] = (f + n) / (n - f); m[11] = -1; m[14] = (2 * f * n) / (n - f); return m; }
}

export const COL = {
  yellow: [0.96, 0.89, 0.52],
  brown: [0.31, 0.25, 0.31],
  cream: [0.97, 0.96, 0.93],
  teal: [0.45, 0.83, 0.88],
  white: [1, 1, 1],
  black: [0.07, 0.06, 0.09],
  pink: [0.33, 0.25, 0.32],
  platMetal: [0.17, 0.20, 0.25],
  platTrim: [0.85, 0.65, 0.15],
  machRed: [0.75, 0.18, 0.15],
  machBlue: [0.18, 0.45, 0.72],
  machYellow: [0.92, 0.75, 0.15],
  pipeGray: [0.35, 0.38, 0.42],
  signNeon: [0.25, 0.75, 0.95],
  woodCrate: [0.42, 0.26, 0.14]
};

export const flat = c => () => c;

export class Mesh {
  constructor(gl, fn, u0, u1, v0, v1, nu, nv, colorFn) {
    const pos = [], nor = [], col = [], idx = [], e = 1e-3;
    for (let i = 0; i <= nu; i++)
      for (let j = 0; j <= nv; j++) {
        const u = u0 + (u1 - u0) * i / nu, v = v0 + (v1 - v0) * j / nv;
        const p = fn(u, v);
        const vv = Math.min(Math.max(v, v0 + e * 2), v1 - e * 2);
        const q = fn(u, vv), qu = fn(u + e, vv), qv = fn(u, vv + e);
        const a = [qu[0] - q[0], qu[1] - q[1], qu[2] - q[2]], b = [qv[0] - q[0], qv[1] - q[1], qv[2] - q[2]];
        let n = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
        const l = Math.hypot(...n) || 1; n = n.map(x => x / l);
        pos.push(...p); nor.push(...n); col.push(...colorFn(p, u, v));
      }
    for (let i = 0; i < nu; i++)
      for (let j = 0; j < nv; j++) {
        const a = i * (nv + 1) + j, b = a + nv + 1;
        idx.push(a, b, a + 1, b, b + 1, a + 1);
      }
    this.gl = gl; this.count = idx.length;
    const mk = (t, d, A) => { const bf = gl.createBuffer(); gl.bindBuffer(t, bf); gl.bufferData(t, new A(d), gl.STATIC_DRAW); return bf; };
    this.bPos = mk(gl.ARRAY_BUFFER, pos, Float32Array);
    this.bNor = mk(gl.ARRAY_BUFFER, nor, Float32Array);
    this.bCol = mk(gl.ARRAY_BUFFER, col, Float32Array);
    this.bIdx = mk(gl.ELEMENT_ARRAY_BUFFER, idx, Uint16Array);
  }

  draw(prog) {
    const gl = this.gl;
    [["aPos", this.bPos], ["aNormal", this.bNor], ["aColor", this.bCol]].forEach(([n, b]) => {
      const loc = gl.getAttribLocation(prog, n);
      if (loc !== -1) {
        gl.bindBuffer(gl.ARRAY_BUFFER, b);
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, 3, gl.FLOAT, false, 0, 0);
      }
    });
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.bIdx);
    gl.drawElements(gl.TRIANGLES, this.count, gl.UNSIGNED_SHORT, 0);
  }
}

export class Shapes {
  static ellipsoid(gl, a, b, c, colorFn) {
    return new Mesh(gl, (u, v) => [a * Math.cos(v) * Math.cos(u), b * Math.cos(v) * Math.sin(u), c * Math.sin(v)],
      -Math.PI, Math.PI, -Math.PI / 2, Math.PI / 2, 48, 32, colorFn);
  }
  static ellipticCone(gl, a, b, c, colorFn) {
    return new Mesh(gl, (u, v) => [a * v * Math.cos(u), b * v * Math.sin(u), c * v],
      -Math.PI, Math.PI, 0, 1, 32, 8, colorFn);
  }
  static cylinder(gl, r, h, colorFn) {
    return new Mesh(gl, (u, v) => [r * Math.cos(u), -h * v, r * Math.sin(u)],
      -Math.PI, Math.PI, 0, 1, 24, 8, colorFn);
  }
  static bezierTube(gl, P, rFn, pipih, colorFn) {
    const bez = t => { const s = 1 - t; return [0, 1].map(k => s * s * s * P[0][k] + 3 * s * s * t * P[1][k] + 3 * s * t * t * P[2][k] + t * t * t * P[3][k]); };
    return new Mesh(gl, (u, v) => {
      const p = bez(v), q = bez(Math.min(v + 1e-3, 1)), r0 = bez(Math.max(v - 1e-3, 0));
      let tx = q[0] - r0[0], ty = q[1] - r0[1]; const l = Math.hypot(tx, ty) || 1;
      const nx = -ty / l, ny = tx / l, r = rFn(v);
      return [p[0] + r * Math.cos(u) * nx, p[1] + r * Math.cos(u) * ny, r * pipih * Math.sin(u)];
    }, 0, 2 * Math.PI, 0, 1, 20, 24, colorFn);
  }
}

export class Part {
  constructor(mesh, pos = [0, 0, 0], rot = [0, 0, 0]) {
    this.mesh = mesh; this.pos = pos; this.rot = rot; this.children = [];
    this.scl = 1; this.axis = null; this.angle = 0;
  }
  add(c) { this.children.push(c); return c; }
  draw(gl, prog, parent) {
    let m = Mat4.multiply(parent, Mat4.translate(...this.pos));
    m = Mat4.multiply(m, Mat4.rotZ(this.rot[2]));
    m = Mat4.multiply(m, Mat4.rotY(this.rot[1]));
    m = Mat4.multiply(m, Mat4.rotX(this.rot[0]));
    if (this.axis) m = Mat4.multiply(m, Mat4.rotateAxis(this.axis, this.angle));
    if (this.scl !== 1) m = Mat4.multiply(m, Mat4.scale(this.scl));
    if (this.mesh) {
      if (!prog.uModelLoc) prog.uModelLoc = gl.getUniformLocation(prog, "uModel");
      gl.uniformMatrix4fv(prog.uModelLoc, false, new Float32Array(m));
      this.mesh.draw(prog);
    }
    this.children.forEach(c => c.draw(gl, prog, m));
  }
}

export const VS_CATBEE = `
attribute vec3 aPos;
attribute vec3 aNormal;
attribute vec3 aColor;
uniform mat4 uModel, uView, uProj;
varying vec3 vN, vW, vC;
void main(){
  vec4 w = uModel * vec4(aPos, 1.0);
  vW = w.xyz;
  vN = mat3(uModel) * aNormal;
  vC = aColor;
  gl_Position = uProj * uView * w;
}`;

export const FS_CATBEE = `
precision mediump float;
varying vec3 vN, vW, vC;
uniform vec3 uCam;
void main(){
  vec3 N = normalize(vN);
  vec3 V = normalize(uCam - vW);
  if(dot(N,V) < 0.0) N = -N;
  vec3 L = normalize(vec3(0.5, 1.0, 0.8));
  float diff = max(dot(N, L), 0.0);
  vec3 H = normalize(L + V);
  float spec = pow(max(dot(N, H), 0.0), 32.0) * 0.25;
  vec3 c = vC * (0.4 + 0.75 * diff) + spec;
  float d = length(uCam - vW);
  float fog = clamp((d - 20.0) / 22.0, 0.0, 1.0);
  c = mix(c, vec3(0.10, 0.12, 0.15), fog);
  gl_FragColor = vec4(c, 1.0);
}`;