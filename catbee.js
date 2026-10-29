// =====================================================================
// catbee.js -> Class Karakter CatBee & Environment Make-A-Friend (Fit Lorong Kanan)
// =====================================================================

import { Mat4, COL, flat, Shapes, Part, Mesh } from "./libscatbee.js";

export class CatBee {
  constructor(gl) {
    const S = Shapes, PI = Math.PI;
    this.ants = [];
    this.knobs = [];
    this.walkAmt = 0;
    this.hov = 0;
    this.cycle = 0;
    this.CYCLE_LEN = 14;
    this.flapPhase = 0;
    this.speed = 0;

    const stripeZ = (p) => Math.sin(p[2] * 11) > 0.35 ? COL.brown : COL.yellow;

    this.rootH = 0.7;
    this.root = new Part(null, [0, this.rootH, 0]);
    this.shadow = new Part(S.ellipsoid(gl, 0.55, 0.01, 0.8, flat([0.05, 0.06, 0.08])), [0, 0.03, 0]);

    this.body = this.root.add(new Part(S.ellipsoid(gl, 0.38, 0.4, 0.65, stripeZ)));
    this.body.add(new Part(S.ellipsoid(gl, 0.27, 0.28, 0.3, flat(COL.cream)), [0, -0.12, 0.35]));

    const hA = 0.6, hB = 0.46, hC = 0.48;
    const headColor = (p) => {
      const dahi = p[1] > 0.25 && (((Math.abs(p[0]) - 0.165) / 0.1) ** 2 + ((p[2] - 0.1) / 0.22) ** 2) < 1;
      const pipi = Math.abs(p[0]) > 0.38 && (((p[2] - 0.05) / 0.22) ** 2 + ((p[1] + 0.17) / 0.09) ** 2) < 1;
      return (dahi || pipi) ? COL.brown : COL.yellow;
    };
    this.head = this.body.add(new Part(S.ellipsoid(gl, hA, hB, hC, headColor), [0, 0.45, 0.6]));
    this.head.axis = [1, 0, 1];

    const zKepala = (x, y) => hC * Math.sqrt(Math.max(0, 1 - (x / hA) ** 2 - ((y - 0) / hB) ** 2));
    const onHead = (x, y, emb = 0) => {
      const z = zKepala(x, y);
      const nx = x / (hA * hA), ny = y / (hB * hB), nz = z / (hC * hC), l = Math.hypot(nx, ny, nz);
      const n = [nx / l, ny / l, nz / l];
      return new Part(null, [x - n[0] * emb, y - n[1] * emb, z - n[2] * emb],
                      [-Math.asin(n[1]), Math.atan2(n[0], n[2]), 0]);
    };

    const telinga = (s, B, h, a, b, tilt, warna) => {
      const puncak = [B[0] + s * h * Math.sin(tilt), B[1] + h * Math.cos(tilt), B[2]];
      return new Part(S.ellipticCone(gl, a, b, h, flat(warna)), puncak, [PI / 2, 0, -s * tilt]);
    };

    [-1, 1].forEach(s => {
      this.head.add(telinga(s, [s * 0.36, 0.20, -0.02], 0.36, 0.19, 0.06, 0.55, COL.yellow));
      this.head.add(telinga(s, [s * 0.365, 0.23, 0.05], 0.27, 0.12, 0.06, 0.55, COL.cream));

      const matP = onHead(s * 0.23, -0.07, 0.02);
      this.head.add(matP);
      const mata = matP.add(new Part(null, [0, 0, 0], [0, 0, s * 0.12]));
      mata.add(new Part(S.ellipsoid(gl, 0.15, 0.105, 0.05, flat(COL.white))));
      mata.add(new Part(S.ellipsoid(gl, 0.085, 0.09, 0.05, flat(COL.black)), [0, -0.01, 0.012]));
      mata.add(new Part(S.ellipsoid(gl, 0.022, 0.022, 0.012, flat(COL.white)), [-s * 0.03, 0.0, 0.055]));
      mata.add(new Part(S.ellipsoid(gl, 0.165, 0.085, 0.062, flat(COL.yellow)), [0, 0.075, 0]));
      mata.add(new Part(S.ellipsoid(gl, 0.16, 0.013, 0.058, flat(COL.brown)), [0, 0, 0]));

      const alisP = onHead(s * 0.22, 0.22, 0);
      this.head.add(alisP);
      alisP.add(new Part(S.bezierTube(gl,
        [[-0.14 * s, -0.03], [-0.09 * s, 0.03], [0.05 * s, 0.04], [0.14 * s, -0.05]],
        v => 0.014 * (0.5 + Math.sin(PI * v)), 1, flat(COL.brown))));

      const ant = this.head.add(new Part(
        S.bezierTube(gl, [[0, 0], [0, 0.25], [0.06, 0.4], [0.26, 0.48]], v => 0.055, 1, flat(COL.brown)),
        [s * 0.2, 0.4, 0.05], [0, s > 0 ? -0.6 : PI + 0.6, 0]));
      const knob = ant.add(new Part(S.ellipsoid(gl, 0.17, 0.115, 0.115, flat(COL.brown)), [0.33, 0.51, 0], [0, 0, 0.38]));
      this.ants.push(ant);
      this.knobs.push(knob);
    });

    this.head.add(new Part(S.ellipsoid(gl, 0.17, 0.12, 0.12, flat(COL.cream)), [0, -0.23, zKepala(0, -0.23) - 0.03]));
    [-1, 1].forEach(s => this.head.add(new Part(S.ellipsoid(gl, 0.12, 0.1, 0.11, flat(COL.cream)),
                                             [s * 0.09, -0.25, zKepala(s * 0.09, -0.25) - 0.03])));
    this.head.add(new Part(S.ellipsoid(gl, 0.05, 0.034, 0.03, flat(COL.pink)), [0, -0.15, 0.465]));
    this.head.add(new Part(S.ellipsoid(gl, 0.055, 0.04, 0.025, flat(COL.black)), [0, -0.285, 0.49]));

    const ukSayap = 0.6;
    const sayapP = [[0, 0], [0.1, 0.45], [0.3, 0.7], [0.55, 0.85]].map(q => [q[0] * ukSayap, q[1] * ukSayap]);
    this.wings = [1, -1].map(s => this.body.add(new Part(
      S.bezierTube(gl, sayapP, v => ukSayap * (0.03 + 0.2 * Math.sin(PI * v)), 0.1, flat(COL.teal)),
      [s * 0.2, 0.3, -0.05],
      [0, s > 0 ? 0.5 : PI - 0.5, 0.2])));

    const stripeY = (p) => Math.sin(p[1] * 18) > 0.3 ? COL.brown : COL.yellow;
    const hipY = -0.2, legRadius = 0.11;
    const pawSize = [0.14, 0.10, 0.18], thighSize = [0.15, 0.17, 0.17];
    const pawDown = this.rootH + hipY - pawSize[1];
    const legLength = pawDown - 0.05;
    const legPos = [[1, 0.34], [-1, 0.34], [1, -0.34], [-1, -0.34]];
    this.legs = legPos.map(([sx, z]) => {
      const leg = this.body.add(new Part(S.cylinder(gl, legRadius, legLength, stripeY), [sx * 0.22, hipY, z]));
      leg.add(new Part(S.ellipsoid(gl, ...thighSize, flat(COL.yellow)), [0, 0, 0]));
      leg.add(new Part(S.ellipsoid(gl, ...pawSize, flat(COL.yellow)), [0, -pawDown, 0.04]));
      return leg;
    });

    const stripeV = (p, u, v) => Math.floor(v * 8) % 2 ? COL.brown : COL.yellow;
    this.tail = this.body.add(new Part(
      S.bezierTube(gl, [[0, 0], [0.5, -0.15], [0.85, 0.1], [0.95, 0.55]], v => 0.11 - 0.03 * v, 1, stripeV),
      [0, -0.05, -0.6], [0, PI / 2, 0]));
    this.tail.add(new Part(S.ellipticCone(gl, 0.08, 0.08, 0.28, flat(COL.brown)), [1.011, 0.823, 0], [PI / 2, 0, -0.22]));
  }

