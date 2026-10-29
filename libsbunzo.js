"use strict";

/* =====================================================================
   LIBSBUNZO.JS - Matematika, Kurva, Mesh Generator, Shader & Utilities
   ===================================================================== */

/* ------------------------------ Vektor ------------------------------ */
export const vsub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const vadd = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const vmul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
export const vdot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const vcross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
export const vlen = (a) => Math.hypot(a[0], a[1], a[2]);
export const vnorm = (a) => {
  const l = vlen(a) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
export const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/* ------------------------------ Matriks 4x4 (column-major) ------------------------------ */
export const M4 = {
  identity() {
    return new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
  },
  mul(a, b) {
    const o = new Float32Array(16);
    for (let c = 0; c < 4; c++)
      for (let r = 0; r < 4; r++) {
        let s = 0;
        for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k];
        o[c * 4 + r] = s;
      }
    return o;
  },
  translate(x, y, z) {
    const m = M4.identity();
    m[12] = x; m[13] = y; m[14] = z;
    return m;
  },
  scale(x, y, z) {
    const m = M4.identity();
    m[0] = x; m[5] = y; m[10] = z;
    return m;
  },
  rotX(a) {
    const m = M4.identity(), c = Math.cos(a), s = Math.sin(a);
    m[5] = c; m[6] = s; m[9] = -s; m[10] = c;
    return m;
  },
  rotY(a) {
    const m = M4.identity(), c = Math.cos(a), s = Math.sin(a);
    m[0] = c; m[2] = -s; m[8] = s; m[10] = c;
    return m;
  },
  rotZ(a) {
    const m = M4.identity(), c = Math.cos(a), s = Math.sin(a);
    m[0] = c; m[1] = s; m[4] = -s; m[5] = c;
    return m;
  },
  axisAngle(axis, a) {
    const n = vnorm(axis), x = n[0], y = n[1], z = n[2];
    const c = Math.cos(a), s = Math.sin(a), t = 1 - c;
    const m = M4.identity();
    m[0] = t * x * x + c;     m[1] = t * x * y + s * z; m[2] = t * x * z - s * y;
    m[4] = t * x * y - s * z; m[5] = t * y * y + c;     m[6] = t * y * z + s * x;
    m[8] = t * x * z + s * y; m[9] = t * y * z - s * x; m[10] = t * z * z + c;
    return m;
  },
  perspective(fovy, aspect, near, far) {
    const f = 1 / Math.tan(fovy / 2), m = new Float32Array(16);
    m[0] = f / aspect;
    m[5] = f;
    m[10] = (far + near) / (near - far);
    m[11] = -1;
    m[14] = (2 * far * near) / (near - far);
    return m;
  },
  lookAt(eye, target, up) {
    const z = vnorm(vsub(eye, target));
    const x = vnorm(vcross(up, z));
    const y = vcross(z, x);
    return new Float32Array([
      x[0], y[0], z[0], 0,
      x[1], y[1], z[1], 0,
      x[2], y[2], z[2], 0,
      -vdot(x, eye), -vdot(y, eye), -vdot(z, eye), 1,
    ]);
  },
  normalMat(m) {
    const A = (i, j) => m[j * 4 + i];
    const C00 = A(1, 1) * A(2, 2) - A(1, 2) * A(2, 1);
    const C01 = -(A(1, 0) * A(2, 2) - A(1, 2) * A(2, 0));
    const C02 = A(1, 0) * A(2, 1) - A(1, 1) * A(2, 0);
    const C10 = -(A(0, 1) * A(2, 2) - A(0, 2) * A(2, 1));
    const C11 = A(0, 0) * A(2, 2) - A(0, 2) * A(2, 0);
    const C12 = -(A(0, 0) * A(2, 1) - A(0, 1) * A(2, 0));
    const C20 = A(0, 1) * A(1, 2) - A(0, 2) * A(1, 1);
    const C21 = -(A(0, 0) * A(1, 2) - A(0, 2) * A(1, 0));
    const C22 = A(0, 0) * A(1, 1) - A(0, 1) * A(1, 0);
    let det = A(0, 0) * C00 + A(0, 1) * C01 + A(0, 2) * C02;
    det = Math.abs(det) < 1e-12 ? 1 : det;
    const C = [[C00, C01, C02], [C10, C11, C12], [C20, C21, C22]];
    const o = new Float32Array(9);
    for (let i = 0; i < 3; i++)
      for (let j = 0; j < 3; j++) o[j * 3 + i] = C[i][j] / det;
    return o;
  },
};

