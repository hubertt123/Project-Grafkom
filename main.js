import { LIBS, createRenderer, Animated, ease, set, param, pulse, moveTo, turnTo, scaleTo, camTo, flicker } from "./libshuggy.js";
import { MyObject, makeNode } from "./libshuggy.js";
import * as B from "./libshuggy.js";
import { Huggy, Dummy } from "./Huggy.js";
import {
  vsub, vadd, vmul, vdot, vcross, vlen, vnorm, smooth,
  M4, alignRot, rotVec, xfPoint, easeOutBack, easeOutCubic, xf, limbMatrix,
  meshEllipsoid, meshCylinder, meshOpenCylinder, meshCone, meshBox, meshWall,
  bezierCircle, makeTube, VS, FS, compile, upload,
  FONT
} from "./libsbunzo.js";
import { BunzoCharacter } from "./bunzo.js";
import { CatBee, CatbeeEnvironment } from "./catbee.js";
import { VS_CATBEE, FS_CATBEE } from "./libscatbee.js";

// ==========================================
// 1. ENVIRONMENT (Lorong & Lingkungan)
// ==========================================
const YELLOW = [0.95, 0.80, 0.15];
const FLOOR = [0.13, 0.14, 0.17], WALL = [0.17, 0.21, 0.27], RUST = [0.34, 0.18, 0.12];
const GRAY = [0.30, 0.32, 0.36], ORANGE = [0.85, 0.42, 0.10], BROWN = [0.38, 0.24, 0.12];
const CEIL = [0.10, 0.12, 0.15], RED = [1.0, 0.25, 0.18];
const CH = 9.2;
export const BRANCH_X = { left: -10, mid: 0, right: 10 };

export class Environment extends Animated {
  constructor(ctx) {
    super();
    this.ctx = ctx;
    this.root = new MyObject(ctx.GL, ctx.prog, ctx.locs);
    this.params = { alarm: 0, power: 1, flick: 0 };
    this.lamps = [];
    this.build();
  }
  attachTo(parent) { parent.add(this.root); return this; }
  node(p, g, pos, eul) { return makeNode(this.ctx, p, g, pos, eul); }

  build() {
    this.buildMainCorridor();
    this.buildHub();
    this.buildBranch({ name: "left",  x: BRANCH_X.left,  len: 30, panel: [0.40, 0.14, 0.10], pipe: ORANGE, n: 1,
                       lamp: [1.0, 0.55, 0.25], alarmW: 1, flickW: 1 });
    this.buildBranch({ name: "mid",   x: BRANCH_X.mid,   len: 22, panel: [0.14, 0.26, 0.38], pipe: [0.20, 0.50, 0.65], n: 2,
                       lamp: [0.35, 0.80, 1.0], alarmW: 0, flickW: 0 });
    this.buildBranch({ name: "right", x: BRANCH_X.right, len: 22, panel: [0.20, 0.30, 0.22], pipe: [0.45, 0.30, 0.65], n: 3,
                       lamp: [0.55, 0.90, 0.60], alarmW: 0, flickW: 0, lamp2: [0.70, 0.45, 1.0] });
    this.buildDoor();
    this.buildProps();
  }

  addLamp(x, z, ceilY, cable, color, alarmW, flickW, r = 0.32) {
    const c = this.node(this.root, B.cylinder(0.03, cable, GRAY), [x, ceilY, z]);
    const bulb = this.node(c, B.ellipsoid(r, r, r, [1, 1, 1]), [0, -cable, 0]);
    this.lamps.push({ cable: c, bulb, base: color, alarmW, flickW, seed: this.lamps.length });
  }

  buildMainCorridor() {
    const root = this.root, node = (...a) => this.node(...a);
    node(root, B.box(10, 0.4, 36, FLOOR), [0, -0.2, -4]);
    node(root, B.box(10, 0.4, 36, CEIL), [0, CH + 0.2, -4]);
    [-1, 1].forEach(s => {
      node(root, B.box(0.4, 9.4, 36, WALL), [s * 5.2, 4.5, -4]);
      node(root, B.box(0.3, 2.6, 36, RUST), [s * 4.85, 1.3, -4]);
      node(root, B.box(0.1, 0.25, 36, YELLOW), [s * 4.65, 2.75, -4]);
      node(root, B.box(0.25, 0.02, 36, YELLOW), [s * 3.4, 0.01, -4]);
    });
    node(root, B.cylinder(0.25, 36, GRAY),   [-3.8, 8.2, 14], [90, 0, 0]);
    node(root, B.cylinder(0.18, 36, ORANGE), [3.6, 7.9, 14], [90, 0, 0]);
    [8, 0, -8, -16].forEach(z => this.addLamp(0, z, CH - 0.2, 1.2, [1.0, 0.85, 0.62], 0.4, 0));
  }

  buildHub() {
    const root = this.root, node = (...a) => this.node(...a);
    const HH = 11.6;
    node(root, B.box(30, 0.4, 12, FLOOR), [0, -0.2, -28]);
    node(root, B.box(30, 0.4, 12, CEIL), [0, 11.4, -28]);
    [-1, 1].forEach(s => {
      node(root, B.box(0.4, HH, 12, WALL), [s * 15.2, 5.6, -28]);
      node(root, B.box(0.3, 2.6, 12, RUST), [s * 14.85, 1.3, -28]);
      node(root, B.box(0.1, 0.25, 12, YELLOW), [s * 14.65, 2.75, -28]);
      node(root, B.box(10, HH, 0.4, WALL), [s * 10, 5.6, -22.2]);
    });
    node(root, B.box(10.4, 2.4, 0.4, WALL), [0, 10.4, -22.2]);
    [-14.5, -5, 5, 14.5].forEach((x, i) => node(root, B.box(i === 0 || i === 3 ? 1 : 2, HH, 0.4, WALL), [x, 5.6, -34.2]));
    const SIGN = [[1.0, 0.45, 0.15], [0.25, 0.80, 1.0], [0.55, 0.90, 0.40]];
    [-10, 0, 10].forEach((x, i) => {
      node(root, B.box(8.2, 2.4, 0.4, WALL), [x, 10.4, -34.2]);
      const sign = node(root, B.box(3, 0.9, 0.15, SIGN[i]), [x, 10.4, -33.9]);
      sign.emissive = 0.9;
      for (let k = 0; k <= i; k++) node(root, B.box(0.2, 0.55, 0.06, [1, 1, 1]), [x + (k - i / 2) * 0.5, 10.4, -33.8]).emissive = 1;
      const dx = x, dz = -11.5, len = Math.hypot(dx, dz);
      node(root, B.box(0.25, 0.02, len, YELLOW), [dx / 2, 0.01, -28.25], [0, Math.atan2(dx, dz) * 180 / Math.PI, 0]);
    });
    [-7, 0, 7].forEach(x => this.addLamp(x, -28, 11.2, x === 0 ? 2.2 : 1.6, [1.0, 0.90, 0.75], 0.6, 0.5, x === 0 ? 0.45 : 0.32));
  }