  update(t, dt, walk, force) {
    const lerp = (a, b, k) => a + (b - a) * k;
    const ss = (x, a, b) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };

    if (walk) this.cycle += dt;
    const c = this.cycle % this.CYCLE_LEN;
    const auto = ss(c, 6, 7) - ss(c, 11, 12);
    const target = (force === null || force === undefined) ? auto : force;
    this.hov += (target - this.hov) * Math.min(1, dt * 4);
    const h = this.hov;

    this.walkAmt += ((walk ? 1 : 0) - this.walkAmt) * Math.min(1, dt * 6);
    const g = this.walkAmt * (1 - h);
    const sw = Math.sin(t * 5);
    this.speed = this.walkAmt * (1 + 0.4 * h);

    this.root.pos[1] = this.rootH + Math.abs(sw) * 0.03 * g + 0.7 * h + Math.sin(t * 2) * 0.06 * h;
    this.root.rot[0] = -0.12 * h;

    const dangle = Math.sin(t * 3) * 0.08 * h;
    this.legs[0].rot[0] = sw * 0.5 * g + 0.5 * h + dangle;
    this.legs[3].rot[0] = sw * 0.5 * g + 0.9 * h + dangle;
    this.legs[1].rot[0] = -sw * 0.5 * g + 0.5 * h - dangle;
    this.legs[2].rot[0] = -sw * 0.5 * g + 0.9 * h - dangle;

