// ==========================================
// 1. LIBS (Matematika & Transformasi Matriks)
// ==========================================
export const LIBS = {
  degToRad(a) { return a * Math.PI / 180; },

  get_projection(fov, aspect, near, far) {
    const f = 1 / Math.tan(LIBS.degToRad(fov) / 2);
    return [f / aspect,0,0,0, 0,f,0,0, 0,0,(far+near)/(near-far),-1, 0,0,2*far*near/(near-far),0];
  },

  get_I4() { return [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]; },

  multiply(a, b) {
    const o = new Array(16);
    for (let c = 0; c < 4; c++)
      for (let r = 0; r < 4; r++) {
        let s = 0;
        for (let k = 0; k < 4; k++) s += a[k*4 + r] * b[c*4 + k];
        o[c*4 + r] = s;
      }
    return o;
  },

  translate(x, y, z) { return [1,0,0,0, 0,1,0,0, 0,0,1,0, x,y,z,1]; },
  scale(x, y, z)     { return [x,0,0,0, 0,y,0,0, 0,0,z,0, 0,0,0,1]; },
  rotateX(d) { const c = Math.cos(LIBS.degToRad(d)), s = Math.sin(LIBS.degToRad(d)); return [1,0,0,0, 0,c,s,0, 0,-s,c,0, 0,0,0,1]; },
  rotateY(d) { const c = Math.cos(LIBS.degToRad(d)), s = Math.sin(LIBS.degToRad(d)); return [c,0,-s,0, 0,1,0,0, s,0,c,0, 0,0,0,1]; },
  rotateZ(d) { const c = Math.cos(LIBS.degToRad(d)), s = Math.sin(LIBS.degToRad(d)); return [c,s,0,0, -s,c,0,0, 0,0,1,0, 0,0,0,1]; },
  rotateEuler(rx, ry, rz) {
    return LIBS.multiply(LIBS.rotateZ(rz), LIBS.multiply(LIBS.rotateY(ry), LIBS.rotateX(rx)));
  },

  rotateArbitrary(axis, deg) {
    const l = Math.hypot(axis[0], axis[1], axis[2]);
    const x = axis[0]/l, y = axis[1]/l, z = axis[2]/l;
    const a = LIBS.degToRad(deg), c = Math.cos(a), s = Math.sin(a), t = 1 - c;
    return [
      t*x*x + c,   t*x*y + s*z, t*x*z - s*y, 0,
      t*x*y - s*z, t*y*y + c,   t*y*z + s*x, 0,
      t*x*z + s*y, t*y*z - s*x, t*z*z + c,   0,
      0, 0, 0, 1
    ];
  },
  rotateAboutPivot(axis, deg, p) {
    return LIBS.multiply(LIBS.translate(p[0], p[1], p[2]),
           LIBS.multiply(LIBS.rotateArbitrary(axis, deg), LIBS.translate(-p[0], -p[1], -p[2])));
  },

  lookAt(eye, ctr, up) {
    let f = [ctr[0]-eye[0], ctr[1]-eye[1], ctr[2]-eye[2]];
    let l = Math.hypot(...f); f = f.map(v => v / l);
    let s = [f[1]*up[2]-f[2]*up[1], f[2]*up[0]-f[0]*up[2], f[0]*up[1]-f[1]*up[0]];
    l = Math.hypot(...s); s = s.map(v => v / l);
    const u = [s[1]*f[2]-s[2]*f[1], s[2]*f[0]-s[0]*f[2], s[0]*f[1]-s[1]*f[0]];
    const d = (a, b) => a[0]*b[0] + a[1]*b[1] + a[2]*b[2];
    return [s[0],u[0],-f[0],0, s[1],u[1],-f[1],0, s[2],u[2],-f[2],0, -d(s,eye),-d(u,eye),d(f,eye),1];
  },

  normalMatrix(m) {
    const A = (i, j) => m[j*4 + i];
    const C = [
      [A(1,1)*A(2,2) - A(1,2)*A(2,1), -(A(1,0)*A(2,2) - A(1,2)*A(2,0)), A(1,0)*A(2,1) - A(1,1)*A(2,0)],
      [-(A(0,1)*A(2,2) - A(0,2)*A(2,1)), A(0,0)*A(2,2) - A(0,2)*A(2,0), -(A(0,0)*A(2,1) - A(0,1)*A(2,0))],
      [A(0,1)*A(1,2) - A(0,2)*A(1,1), -(A(0,0)*A(1,2) - A(0,2)*A(1,0)), A(0,0)*A(1,1) - A(0,1)*A(1,0)]
    ];
    let det = A(0,0)*C[0][0] + A(0,1)*C[0][1] + A(0,2)*C[0][2];
    if (Math.abs(det) < 1e-12) det = 1;
    const o = new Float32Array(9);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) o[j*3 + i] = C[i][j] / det;
    return o;
  },

  transformPoint(m, p) {
    return [m[0]*p[0]+m[4]*p[1]+m[8]*p[2]+m[12],
            m[1]*p[0]+m[5]*p[1]+m[9]*p[2]+m[13],
            m[2]*p[0]+m[6]*p[1]+m[10]*p[2]+m[14]];
  }
};