  buildBranch({ name, x, len, panel, pipe, n, lamp, alarmW, flickW, lamp2 }) {
    const root = this.root, node = (...a) => this.node(...a);
    const zc = -34 - len / 2, zEnd = -34 - len;
    node(root, B.box(8.8, 0.4, len, FLOOR), [x, -0.2, zc]);
    node(root, B.box(8.8, 0.4, len, CEIL), [x, CH + 0.2, zc]);
    [-1, 1].forEach(s => {
      node(root, B.box(0.4, 9.4, len, WALL), [x + s * 4.2, 4.5, zc]);
      node(root, B.box(0.3, 2.6, len, panel), [x + s * 3.85, 1.3, zc]);
      node(root, B.box(0.1, 0.25, len, YELLOW), [x + s * 3.65, 2.75, zc]);
      node(root, B.box(0.25, 0.02, len, YELLOW), [x + s * 2.6, 0.01, zc]);
    });
    node(root, B.cylinder(0.22, len, pipe), [x, 8.4, -34], [90, 0, 0]);
    if (name === "mid") node(root, B.box(8.8, 9.4, 0.4, WALL), [x, 4.5, zEnd - 0.2]);
    const lz = name === "left" ? [-40, -48, -56] : [-40, -48];
    lz.forEach((z, i) => this.addLamp(x, z, CH - 0.2, 1.2, (i % 2 && lamp2) ? lamp2 : lamp, alarmW, flickW));
  }

  buildDoor() {
    const root = this.root, node = (...a) => this.node(...a);
    const x = BRANCH_X.left, z = -64;
    node(root, B.box(1.8, 9.4, 0.4, WALL), [x - 3.1, 4.5, z - 0.2]);
    node(root, B.box(1.8, 9.4, 0.4, WALL), [x + 3.1, 4.5, z - 0.2]);
    node(root, B.box(4.4, 1.2, 0.4, WALL), [x, 8.6, z - 0.2]);
    node(root, B.box(4.4, 0.4, 8, FLOOR), [x, -0.2, z - 4.2]);
    node(root, B.box(4.6, 8.4, 0.3, [0.01, 0.01, 0.02]), [x, 4.2, z - 8.4]);
    node(root, B.box(4.6, 0.15, 0.5, [0.05, 0.06, 0.08]), [x, 8.05, z - 0.1]);
    node(root, B.box(4.2, 7.8, 0.2, [0.25, 0.10, 0.10]), [x, 3.9, z + 0.1]);
    node(root, B.box(8, 0.02, 0.35, YELLOW), [x, 0.012, -44]);
    for (let k = -3; k <= 3; k++) node(root, B.box(0.5, 0.025, 0.35, [0.02, 0.02, 0.02]), [x + k * 1.1, 0.014, -44]);
  }

  buildProps() {
    const root = this.root, node = (...a) => this.node(...a);
    node(root, B.box(1.6, 1.6, 1.6, BROWN), [-3.8, 0.8, -6], [0, 15, 0]);
    node(root, B.box(1.0, 1.0, 1.0, BROWN), [-3.7, 2.1, -6], [0, -10, 0]);
    node(root, B.box(1.3, 1.3, 1.3, BROWN), [3.9, 0.65, -14], [0, -20, 0]);
    node(root, B.cylinder(0.5, 1.3, [0.12, 0.35, 0.40]), [-3.9, 1.3, -18]);
    node(root, B.box(1.5, 1.5, 1.5, BROWN), [-13.4, 0.75, -24], [0, 25, 0]);
    node(root, B.box(1.2, 1.2, 1.2, BROWN), [13.4, 0.6, -24.5], [0, -15, 0]);
    node(root, B.cylinder(0.5, 1.3, [0.12, 0.35, 0.40]), [13.3, 1.3, -32]);
    node(root, B.cylinder(0.5, 1.3, [0.35, 0.12, 0.10]), [-13.4, 1.3, -52]);
    node(root, B.box(1.4, 1.4, 1.4, BROWN), [-13.3, 0.7, -57], [0, 12, 0]);
    const ring = node(root, B.ellipsoid(2.6, 0.04, 2.6, [0.25, 0.70, 0.95]), [BRANCH_X.mid, 0.02, -46]); ring.emissive = 0.4;
    const ring2 = node(root, B.ellipsoid(3.1, 0.03, 3.1, [0.10, 0.25, 0.40]), [BRANCH_X.mid, 0.015, -46]);
  }

  update(time, dt) {
    this.sample(time);
    const P = this.params;
    // Lampu lorong kiri baru menyala saat T >= 105 (pas kamera tiba di depan lorong Bunzo)
    const powerLeft = Math.max(0, Math.min(1, (time - 105) / 3));

    this.lamps.forEach((l, i) => {
      l.cable.setTransform({ axis: [1, 0, 0.3], angle: Math.sin(time * 0.9 + i) * 4 });
      const m = Math.min(1, P.alarm * l.alarmW);
      const c = B.mix(l.base, RED, m);
      const breathe = 0.93 + 0.07 * Math.sin(time * 0.6 + i * 1.3);
      const flick = 1 - 0.85 * P.flick * l.flickW;
      
      const branchK = l.alarmW === 1 ? powerLeft : 1;
      const k = P.power * breathe * flick * branchK;
      
      l.bulb.tint = c.map(v => v * k);
      l.bulb.emissive = (0.85 + 0.15 * Math.sin(time * 23 + i * 5) * (i === 1 ? 1 : 0.3)) * k;
    });
  }

  lights(focus = [0, 4, 0]) {
    const items = this.lamps.map(l => {
      const p = LIBS.transformPoint(l.bulb.MODEL_MATRIX, [0, 0, 0]);
      return { p, c: l.bulb.tint, d: Math.hypot(p[0] - focus[0], p[1] - focus[1], p[2] - focus[2]) };
    }).sort((a, b) => a.d - b.d).slice(0, 6);
    const pos = [], col = [];
    items.forEach(it => { pos.push(...it.p); col.push(...it.c); });
    return { pos, col };
  }
}

// ==========================================
// 2. STORY (Timeline & Keyframes Alur Cerita)
// ==========================================
export const DURATION = 170;