export function alignRot(a, b) {
  const c = vcross(a, b), l = vlen(c), d = vdot(a, b);
  if (l < 1e-6) {
    const m = d > 0 ? M4.identity() : M4.axisAngle([1, 0, 0], Math.PI);
    return { m, inv: m };
  }
  const ang = Math.atan2(l, d);
  return { m: M4.axisAngle(c, ang), inv: M4.axisAngle(c, -ang) };
}

export const rotVec = (M, v) => [
  M[0] * v[0] + M[4] * v[1] + M[8] * v[2],
  M[1] * v[0] + M[5] * v[1] + M[9] * v[2],
  M[2] * v[0] + M[6] * v[1] + M[10] * v[2],
];

export const xfPoint = (M, p) => [
  M[0] * p[0] + M[4] * p[1] + M[8] * p[2] + M[12],
  M[1] * p[0] + M[5] * p[1] + M[9] * p[2] + M[13],
  M[2] * p[0] + M[6] * p[1] + M[10] * p[2] + M[14],
];

export const easeOutBack = (x) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
export const easeOutCubic = (x) => 1 - Math.pow(1 - x, 3);

export function xf(p, s, r) {
  let m = M4.translate(p[0], p[1], p[2]);
  if (r) {
    if (r[1]) m = M4.mul(m, M4.rotY(r[1]));
    if (r[0]) m = M4.mul(m, M4.rotX(r[0]));
    if (r[2]) m = M4.mul(m, M4.rotZ(r[2]));
  }
  return M4.mul(m, M4.scale(s[0], s[1], s[2]));
}

export function limbMatrix(p0, p1, rx, rz) {
  const d = vsub(p1, p0), len = vlen(d), y = vmul(d, 1 / len);
  let ref = [0, 0, 1];
  if (Math.abs(vdot(y, ref)) > 0.9) ref = [1, 0, 0];
  const x = vnorm(vcross(ref, y));
  const z = vcross(x, y);
  const c = vmul(vadd(p0, p1), 0.5);
  return new Float32Array([
    x[0] * rx, x[1] * rx, x[2] * rx, 0,
    y[0] * len, y[1] * len, y[2] * len, 0,
    z[0] * rz, z[1] * rz, z[2] * rz, 0,
    c[0], c[1], c[2], 1,
  ]);
}