// ==========================================
// 2. SHADER (Setup WebGL, Vertex & Fragment)
// ==========================================
const vsSource = `
attribute vec3 position, color, normal;
uniform mat4 Pmatrix, Vmatrix, Mmatrix;
uniform mat3 uNormalMat;
uniform float uShell, uFurLen;
varying vec3 vColor, vNormal, vWorld, vObj, vObjN;
void main() {
  vec3 p = position + normal * (uShell * uFurLen);
  vec4 w = Mmatrix * vec4(p, 1.0);
  w.y -= uShell * uShell * uFurLen * 0.8;
  w.y -= uShell * uShell * uFurLen * 1.3;
  vWorld = w.xyz;
  vColor = color;
  vNormal = uNormalMat * normal;
  vObj = position;
  vObjN = normal;
  gl_Position = Pmatrix * Vmatrix * w;
}`;

const fsSource = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec3 vColor, vNormal, vWorld, vObj, vObjN;
uniform vec3 uTint, uCam, uLP[3], uLC[3];
uniform float uEmissive, uShell;
uniform vec4 uMask;
uniform vec2 uFog;
float hash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
void main() {
  vec3 base = vColor * uTint;
  if (uShell > 0.0) {
    vec3 q = vObj * 42.0;
    vec3 id = floor(q);
    vec3 f = fract(q) - 0.5;
    vec3 n0 = normalize(vObjN);
    f -= n0 * dot(f, n0);
    float len = 0.35 + 0.65 * hash(id);
    float fm = 1.0;
    if (uMask.w > 0.0) fm = mix(0.3, 1.0, smoothstep(uMask.w * 0.3, uMask.w, distance(vObj, uMask.xyz)));
    float rad = mix(0.55, 0.12, uShell);
    if (uShell > len * fm || length(f) > rad) discard;
    base *= mix(0.72, 1.12, uShell);
  }
  vec3 N = normalize(vNormal);
  vec3 V = normalize(uCam - vWorld);
  if (dot(N, V) < 0.0) N = -N;
  vec3 light = mix(vec3(0.20, 0.18, 0.20), vec3(0.34, 0.40, 0.52), N.y * 0.5 + 0.5);
  light += vec3(0.20, 0.24, 0.32) * max(dot(N, normalize(vec3(0.2, 1.0, 0.4))), 0.0);
  vec3 spec = vec3(0.0);
  for (int i = 0; i < 3; i++) {
    vec3 Lv = uLP[i] - vWorld; float d = length(Lv); Lv /= d;
    float att = 1.0 / (1.0 + 0.04 * d + 0.015 * d * d);
    float df = max(dot(N, Lv), 0.0);
    light += uLC[i] * df * att * 2.2;
    vec3 H = normalize(Lv + V);
    spec += uLC[i] * pow(max(dot(N, H), 0.0), 32.0) * att * 0.6 * df;
  }
  vec3 col = base * light + spec + base * uEmissive * 1.5;
  col += pow(1.0 - max(dot(N, V), 0.0), 3.0) * 0.10 * vec3(0.5, 0.6, 0.8);
  float fog = smoothstep(uFog.x, uFog.y, length(uCam - vWorld));
  gl_FragColor = vec4(mix(col, vec3(0.02, 0.03, 0.05), fog), 1.0);
}`;

export function createRenderer(canvas) {
  const GL = canvas.getContext("webgl", { antialias: true });
  function compile(type, src) {
    const s = GL.createShader(type); GL.shaderSource(s, src); GL.compileShader(s);
    if (!GL.getShaderParameter(s, GL.COMPILE_STATUS)) console.error(GL.getShaderInfoLog(s));
    return s;
  }
  const prog = GL.createProgram();
  GL.attachShader(prog, compile(GL.VERTEX_SHADER, vsSource));
  GL.attachShader(prog, compile(GL.FRAGMENT_SHADER, fsSource));
  GL.linkProgram(prog);
  GL.useProgram(prog);

  const locs = {
    position: GL.getAttribLocation(prog, "position"),
    color:    GL.getAttribLocation(prog, "color"),
    normal:   GL.getAttribLocation(prog, "normal"),
    M:        GL.getUniformLocation(prog, "Mmatrix"),
    N:        GL.getUniformLocation(prog, "uNormalMat"),
    shell:    GL.getUniformLocation(prog, "uShell"),
    furLen:   GL.getUniformLocation(prog, "uFurLen"),
    furMask:  GL.getUniformLocation(prog, "uMask"),
    tint:     GL.getUniformLocation(prog, "uTint"),
    emissive: GL.getUniformLocation(prog, "uEmissive"),
  };
  const uP = GL.getUniformLocation(prog, "Pmatrix"), uV = GL.getUniformLocation(prog, "Vmatrix");
  const uCam = GL.getUniformLocation(prog, "uCam");
  const uLP = GL.getUniformLocation(prog, "uLP"), uLC = GL.getUniformLocation(prog, "uLC");
  const uFog = GL.getUniformLocation(prog, "uFog");
  GL.uniform2f(uFog, 12, 40);
  GL.enableVertexAttribArray(locs.position);
  GL.enableVertexAttribArray(locs.color);
  GL.enableVertexAttribArray(locs.normal);
  return { GL, prog, locs, uP, uV, uCam, uLP, uLC, uFog };
}

// ==========================================
// 3. ANIMATION & KEYFRAMES
// ==========================================
export const clamp01 = x => Math.min(1, Math.max(0, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };

export const ease = {
  linear: t => t,
  inOut:  t => t * t * (3 - 2 * t),
  in:     t => t * t,
  out:    t => 1 - (1 - t) * (1 - t),
  hold:   t => 0
};

export const key = (t, v, e) => ({ t, v, ease: e });
const copy = v => Array.isArray(v) ? v.slice() : v;

export class Track {
  constructor(keys) { this.keys = keys.slice().sort((a, b) => a.t - b.t); }
  at(time) {
    const K = this.keys;
    if (time <= K[0].t) return copy(K[0].v);
    const last = K[K.length - 1];
    if (time >= last.t) return copy(last.v);
    let i = 0; while (K[i + 1].t < time) i++;
    const a = K[i], b = K[i + 1];
    const e = (a.ease || ease.inOut)((time - a.t) / (b.t - a.t));
    return Array.isArray(a.v) ? a.v.map((x, k) => lerp(x, b.v[k], e)) : lerp(a.v, b.v, e);
  }
}

export class Animated {
  tracks = {};
  params = {};
  track(name, keys) { this.tracks[name] = new Track(keys); return this; }
  sample(time) { for (const n in this.tracks) this.params[n] = this.tracks[n].at(time); }
  valueAt(name, t) {
    const tr = this.tracks[name];
    if (tr) return tr.at(t);
    const v = this.params[name];
    return Array.isArray(v) ? v.slice() : (v === undefined ? 0 : v);
  }
  addKeys(name, keys) {
    if (!this.tracks[name]) this.tracks[name] = new Track(keys);
    else {
      const tr = this.tracks[name];
      keys.forEach(k => { tr.keys = tr.keys.filter(x => x.t !== k.t); tr.keys.push(k); });
      tr.keys.sort((a, b) => a.t - b.t);
    }
    return this;
  }
}

// ==========================================
// 4. BUILDERS (Pembuat Geometri 3D)
// ==========================================
const sub = (a, b) => [a[0]-b[0], a[1]-b[1], a[2]-b[2]];
const cross = (a, b) => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
const norm = v => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0]/l, v[1]/l, v[2]/l]; };
export const mix = (c1, c2, t) => c1.map((x, i) => lerp(x, c2[i], t));

export function parametric(fn, nu, nv, color) {
  const vertex = [], faces = [], e = 1e-4;
  for (let i = 0; i <= nu; i++)
    for (let j = 0; j <= nv; j++) {
      const u = i / nu, v = j / nv, r = fn(u, v);
      let n = r.n;
      if (!n) {
        const du = sub(fn(Math.min(1, u+e), v).p, fn(Math.max(0, u-e), v).p);
        const dv = sub(fn(u, v+e).p, fn(u, v-e).p);
        n = cross(dv, du);
        if (Math.hypot(n[0], n[1], n[2]) < 1e-9) n = [0, u < 0.5 ? 1 : -1, 0];
      }
      n = norm(n);
      const c = typeof color === "function" ? color(u, v, r.p) : color;
      vertex.push(r.p[0], r.p[1], r.p[2], c[0], c[1], c[2], n[0], n[1], n[2]);
    }
  for (let i = 0; i < nu; i++)
    for (let j = 0; j < nv; j++) {
      const a = i * (nv + 1) + j, b = a + nv + 1;
      faces.push(a, b, a + 1, a + 1, b, b + 1);
    }
  return { vertex, faces };
}

export function ellipsoid(rx, ry, rz, color, c = [0,0,0], nu = 18, nv = 28) {
  return parametric((u, v) => {
    const th = u * Math.PI, ph = v * 2 * Math.PI;
    const nx = Math.sin(th)*Math.cos(ph), ny = Math.cos(th), nz = Math.sin(th)*Math.sin(ph);
    return { p: [c[0]+rx*nx, c[1]+ry*ny, c[2]+rz*nz], n: [nx/rx, ny/ry, nz/rz] };
  }, nu, nv, color);
}

export function capsule(r, h, color, nu = 20, nv = 20) {
  const cy = -(h/2 + r);
  return parametric((u, v) => {
    const ph = v * 2 * Math.PI; let th, off;
    if (u < 0.4)        { th = (u/0.4) * Math.PI/2; off = h/2; }
    else if (u <= 0.6)  { th = Math.PI/2; off = h/2 - ((u-0.4)/0.2) * h; }
    else                { th = Math.PI/2 + ((u-0.6)/0.4) * Math.PI/2; off = -h/2; }
    const nx = Math.sin(th)*Math.cos(ph), ny = Math.cos(th), nz = Math.sin(th)*Math.sin(ph);
    return { p: [r*nx, r*ny + off + cy, r*nz], n: [nx, ny, nz] };
  }, nu, nv, color);
}

export function cylinder(r, h, color, nv = 20) {
  return parametric((u, v) => {
    const ph = v * 2 * Math.PI;
    return { p: [r*Math.cos(ph), -u*h, r*Math.sin(ph)], n: [Math.cos(ph), 0, Math.sin(ph)] };
  }, 1, nv, color);
}

export function box(w, h, d, color) {
  const x = w/2, y = h/2, z = d/2, vertex = [], faces = [];
  const F = [
    [[0,0,1],  [-x,-y,z],[x,-y,z],[x,y,z],[-x,y,z]],
    [[0,0,-1], [x,-y,-z],[-x,-y,-z],[-x,y,-z],[x,y,-z]],
    [[1,0,0],  [x,-y,z],[x,-y,-z],[x,y,-z],[x,y,z]],
    [[-1,0,0], [-x,-y,-z],[-x,-y,z],[-x,y,z],[-x,y,-z]],
    [[0,1,0],  [-x,y,z],[x,y,z],[x,y,-z],[-x,y,-z]],
    [[0,-1,0], [-x,-y,-z],[x,-y,-z],[x,-y,z],[-x,-y,z]]
  ];
  F.forEach((f, i) => {
    for (let k = 1; k <= 4; k++) vertex.push(...f[k], ...color, ...f[0]);
    faces.push(i*4, i*4+1, i*4+2, i*4, i*4+2, i*4+3);
  });
  return { vertex, faces };
}

export function cone(r, h, color, nv = 16) {
  return parametric((u, v) => {
    const ph = v * 2 * Math.PI, rr = r * (1 - u);
    return { p: [rr*Math.cos(ph), u*h, rr*Math.sin(ph)], n: [h*Math.cos(ph), r, h*Math.sin(ph)] };
  }, 2, nv, color);
}

export function hyperboloid1(a, c, t0, t1, color, nu = 16, nv = 32) {
  return parametric((u, v) => {
    const t = lerp(t0, t1, u), ph = v * 2 * Math.PI;
    const x = a*Math.cosh(t)*Math.cos(ph), y = c*Math.sinh(t), z = a*Math.cosh(t)*Math.sin(ph);
    return { p: [x, y, z], n: [x/(a*a), -y/(c*c), z/(a*a)] };
  }, nu, nv, color);
}

export function saddle(w, d, k, color, trim = "bow", nu = 28, nv = 12) {
  return parametric((u, v) => {
    const p = u * 2 - 1;
    const f = trim === "oval" ? Math.sqrt(Math.max(0, 1 - p * p)) : (0.2 + 0.8 * Math.abs(p));
    const q = (v * 2 - 1) * f;
    const x = p * w / 2, z = q * d / 2;
    return { p: [x, k * (p*p - q*q), z] };
  }, nu, nv, color);
}

export function bezier(pts, t) {
  let P = pts.map(p => p.slice());
  for (let r = pts.length - 1; r > 0; r--)
    for (let i = 0; i < r; i++)
      for (let k = 0; k < 3; k++) P[i][k] = (1 - t) * P[i][k] + t * P[i+1][k];
  return P[0];
}

export function bspline(pts, t) {
  const P = [pts[0], pts[0], ...pts, pts[pts.length-1], pts[pts.length-1]];
  const segs = P.length - 3;
  const s = Math.min(Math.floor(t * segs), segs - 1), lt = t * segs - s;
  const b = [(1-lt)**3/6, (3*lt**3 - 6*lt**2 + 4)/6, (-3*lt**3 + 3*lt**2 + 3*lt + 1)/6, lt**3/6];
  const out = [0, 0, 0];
  for (let i = 0; i < 4; i++) for (let k = 0; k < 3; k++) out[k] += b[i] * P[s+i][k];
  return out;
}

export function tube(curve, radius, color, nu = 60, nv = 10, capPow = 0.35) {
  return parametric((u, v) => {
    const e = 1e-3;
    const c = curve(u);
    const T = norm(sub(curve(Math.min(1, u+e)), curve(Math.max(0, u-e))));
    let ref = [0, 0, 1];
    if (Math.abs(T[2]) > 0.9) ref = [0, 1, 0];
    const N = norm(cross(ref, T)), Bn = cross(T, N);
    const ph = v * 2 * Math.PI, rr = radius * Math.pow(Math.sin(Math.PI * u), capPow);
    const dx = Math.cos(ph), dy = Math.sin(ph);
    const nrm = [dx*N[0]+dy*Bn[0], dx*N[1]+dy*Bn[1], dx*N[2]+dy*Bn[2]];
    return { p: [c[0]+rr*nrm[0], c[1]+rr*nrm[1], c[2]+rr*nrm[2]], n: nrm };
  }, nu, nv, color);
}

const hash3 = (i, j, k) => { const h = Math.sin(i*127.1 + j*311.7 + k*74.7) * 43758.5453; return h - Math.floor(h); };
export function noise3(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const sm = t => t*t*(3 - 2*t), u = sm(x-xi), v = sm(y-yi), w = sm(z-zi);
  const L = (a, b, t) => a + (b - a) * t;
  const f = dz => L(L(hash3(xi,yi,zi+dz), hash3(xi+1,yi,zi+dz), u), L(hash3(xi,yi+1,zi+dz), hash3(xi+1,yi+1,zi+dz), u), v);
  return L(f(0), f(1), w);
}

function rng(seed) {
  let a = seed | 0;
  return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const cp = (w, m) => { const c = Math.cos(w); return Math.sign(c) * Math.pow(Math.abs(c), m); };
const sp = (w, m) => { const s = Math.sin(w); return Math.sign(s) * Math.pow(Math.abs(s), m); };

export function superellipsoid(a, b, d, e1, e2, color, o = {}) {
  const c = o.center || [0,0,0], tp = o.taper || 0;
  return parametric((u, v) => {
    const eta = Math.PI/2 - u*Math.PI, om = v*2*Math.PI;
    const ce = cp(eta, e1), se = sp(eta, e1), co = cp(om, e2), so = sp(om, e2);
    return { p: [c[0] + a*(1 + tp*se)*ce*co, c[1] + b*se, c[2] + d*(1 + 0.4*tp*se)*ce*so] };
  }, o.nu || 28, o.nv || 40, color);
}

export function superSurfZ(x, y, P, C = [0,0,0]) {
  const yn = (y - C[1]) / P.b, tp = P.taper || 0;
  const rem = 1 - Math.pow(Math.abs(yn), 2 / P.e1); if (rem <= 0) return C[2];
  const aE = P.a * (1 + tp*yn), dE = P.d * (1 + 0.4*tp*yn);
  const Sx = Math.pow(Math.abs((x - C[0]) / aE), 2 / P.e2);
  const Sz = Math.pow(rem, P.e1 / P.e2) - Sx; if (Sz <= 0) return C[2];
  return C[2] + dE * Math.pow(Sz, P.e2 / 2);
}

export function addFur(geo, count, len, rad, baseCol, tipCol, seed = 1, accept = () => true) {
  const R = rng(seed), V = geo.vertex, nv = V.length / 9, ring = 5;
  let cx = 0, cy = 0, cz = 0;
  for (let i = 0; i < nv; i++) { cx += V[i*9]; cy += V[i*9+1]; cz += V[i*9+2]; }
  cx /= nv; cy /= nv; cz /= nv;
  let made = 0, tries = 0;
  while (made < count && tries < count * 30) {
    tries++;
    const i = Math.floor(R() * nv) * 9;
    const p = [V[i], V[i+1], V[i+2]];
    let n = [V[i+6], V[i+7], V[i+8]];
    if (n[0]*(p[0]-cx) + n[1]*(p[1]-cy) + n[2]*(p[2]-cz) < 0) n = n.map(x => -x);
    if (!accept(p, n)) continue;
    const ref = Math.abs(n[1]) > 0.9 ? [1,0,0] : [0,1,0];
    const t1 = norm(cross(n, ref)), t2 = cross(n, t1), L = len * (0.6 + 0.8*R());
    const dir = norm([n[0] + (R()-0.5)*0.6, n[1] + (R()-0.5)*0.6 - 0.12, n[2] + (R()-0.5)*0.6]);
    const base = V.length / 9;
    for (let k = 0; k < ring; k++) {
      const an = k / ring * 2 * Math.PI, c = Math.cos(an), s = Math.sin(an);
      const rv = [t1[0]*c + t2[0]*s, t1[1]*c + t2[1]*s, t1[2]*c + t2[2]*s];
      const nn = norm([rv[0]*0.7 + dir[0]*0.5, rv[1]*0.7 + dir[1]*0.5, rv[2]*0.7 + dir[2]*0.5]);
      V.push(p[0] + rv[0]*rad - n[0]*0.03, p[1] + rv[1]*rad - n[1]*0.03, p[2] + rv[2]*rad - n[2]*0.03,
             baseCol[0], baseCol[1], baseCol[2], nn[0], nn[1], nn[2]);
    }
    V.push(p[0] + dir[0]*L, p[1] + dir[1]*L, p[2] + dir[2]*L, tipCol[0], tipCol[1], tipCol[2], dir[0], dir[1], dir[2]);
    for (let k = 0; k < ring; k++) geo.faces.push(base + k, base + (k + 1) % ring, base + ring);
    made++;
  }
  return geo;
}

export function orientOutward(geo) {
  const V = geo.vertex, n = V.length / 9;
  let cx = 0, cy = 0, cz = 0;
  for (let i = 0; i < n; i++) { cx += V[i*9]; cy += V[i*9+1]; cz += V[i*9+2]; }
  cx /= n; cy /= n; cz /= n;
  for (let i = 0; i < n; i++) {
    const o = i * 9;
    if (V[o+6]*(V[o]-cx) + V[o+7]*(V[o+1]-cy) + V[o+8]*(V[o+2]-cz) < 0) { V[o+6] = -V[o+6]; V[o+7] = -V[o+7]; V[o+8] = -V[o+8]; }
  }
  return geo;
}

// ==========================================
// 5. ACTIONS (Helper Kamera & Gerak)
// ==========================================
export const set = (a, name, t, v) => a.addKeys(name, [key(t, v)]);
export const param = (a, name, t0, t1, v, e) => a.addKeys(name, [key(t0, a.valueAt(name, t0), e), key(t1, v)]);
export const pulse = (a, name, t0, t1, t2, t3, peak = 1) =>
  a.addKeys(name, [key(t0, 0), key(t1, peak), key(t2, peak), key(t3, 0)]);

export const moveTo  = (a, t0, t1, to, e) => param(a, "pos", t0, t1, to, e);
export const turnTo  = (a, t0, t1, deg, e) => param(a, "rotY", t0, t1, deg, e);
export const scaleTo = (a, t0, t1, s, e) => param(a, "scale", t0, t1, s, e);
export const camTo = (cam, t0, t1, eye, target) => { param(cam, "eye", t0, t1, eye); param(cam, "target", t0, t1, target); };

export function flicker(a, name, t0, t1, step, hi, lo) {
  const k = [];
  for (let t = t0, i = 0; t < t1; t += step, i++) k.push(key(t, i % 2 ? hi : lo, ease.linear));
  a.addKeys(name, k);
}

export function camShot(cam, t0, t1, fn, step = 0.25) {
  const n = Math.max(2, Math.ceil((t1 - t0) / step)), kE = [], kT = [];
  for (let i = 0; i <= n; i++) {
    const t = t0 + (t1 - t0 - 0.02) * i / n, s = fn(i / n, t);
    kE.push(key(t, s.eye, ease.linear)); kT.push(key(t, s.target, ease.linear));
  }
  cam.addKeys("eye", kE); cam.addKeys("target", kT);
}
const mixV = (a, b, e) => a.map((x, i) => x + (b[i] - x) * e);

export const camMove = (cam, t0, t1, eye0, tgt0, eye1, tgt1, e = ease.inOut) =>
  camShot(cam, t0, t1, u => ({ eye: mixV(eye0, eye1, e(u)), target: mixV(tgt0, tgt1, e(u)) }));

export const panCam = (cam, t0, t1, eye, targets) =>
  camShot(cam, t0, t1, u => {
    const seg = Math.min(targets.length - 2, Math.floor(u * (targets.length - 1))), lu = u * (targets.length - 1) - seg;
    return { eye, target: mixV(targets[seg], targets[seg + 1], ease.inOut(lu)) };
  });

export function followCam(cam, actor, t0, t1, off, look) {
  camShot(cam, t0, t1, (u, t) => {
    const p = actor.valueAt("pos", t), r = actor.valueAt("rotY", t) * Math.PI / 180;
    const f = [Math.sin(r), 0, Math.cos(r)], rt = [-Math.cos(r), 0, Math.sin(r)];
    const at = v => [p[0] + rt[0] * v[0] + f[0] * v[2], p[1] + v[1], p[2] + rt[2] * v[0] + f[2] * v[2]];
    return { eye: at(off), target: at(look) };
  }, 0.1);
}

export const orbitCam = (cam, t0, t1, center, radius, height, a0, a1, e = ease.inOut) =>
  camShot(cam, t0, t1, u => {
    const a = (a0 + (a1 - a0) * e(u)) * Math.PI / 180;
    return { eye: [center[0] + Math.sin(a) * radius, height, center[2] + Math.cos(a) * radius], target: center };
  });

export const jump = (a, t, to) => a.addKeys("pos", [key(t - 0.001, a.valueAt("pos", t - 0.001), ease.linear), key(t, to)]);

// ==========================================
// 6. MYOBJECT (Node Hierarki Scene Graph)
// ==========================================
const SHELLS = 20;

export class MyObject {
    GL = null;
    SHADER_PROGRAM = null;
    locs = null;

    OBJECT_VERTEX = null;
    OBJECT_FACES = null;

    vertex = [];
    faces = [];

    POSITION_MATRIX = LIBS.get_I4();
    MOVE_MATRIX     = LIBS.get_I4();
    MODEL_MATRIX    = LIBS.get_I4();

    childs = [];
    tint = [1, 1, 1];
    emissive = 0;
    furLen = 0;
    furMask = [0, 0, 0, 0];

    constructor(GL, SHADER_PROGRAM, locs, geo = { vertex: [], faces: [] }) {
        this.GL = GL;
        this.SHADER_PROGRAM = SHADER_PROGRAM;
        this.locs = locs;
        this.vertex = geo.vertex;
        this.faces = geo.faces;
    }

    setPose(pos = [0,0,0], euler = [0,0,0]) {
        this.POSITION_MATRIX = LIBS.multiply(LIBS.translate(...pos), LIBS.rotateEuler(...euler));
    }

    setTransform({ translate = [0,0,0], rotate = [0,0,0], scale = [1,1,1],
                   axis = null, angle = 0, pivot = [0,0,0] } = {}) {
        let M = LIBS.translate(...translate);
        if (axis) M = LIBS.multiply(M, LIBS.rotateAboutPivot(axis, angle, pivot));
        M = LIBS.multiply(M, LIBS.rotateEuler(...rotate));
        this.MOVE_MATRIX = LIBS.multiply(M, LIBS.scale(...scale));
    }

    add(child) { this.childs.push(child); return child; }

    setup() {
        const GL = this.GL;
        if (this.faces.length > 0) {
            this.OBJECT_VERTEX = GL.createBuffer();
            GL.bindBuffer(GL.ARRAY_BUFFER, this.OBJECT_VERTEX);
            GL.bufferData(GL.ARRAY_BUFFER, new Float32Array(this.vertex), GL.STATIC_DRAW);
            this.OBJECT_FACES = GL.createBuffer();
            GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, this.OBJECT_FACES);
            GL.bufferData(GL.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.faces), GL.STATIC_DRAW);
        }
        this.childs.forEach(child => child.setup());
    }

    render(PARENT_MATRIX) {
        const GL = this.GL, L = this.locs;
        this.MODEL_MATRIX = LIBS.multiply(PARENT_MATRIX, LIBS.multiply(this.POSITION_MATRIX, this.MOVE_MATRIX));

        if (this.faces.length > 0) {
            GL.useProgram(this.SHADER_PROGRAM);
            GL.uniformMatrix4fv(L.M, false, new Float32Array(this.MODEL_MATRIX));
            GL.uniformMatrix3fv(L.N, false, LIBS.normalMatrix(this.MODEL_MATRIX));
            GL.uniform3fv(L.tint, this.tint);
            GL.uniform1f(L.emissive, this.emissive);
            GL.uniform1f(L.furLen, this.furLen);
            GL.uniform4fv(L.furMask, this.furMask);
            GL.bindBuffer(GL.ARRAY_BUFFER, this.OBJECT_VERTEX);
            GL.vertexAttribPointer(L.position, 3, GL.FLOAT, false, 36, 0);
            GL.vertexAttribPointer(L.color,    3, GL.FLOAT, false, 36, 12);
            GL.vertexAttribPointer(L.normal,   3, GL.FLOAT, false, 36, 24);
            GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, this.OBJECT_FACES);
            GL.uniform1f(L.shell, 0);
            GL.drawElements(GL.TRIANGLES, this.faces.length, GL.UNSIGNED_SHORT, 0);
            if (this.furLen > 0)
                for (let i = 1; i <= SHELLS; i++) {
                    GL.uniform1f(L.shell, i / SHELLS);
                    GL.drawElements(GL.TRIANGLES, this.faces.length, GL.UNSIGNED_SHORT, 0);
                }
            GL.uniform1f(L.shell, 0);
        }
        this.childs.forEach(child => child.render(this.MODEL_MATRIX));
    }
}

export function makeNode(ctx, parent, geo, pos = [0,0,0], eul = [0,0,0]) {
    const o = new MyObject(ctx.GL, ctx.prog, ctx.locs, geo);
    o.setPose(pos, eul);
    parent.add(o);
    return o;
}