export const captions = [
  [0, 5, "Lorong pabrik Playtime Co. ... sunyi dan gelap."],
  [5, 17, "Dua pengunjung memasuki lorong."],
  [17, 25, "Mereka berhenti dan saling mengobrol."],
  [25, 30, "Suasana lorong menjadi aneh ..."],
  [30, 46, "Sesosok tinggi berjalan keluar dari kegelapan: Huggy Wuggy."],
  [46, 54, "Huggy tersenyum dan melambai ramah ..."],
  [54, 66, "... lalu tiba-tiba membesar! Mereka berlari!"],
  [66, 72, "Huggy kembali tenang."],
  [72, 82, "Huggy melambai dan berbalik ke dalam lorong."],
  [82, 88, "Huggy menghilang kembali ke kegelapan lorong."],
  [88, 142, "Memasuki Lorong Kiri: Area Musical Memory (Bunzo Bunny)"],
  [142, 170, "Memasuki Lorong Kanan: Area Make-A-Friend (Cat-Bee)"]
];

export function buildStory({ env, huggy, charB, charC, cam }) {
  set(cam, "eye", 0, [0, 7, 15]);  set(cam, "target", 0, [0, 2.5, -10]);  set(cam, "shake", 0, 0);
  camTo(cam, 0, 6,   [0, 3.9, 9.5],   [0, 3, -8]);
  camTo(cam, 24, 30, [0.5, 3.4, 5.5], [0, 4.5, -30]);
  camTo(cam, 30, 44, [0, 3.7, 7.5],   [0, 4, -10]);
  camTo(cam, 53, 55, [0, 2.0, 3.5],   [0, 5, -9]);
  camTo(cam, 64, 68, [0.8, 5.8, -3.5], [0, 5.6, -7.5]);
  camTo(cam, 80, 84, [0, 3.9, 2],     [0, 3.5, -20]);

  // =====================================================================
  // CINEMATIC TOUR LORONG BUNZO (FULL GAMEPLAY & JUMPSCARE) & CAT-BEE
  // =====================================================================
  // 1. Transisi Sinematik Meluncur Lambat ke Hub Central (Detik 84 - 96)
  camTo(cam, 84, 96, [0, 4.2, -14], [0, 3.5, -28]);

  // 2. LORONG KIRI - BUNZO BUNNY (X: -10, Z: -48) -> WIDE CAMERA
  camTo(cam, 96, 106,  [-10, 4.0, -32.0], [-10, 3.2, -48]); // Wide shot lorong kiri
  camTo(cam, 106, 130, [-10, 3.8, -35.0], [-10, 3.2, -48]); // Wide framing gameplay & Bunzo merosot
  camTo(cam, 130, 142, [-10, 3.6, -35.5], [-10, 3.0, -48]); // Wide framing NGAMUK / JUMPSCARE (Tahan 12 detik!)

  // 3. TRANSISI KE LORONG KANAN - CAT-BEE (X: 10, Z: -46.5) -> WIDE CAMERA
  camTo(cam, 142, 148, [0, 4.5, -24],   [10, 3.5, -40]);  // Pindah perlahan lewat Hub Central
  camTo(cam, 148, 170, [10, 3.8, -33.5], [10, 2.8, -46.5]);// Wide framing Cat-Bee melayang & Mesin Merah

  param(cam, "shake", 54, 55, 1);  param(cam, "shake", 63, 66, 0);

  param(env, "alarm", 53.5, 55, 1);  param(env, "alarm", 65, 68, 0);
  set(env, "power", 0, 1);  set(env, "power", 53.9, 1);
  flicker(env, "power", 54, 64, 0.3, 1, 0.15);
  param(env, "power", 65, 66, 1);  
  param(env, "power", 94, 100, 0);
  param(env, "power", 104, 106, 1); // Listrik menyala kembali tepat saat tiba di depan Bunzo

  set(charB, "pos", 0, [-2.2, 0, 16]);  set(charB, "rotY", 0, 180);
  moveTo(charB, 5, 17, [-2.2, 0, -6]);
  turnTo(charB, 18, 20, 90);  turnTo(charB, 30, 32, 180);
  scaleTo(charB, 48, 52, 0.85);  scaleTo(charB, 52, 54, 1);
  pulse(charB, "wave", 48, 50, 53, 54);
  turnTo(charB, 54, 55.5, 0);  moveTo(charB, 54.5, 63, [-2.2, 0, 16], ease.linear);

  set(charC, "pos", 0, [2.2, 0, 16]);  set(charC, "rotY", 0, 180);
  moveTo(charC, 7, 19, [2.2, 0, -6]);
  turnTo(charC, 20, 22, 270);  turnTo(charC, 30, 32, 180);
  scaleTo(charC, 47, 51, 0.8);  scaleTo(charC, 51, 54.2, 1);
  turnTo(charC, 54.5, 56, 360);  moveTo(charC, 55, 63.5, [2.2, 0, 16], ease.linear);

  set(huggy, "pos", 0, [0, 0, -37]);
  moveTo(huggy, 27, 30.5, [0, 0, -33.2]);
  moveTo(huggy, 30.5, 48, [0, 0, -11]);
  pulse(huggy, "wave", 46, 48, 53, 55);
  moveTo(huggy, 54, 57, [0, 0, -7.5], ease.out);
  scaleTo(huggy, 54, 57, 1.3);  scaleTo(huggy, 66, 70, 1);
  pulse(huggy, "scare", 54, 56, 63, 67);
  pulse(huggy, "wave", 72, 74, 79, 80.5);
  turnTo(huggy, 80, 82, 180);  moveTo(huggy, 82, 90, [0, 0, -37]);
}

// ==========================================
// 3. MAIN RENDER LOOP & INTI LOGIKA
// ==========================================
const canvas = document.getElementById("glcanvas");
const { GL, prog, locs, uP, uV, uCam, uLP, uLC } = createRenderer(canvas);

// Inisialisasi Program Shader Bunzo Bunny (Lorong Kiri)
const bunzoProg = GL.createProgram();
GL.attachShader(bunzoProg, compile(GL, GL.VERTEX_SHADER, VS));
GL.attachShader(bunzoProg, compile(GL, GL.FRAGMENT_SHADER, FS));
GL.linkProgram(bunzoProg);
if (!GL.getProgramParameter(bunzoProg, GL.LINK_STATUS)) throw new Error(GL.getProgramInfoLog(bunzoProg));