/* ------------------------------ Mesh Builders ------------------------------ */
export function meshEllipsoid(stacks = 28, slices = 48) {
  const m = { pos: [], nor: [], idx: [] };
  for (let i = 0; i <= stacks; i++) {
    const phi = (i / stacks) * Math.PI;
    for (let j = 0; j <= slices; j++) {
      const th = (j / slices) * Math.PI * 2;
      const x = Math.sin(phi) * Math.cos(th);
      const y = Math.cos(phi);
      const z = Math.sin(phi) * Math.sin(th);
      m.pos.push(x, y, z);
      m.nor.push(x, y, z);
    }
  }
  for (let i = 0; i < stacks; i++)
    for (let j = 0; j < slices; j++) {
      const a = i * (slices + 1) + j, b = a + slices + 1;
      m.idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  return m;
}

export function addDisc(m, y, radius, ny, slices) {
  const base = m.pos.length / 3;
  m.pos.push(0, y, 0);
  m.nor.push(0, ny, 0);
  for (let j = 0; j <= slices; j++) {
    const th = (j / slices) * Math.PI * 2;
    m.pos.push(Math.cos(th) * radius, y, Math.sin(th) * radius);
    m.nor.push(0, ny, 0);
  }
  for (let j = 0; j < slices; j++) m.idx.push(base, base + 1 + j, base + 2 + j);
}

export function meshCylinder(slices = 40) {
  const m = { pos: [], nor: [], idx: [] };
  for (let j = 0; j <= slices; j++) {
    const th = (j / slices) * Math.PI * 2, c = Math.cos(th), s = Math.sin(th);
    m.pos.push(c, -0.5, s, c, 0.5, s);
    m.nor.push(c, 0, s, c, 0, s);
  }
  for (let j = 0; j < slices; j++) {
    const a = 2 * j;
    m.idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  addDisc(m, -0.5, 1, -1, slices);
  addDisc(m, 0.5, 1, 1, slices);
  return m;
}

export function meshOpenCylinder(slices = 48) {
  const m = { pos: [], nor: [], idx: [] };
  for (let j = 0; j <= slices; j++) {
    const th = (j / slices) * Math.PI * 2, c = Math.cos(th), s = Math.sin(th);
    m.pos.push(c, -0.5, s, c, 0.5, s);
    m.nor.push(c, 0, s, c, 0, s);
  }
  for (let j = 0; j < slices; j++) {
    const a = 2 * j;
    m.idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  return m;
}

export function meshCone(k = 0, slices = 48) {
  const m = { pos: [], nor: [], idx: [] };
  for (let j = 0; j <= slices; j++) {
    const th = (j / slices) * Math.PI * 2, c = Math.cos(th), s = Math.sin(th);
    const n = vnorm([c, 1 - k, s]);
    m.pos.push(c, 0, s, k * c, 1, k * s);
    m.nor.push(...n, ...n);
  }
  for (let j = 0; j < slices; j++) {
    const a = 2 * j;
    m.idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  addDisc(m, 0, 1, -1, slices);
  if (k > 0) addDisc(m, 1, k, 1, slices);
  return m;
}

export function meshBox() {
  const m = { pos: [], nor: [], idx: [] };
  const F = [
    [[0, 0, 1], [1, 0, 0], [0, 1, 0]],
    [[0, 0, -1], [-1, 0, 0], [0, 1, 0]],
    [[1, 0, 0], [0, 0, -1], [0, 1, 0]],
    [[-1, 0, 0], [0, 0, 1], [0, 1, 0]],
    [[0, 1, 0], [1, 0, 0], [0, 0, -1]],
    [[0, -1, 0], [1, 0, 0], [0, 0, 1]],
  ];
  F.forEach(([n, u, v]) => {
    const b = m.pos.length / 3;
    [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([a, c]) => {
      m.pos.push(
        (n[0] + u[0] * a + v[0] * c) * 0.5,
        (n[1] + u[1] * a + v[1] * c) * 0.5,
        (n[2] + u[2] * a + v[2] * c) * 0.5
      );
      m.nor.push(n[0], n[1], n[2]);
    });
    m.idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
  });
  return m;
}

export function meshWall() {
  return {
    pos: [-0.5, 0, 0, 0.5, 0, 0, 0.5, 1, 0, -0.5, 1, 0],
    nor: [0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1],
    idx: [0, 1, 2, 0, 2, 3],
  };
}

/* ------------------------------ Kurva ------------------------------ */
export function bez(p0, p1, p2, p3, t) {
  const u = 1 - t;
  return [0, 1, 2].map(
    (i) => u * u * u * p0[i] + 3 * u * u * t * p1[i] + 3 * u * t * t * p2[i] + t * t * t * p3[i]
  );
}

export function sampleBez(c, n, t0 = 0, t1 = 1) {
  const out = [];
  for (let i = 0; i <= n; i++) out.push(bez(c[0], c[1], c[2], c[3], t0 + ((t1 - t0) * i) / n));
  return out;
}

export function bezierCircle(nPer = 10) {
  const k = 0.5523;
  const segs = [
    [[1, 0, 0], [1, k, 0], [k, 1, 0], [0, 1, 0]],
    [[0, 1, 0], [-k, 1, 0], [-1, k, 0], [-1, 0, 0]],
    [[-1, 0, 0], [-1, -k, 0], [-k, -1, 0], [0, -1, 0]],
    [[0, -1, 0], [k, -1, 0], [1, -k, 0], [1, 0, 0]],
  ];
  const out = [];
  segs.forEach((s) => {
    for (let i = 0; i < nPer; i++) out.push(bez(s[0], s[1], s[2], s[3], i / nPer));
  });
  out.push([1, 0, 0]);
  return out;
}

export function catmull(pts, per = 12) {
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(i - 1, 0)], p1 = pts[i], p2 = pts[i + 1];
    const p3 = pts[Math.min(i + 2, pts.length - 1)];
    for (let s = 0; s < per; s++) {
      const t = s / per, t2 = t * t, t3 = t2 * t;
      out.push(
        [0, 1, 2].map(
          (q) =>
            0.5 *
            (2 * p1[q] +
              (-p0[q] + p2[q]) * t +
              (2 * p0[q] - 5 * p1[q] + 4 * p2[q] - p3[q]) * t2 +
              (-p0[q] + 3 * p1[q] - 3 * p2[q] + p3[q]) * t3)
        )
      );
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

export function makeTube(pts, radFn, ref, seg = 16) {
  const m = { pos: [], nor: [], idx: [] }, n = pts.length;
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(i - 1, 0)], b = pts[Math.min(i + 1, n - 1)];
    const T = vnorm(vsub(b, a));
    let W = vcross(T, ref);
    if (vlen(W) < 1e-4) W = vcross(T, [0, 1, 0]);
    W = vnorm(W);
    const N = vcross(W, T);
    const r = radFn(i / (n - 1));
    const rw = Math.max(r[0], 1e-3), rt = Math.max(r[1], 1e-3);
    for (let j = 0; j <= seg; j++) {
      const ang = (j / seg) * Math.PI * 2, c = Math.cos(ang), s = Math.sin(ang);
      const p = pts[i];
      m.pos.push(
        p[0] + W[0] * c * rw + N[0] * s * rt,
        p[1] + W[1] * c * rw + N[1] * s * rt,
        p[2] + W[2] * c * rw + N[2] * s * rt
      );
      const nn = vnorm([
        W[0] * (c / rw) + N[0] * (s / rt),
        W[1] * (c / rw) + N[1] * (s / rt),
        W[2] * (c / rw) + N[2] * (s / rt),
      ]);
      m.nor.push(nn[0], nn[1], nn[2]);
    }
  }
  for (let i = 0; i < n - 1; i++)
    for (let j = 0; j < seg; j++) {
      const a = i * (seg + 1) + j, b = a + seg + 1;
      m.idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  return m;
}

/* ------------------------------ Shader & WebGL Upload ------------------------------ */
export const VS = `
attribute vec3 aPos;
attribute vec3 aNor;
uniform mat4 uModel, uView, uProj;
uniform mat3 uNormalMat;
varying vec3 vN, vWorld, vObj;
void main(){
  vec4 w = uModel * vec4(aPos, 1.0);
  vWorld = w.xyz;
  vN = uNormalMat * aNor;
  vObj = aPos;
  gl_Position = uProj * uView * w;
}`;

export const FS = `
precision mediump float;
varying vec3 vN, vWorld, vObj;
uniform vec3 uColor, uColor2, uEye;
uniform float uMode, uShine, uSpec, uFreq, uAlpha;
void main(){
  if (uMode > 2.5 && uMode < 3.5) {
    float g = clamp(vObj.y + 0.5, 0.0, 1.0);
    float st = step(0.5, fract(atan(vObj.z, vObj.x) / 6.2831853 * 18.0));
    gl_FragColor = vec4(mix(uColor, uColor2, g) * (0.9 + 0.1 * st), 1.0);
    return;
  }
  if (uMode > 4.5 && uMode < 5.5) {
    gl_FragColor = vec4(uColor, 1.0);
    return;
  }
  vec3 n = normalize(vN);
  vec3 v = normalize(uEye - vWorld);
  if (dot(n, v) < 0.0) n = -n;
  vec3 base = uColor;
  if (uMode > 0.5 && uMode < 1.5) {
    float s = fract(vObj.y * 4.5);
    base = s < 0.5 ? uColor : uColor2;
  } else if (uMode > 1.5 && uMode < 2.5) {
    float c = mod(floor(vObj.x * uFreq) + floor(vObj.z * uFreq), 2.0);
    base = c < 1.0 ? uColor : uColor2;
  } else if (uMode > 5.5 && uMode < 6.5) {
    float w = vWorld.y + 0.75 * sin(vWorld.x * 0.55 + vWorld.z * 0.55);
    float band = mod(floor(w / 1.7), 4.0);
    vec3 c0 = vec3(0.74, 0.17, 0.1);
    vec3 c1 = vec3(0.92, 0.7, 0.12);
    vec3 c2 = vec3(0.1, 0.52, 0.47);
    vec3 c3 = vec3(0.8, 0.36, 0.11);
    base = band < 0.5 ? c0 : (band < 1.5 ? c1 : (band < 2.5 ? c2 : c3));
    base *= 0.78 + 0.12 * sin(vWorld.x * 2.7 + vWorld.z * 2.7) * sin(vWorld.y * 1.9);
  } else if (uMode > 6.5) {
    float s = step(0.5, fract(vWorld.y * 1.1 + (vWorld.x + vWorld.z) * 0.5));
    base = s < 0.5 ? vec3(0.93, 0.78, 0.1) : vec3(0.06, 0.06, 0.07);
  }
  vec3 L1 = normalize(vec3(0.5, 0.9, 0.8));
  vec3 L2 = normalize(vec3(-0.8, 0.3, 0.4));
  float d1 = max(dot(n, L1), 0.0);
  float d2 = max(dot(n, L2), 0.0);
  vec3 hemi = mix(vec3(0.24, 0.21, 0.19), vec3(0.42, 0.47, 0.56), n.y * 0.5 + 0.5);
  vec3 col = base * (hemi * 0.9 + vec3(1.0, 0.97, 0.9) * d1 * 0.75 + vec3(0.5, 0.6, 0.8) * d2 * 0.22);
  vec3 h = normalize(L1 + v);
  col += vec3(pow(max(dot(n, h), 0.0), uShine) * uSpec);
  col += pow(1.0 - max(dot(n, v), 0.0), 3.0) * 0.07;
  gl_FragColor = vec4(min(col, vec3(1.0)), uAlpha);
}`;

export function compile(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
  return s;
}

export function upload(gl, m) {
  const mk = (target, data) => {
    const b = gl.createBuffer();
    gl.bindBuffer(target, b);
    gl.bufferData(target, data, gl.STATIC_DRAW);
    return b;
  };
  return {
    pos: mk(gl.ARRAY_BUFFER, new Float32Array(m.pos)),
    nor: mk(gl.ARRAY_BUFFER, new Float32Array(m.nor)),
    idx: mk(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(m.idx)),
    count: m.idx.length,
  };
}

/* ------------------------------ Warna & Font ------------------------------ */
export const COL = {
  yellow: [0.98, 0.79, 0.2],
  green: [0.12, 0.48, 0.08],
  belly: [0.98, 0.84, 0.39],
  frill: [0.23, 0.57, 0.13],
  button: [0.08, 0.31, 0.06],
  buttonX: [0.04, 0.16, 0.03],
  mark: [0.18, 0.52, 0.1],
  hatLight: [0.28, 0.57, 0.14],
  hatDark: [0.11, 0.36, 0.08],
  knob: [0.18, 0.4, 0.1],
  cheek: [0.88, 0.33, 0.14],
  earIn: [0.78, 0.5, 0.14],
  toe: [0.78, 0.52, 0.1],
  black: [0.02, 0.02, 0.03],
  white: [0.98, 0.97, 0.94],
  mouth: [0.72, 0.08, 0.13],
  lip: [0.5, 0.06, 0.09],
  tongue: [0.9, 0.36, 0.36],
  cymEdge: [0.43, 0.27, 0.11],
  cymFace: [0.72, 0.49, 0.22],
  ring: [0.9, 0.9, 0.92],
  base: [0.85, 0.36, 0.12],
};

export const mix = (a, b, t) => a + (b - a) * t;

export const FONT = {
  Y: ["X.X", "X.X", ".X.", ".X.", ".X."],
  E: ["XXX", "X..", "XX.", "X..", "XXX"],
  L: ["X..", "X..", "X..", "X..", "XXX"],
  O: ["XXX", "X.X", "X.X", "X.X", "XXX"],
  W: ["X.X", "X.X", "X.X", "XXX", "X.X"],
  B: ["XX.", "X.X", "XX.", "X.X", "XX."],
  U: ["X.X", "X.X", "X.X", "X.X", "XXX"],
  G: ["XXX", "X..", "X.X", "X.X", "XXX"],
  R: ["XX.", "X.X", "XX.", "X.X", "X.X"],
  N: ["X.X", "XXX", "XXX", "X.X", "X.X"],
  D: ["XX.", "X.X", "X.X", "X.X", "XX."],
};