    this.head.rot[0] = Math.sin(t * 2.5) * 0.08;
    this.head.angle = Math.sin(t * 1.5) * 0.12;
    this.tail.rot[1] = Math.PI / 2 + Math.sin(t * 3) * 0.35;

    this.flapPhase += dt * lerp(14, 30, h);
    const flutter = 0.04 + 0.3 * Math.pow(Math.max(0, Math.sin(t * 1.3)), 12);
    const amp = lerp(flutter, 0.7, h);
    const base = lerp(0.1, 0.3, h);
    this.wings.forEach((wg, i) => {
      const s = i === 0 ? 1 : -1;
      wg.rot[2] = (base + Math.sin(this.flapPhase) * amp) * s;
    });

    this.ants.forEach((a, i) => { a.rot[2] = Math.sin(t * 4 + i) * 0.12; });
    this.knobs.forEach(k => { k.scl = 1 + 0.12 * Math.sin(t * 6); });
    this.shadow.scl = 1 - 0.35 * h;
  }

  draw(gl, prog, m) {
    this.shadow.draw(gl, prog, m);
    this.root.draw(gl, prog, m);
  }
}

// Ukuran environment disesuaikan agar pas di dalam lorong kanan (lebar ~4.4 unit dari pusat)
const ROOM = { x: 4.0, z: 5.0, h: 8.0 };

const rnd = (i, j, s = 0) => {
  const x = Math.sin(i * 127.1 + j * 311.7 + s * 74.7) * 43758.5453;
  return x - Math.floor(x);
};

function buildMesh(gl, pos, nor, col, idx) {
  const m = Object.create(Mesh.prototype);
  m.gl = gl; m.count = idx.length;
  const mk = (t, d, A) => { const bf = gl.createBuffer(); gl.bindBuffer(t, bf); gl.bufferData(t, new A(d), gl.STATIC_DRAW); return bf; };
  m.bPos = mk(gl.ARRAY_BUFFER, pos, Float32Array);
  m.bNor = mk(gl.ARRAY_BUFFER, nor, Float32Array);
  m.bCol = mk(gl.ARRAY_BUFFER, col, Float32Array);
  m.bIdx = mk(gl.ELEMENT_ARRAY_BUFFER, idx, Uint16Array);
  return m;
}

function quadMesh(gl, quads) {
  const pos = [], nor = [], col = [], idx = [];
  quads.forEach((q, k) => {
    q.p.forEach(p => { pos.push(...p); nor.push(...q.n); col.push(...q.c); });
    const b = k * 4;
    idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
  });
  return buildMesh(gl, pos, nor, col, idx);
}

function boxMesh(gl, w, h, d, c) {
  const x = w / 2, z = d / 2;
  return quadMesh(gl, [
    { n: [0, 0, 1],  p: [[-x, 0, z], [x, 0, z], [x, h, z], [-x, h, z]] },
    { n: [0, 0, -1], p: [[x, 0, -z], [-x, 0, -z], [-x, h, -z], [x, h, -z]] },
    { n: [1, 0, 0],  p: [[x, 0, z], [x, 0, -z], [x, h, -z], [x, h, z]] },
    { n: [-1, 0, 0], p: [[-x, 0, -z], [-x, 0, z], [-x, h, z], [-x, h, -z]] },
    { n: [0, 1, 0],  p: [[-x, h, z], [x, h, z], [x, h, -z], [-x, h, -z]] },
    { n: [0, -1, 0], p: [[-x, 0, -z], [x, 0, -z], [x, 0, z], [-x, 0, z]] }
  ].map(q => ({ ...q, c })));
}

function floorMesh(gl) {
  const q = [], g = 0.03;
  const X = ROOM.x * 2, Z = ROOM.z * 2;
  for (let i = 0; i < X; i++)
    for (let j = 0; j < Z; j++) {
      const x0 = -ROOM.x + i + g, x1 = -ROOM.x + i + 1 - g;
      const z0 = -ROOM.z + j + g, z1 = -ROOM.z + j + 1 - g;
      const r = rnd(i, j), v = rnd(j, i, 3);
      let c;
      if (r < 0.09) c = [0.50, 0.11, 0.11];        // merah
      else if (r < 0.17) c = [0.14, 0.24, 0.52];   // biru
      else if (r < 0.24) c = [0.58, 0.47, 0.11];   // kuning
      else if (r < 0.28) c = [0.14, 0.38, 0.20];   // hijau
      else { const k = 0.16 + 0.09 * v; c = [k, k + 0.015, k + 0.04]; }
      q.push({ p: [[x0, 0, z0], [x1, 0, z0], [x1, 0, z1], [x0, 0, z1]], n: [0, 1, 0], c });
    }
  return quadMesh(gl, q);
}