const aPosBunzo = GL.getAttribLocation(bunzoProg, "aPos");
const aNorBunzo = GL.getAttribLocation(bunzoProg, "aNor");
const UBunzo = {};
["uModel", "uView", "uProj", "uNormalMat", "uColor", "uColor2", "uEye", "uMode", "uShine", "uSpec", "uFreq", "uAlpha"].forEach(
  (n) => (UBunzo[n] = GL.getUniformLocation(bunzoProg, n))
);

const bunzoChar = new BunzoCharacter(GL, UBunzo, aPosBunzo, aNorBunzo);

const G_Bunzo = {
  sphere: upload(GL, meshEllipsoid()),
  cyl: upload(GL, meshCylinder()),
  coneHat: upload(GL, meshCone(0.1)),
  cone: upload(GL, meshCone(0)),
  box: upload(GL, meshBox()),
  wall: upload(GL, meshWall()),
  shaft: upload(GL, meshOpenCylinder()),
};

// Inisialisasi Program Shader Cat-Bee (Lorong Kanan)
const catbeeProg = GL.createProgram();
GL.attachShader(catbeeProg, compile(GL, GL.VERTEX_SHADER, VS_CATBEE));
GL.attachShader(catbeeProg, compile(GL, GL.FRAGMENT_SHADER, FS_CATBEE));
GL.linkProgram(catbeeProg);
if (!GL.getProgramParameter(catbeeProg, GL.LINK_STATUS)) throw new Error(GL.getProgramInfoLog(catbeeProg));

const uViewCatbee = GL.getUniformLocation(catbeeProg, "uView");
const uProjCatbee = GL.getUniformLocation(catbeeProg, "uProj");
const uCamCatbee = GL.getUniformLocation(catbeeProg, "uCam");

const catBeeChar = new CatBee(GL);
const catbeeEnv = new CatbeeEnvironment(GL);

const ctx = { GL, prog, locs };
const scene = new MyObject(GL, prog, locs);

const env = new Environment(ctx).attachTo(scene);
const huggy = new Huggy(ctx, { name: "Huggy" }).attachTo(scene);
const charB = new Dummy(ctx, { name: "Karakter 2", color: [0.20, 0.55, 0.85] }).attachTo(scene);
const charC = new Dummy(ctx, { name: "Karakter 3", color: [0.85, 0.30, 0.45] }).attachTo(scene);
const actors = [huggy, charB, charC];

const cam = new Animated();
buildStory({ env, huggy, charB, charC, cam });
scene.setup();

const capEl = document.getElementById("caption");
let T = parseFloat(new URLSearchParams(location.search).get("t")) || 0;
let playing = true, last = null, free = false, drag = false, lx = 0, ly = 0;
const keys = new Set();
const fc = { pos: [0, 3.7, 7.5], yaw: 0, pitch: 0 };
const fwdOf = () => [Math.sin(fc.yaw) * Math.cos(fc.pitch), Math.sin(fc.pitch), -Math.cos(fc.yaw) * Math.cos(fc.pitch)];
let curEye = [0, 4, 8], curTarget = [0, 3, -8];
const statusEl = document.getElementById("camstatus");

window.addEventListener("keydown", e => {
  keys.add(e.code);
  if (e.repeat && (e.code === "KeyF" || e.code === "Space")) return;
  if (e.code === "Space") { playing = !playing; e.preventDefault(); }
  else if (e.code === "ArrowRight") T = Math.min(DURATION, T + 5);
  else if (e.code === "ArrowLeft") T = Math.max(0, T - 5);
  else if (e.code === "KeyR") T = 0;
  else if (e.code === "KeyF") {
    free = !free;
    if (free) {
      fc.pos = curEye.slice();
      const d = [curTarget[0] - curEye[0], curTarget[1] - curEye[1], curTarget[2] - curEye[2]], l = Math.hypot(...d);
      fc.yaw = Math.atan2(d[0], -d[2]); fc.pitch = Math.asin(d[1] / l);
    }
  }
});
window.addEventListener("keyup", e => keys.delete(e.code));
window.addEventListener("blur", () => { keys.clear(); drag = false; });
canvas.addEventListener("mousedown", e => { drag = true; lx = e.clientX; ly = e.clientY; });
window.addEventListener("mouseup", () => drag = false);
window.addEventListener("mousemove", e => {
  if (!drag || !free) return;
  fc.yaw += (e.clientX - lx) * 0.004;
  fc.pitch = Math.max(-1.5, Math.min(1.5, fc.pitch - (e.clientY - ly) * 0.004));
  lx = e.clientX; ly = e.clientY;
});
canvas.addEventListener("wheel", e => {
  e.preventDefault();
  if (free) { const f = fwdOf(); fc.pos = fc.pos.map((v, i) => v - f[i] * e.deltaY * 0.01); }
}, { passive: false });
canvas.addEventListener("dblclick", () => { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen(); });

let Pm;
function resize() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
  Pm = LIBS.get_projection(48, canvas.width / canvas.height, 0.1, 120);
}
window.addEventListener("resize", resize);
resize();

GL.enable(GL.DEPTH_TEST);
GL.clearColor(0.02, 0.03, 0.05, 1);

/* ---------- EFEK SUARA (WEB AUDIO SYNTHESIZER) ---------- */
let audioCtx = null;
function beep(freq, dur, type = "sine", vol = 0.12) {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === "suspended") audioCtx.resume();
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + dur);
    o.connect(g); g.connect(audioCtx.destination);
    o.start(); o.stop(audioCtx.currentTime + dur);
  } catch (e) {}
}

/* ---------- LOGIKA DAN RENDER MAP MUSICAL MEMORY (BUNZO) ---------- */
const A_BUNZO = 6.93;
const PLAT = { r: 2.4, top: 2.42 };
const SCR_Y = 4.9;
const ringTube = (R, y, rw, rt) =>
  upload(GL, makeTube(bezierCircle(14).map((p) => [p[0] * R, y, p[1] * R]), () => [rw, rt], [0, 1, 0], 14));
const machRingLow = ringTube(2.4, 7.4, 0.95, 0.3);
const machRingTop = ringTube(2.4, 9.6, 0.95, 0.1);
const platRing = ringTube(2.4, 2.45, 0.07, 0.05);

