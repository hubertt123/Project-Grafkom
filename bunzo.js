"use strict";

import {
  vsub, vadd, vmul, vdot, vcross, vlen, vnorm, smooth,
  M4, alignRot, rotVec, xfPoint, easeOutBack, easeOutCubic, xf, limbMatrix,
  meshEllipsoid, meshCylinder, meshCone,
  bez, sampleBez, bezierCircle, catmull, makeTube,
  upload, COL, mix
} from "./libsbunzo.js";

/* =====================================================================
   BUNZO.JS - Modul Pembentuk Karakter Bunzo Bunny
   ===================================================================== */

export class BunzoCharacter {
  constructor(gl, U, aPos, aNor) {
    this.gl = gl;
    this.U = U;
    this.aPos = aPos;
    this.aNor = aNor;

    this.root = M4.identity();
    this.stack = [];

    this.initGeom();
  }

  initGeom() {
    const gl = this.gl;

    this.G = {
      sphere: upload(gl, meshEllipsoid()),
      cyl: upload(gl, meshCylinder()),
      coneHat: upload(gl, meshCone(0.1)),
      cone: upload(gl, meshCone(0)),
    };

    this.HEAD = { c: [0, 3.03, 0], r: [0.66, 0.6, 0.52] };
    this.TORSO = { c: [0, 2.16, 0], r: [0.4, 0.49, 0.32] };
    this.MOUTH = { cy: 3.046 };

    this.headZ = (x, y) =>
      this.HEAD.r[2] * Math.sqrt(Math.max(0, 1 - (x / this.HEAD.r[0]) ** 2 - ((y - this.HEAD.c[1]) / this.HEAD.r[1]) ** 2));

    this.surfRot = (c, r, p) => {
      const n = vnorm([(p[0] - c[0]) / r[0] ** 2, (p[1] - c[1]) / r[1] ** 2, (p[2] - c[2]) / r[2] ** 2]);
      return { n, rx: -Math.asin(n[1]), ry: Math.atan2(n[0], n[2]) };
    };

    const earCtrl = (s) => [
      [0.42 * s, 3.42, -0.22],
      [0.78 * s, 3.62, -0.22],
      [0.82 * s, 2.45, -0.2],
      [0.62 * s, 1.76, -0.16],
    ];
    const earRound = (u, from) =>
      u > from ? Math.sqrt(Math.max(0, 1 - ((u - from) / (1 - from)) ** 2)) : 1;

    this.ears = [-1, 1].map((s) => {
      const outer = makeTube(
        sampleBez(earCtrl(s), 48),
        (u) => {
          const r = earRound(u, 0.8);
          const fullness = smooth(0, 0.48, u);
          return [(0.17 + 0.13 * fullness) * r, (0.08 + 0.055 * fullness) * r + 0.002];
        },
        [0, 0, 1],
        20
      );
      const innerPts = sampleBez(earCtrl(s), 44, 0.12, 0.92).map((p, i) => {
        const u = 0.12 + 0.8 * (i / 44);
        const outerDepth = (0.08 + 0.055 * smooth(0, 0.48, u)) * earRound(u, 0.8) + 0.002;
        return [p[0], p[1], p[2] + outerDepth + 0.004];
      });
      const inner = makeTube(
        innerPts,
        (u) => {
          const earU = 0.12 + 0.8 * u;
          const r = earRound(earU, 0.8);
          return [(0.105 + 0.075 * smooth(0, 0.48, earU)) * r, 0.032 * r + 0.002];
        },
        [0, 0, 1],
        14
      );
      return { s, outer: upload(gl, outer), inner: upload(gl, inner), base: earCtrl(s)[0] };
    });

    const torsoZ = (x, y) =>
      this.TORSO.r[2] * Math.sqrt(Math.max(0, 1 - (x / this.TORSO.r[0]) ** 2 - ((y - this.TORSO.c[1]) / this.TORSO.r[1]) ** 2));
    this.torsoZ = torsoZ;

    this.straps = [-1, 1].map((s) => {
      const front = [[0.22, 1.92, torsoZ(0.22, 1.92) + 0.04]].concat(
        [[0.25, 2.06], [0.25, 2.3], [0.21, 2.5]].map((p) => [p[0], p[1], torsoZ(p[0], p[1]) + 0.04])
      );
      const back = [[0.21, 2.5], [0.23, 2.25], [0.22, 2.05]].map((p) => [p[0], p[1], -(torsoZ(p[0], p[1]) + 0.04)]);
      const P = front.concat([[0.18, 2.58, 0]], back, [[0.22, 1.92, -0.3]]).map((p) => [p[0] * s, p[1], p[2]]);
      return upload(gl, makeTube(catmull(P, 10), () => [0.022, 0.06], [1, 0, 0], 12));
    });

    this.ringGeom = upload(
      gl,
      makeTube(
        bezierCircle(10).map((p) => [p[0] * 0.07, 2.05 + p[1] * 0.07, -0.25]),
        () => [0.017, 0.017],
        [0, 0, 1],
        12
      )
    );
    this.cymbalGroove = upload(
      gl,
      makeTube(
        Array.from({ length: 81 }, (_, i) => {
          const a = (i / 80) * Math.PI * 2;
          return [Math.cos(a), 0, Math.sin(a)];
        }),
        () => [0.008, 0.008],
        [0, 1, 0],
        8
      )
    );

    const makePatch = (poly, lift, rings = 6) => {
      const n = poly.length;
      const cx = poly.reduce((a, p) => a + p[0], 0) / n, cy = poly.reduce((a, p) => a + p[1], 0) / n;
      const m = { pos: [], nor: [], idx: [] };
      for (let r = 0; r <= rings; r++) {
        const f = r / rings;
        for (let i = 0; i < n; i++) {
          const x = cx + (poly[i][0] - cx) * f, y = cy + (poly[i][1] - cy) * f;
          const z = this.headZ(x, y) + lift;
          const nr = vnorm([x / this.HEAD.r[0] ** 2, (y - this.HEAD.c[1]) / this.HEAD.r[1] ** 2, z / this.HEAD.r[2] ** 2]);
          m.pos.push(x, y, z);
          m.nor.push(nr[0], nr[1], nr[2]);
        }
      }
      for (let r = 0; r < rings; r++)
        for (let i = 0; i < n; i++) {
          const a = r * n + i, b = r * n + ((i + 1) % n), c = (r + 1) * n + i, d = (r + 1) * n + ((i + 1) % n);
          m.idx.push(a, c, b, b, c, d);
        }
      return upload(gl, m);
    };

    const circ = (cx, cy, rx, ry, n = 32) =>
      Array.from({ length: n }, (_, i) => {
        const a = (i / n) * Math.PI * 2;
        return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)];
      });
    const tri = (cx, cy, w, h, pointUp = false) => {
      const V = pointUp
        ? [[cx, cy + h / 2], [cx + w, cy - h / 2], [cx - w, cy - h / 2]]
        : [[cx - w, cy + h / 2], [cx + w, cy + h / 2], [cx, cy - h / 2]];
      const out = [];
      for (let i = 0; i < 3; i++) for (let k = 0; k < 5; k++) {
        const a = V[i], b = V[(i + 1) % 3], t = k / 5;
        out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
      }
      return out;
    };

    const mcy = this.MOUTH.cy;
    const mouthTopCurve = [[-0.29, mcy + 0.01, 0], [-0.15, mcy + 0.09, 0], [0.15, mcy + 0.09, 0], [0.29, mcy + 0.01, 0]];
    const mouthBotCurve = [[0.29, mcy + 0.01, 0], [0.29, mcy - 0.32, 0], [-0.29, mcy - 0.32, 0], [-0.29, mcy + 0.01, 0]];
    const mouthTop = sampleBez(mouthTopCurve, 48).map((p) => [p[0], p[1]]);
    const mouthBot = sampleBez(mouthBotCurve, 64).map((p) => [p[0], p[1]]);
    this.mouthTop = mouthTop;
    this.mouthBot = mouthBot;

    this.curveYAtX = (curve, x) => {
      for (let i = 1; i < curve.length; i++) {
        const a = curve[i - 1], b = curve[i];
        if ((x - a[0]) * (x - b[0]) <= 0) {
          const t = (x - a[0]) / (b[0] - a[0]);
          return a[1] + (b[1] - a[1]) * t;
        }
      }
      return curve[0][1];
    };

    const mouthPoly = mouthTop.slice(0, -1).concat(mouthBot.slice(0, -1));
    this.mouthPatch = makePatch(mouthPoly, 0.01, 8);

    const tCen = [0, mcy - 0.14];
    const arc = mouthBot.filter((p) => p[1] < mcy - 0.1).map((p) => [tCen[0] + (p[0] - tCen[0]) * 0.86, tCen[1] + (p[1] - tCen[1]) * 0.86]);
    const tL = arc[arc.length - 1], tR = arc[0];
    const arch = sampleBez([[tL[0], tL[1], 0], [tL[0] * 0.45, tL[1] + 0.075, 0], [tR[0] * 0.45, tR[1] + 0.075, 0], [tR[0], tR[1], 0]], 12).slice(1, -1).map((p) => [p[0], p[1]]);
    this.tonguePatch = makePatch(arc.concat(arch), 0.014, 6);

    this.lipGeom = upload(
      gl,
      makeTube(
        mouthPoly.concat([mouthPoly[0]]).map((p) => [p[0], p[1], this.headZ(p[0], p[1]) + 0.014]),
        () => [0.008, 0.008],
        [0, 0, 1],
        6
      )
    );
    this.cheeks = [-1, 1].map((s) => makePatch(circ(0.39 * s, 2.96, 0.17, 0.16), 0.004, 6));
    this.marks = [-1, 1].flatMap((s) => [
      makePatch(tri(0.28 * s, 3.45, 0.055, 0.14, true), 0.01, 3),
      makePatch(tri(0.22 * s, 3.14, 0.038, 0.08), 0.01, 3),
    ]);

    this.FOOT = { c: [0, 0.12, 0.2], r: [0.2, 0.12, 0.48] };
    this.toeLines = [-0.07, 0.07].map((dx) => {
      const c2 = [[dx * 0.9, 0.33], [dx, 0.42], [dx * 1.1, 0.5], [dx * 1.15, 0.58]];
      const pts = sampleBez(c2.map((p) => [p[0], p[1], 0]), 16).map((p) => {
        const q = 1 - (p[0] / this.FOOT.r[0]) ** 2 - ((p[1] - this.FOOT.c[2]) / this.FOOT.r[2]) ** 2;
        return [p[0], this.FOOT.c[1] + this.FOOT.r[1] * Math.sqrt(Math.max(0, q)) + 0.004, p[1]];
      });
      return upload(gl, makeTube(pts, () => [0.011, 0.011], [1, 0, 0], 6));
    });
  }

  draw(geom, local, color, o) {
    o = o || {};
    const gl = this.gl;
    const model = M4.mul(this.root, local);
    gl.uniformMatrix4fv(this.U.uModel, false, model);
    gl.uniformMatrix3fv(this.U.uNormalMat, false, M4.normalMat(model));
    gl.uniform3fv(this.U.uColor, color);
    gl.uniform3fv(this.U.uColor2, o.color2 || color);
    gl.uniform1f(this.U.uMode, o.mode || 0);
    gl.uniform1f(this.U.uFreq, 1);
    gl.uniform1f(this.U.uAlpha, 1);
    gl.uniform1f(this.U.uShine, o.shine || 24);
    gl.uniform1f(this.U.uSpec, o.spec === undefined ? 0.1 : o.spec);
    gl.bindBuffer(gl.ARRAY_BUFFER, geom.pos);
    gl.vertexAttribPointer(this.aPos, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, geom.nor);
    gl.vertexAttribPointer(this.aNor, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, geom.idx);
    if (o.cull) gl.enable(gl.CULL_FACE);
    gl.drawElements(gl.TRIANGLES, geom.count, gl.UNSIGNED_SHORT, 0);
    if (o.cull) gl.disable(gl.CULL_FACE);
  }

  ell(p, r, col, rot, o) { this.draw(this.G.sphere, xf(p, r, rot), col, o); }
  cyl(p, r, col, rot, o) { this.draw(this.G.cyl, xf(p, r, rot), col, o); }
  cone(p, r, col, rot, o) { this.draw(this.G.cone, xf(p, r, rot), col, o); }

  push() { this.stack.push(this.root); }
  pop() { this.root = this.stack.pop(); }
  joint(pv, M) {
    this.root = M4.mul(this.root, M4.mul(M4.translate(pv[0], pv[1], pv[2]), M4.mul(M, M4.translate(-pv[0], -pv[1], -pv[2]))));
  }

  cymbal(H, n) {
    const c = vadd(H, vmul(n, 0.1));
    this.draw(this.G.cyl, limbMatrix(vsub(c, vmul(n, 0.025)), vadd(c, vmul(n, 0.025)), 0.5, 0.5), COL.cymEdge, { shine: 30, spec: 0.25 });
    this.draw(this.G.cyl, limbMatrix(vsub(c, vmul(n, 0.02)), vadd(c, vmul(n, 0.032)), 0.42, 0.42), COL.cymFace, { shine: 30, spec: 0.25 });
    this.draw(this.G.cyl, limbMatrix(vadd(c, vmul(n, 0.032)), vadd(c, vmul(n, 0.046)), 0.27, 0.27), [0.78, 0.57, 0.29], { shine: 45, spec: 0.35 });
    this.draw(this.G.cyl, limbMatrix(vadd(c, vmul(n, 0.046)), vadd(c, vmul(n, 0.074)), 0.095, 0.095), COL.cymEdge, { shine: 50, spec: 0.4 });
    [0.31, 0.4].forEach((radius, i) => {
      const center = vadd(c, vmul(n, 0.05));
      this.draw(this.cymbalGroove, limbMatrix(vsub(center, vmul(n, 0.006)), vadd(center, vmul(n, 0.006)), radius, radius), i ? COL.cymEdge : COL.ring, { spec: 0.2 });
    });
    this.ell(vsub(c, vmul(n, 0.055)), [0.05, 0.05, 0.05], COL.cymEdge);
  }

  drawArm(s, Htarget, a) {
    const S = [0.3 * s, 2.4, 0], L1 = 0.56, L2 = 0.56;
    let H = Htarget, d = vsub(H, S), dist = vlen(d);
    const maxd = L1 + L2 - 0.02;
    if (dist > maxd) { H = vadd(S, vmul(d, maxd / dist)); d = vsub(H, S); dist = maxd; }
    const dir = vmul(d, 1 / dist);
    const aa = (L1 * L1 - L2 * L2 + dist * dist) / (2 * dist);
    const h = Math.sqrt(Math.max(0, L1 * L1 - aa * aa));
    let pole = [0.3 * s, -1, -0.4];
    pole = vnorm(vsub(pole, vmul(dir, vdot(pole, dir))));
    const E = vadd(vadd(S, vmul(dir, aa)), vmul(pole, h));

    const down = [0, -1, 0];
    const R1 = alignRot(down, vnorm(vsub(E, S)));
    const R2 = alignRot(down, rotVec(R1.inv, vnorm(vsub(H, E))));
    const E0 = [S[0], S[1] - L1, S[2]], H0 = [E0[0], E0[1] - L2, E0[2]];

    this.push();
    this.joint(S, R1.m);
    this.draw(this.G.cyl, limbMatrix(S, E0, 0.098, 0.098), COL.yellow);
    this.ell(S, [0.125, 0.125, 0.125], COL.yellow);
    this.ell(E0, [0.1, 0.1, 0.1], COL.yellow);
    this.push();
    this.joint(E0, R2.m);
    this.draw(this.G.cyl, limbMatrix(E0, H0, 0.088, 0.088), COL.yellow);
    this.ell(H0, [0.12, 0.12, 0.13], COL.yellow);
    const nWorld = [-s * Math.cos(a), 0, Math.sin(a)];
    this.cymbal(H0, rotVec(R2.inv, rotVec(R1.inv, nWorld)));
    this.pop();
    this.pop();
  }

  drawBunzo(t, P, state, game) {
    P = P || { x: 0, y: 0, z: 0, s: 1, base: true };
    const on = state.clap, auto = P.k !== undefined;
    
    // NIKMATI K-PARAMETER DARI OBJEK GAME (SIMBAL BERADU CEPAT SAAT KALAH)
    let k = on ? 0.5 - 0.5 * Math.cos(t * 4.0) : 0;
    if (auto) {
      k = P.k;
    } else {
      k = k * k * (3 - 2 * k);
    }
    
    const shake = P.shake !== undefined ? P.shake : 0;
    const fl = 1 + 0.3 * (P.lunge || 0);

    let baseM = M4.mul(
      M4.translate(P.x, P.y + (on && !auto ? 0.02 * Math.abs(Math.sin(t * 4.0)) * P.s : 0), P.z),
      M4.scale(P.s * fl, P.s * fl, P.s * fl)
    );
    const att = xfPoint(baseM, [0, 2.14, -0.25]);
    const intro = P.intro === undefined ? 1 : P.intro;
    const Ssq = M4.scale(intro * (1 + 0.035 * k), intro * (1 - 0.05 * k), intro * (1 + 0.035 * k));
    const Rsw = M4.axisAngle([1, 0, 0.35], P.sway || 0);
    baseM = M4.mul(M4.translate(att[0], att[1], att[2]), M4.mul(Rsw, M4.mul(Ssq, M4.mul(M4.translate(-att[0], -att[1], -att[2]), baseM))));
    this.root = baseM;
    this.stack.length = 0;

    if (P.base) this.cyl([0, -0.06, 0], [1.4, 0.12, 1.3], COL.base, null, { spec: 0.05 });

    [-1, 1].forEach((s) => {
      const lx0 = 0.26 * s;
      this.push();
      const swing = 0.12 * Math.sin(t * 1.7 + (s > 0 ? 0 : 1.4)) + (auto ? 0.12 * k : 0) + shake * 0.15 * Math.sin(t * 13 + s);
      this.joint([lx0, 1.45, 0], M4.axisAngle([1, 0, 0.25 * s], swing));
      this.cyl([lx0, 0.74, 0], [0.125, 1.12, 0.125], COL.yellow);
      this.ell([lx0, this.FOOT.c[1], this.FOOT.c[2]], this.FOOT.r, COL.yellow);
      this.toeLines.forEach((g) => this.draw(g, M4.translate(lx0, 0, 0), COL.toe, { spec: 0.02 }));
      this.pop();

      this.ell([lx0, 1.42, 0], [0.32, 0.35, 0.36], COL.green, null, { spec: 0.03 });
      for (let i = 0; i < 16; i++) {
        const th = (i / 16) * Math.PI * 2;
        this.ell([lx0 + 0.16 * Math.cos(th), 1.1, 0.185 * Math.sin(th)], [0.055, 0.035, 0.055], COL.frill, null, { spec: 0.02 });
      }
    });
    this.ell([0, 1.58, 0], [0.43, 0.32, 0.37], COL.green, null, { spec: 0.03 });
    this.cyl([0, 1.83, 0], [0.37, 0.22, 0.32], COL.green, null, { spec: 0.03 });

    this.push();
    const br = Math.sin(t * 2.0);
    this.joint([0, 1.7, 0], M4.scale(1 + 0.014 * br, 1 + 0.025 * br, 1 + 0.014 * br));
    this.ell(this.TORSO.c, this.TORSO.r, COL.yellow);
    this.ell([0, 2.16, 0.3], [0.22, 0.34, 0.025], COL.belly, null, { spec: 0.02 });

    this.ell([0, 2.06, 0.3], [0.24, 0.19, 0.06], COL.green, null, { spec: 0.03 });
    this.straps.forEach((g) => this.draw(g, M4.identity(), COL.green, { spec: 0.03 }));
    [-1, 1].forEach((s) => {
      const x = 0.22 * s, y = 2.01;
      const zs = this.torsoZ(x, y);
      const ry = Math.atan2(x / this.TORSO.r[0] ** 2, (y - this.TORSO.c[1]) / this.TORSO.r[1] ** 2);
      const bp = [x, y, zs + 0.05];
      this.cyl(bp, [0.078, 0.035, 0.078], COL.button, [Math.PI / 2, ry, 0], { spec: 0.15 });
      [Math.PI / 4, -Math.PI / 4].forEach((a) =>
        this.ell([bp[0] + Math.sin(ry) * 0.02, bp[1], bp[2] + Math.cos(ry) * 0.02], [0.048, 0.008, 0.01], COL.buttonX, [0, ry, a], { spec: 0.02 })
      );
    });
    this.draw(this.ringGeom, M4.identity(), COL.ring, { shine: 60, spec: 0.6 });

    this.push();
    // ROTASI BERGETAR KEPALA SAAT JUMPSCARE (SHAKE INTENS)
    const turn = 0.22 * Math.sin(t * 0.9) + shake * 0.45 * Math.sin(t * 17);
    this.joint([0, 2.4, 0], M4.mul(M4.axisAngle([0.2, 1, 0.1], turn), M4.axisAngle([1, 0, 0.3], 0.05 * Math.sin(t * 2.0 + 0.5))));
    this.ell(this.HEAD.c, this.HEAD.r, COL.yellow);

    this.cone([-0.03, 3.5, 0.2], [0.03, 0.11, 0.03], COL.yellow, [0.5, 0, 0.1]);
    this.cone([0.07, 3.49, 0.2], [0.025, 0.07, 0.025], COL.yellow, [0.6, 0, -0.3]);

    this.ears.forEach((e, i) => {
      this.push();
      const flap = 0.07 * Math.sin(t * 2.0 + i * 1.7) * (i ? -1 : 1) + (auto ? 0.1 * k * (i ? -1 : 1) : 0) + shake * 0.25 * Math.sin(t * 14 + i);
      this.joint(e.base, M4.axisAngle([0.2, 0.1, 1], flap));
      this.draw(e.outer, M4.identity(), COL.yellow);
      this.draw(e.inner, M4.identity(), COL.earIn, { spec: 0.03 });
      this.pop();
    });

    this.cheeks.forEach((g) => this.draw(g, M4.identity(), COL.cheek, { spec: 0.02 }));
    [-1, 1].forEach((s) => {
      const ex = 0.23 * s, ey = 3.31, ez = this.headZ(ex, ey), q = this.surfRot(this.HEAD.c, this.HEAD.r, [ex, ey, ez]);
      this.ell([ex, ey, ez - 0.004], [0.075, 0.09, 0.02], COL.black, [q.rx, q.ry, 0], { spec: 0 });
    });
    this.marks.forEach((g) => this.draw(g, M4.identity(), COL.mark, { spec: 0.02 }));
    this.draw(this.mouthPatch, M4.identity(), COL.mouth, { spec: 0.05 });
    this.draw(this.tonguePatch, M4.identity(), COL.tongue, { spec: 0.05 });
    this.draw(this.lipGeom, M4.identity(), COL.lip, { spec: 0.03 });

    const incisorX = 0.1, incisorY = this.curveYAtX(this.mouthTop, incisorX) - 0.043;
    this.cyl([0, incisorY, this.headZ(0, incisorY) + 0.035], [0.1, 0.086, 0.028], COL.white, null, { spec: 0.1 });
    [-1, 1].forEach((s) => {
      const x = 0.15 * s, y = this.curveYAtX(this.mouthTop, x), z = this.headZ(x, y) + 0.035;
      this.cone([x, y, z], [0.03, 0.105, 0.02], COL.white, [0, 0, Math.PI], { spec: 0.06 });
    });
    [-0.22, -0.1, 0.1, 0.22].forEach((x) => {
      const y = this.curveYAtX(this.mouthBot, x);
      const z = this.headZ(x, y) + 0.024;
      const angle = Math.atan2(x, this.MOUTH.cy - 0.11 - y);
      this.cone([x, y, z], [0.02, 0.048, 0.016], COL.white, [0, 0, angle], { spec: 0.06 });
    });

    this.push();
    this.joint([0, 3.4, 0], M4.axisAngle([1, 0, 1], 0.07 * Math.sin(t * 3.0) + shake * 0.2 * Math.sin(t * 16)));
    const hatM = M4.mul(M4.translate(0, 3.47, -0.04), M4.mul(M4.rotX(-0.12), M4.rotZ(-0.08)));
    this.draw(this.G.coneHat, M4.mul(hatM, M4.scale(0.22, 0.6, 0.22)), COL.hatLight, { mode: 1, color2: COL.hatDark, spec: 0.05 });
    this.draw(this.G.cyl, M4.mul(hatM, xf([0, 0.64, 0], [0.045, 0.1, 0.045])), COL.knob, { spec: 0.03 });
    this.draw(this.G.sphere, M4.mul(hatM, xf([0, 0.73, 0], [0.09, 0.06, 0.075])), COL.knob, { spec: 0.03 });
    [[-0.045, 0.79, -0.45], [0.025, 0.82, 0.12], [0.075, 0.77, 0.58]].forEach((p, i) => {
      this.draw(this.G.sphere, M4.mul(hatM, xf([p[0], p[1], 0], [0.055, 0.11, 0.045], [0, 0, p[2]])), i === 1 ? COL.frill : COL.green, { spec: 0.03 });
    });
    this.pop();
    this.pop();

    const a = mix(1.0, 0, k);
    [-1, 1].forEach((s) => {
      this.drawArm(s, [mix(1.2, 0.12, k) * s, mix(2.58, 2.3, k), mix(0.7, 0.85, k)], a);
    });
    this.pop();

    // Kawat gantung lurus dari lubang atas lorong Bunzo ke kepala Bunzo
    if (P.cable) {
      this.root = M4.identity();
      const topPoint = [P.x, 9.6, P.z - 0.7];
      this.draw(this.G.cyl, limbMatrix(att, topPoint, 0.025, 0.025), [0.25, 0.27, 0.30], { spec: 0.5 });
    }
  }
}