export class CatbeeEnvironment {
  constructor(gl) {
    const S = Shapes, PI = Math.PI;
    this.root = new Part(null, [0, 0, 0]);
    const R = this.root;

    const cache = new Map();
    const memo = (key, fn) => { if (!cache.has(key)) cache.set(key, fn()); return cache.get(key); };
    const box  = (w, h, d, c) => memo(`b${w},${h},${d},${c}`, () => boxMesh(gl, w, h, d, c));
    const ell  = (a, b, c, col) => memo(`e${a},${b},${c},${col}`, () => S.ellipsoid(gl, a, b, c, flat(col)));
    const cylM = (r, h, col) => memo(`c${r},${h},${col}`, () => S.cylinder(gl, r, h, flat(col)));
    const put  = (parent, mesh, pos = [0, 0, 0], rot = [0, 0, 0]) => parent.add(new Part(mesh, pos, rot));
    const grp  = (parent, pos = [0, 0, 0], rot = [0, 0, 0]) => parent.add(new Part(null, pos, rot));
    const cyl = (parent, r, h, col, pos = [0, 0, 0], cap = true, rot = [0, 0, 0]) => {
      const g = grp(parent, pos, rot);
      put(g, cylM(r, h, col), [0, h, 0]);
      if (cap) put(g, ell(r, 0.02, r, col), [0, h, 0]);
      return g;
    };

    const YEL = [0.80, 0.64, 0.10];
    const RED = [0.60, 0.12, 0.10], BLU = [0.15, 0.35, 0.62];
    const DARK = [0.06, 0.06, 0.08], DGRAY = [0.14, 0.15, 0.17];
    const GLASS = [0.38, 0.46, 0.50], WHITE = [0.92, 0.92, 0.9], BLACK = [0.03, 0.03, 0.04];

    // 1. Render Motif Lantai Ubin yang Fit
    put(R, floorMesh(gl));

    // 2. Marka Lingkaran Konsentris di Lantai (tempat Cat-Bee berputar)
    [[1.8, [0.62, 0.50, 0.10]], [1.6, [0.50, 0.12, 0.10]], [1.4, [0.14, 0.30, 0.55]], [1.2, [0.15, 0.17, 0.20]]]
      .forEach(([r, c], k) => put(R, ell(r, 0.004 * (k + 1), r, c), [0, 0, -1.5]));

    // 3. Tabung Kaca Samping (Kiri Lorong Kanan)
    const tank = (x, z) => {
      const g = grp(R, [x, 0, z], [0, PI / 2, 0]);
      cyl(g, 0.5, 0.7, YEL);
      cyl(g, 0.52, 0.08, RED, [0, 0.4, 0], false);
      cyl(g, 0.52, 0.06, BLU, [0, 0.28, 0], false);
      cyl(g, 0.42, 1.8, GLASS, [0, 0.7, 0], false);
      cyl(g, 0.48, 0.20, YEL, [0, 2.5, 0]);
      put(g, ell(0.2, 0.2, 0.2, [0.20, 0.35, 0.70]), [0, 2.8, 0]);
    };
    tank(-3.2, -1.0);

    // 4. Mesin Merah Bermata di Belakang (Pas di Ujung Lorong Kanan)
    const rm = grp(R, [0, 0, -4.2], [0, 0, 0]);
    put(rm, box(1.8, 0.2, 1.4, DARK), [0, 0, 0]);
    put(rm, box(1.7, 2.2, 1.3, RED), [0, 0.2, 0]);
    put(rm, box(0.9, 1.2, 0.04, BLU), [0.2, 0.2, 0.68]);
    put(rm, ell(0.4, 0.4, 0.02, BLU), [0.2, 1.4, 0.69]);
    put(rm, box(0.7, 1.1, 0.05, [0.04, 0.04, 0.07]), [0.2, 0.2, 0.7]);
    
    [[-0.4, 1.9], [0.4, 1.8]].forEach(([ex, ey]) => {
      put(rm, ell(0.32, 0.35, 0.1, DGRAY), [ex, ey, 0.65]);
      put(rm, ell(0.27, 0.30, 0.18, WHITE), [ex, ey, 0.68]);
      put(rm, ell(0.11, 0.12, 0.08, BLACK), [ex - 0.04, ey - 0.04, 0.78]);
    });
    cyl(rm, 0.2, 0.4, [0.2, 0.22, 0.26], [0.2, 2.4, -0.1]);
    put(rm, S.ellipticCone(gl, 0.4, 0.4, 0.5, flat([0.20, 0.45, 0.75])), [0.2, 2.8, -0.1], [-PI / 2, 0, 0]);
  }

  update(t) {}
  draw(gl, prog, m) { this.root.draw(gl, prog, m); }
}