const BTN = [
  { word: "YELLOW", col: [1.0, 0.9, 0.05], a: -0.72 },
  { word: "BLUE", col: [0.1, 0.62, 1.0], a: -0.25 },
  { word: "GREEN", col: [0.15, 0.85, 0.2], a: 0.25 },
  { word: "RED", col: [0.92, 0.12, 0.1], a: 0.72 },
];
const METAL = [0.3, 0.32, 0.36], DARK = [0.07, 0.07, 0.09];
const hash = (i) => { const v = Math.sin(i * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };

const wallFrame = (deg) => {
  const phi = (deg * Math.PI) / 180;
  return M4.mul(M4.translate(Math.sin(phi) * A_BUNZO, 0, Math.cos(phi) * A_BUNZO), M4.rotY(phi + Math.PI));
};

let rootBunzo = M4.identity();
function drawBunzoGeom(geom, local, color, o) {
  o = o || {};
  const model = M4.mul(rootBunzo, local);
  GL.uniformMatrix4fv(UBunzo.uModel, false, model);
  GL.uniformMatrix3fv(UBunzo.uNormalMat, false, M4.normalMat(model));
  GL.uniform3fv(UBunzo.uColor, color);
  GL.uniform3fv(UBunzo.uColor2, o.color2 || color);
  GL.uniform1f(UBunzo.uMode, o.mode || 0);
  GL.uniform1f(UBunzo.uFreq, 1);
  GL.uniform1f(UBunzo.uAlpha, 1);
  GL.uniform1f(UBunzo.uShine, o.shine || 24);
  GL.uniform1f(UBunzo.uSpec, o.spec === undefined ? 0.1 : o.spec);
  GL.bindBuffer(GL.ARRAY_BUFFER, geom.pos);
  GL.vertexAttribPointer(aPosBunzo, 3, GL.FLOAT, false, 0, 0);
  GL.bindBuffer(GL.ARRAY_BUFFER, geom.nor);
  GL.vertexAttribPointer(aNorBunzo, 3, GL.FLOAT, false, 0, 0);
  GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, geom.idx);
  if (o.cull) GL.enable(GL.CULL_FACE);
  GL.drawElements(GL.TRIANGLES, geom.count, GL.UNSIGNED_SHORT, 0);
  if (o.cull) GL.disable(GL.CULL_FACE);
}

const ellB = (p, r, col, rot, o) => drawBunzoGeom(G_Bunzo.sphere, xf(p, r, rot), col, o);
const cylB = (p, r, col, rot, o) => drawBunzoGeom(G_Bunzo.cyl, xf(p, r, rot), col, o);
const boxB = (p, r, col, rot, o) => drawBunzoGeom(G_Bunzo.box, xf(p, r, rot), col, o);
const stillB = M4.identity();

function tileGrid(frameM, cx, cy, cols, rows, tile, pitch, color) {
  rootBunzo = M4.mul(M4.translate(BRANCH_X.left, 0, -48), frameM);
  boxB([cx, cy, -0.02], [cols * pitch + 0.16, rows * pitch + 0.16, 0.2], [0.05, 0.05, 0.06], null, { spec: 0.1 });
  
  const powerLeft = Math.max(0, Math.min(1, (T - 105) / 3));
  if (powerLeft <= 0) return;

  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const x = cx + (c - (cols - 1) / 2) * pitch, y = cy + ((rows - 1) / 2 - r) * pitch;
      const tone = (0.9 + 0.1 * Math.sin(r * 12.9 + c * 7.7)) * powerLeft;
      boxB([x, y, 0.07], [tile, tile, 0.1], [color[0] * tone, color[1] * tone, color[2] * tone], null, { mode: 5 });
    }
}

function drawWord(frameM, word, cy, px) {
  const powerLeft = Math.max(0, Math.min(1, (T - 105) / 3));
  if (powerLeft <= 0) return;

  rootBunzo = M4.mul(M4.translate(BRANCH_X.left, 0, -48), frameM);
  const w = word.length * 4 - 1;
  word.split("").forEach((ch, li) => {
    const g = FONT[ch];
    if (!g) return;
    for (let r = 0; r < 5; r++)
      for (let c = 0; c < 3; c++)
        if (g[r][c] === "X") {
          const x = (li * 4 + c - (w - 1) / 2) * px, y = cy + (2 - r) * px;
          boxB([x, y, 0.14], [px * 0.92, px * 0.92, 0.04], [0.22 * powerLeft, 0.17 * powerLeft, 0.04 * powerLeft], null, { spec: 0.02 });
        }
  });
}

const BTN_POS = BTN.map((b) => [4.3 * Math.sin(b.a), 3.05, -4.3 * Math.cos(b.a)]);
const SEQ_ALL = [0, 2, 1, 3, 0, 1, 3, 2, 0, 3, 1, 2];
const PLAN = ["ok", "ok", "err", "ok", "err", "err"];
const Y_START = 5.4, Y_MAX = 5.8, SLOW_DESCENT = 0.15, DROP_SPEED = 1.1, DROP_TIME = 2.2, RISE = 1.4;
const FREQ = [262, 330, 392, 494];
const HAND_IDLE = [[-1.5, 2.95, 1.9], [1.5, 2.95, 1.9]];
const BLANK = { word: "", col: [1.0, 0.9, 0.05], dim: 0.25 };
const game = {
  phase: "wait", t: 0, round: 1, attempt: 0, step: -1, seq: [], failAt: -1, wrong: false,
  y: Y_START, vy: 0, age: 0, intro: 0.001, lunge: 0, rise: 0, drop: 0, shake: 0, party: 0, clapT: 9, k: 0, sway: 0, screenHold: 0, flash: 0,
  btn: BTN.map(() => ({ glow: 0, hold: 0, press: 0 })),
  screen: Object.assign({}, BLANK),
  hands: HAND_IDLE.map((p) => ({ pos: p.slice(), rx: 0, tp: p.slice(), tr: 0 })),
};

const seqLen = () => Math.min(SEQ_ALL.length, game.round + 2);
const setScreen = (word, col, dim, hold) => { game.screen = { word, col, dim, pop: 1 }; game.screenHold = hold || 0; };
const blank = () => { game.screen = Object.assign({}, BLANK); };
const light = (i, hold) => { game.btn[i].glow = 1; game.btn[i].hold = hold; };

function resetGame() {
  Object.assign(game, { phase: "wait", t: 0, round: 1, attempt: 0, step: -1, y: Y_START, vy: 0, lunge: 0, rise: 0, drop: 0, shake: 0, party: 0, wrong: false, flash: 0 });
  blank();
}
function startAttempt() {
  game.phase = "show"; game.t = 0; game.step = -1; game.wrong = false;
  game.seq = SEQ_ALL.slice(0, seqLen());
  game.failAt = PLAN[game.attempt % PLAN.length] === "err" ? Math.min(seqLen() - 1, 1 + (game.attempt % 2)) : -1;
  blank();
}
function finishInput(ok) {
  game.phase = "result"; game.t = 0; game.attempt++;
  if (ok) {
    setScreen("", [0.15, 0.9, 0.25], 1, 0.9); game.flash = 0.9;
    game.rise += RISE; game.round++; game.party = 1.2;
    beep(523, 0.18); setTimeout(() => beep(659, 0.25), 150);
  } else {
    setScreen("", [0.95, 0.12, 0.1], 1, 0.9); game.flash = 0.9;
    game.drop = DROP_TIME; game.shake = 1;
    beep(110, 0.5, "sawtooth", 0.1);
  }
}
function aimHand(h, i, zoff) {
  const p = BTN_POS[i];
  game.hands[h].tp = [p[0], p[1] - 0.25, p[2] + zoff];
  game.hands[h].tr = -1.35;
}
function idleHands(except) {
  game.hands.forEach((h, i) => { if (i !== except) { h.tp = HAND_IDLE[i].slice(); h.tr = 0; } });
}

function updateGame(dt, t) {
  const g = game;

  if (T < 105) {
    g.phase = "wait";
    g.t = 0;
    g.age = 0;
    g.y = Y_START;
    g.vy = 0;
    g.drop = 0;
    g.rise = 0;
    g.shake = 0;
    g.lunge = 0;
    blank();
    return;
  }

  g.t += dt; g.clapT += dt; g.age += dt;
  g.intro = Math.max(0.001, easeOutBack(Math.min(1, g.age / 1.6)));
  if (g.screen.pop) g.screen.pop = Math.max(0, g.screen.pop - dt * 4);
  g.btn.forEach((b) => {
    b.hold -= dt;
    if (b.hold <= 0) b.glow = Math.max(0, b.glow - dt * 4);
    b.press = Math.max(0, b.press - dt * 5);
  });
  if (g.screenHold > 0) { g.screenHold -= dt; if (g.screenHold <= 0 && g.phase !== "gameover") blank(); }
  if (g.party > 0) { g.party -= dt; if (g.clapT > 0.45) g.clapT = 0; }
  g.shake = Math.max(0, g.shake - dt * 0.45);
  let active = -1;

  switch (g.phase) {
    case "wait":
      if (g.t > 2.0) startAttempt();
      break;
    case "show": {
      const n = seqLen(), S = 1.1, idx = Math.floor(g.t / S);
      if (idx !== g.step && idx < n) {
        g.step = idx;
        const i = g.seq[idx];
        light(i, 0.7);
        setScreen(BTN[i].word, BTN[i].col, 1, 0.7);
        g.clapT = 0;
        beep(FREQ[i], 0.4);
      }
      if (g.t >= n * S + 0.6) { g.phase = "input"; g.t = 0; g.step = -1; blank(); }
      break;
    }
    case "input": {
      const n = seqLen(), P = 1.4, idx = Math.floor(g.t / P), lt = g.t - idx * P;
      if (idx >= n) { finishInput(true); break; }
      const want = g.seq[idx];
      const chosen = idx === g.failAt ? (want + 1) % 4 : want;
      active = chosen < 2 ? 0 : 1;
      if (lt < 0.6) aimHand(active, chosen, 1.4);
      else if (lt < 0.95) aimHand(active, chosen, 0.88);
      else { game.hands[active].tp = HAND_IDLE[active].slice(); game.hands[active].tr = 0; }
      if (idx !== g.step && lt >= 0.6) {
        g.step = idx;
        light(chosen, 0.5); g.btn[chosen].press = 1;
        setScreen(BTN[chosen].word, BTN[chosen].col, 1, 0.5);
        beep(FREQ[chosen], 0.3);
        if (chosen !== want) g.wrong = true;
      }
      if (g.wrong && lt >= 0.95) finishInput(false);
      break;
    }
    case "result":
      if (g.t > (g.drop > 0 ? 3.2 : 2.6)) { g.phase = "wait"; g.t = 0.6; }
      break;
    case "gameover": {
      const on = Math.sin(t * 26) > 0;
      setScreen("", [0.95, 0.1, 0.08], on ? 1 : 0.15, 0);
      g.shake = 1;
      if (g.t > 15.0) { g.phase = "reset"; g.t = 0; blank(); }
      break;
    }
    case "reset":
      if (g.y >= Y_START - 0.05 && g.t > 2.0) resetGame();
      break;
  }
  idleHands(active);

  g.hands.forEach((h) => {
    const f = Math.min(1, dt * 9);
    for (let i = 0; i < 3; i++) h.pos[i] += (h.tp[i] - h.pos[i]) * f;
    h.rx += (h.tr - h.rx) * f;
  });

  g.lunge = g.phase === "gameover" ? easeOutCubic(Math.min(1, g.t / 0.35)) : Math.max(0, g.lunge - dt * 1.5);

  if (g.phase === "gameover") { g.y = PLAT.top; g.vy = 0; }
  else {
    let desired;
    if (g.phase === "reset") desired = Math.min(2.2, (Y_START - g.y) * 2.5);
    else if (g.drop > 0) desired = -DROP_SPEED;
    else desired = (g.rise > 0 ? Math.min(1.2, 0.15 + g.rise * 3) : 0) - SLOW_DESCENT;
    g.vy += (desired - g.vy) * Math.min(1, dt * 4);
    g.y += g.vy * dt;
    if (g.drop > 0) g.drop -= dt;
    if (g.vy > 0 && g.phase !== "reset") g.rise = Math.max(0, g.rise - g.vy * dt);
    if (g.phase === "reset") g.y = Math.min(Y_START, g.y);
    else {
      g.y = Math.min(Y_MAX, Math.max(PLAT.top, g.y));
      if (g.y <= PLAT.top + 0.03) {
        g.phase = "gameover"; g.t = 0; g.drop = 0; g.rise = 0; g.shake = 1;
        beep(80, 0.8, "sawtooth", 0.15);
      }
    }
  }

  g.k = g.phase === "gameover" ? 0.5 + 0.5 * Math.sin(t * 18) : (g.clapT < 0.4 ? Math.sin((Math.PI * g.clapT) / 0.4) : 0);
  g.sway = 0.07 * Math.sin(t * 1.4) + g.shake * 0.12 * Math.sin(t * 15);
}

function drawBunzoMap() {
  rootBunzo = M4.translate(BRANCH_X.left, 0, -48);

  cylB([0, -0.12, 0], [9.4, 0.24, 9.4], [0.09, 0.09, 0.11], null, { spec: 0.15 });
  cylB([0, 0.0, 0], [8.05, 0.02, 8.05], [0.13, 0.13, 0.16], null, { spec: 0.2, shine: 40 });

  const scr = game.screen;
  tileGrid(wallFrame(180), 0, SCR_Y, 5, 5, 0.62, 0.74, scr.col.map((v) => v * scr.dim));
  if (scr.word) drawWord(wallFrame(180), scr.word, SCR_Y, 0.085 * (1 + 0.3 * (scr.pop || 0)));

  rootBunzo = M4.translate(BRANCH_X.left, 0, -48);

  cylB([0, 1.15, 0], [PLAT.r, 2.3, PLAT.r], [0.07, 0.07, 0.09], null, { spec: 0.3, shine: 40 });
  cylB([0, 0.12, 0], [PLAT.r + 0.3, 0.24, PLAT.r + 0.3], [0.16, 0.16, 0.19], null, { spec: 0.3 });
  cylB([0, 2.36, 0], [PLAT.r + 0.05, 0.12, PLAT.r + 0.05], [0.9, 0.87, 0.72], null, { spec: 0.1 });
  drawBunzoGeom(platRing, stillB, [0.28, 0.29, 0.33], { spec: 0.5, shine: 50 });

  const target = [0, 3.4, 2.0];
  BTN.forEach((b, bi) => {
    const g = game.btn[bi];
    const x = 4.3 * Math.sin(b.a), z = -4.3 * Math.cos(b.a), y = 3.05;
    const p = [x, y, z], n = vnorm(vsub(target, p));
    const lit = 0.32 + 0.68 * g.glow;
    const face = b.col.map((v) => Math.min(1, v * lit + g.glow * 0.3));
    const pp = vadd(p, vmul(n, -0.09 * g.press));
    cylB([x, 1.5, z], [0.07, 2.8, 0.07], METAL, null, { spec: 0.4 });
    cylB([x, 0.1, z], [0.5, 0.2, 0.5], DARK, null, { spec: 0.3 });
    drawBunzoGeom(G_Bunzo.cyl, limbMatrix(vsub(p, vmul(n, 0.17)), vadd(p, vmul(n, 0.17)), 0.56, 0.56), DARK, { spec: 0.4 });
    drawBunzoGeom(G_Bunzo.cyl, limbMatrix(vadd(p, vmul(n, 0.12)), vadd(p, vmul(n, 0.2)), 0.6, 0.6), METAL, { spec: 0.6, shine: 50 });
    drawBunzoGeom(G_Bunzo.cyl, limbMatrix(vadd(pp, vmul(n, 0.19)), vadd(pp, vmul(n, 0.215)), 0.44 * (1 + 0.16 * g.glow + 0.12 * g.press), 0.44 * (1 + 0.16 * g.glow + 0.12 * g.press)), face, { mode: 5 });
    const tg = vnorm(vcross([0, 1, 0], n));
    [-1, 1].forEach((s) => ellB(vadd(p, vmul(tg, 0.6 * s)), [0.1, 0.1, 0.1], METAL, null, { spec: 0.5 }));
  });

  drawBunzoGeom(machRingLow, stillB, METAL, { spec: 0.5, shine: 40 });
  drawBunzoGeom(machRingTop, stillB, METAL, { spec: 0.5, shine: 40 });
  drawBunzoGeom(G_Bunzo.shaft, xf([0, 8.5, 0], [3.35, 2.2, 3.35]), [0.2, 0.21, 0.25], { spec: 0.4 });
  drawBunzoGeom(G_Bunzo.shaft, xf([0, 10.0, 0], [1.45, 5.6, 1.45]), [0.1, 0.11, 0.13], { spec: 0.2 });
  for (let i = 0; i < 7; i++) {
    const ang = (i / 7) * Math.PI * 2 + 0.3, d = [Math.sin(ang), 0, Math.cos(ang)];
    const p0 = [d[0] * 3.2, 8.5, d[2] * 3.2], p1 = [d[0] * 4.0, 8.5, d[2] * 4.0];
    drawBunzoGeom(G_Bunzo.cyl, limbMatrix(p0, p1, 0.55, 0.55), [0.04, 0.04, 0.05], { spec: 0.5, shine: 50 });
    drawBunzoGeom(G_Bunzo.cyl, limbMatrix(vsub(p1, vmul(d, 0.05)), vadd(p1, vmul(d, 0.05)), 0.64, 0.64), METAL, { spec: 0.6 });
    cylB([d[0] * 3.45, 9.1, d[2] * 3.45], [0.09, 1.8, 0.09], METAL, null, { spec: 0.4 });
    for (let k = 0; k < 3; k++) {
      const a2 = ang + (k - 1) * 0.18;
      ellB([Math.sin(a2) * 3.0, 9.72, Math.cos(a2) * 3.0], [0.1, 0.07, 0.1], METAL, null, { spec: 0.5 });
    }
  }

  for (let i = 0; i < 26; i++) {
    const a = hash(i) * Math.PI * 2, r = 3.1 + hash(i + 40) * 3.6;
    const x = Math.sin(a) * r, z = Math.cos(a) * r, s = 0.12 + hash(i + 80) * 0.3;
    if (Math.hypot(x - 2.8, z + 3.2) < 0.9 || Math.hypot(x + 2.8, z + 3.2) < 0.9 || Math.hypot(x - 1.07, z + 4.16) < 0.9 || Math.hypot(x + 1.07, z + 4.16) < 0.9) continue;
    const rot = [hash(i + 5) * 3, hash(i + 9) * 3, hash(i + 13) * 3];
    if (i % 3 === 0) boxB([x, s * 0.4, z], [s * 1.6, s * 0.6, s], METAL, rot, { spec: 0.3 });
    else if (i % 3 === 1) cylB([x, s * 0.5, z], [s * 0.7, s * 0.9, s * 0.7], [0.18, 0.19, 0.22], [Math.PI / 2 * hash(i), 0, rot[2]], { spec: 0.3 });
    else ellB([x, s * 0.4, z], [s, s * 0.5, s * 0.8], [0.14, 0.14, 0.17], rot, { spec: 0.2 });
  }
}

function drawBunzoHands() {
  rootBunzo = M4.translate(BRANCH_X.left, 0, -48);
  game.hands.forEach((h, i) => {
    const glove = i === 0 ? [0.1, 0.22, 0.85] : [0.1, 0.55, 0.2], side = i === 0 ? 1 : -1;
    const yAxis = [0, Math.cos(h.rx), Math.sin(h.rx)];
    const wrist = vsub(h.pos, vmul(yAxis, 0.5));
    rootBunzo = M4.translate(BRANCH_X.left, 0, -48);
    drawBunzoGeom(G_Bunzo.cyl, limbMatrix(wrist, [h.pos[0] * 0.6, 2.0, 5.2], 0.15, 0.15), [0.95, 0.8, 0.1], { spec: 0.3 });
    rootBunzo = M4.mul(M4.translate(BRANCH_X.left + h.pos[0], h.pos[1], -48 + h.pos[2]), M4.rotX(h.rx));
    ellB([0, 0, 0], [0.3, 0.34, 0.11], glove, null, { spec: 0.3 });
    [[-0.19, 0.34], [-0.065, 0.44], [0.065, 0.46], [0.19, 0.4]].forEach(([x, len]) => {
      drawBunzoGeom(G_Bunzo.cyl, limbMatrix([x, 0.25, 0], [x, 0.25 + len, 0], 0.062, 0.062), glove, { spec: 0.3 });
      ellB([x, 0.25 + len, 0], [0.062, 0.062, 0.062], glove, null, { spec: 0.3 });
    });
    drawBunzoGeom(G_Bunzo.cyl, limbMatrix([0.26 * side, -0.05, 0], [0.5 * side, 0.28, 0], 0.07, 0.07), glove, { spec: 0.3 });
    ellB([0.5 * side, 0.28, 0], [0.07, 0.07, 0.07], glove, null, { spec: 0.3 });
  });
  rootBunzo = M4.identity();
}

let catAngle = 0;
function frame(ms) {
  const real = last === null ? 0 : Math.min(0.05, (ms - last) / 1000);
  last = ms;
  const dt = playing ? real : 0;
  T = Math.min(DURATION, T + dt);

  // Transisi Otomatis ke Kamera Bebas setelah Tur Sinematik Selesai pada detik 170
  if (T >= DURATION && !free) {
    free = true;
    fc.pos = curEye.slice();
    const d = [curTarget[0] - curEye[0], curTarget[1] - curEye[1], curTarget[2] - curEye[2]], l = Math.hypot(...d);
    fc.yaw = Math.atan2(d[0], -d[2]);
    fc.pitch = Math.asin(d[1] / l);
  }

  env.update(T, dt);
  actors.forEach(a => a.update(T, dt));
  cam.sample(T);

  const c = cam.params;
  let eye = c.eye.slice(), target = c.target;
  eye[0] += Math.sin(T * 47) * 0.06 * c.shake; eye[1] += Math.sin(T * 53) * 0.05 * c.shake; eye[2] += Math.sin(T * 41) * 0.05 * c.shake;
  curEye = eye.slice(); curTarget = target.slice();
  if (free) {
    const f = fwdOf(), r = [Math.cos(fc.yaw), 0, Math.sin(fc.yaw)];
    const sp = (keys.has("ShiftLeft") || keys.has("ShiftRight") ? 24 : 8) * real;
    const mv = (v, k) => { for (let i = 0; i < 3; i++) fc.pos[i] += v[i] * k; };
    if (keys.has("KeyW")) mv(f, sp);
    if (keys.has("KeyS")) mv(f, -sp);
    if (keys.has("KeyD")) mv(r, sp);
    if (keys.has("KeyA")) mv(r, -sp);
    if (keys.has("KeyE")) fc.pos[1] += sp;
    if (keys.has("KeyQ")) fc.pos[1] -= sp;
    eye = fc.pos.slice();
    target = [eye[0] + f[0], eye[1] + f[1], eye[2] + f[2]];
  }
  const V = LIBS.lookAt(eye, target, [0, 1, 0]);
  const L = env.lights();

  GL.viewport(0, 0, canvas.width, canvas.height);
  GL.clear(GL.COLOR_BUFFER_BIT | GL.DEPTH_BUFFER_BIT);

  // 1. Render Map Utama, Huggy Wuggy, dan Karakter Tengah
  GL.useProgram(prog);
  GL.uniformMatrix4fv(uP, false, new Float32Array(Pm));
  GL.uniformMatrix4fv(uV, false, new Float32Array(V));
  GL.uniform3fv(uCam, eye);
  GL.uniform3fv(uLP, new Float32Array(L.pos));
  GL.uniform3fv(uLC, new Float32Array(L.col));
  scene.render(LIBS.get_I4());

  // 2. Render Bunzo Bunny di Lorong Kiri (X: -10, Z: -48)
  // Geometri tetap di-render dari detik 96 (gelap saat kamera bergerak), dan baru menyala di detik 105
  if (T >= 96) {
    GL.useProgram(bunzoProg);
    GL.uniformMatrix4fv(UBunzo.uView, false, new Float32Array(V));
    GL.uniformMatrix4fv(UBunzo.uProj, false, new Float32Array(Pm));
    GL.uniform3fv(UBunzo.uEye, eye);

    updateGame(real, ms / 1000);
    drawBunzoMap();
    drawBunzoHands();

    bunzoChar.drawBunzo(ms / 1000, {
      x: BRANCH_X.left,
      y: game.y,
      z: -48 + 0.7,
      s: 0.5,
      base: false,
      cable: true,
      k: game.k,
      sway: game.sway,
      shake: game.shake,
      lunge: game.lunge,
      intro: game.intro,
    }, { clap: false, auto: true }, game);
  }

  // 3. Render Cat-Bee di Lorong Kanan (X: 10, Z: -46.5)
  if (T >= 130) {
    GL.useProgram(catbeeProg);
    GL.uniformMatrix4fv(uProjCatbee, false, new Float32Array(Pm));
    GL.uniformMatrix4fv(uViewCatbee, false, new Float32Array(V));
    GL.uniform3fv(uCamCatbee, eye);

    catbeeEnv.update(ms / 1000);
    const mRightBranch = LIBS.translate(BRANCH_X.right, 0, -46.5);
    catbeeEnv.draw(GL, catbeeProg, mRightBranch);

    catBeeChar.update(ms / 1000, dt, playing, 1.0);
    catAngle += dt * 0.7 * catBeeChar.speed;
    const Radius = 1.4;

    let mCat = LIBS.multiply(mRightBranch, LIBS.translate(Radius * Math.sin(catAngle), 0, Radius * Math.cos(catAngle)));
    const angleDeg = (catAngle * 180 / Math.PI) + 90;
    mCat = LIBS.multiply(mCat, LIBS.rotateY(angleDeg));
    mCat = LIBS.multiply(mCat, LIBS.scale(1.35, 1.35, 1.35));

    catBeeChar.draw(GL, catbeeProg, mCat);
  }

  const cap = captions.find(x => T >= x[0] && T < x[1]) || captions[captions.length - 1];
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);