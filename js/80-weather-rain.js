  var vv = {};
  br(vv, { create: () => O1, showcase: () => BR });
  function F1(i, e, t) {
    let n =
      Math.imul(i | 0, 374761393) ^
      Math.imul(e | 0, 668265263) ^
      Math.imul(t | 0, 1274126177);
    return (
      (n = Math.imul(n ^ (n >>> 13), 1274126177)),
      ((n ^ (n >>> 16)) >>> 0) / 4294967296
    );
  }
  function Ab(i, e, t, n) {
    let s = Math.floor(i),
      o = Math.floor(e),
      r = i - s,
      a = e - o,
      l = r * r * (3 - 2 * r),
      c = a * a * (3 - 2 * a),
      u = s,
      h = s + 1,
      f = o,
      p = o + 1;
    n &&
      ((u = ((u % n) + n) % n),
      (h = ((h % n) + n) % n),
      (f = ((f % n) + n) % n),
      (p = ((p % n) + n) % n));
    let d = F1(u, f, t),
      v = F1(h, f, t),
      g = F1(u, p, t),
      x = F1(h, p, t);
    return d + (v - d) * l + (g - d) * c + (d - v - g + x) * l * c;
  }
  function fs(i, e, t, n = 4, s = 0) {
    let o = 0,
      r = 0.5,
      a = 0;
    for (let l = 0; l < n; l++)
      ((o += r * Ab(i, e, t + l * 17, s)),
        (a += r),
        (i *= 2),
        (e *= 2),
        (s *= 2),
        (r *= 0.5));
    return o / a;
  }
  var So = (i) => (i < 0 ? 0 : i > 1 ? 1 : i),
    fl = (i, e, t) => {
      let n = So((t - i) / (e - i));
      return n * n * (3 - 2 * n);
    },
    wR = 0.385,
    Li = { x0: -50, z0: -50, size: 100 },
    Sb = [
      [-12, 4, 5, 2, 0.2], [10, -5, 4.5, 2.2, 0.22], [-26, -10, 3.5, 2, 0.2], [24, 11, 3.5, 2.2, 0.2],
      [0, 16, 7, 1.6, 0.18], [-6, -19, 3, 1.4, 0.16], [30, -4, 3, 2.4, 0.18], [-33, 8, 3.2, 2, 0.18],
      [15, 18, 4, 1.4, 0.16], [-17, 19, 3.6, 1.3, 0.16],
    ],
    Tb = 1,
    ER = 0.02;
  function SR(i, e) {
    let t =
      0.6 +
      (fs(i / 8.5, e / 8.5, 11, 4) - 0.47) * 0.3 +
      (fs(i / 2.4, e / 2.4, 23, 3) - 0.5) * 0.14;
    for (let n = 0; n < Sb.length; n++) {
      let s = Sb[n],
        o = (i - s[0]) / (s[2] * Tb),
        r = (e - s[1]) / (s[3] * Tb),
        a = o * o + r * r;
      a < 9 && (t -= (s[4] + ER) * Math.exp(-a * a));
    }
    return t;
  }
  function Rb(i) {
    let e = new Uint8Array(i * i * 4),
      { x0: t, z0: n, size: s } = Li,
      o = s / i;
    for (let r = 0; r < i; r++) {
      let a = n + (r + 0.5) * o;
      for (let l = 0; l < i; l++) {
        let c = t + (l + 0.5) * o,
          u = (r * i + l) * 4,
          h = SR(c, a);
        ((e[u] = Math.round(So(0.5 + (h - wR) * 2.5) * 255)),
          (e[u + 1] = Math.round(
            So(
              0.5 + (fs(c / 5.5, a / 5.5, 41, 3) - 0.5) * 1.5 + (0.5 - h) * 0.9,
            ) * 255,
          )));
        let f =
          fl(0.6, 0.78, fs(c / 1.4, a / 1.4, 77, 4)) *
          fl(0.47, 0.62, fs(c / 9, a / 9, 91, 2));
        ((e[u + 2] = Math.round(So(f) * 255)),
          (e[u + 3] = Math.round(
            So(
              fs(c / 22, a / 0.9, 57, 3) * 0.6 +
                fs(c / 13, a / 13, 63, 3) * 0.4,
            ) * 255,
          )));
      }
    }
    return e;
  }
  function U1(i, e, t, n, s) {
    let o = ((t - Li.x0) / Li.size) * e - 0.5,
      r = ((n - Li.z0) / Li.size) * e - 0.5;
    ((o = o < 0 ? 0 : o > e - 1.001 ? e - 1.001 : o),
      (r = r < 0 ? 0 : r > e - 1.001 ? e - 1.001 : r));
    let a = o | 0,
      l = r | 0,
      c = o - a,
      u = r - l,
      h = (l * e + a) * 4 + s,
      f = e * 4;
    return (
      ((i[h] * (1 - c) + i[h + 4] * c) * (1 - u) +
        (i[h + f] * (1 - c) + i[h + f + 4] * c) * u) /
      255
    );
  }
  function Cb(i) {
    let e = new Uint8Array(i * i * 4),
      t = new Uint8Array(i * i * 4),
      n = new Float32Array(i * i),
      s = new Float32Array(i * i);
    for (let r = 0; r < i; r++)
      for (let a = 0; a < i; a++) {
        let l = a / i,
          c = r / i,
          u = r * i + a,
          h =
            fs(l * 96, c * 96, 3, 2, 96) * 0.6 +
            fs(l * 40, c * 40, 9, 2, 40) * 0.4,
          f = fs(l * 6, c * 6, 21, 4, 6),
          p = (fs(l * 8, c * 8, 31, 2, 8) - 0.5) * 0.25,
          d = (fs(l * 8, c * 8, 37, 2, 8) - 0.5) * 0.25,
          v = 1 - Math.abs(2 * fs((l + p) * 5, (c + d) * 5, 43, 3, 5) - 1),
          g = fs(l * 28, c * 28, 51, 3, 28);
        ((e[u * 4] = Math.round(So(h) * 255)),
          (e[u * 4 + 1] = Math.round(So(f) * 255)),
          (e[u * 4 + 2] = Math.round(So(v) * 255)),
          (e[u * 4 + 3] = Math.round(So(g) * 255)),
          (n[u] = h),
          (s[u] = fs(l * 9, c * 9, 71, 4, 9)));
      }
    let o = (r) => (r + i) % i;
    for (let r = 0; r < i; r++)
      for (let a = 0; a < i; a++) {
        let l = r * i + a,
          c = (n[r * i + o(a + 1)] - n[r * i + o(a - 1)]) * 2.2,
          u = (n[o(r + 1) * i + a] - n[o(r - 1) * i + a]) * 2.2,
          h = (s[r * i + o(a + 2)] - s[r * i + o(a - 2)]) * 9,
          f = (s[o(r + 2) * i + a] - s[o(r - 2) * i + a]) * 9;
        ((t[l * 4] = Math.round(So(0.5 - c) * 255)),
          (t[l * 4 + 1] = Math.round(So(0.5 - u) * 255)),
          (t[l * 4 + 2] = Math.round(So(0.5 - h) * 255)),
          (t[l * 4 + 3] = Math.round(So(0.5 - f) * 255)));
      }
    return { det: e, nrm: t };
  }
  function N1(i, e, { repeat: t = !0, aniso: n = 1 } = {}) {
    let s = new ui(i, e, e, _n, yi);
    return (
      (s.wrapS = s.wrapT = t ? Is : Bi),
      (s.magFilter = Zt),
      (s.minFilter = Ln),
      (s.generateMipmaps = !0),
      (s.anisotropy = n),
      (s.colorSpace = hi),
      (s.needsUpdate = !0),
      s
    );
  }
  var fa = { x0: -50, z0: -35, w: 100, h: 70 };
  function Pb(i, e = 1) {
    let t = document.createElement("canvas");
    t.width = t.height = i;
    let n = t.getContext("2d");
    ((n.fillStyle = "#000"), n.fillRect(0, 0, i, i));
    let s = i / fa.w,
      o = i / fa.h;
    (n.setTransform(s, 0, 0, o, -fa.x0 * s, -fa.z0 * o),
      (n.globalCompositeOperation = "lighter"));
    let r = "#ff0000",
      a = "#00ff00",
      l =
        '"Big Shoulders Display", "Barlow Condensed", Impact, "Arial Narrow", sans-serif',
      c = 90210,
      u = () => {
        ((c |= 0), (c = (c + 1831565813) | 0));
        let A = Math.imul(c ^ (c >>> 15), 1 | c);
        return (
          (A = (A + Math.imul(A ^ (A >>> 7), 61 | A)) ^ A),
          ((A ^ (A >>> 14)) >>> 0) / 4294967296
        );
      },
      h = (A, _, M, E, w, S, z) => {
        ((n.strokeStyle = S),
          (n.lineWidth = w),
          (n.lineCap = "butt"),
          n.setLineDash(z || []),
          n.beginPath(),
          n.moveTo(A, _),
          n.lineTo(M, E),
          n.stroke(),
          n.setLineDash([]));
      },
      f = (A, _, M, E, w, S) => {
        ((n.strokeStyle = S),
          (n.lineWidth = w),
          n.setLineDash([]),
          n.strokeRect(A, _, M - A, E - _));
      },
      p = (A, _, M, E, w) => {
        ((n.fillStyle = w), n.fillRect(A, _, M - A, E - _));
      },
      d = (A, _, M, E, w, S) => {
        (n.save(),
          n.translate(_, M),
          n.rotate(w),
          n.scale(E / 100, E / 100),
          (n.font = `900 100px ${l}`),
          (n.textAlign = "left"),
          (n.textBaseline = "middle"),
          (n.fillStyle = S));
        let H = -n.measureText(A).width / 2;
        (n.fillText(A, H, 0),
          (n.globalCompositeOperation = "source-over"),
          (n.fillStyle = "#000"));
        for (let O of A) {
          let q = n.measureText(O).width;
          (" I1".includes(O) || n.fillRect(H + q * 0.36, -60, 4.5, 120),
            (H += q));
        }
        ((n.globalCompositeOperation = "lighter"), n.restore());
      },
      v = (A, _, M, E, w, S = 1.1, z = 0.14) => {
        (n.save(), n.beginPath(), n.rect(A, _, M - A, E - _), n.clip());
        let H = M - A + (E - _);
        for (let O = 0; O < H; O += S) h(A + O, _, A + O - (E - _), E, z, w);
        (n.restore(), f(A, _, M, E, 0.15, w));
      },
      g = (A, _, M, E) => {
        (n.save(),
          n.translate(A, _),
          n.scale(M, 1),
          (n.fillStyle = E),
          n.beginPath(),
          n.moveTo(-1.6, -0.14),
          n.lineTo(0.5, -0.14),
          n.lineTo(0.5, -0.5),
          n.lineTo(1.7, 0),
          n.lineTo(0.5, 0.5),
          n.lineTo(0.5, 0.14),
          n.lineTo(-1.6, 0.14),
          n.closePath(),
          n.fill(),
          n.restore());
      };
    (h(-25.6, 3.6, 16.2, 3.6, 0.15, r),
      h(-25.6, 8.4, -5.6, 8.4, 0.15, r),
      h(10.4, 8.4, 16.2, 8.4, 0.15, r),
      h(-24, 6, -3, 6, 0.12, a, [3, 4.5]),
      h(6, 6, 15.5, 6, 0.12, a, [3, 4.5]),
      h(-23, 14, 16.2, 14, 0.15, r),
      h(-23, 18.6, 16.2, 18.6, 0.15, r),
      h(-23, 16.3, 15.5, 16.3, 0.1, a, [2, 6]),
      h(-23, -3.6, 16.2, -3.6, 0.12, r),
      h(-23, 0.56, 16.2, 0.56, 0.12, r),
      h(-23, 24.2, 16.2, 24.2, 0.12, r),
      h(-37.5, 2.6, -26.4, 2.6, 0.15, a),
      h(-37.5, 9.2, -26.4, 9.2, 0.15, a),
      g(-14, 4.7, 1, a),
      g(13, 7.3, -1, a),
      g(-16, 15.2, 1, a),
      g(2, 17.5, -1, a),
      p(-26.2, 3.6, -25.75, 8.4, a));
    for (let A = 2.75; A < 9; A += 1) p(-31.2, A, -28.2, A + 0.5, a);
    (d("SLOW", -21.4, 6, 1.7, Math.PI / 2, a),
      d("10", -19, 6, 1.8, Math.PI / 2, a),
      (n.strokeStyle = a),
      (n.lineWidth = 0.14),
      n.beginPath(),
      n.ellipse(-19, 6, 1.35, 1.8, 0, 0, Math.PI * 2),
      n.stroke(),
      h(-30.4, 2.6, -30.4, -10.2, 0.12, a),
      h(-29, 2.6, -29, -8.8, 0.12, a),
      h(-30.4, -10.2, -7, -10.2, 0.12, a),
      h(-29, -8.8, -7, -8.8, 0.12, a));
    for (let A = -28; A < -7.5; A += 2.2) h(A, -10.2, A + 0.9, -8.8, 0.1, a);
    for (let A = -7.5; A < 2; A += 2.2) h(-30.4, A, -29, A + 0.9, 0.1, a);
    let x = [
        [-22.5, -10.3],
        [-5.3, 6.9],
        [10.5, 16.6],
      ],
      y = (A, _, M, E, w, S) => {
        x.forEach((z, H) => {
          if (S && H === 1) return;
          let O = H === 2 ? 1 : 2,
            q = _ - A > 4 ? 2 : 1;
          for (let U = 0; U < O; U++)
            for (let T = 0; T < q; T++) {
              let D = z[0] + ((z[1] - z[0]) * U) / O,
                C = z[0] + ((z[1] - z[0]) * (U + 1)) / O,
                G = A + ((_ - A) * T) / q,
                j = A + ((_ - A) * (T + 1)) / q;
              f(D - 0.12, G - 0.12, C + 0.12, j + 0.12, 0.1, a);
            }
          d(M + (H + 1), (z[0] + z[1]) / 2, E, 0.85, w, r);
        });
      };
    (y(-6.34, -3.9, "D0", -2.9, Math.PI, !1),
      y(0.86, 3.3, "C0", -0.15, 0, !1),
      y(8.7, 13.64, "B0", 14.75, Math.PI, !0),
      y(18.9, 23.84, "A0", 17.85, 0, !1));
    for (let A of [-10.3, -5.3, 6.9, 10.5])
      h(
        A + (A === -10.3 || A === 6.9 ? 0.35 : -0.35),
        -6.3,
        A + (A === -10.3 || A === 6.9 ? 0.35 : -0.35),
        23.8,
        0.1,
        r,
        [1.5, 1.5],
      );
    (v(-6.6, -10.9, -0.4, -8.9, r, 0.9, 0.12),
      v(12.2, -22.6, 16.2, -16.4, r),
      v(-0.9, 5.4, 3.9, 9.9, r, 0.95, 0.13),
      d("KEEP CLEAR", 1.5, 10.6, 0.62, 0, r),
      v(19.8, -4.2, 27.2, 4.2, r, 1.2, 0.16),
      d("KEEP CLEAR", 17.4, -19.5, 0.8, Math.PI / 2, r),
      h(16.9, -29.5, 16.9, 27.5, 0.15, r),
      h(17.7, -29.5, 17.7, 27.5, 0.1, r, [1, 1]),
      h(19.3, -29.5, 19.3, 27.5, 0.1, r, [1, 1]),
      h(27.7, -29.5, 27.7, 27.5, 0.1, r, [1, 1]),
      d("BERTH 4", 23.5, 21.6, 1.9, 0, a),
      d("BERTH 4", 23.5, -7.7, 1.7, Math.PI, a));
    for (let A = -27; A < 27; A += 9)
      d(
        String(400 + Math.round((A + 27) / 9) * 5),
        26.9,
        A + 2,
        0.5,
        Math.PI / 2,
        a,
      );
    n.lineCap = "round";
    let b = (A, _, M, E, w, S) => {
      for (let z of [-0.95, 0.95])
        for (let H of [-0.16, 0.16])
          ((n.strokeStyle = `rgba(0,0,255,${S})`),
            (n.lineWidth = 0.26),
            n.beginPath(),
            n.moveTo(A, _ + z + H),
            n.quadraticCurveTo(
              (A + M) / 2,
              (_ + E) / 2 + w + z + H,
              M,
              E + z + H,
            ),
            n.stroke());
    };
    for (let A = 0; A < 46; A++) {
      let _ = u() < 0.68 ? 6 : 16.3,
        M = _ + (u() - 0.5) * 2.6,
        E = -36 + u() * 40,
        w = 8 + u() * 26;
      b(
        E,
        M,
        Math.min(E + w, 28),
        M + (u() - 0.5) * 1.6,
        (u() - 0.5) * 1.4,
        0.1 + u() * 0.22,
      );
    }
    for (let A = 0; A < 12; A++) {
      let _ = u() < 0.5 ? 6 : 16.3,
        M = u() < 0.5 ? -1 : 1,
        E = 0.12 + u() * 0.2;
      ((n.strokeStyle = `rgba(0,0,255,${E})`),
        (n.lineWidth = 0.3),
        n.beginPath(),
        n.moveTo(10 + u() * 4, _ + (u() - 0.5) * 2),
        n.quadraticCurveTo(
          21 + u() * 3,
          _,
          22 + u() * 4,
          _ + M * (8 + u() * 10),
        ),
        n.stroke());
    }
    for (let A = 0; A < 60; A++) {
      let _ = -34 + u() * 62,
        M = -8 + u() * 34,
        E = 0.6 + u() * 2.5,
        w = (u() - 0.5) * 0.5;
      ((n.strokeStyle = `rgba(0,0,255,${0.15 + u() * 0.3})`),
        (n.lineWidth = 0.12 + u() * 0.2),
        n.beginPath(),
        n.moveTo(_, M),
        n.lineTo(_ + Math.cos(w) * E, M + Math.sin(w) * E),
        n.stroke());
    }
    let m = new xs(t);
    return (
      (m.flipY = !1),
      (m.colorSpace = hi),
      (m.wrapS = m.wrapT = Bi),
      (m.minFilter = Ln),
      (m.magFilter = Zt),
      (m.generateMipmaps = !0),
      (m.anisotropy = e),
      (m.needsUpdate = !0),
      m
    );
  }
  var TR = `
uniform float uTime, uWetG, uReflOn, uReflLod, uMarkRes, uMaskRes;
uniform sampler2D uMask, uMarks, uDetail, uDetailN, uRefl;
uniform vec3 uMaskRect; uniform vec4 uMarkRect; uniform mat4 uReflMatrix; uniform vec2 uReflScale;
varying vec3 vGWorld;
float gRough; vec2 gNxz; float gPuddle; float gWet; float gFilm; float gSoak;
float gH1(vec2 p){ vec3 q = fract(vec3(p.xyx) * .1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
float gVN(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(gH1(i), gH1(i + vec2(1.0, 0.0)), f.x), mix(gH1(i + vec2(0.0, 1.0)), gH1(i + vec2(1.0, 1.0)), f.x), f.y); }
// 4-tap B-spline bicubic of the base level: no texel edge of a data map can ever show, however close the camera is
vec4 gBicubic(sampler2D t, vec2 uv, float res){
  vec2 p = uv * res - 0.5; vec2 i = floor(p); vec2 f = p - i; vec2 f2 = f * f, f3 = f2 * f;
  vec2 w0 = (1.0 - 3.0 * f + 3.0 * f2 - f3) / 6.0, w1 = (4.0 - 6.0 * f2 + 3.0 * f3) / 6.0;
  vec2 w2 = (1.0 + 3.0 * f + 3.0 * f2 - 3.0 * f3) / 6.0, w3 = f3 / 6.0;
  vec2 g0 = w0 + w1, g1 = w2 + w3;
  vec2 h0 = (i + w1 / g0 - 0.5) / res, h1 = (i + w3 / g1 + 1.5) / res;
  return (textureLod(t, vec2(h0.x, h0.y), 0.0) * g0.x + textureLod(t, vec2(h1.x, h0.y), 0.0) * g1.x) * g0.y
       + (textureLod(t, vec2(h0.x, h1.y), 0.0) * g0.x + textureLod(t, vec2(h1.x, h1.y), 0.0) * g1.x) * g1.y;
}
`,
    AR = `
{
  vec2 gxz = vGWorld.xz;
  float gDist = length(cameraPosition - vGWorld);
  // ---- unique large-scale masks (puddle height, dampness, oil, wear) ----
  vec2 muv = (gxz - uMaskRect.xy) * uMaskRect.z;
  float mIn = smoothstep(0.0, 0.05, min(min(muv.x, 1.0 - muv.x), min(muv.y, 1.0 - muv.y)));
  vec4 mk = mix(vec4(0.66, 0.5, 0.0, 0.5), gBicubic(uMask, muv, uMaskRes), mIn);
  // ---- tiling detail ----
  vec4 d1 = texture2D(uDetail, gxz * 0.21);
  vec4 d2 = texture2D(uDetail, gxz * 1.37 + 0.37);
  vec4 n1 = texture2D(uDetailN, gxz * 1.37 + 0.37);
  vec4 n0 = texture2D(uDetailN, gxz * 0.21);
  float grain = d2.r;
  // ---- slabs: 6 m expansion joints with tar sealing ----
  vec2 sj = gxz / 6.0;
  vec2 sf = (0.5 - abs(fract(sj) - 0.5)) * 6.0;
  float jd = min(sf.x, sf.y) + (d1.a - 0.5) * 0.035;
  float jaa = fwidth(jd) + 1e-5;
  float tarW = 0.022 + 0.03 * d1.g;
  float tar = (1.0 - smoothstep(tarW - jaa, tarW + jaa, jd)) * clamp(tarW / jaa, 0.0, 1.0);
  float groove = (1.0 - smoothstep(0.004, 0.012 + jaa, jd)) * clamp(0.02 / jaa, 0.0, 1.0);
  vec2 sid = floor(sj);
  float sh = fract(sin(dot(sid, vec2(127.1, 311.7))) * 43758.5453);
  float sh2 = fract(sh * 7.31 + 0.13);
  // ---- cracks, some sealed with tar ----
  float crArea = smoothstep(0.6, 0.76, mk.a * 0.7 + sh * 0.45);
  float cfw = fwidth(d1.b) * 1.5 + 0.004;
  float crack = smoothstep(0.955 - cfw, 0.975, d1.b) * crArea;
  float seal = smoothstep(0.915 - cfw, 0.94, d1.b) * crArea * step(0.72, sh2);
  // ---- base albedo: worn asphalt in the yard, concrete slabs on the quay ----
  float conc = 1.0;   // colosseum: pale cracked stone everywhere
  vec3 alb = mix(vec3(0.125, 0.125, 0.13), vec3(0.31, 0.28, 0.235), conc);
  alb *= (0.8 + 0.4 * sh2) * (0.8 + 0.4 * d1.g) * (0.62 + 0.76 * grain);
  alb += vec3(0.11, 0.105, 0.095) * smoothstep(0.58, 0.78, d2.a) * (1.0 - conc * 0.6);    // pale aggregate
  float polish = smoothstep(0.38, 0.72, mk.a);                                            // traffic-polished lanes
  alb *= mix(1.0, 0.78, polish);
  alb = mix(alb, vec3(0.018, 0.018, 0.02), max(max(tar, seal * 0.4) * 0.94, crack * 0.9));
  alb *= 1.0 - 0.62 * mk.b;                                                               // oil
  // ---- painted markings (worn, chipped) + tyre rubber ----
  vec2 kuv = (gxz - uMarkRect.xy) * uMarkRect.zw;
  float kIn = step(0.0, kuv.x) * step(kuv.x, 1.0) * step(0.0, kuv.y) * step(kuv.y, 1.0);
  vec3 mp = texture2D(uMarks, kuv).rgb;
  float kpx = max(fwidth(kuv.x), fwidth(kuv.y)) * uMarkRes;
  if (kpx < 1.0) mp = mix(gBicubic(uMarks, kuv, uMarkRes).rgb, mp, smoothstep(0.5, 1.0, kpx));   // magnified: no texel blocks
  mp *= kIn;
  float kw = clamp(kpx * 0.5, 0.16, 0.5);
  // chips: world-space procedural noise down to sub-centimetre (never the texels of a map)
  float chipN = 0.5;
  if (max(mp.r, mp.g) > 0.02) {
    float cf2 = 1.0 - smoothstep(6.0, 18.0, gDist), cf3 = 1.0 - smoothstep(2.5, 7.0, gDist);
    chipN = gVN(gxz * 17.0) * 0.45 + mix(0.5, gVN(gxz * 57.0 + 11.0), cf2) * 0.33 + mix(0.5, gVN(gxz * 181.0 + 5.0), cf3) * 0.22;
  }
  float chip = chipN * 0.62 + d1.a * 0.38;
  float wear = clamp(mk.a * 1.25 - 0.22 + mp.b * 0.6, 0.0, 1.0);
  float wt = mix(0.24, 0.55, wear);
  float keep = smoothstep(wt - 0.045, wt + 0.045, chip) * (1.0 - max(tar, crack));
  float eN = (chipN - 0.5) * 0.55 * (1.0 - kw * 2.0);
  float pY = smoothstep(0.5 - kw, 0.5 + kw, mp.r + eN) * keep;
  float pW = smoothstep(0.5 - kw, 0.5 + kw, mp.g + eN) * keep;
  alb *= 1.0 - 0.6 * mp.b * (1.0 - 0.5 * conc);
  float fade = 0.72 + 0.28 * d1.g;
  alb = mix(alb, vec3(0.52, 0.34, 0.035) * fade, pY * 0.94);
  alb = mix(alb, vec3(0.47, 0.47, 0.44) * fade, pW * 0.94);
  float paint = max(pY, pW);
  // ---- water: one continuous gradient  standing water -> soaked band -> damp -> drier patches ----
  // organic shoreline: world-space noise (40 / 15 / 5 cm) on the water-level comparison, independent of the mask res
  float sf2 = 1.0 - smoothstep(25.0, 60.0, gDist), sf3 = 1.0 - smoothstep(8.0, 22.0, gDist);
  float sn1 = gVN(gxz * 2.5 + 3.0), sn2 = mix(0.5, gVN(gxz * 6.7 + 17.0), sf2), sn3 = mix(0.5, gVN(gxz * 20.0 + 9.0), sf3);
  float sn = sn1 * 0.5 + sn2 * 0.3 + sn3 * 0.2;
  float depth = 0.5 - mk.r + (sn - 0.5) * 0.11 + (d1.g - 0.5) * 0.03 + (grain - 0.5) * 0.012 + groove * 0.04 + crack * 0.02 - paint * 0.01;
  float puddle = smoothstep(0.0, 0.035, depth) * uWetG;                 // mirror weight (~5 cm ramp)
  float deep = smoothstep(0.0, 0.22, depth);                           // 0 at the rim (bed shows) .. 1 a hand deep
  float bandW = 0.05 + 0.15 * sn1 * sn1 + 0.05 * d1.g;                  // soaked band, roughly 10-30 cm, varies along the shore
  float soak = smoothstep(-bandW, 0.0, depth) * uWetG;
  float fringe = smoothstep(-0.65, -0.02, depth);                      // damp halo, about a metre
  float dryP = 1.0 - smoothstep(0.2, 0.42, mk.g + fringe * 0.55 + (d1.g - 0.5) * 0.25 + (sn - 0.5) * 0.12);
  float damp = (1.0 - dryP) * uWetG;
  float wet = clamp(damp * 0.7 + soak * 0.3, 0.0, 1.0);
  float film = clamp(soak * (1.0 - smoothstep(0.35, 0.95, grain + (1.0 - soak) * 0.6)) + groove * 0.5, 0.0, 1.0) * (1.0 - paint * 0.4);
  alb *= mix(0.95, mix(0.7, 0.54, 1.0 - paint), damp);
  alb *= mix(1.0, 0.5, soak);
  // standing water: shallow rim shows the wet bed, deeper water goes murky and dark (never a black cut-out)
  alb = mix(alb, alb * mix(0.85, 0.4, deep) + vec3(0.004, 0.006, 0.0065) * deep, puddle);
  diffuseColor.rgb *= alb;
  // ---- roughness: dry ~0.72 -> damp 0.36..0.56 -> soaked 0.1..0.2 -> water 0.055, all smooth ramps ----
  float rough = mix(0.74, 0.42, damp) + (grain - 0.5) * 0.24 + (d1.g - 0.5) * 0.16 + conc * 0.03 - paint * 0.05;
  rough -= polish * 0.07 + mk.b * 0.16 + max(tar, seal) * 0.1;
  rough = mix(rough, 0.2 + (grain - 0.5) * 0.14, soak * 0.9);
  rough = mix(rough, 0.13, film * 0.8);
  rough += smoothstep(10.0, 80.0, gDist) * 0.04;
  rough = mix(clamp(rough, 0.1, 1.0), 0.055, puddle);
  // ---- normal (world xz slope): aggregate grain + lumps break up the mirror outside puddles ----
  vec2 nxz = (n1.rg - 0.5) * mix(2.1, 0.7, max(film, soak * 0.6)) + (n0.ba - 0.5) * 0.3;
  nxz *= 1.0 - puddle;
  float wsum = puddle + film * 0.2;
  vec2 wv = texture2D(uDetailN, gxz * 0.13 + uTime * vec2(0.031, 0.017)).ba - 0.5;
  vec2 wv2 = texture2D(uDetailN, gxz.yx * 0.31 - uTime * vec2(0.043, 0.027)).ba - 0.5;
  if (wsum > 0.004) {
    nxz += (wv * 0.03 + wv2 * 0.018) * (0.4 + 0.6 * deep) * wsum;
  }
  gSoak = soak;
  gRough = rough; gNxz = nxz; gPuddle = puddle; gWet = wet; gFilm = film;
}
`,
    RR = `
{
  vec3 gV = normalize(cameraPosition - vGWorld);
  vec4 rc = uReflMatrix * vec4(vGWorld.x, 0.0, vGWorld.z, 1.0);
  vec2 ruv = rc.xy / max(rc.w, 1e-4);
  vec2 gf = normalize(-gV.xz + vec2(1e-5)); vec2 gs = vec2(-gf.y, gf.x);
  float sinE = clamp(gV.y, 0.03, 1.0);
  float dk = (gPuddle + gFilm * 0.15 + 0.03) / (1.0 + length(cameraPosition - vGWorld) * 0.07);
  vec2 tilt = vec2(dot(gNxz, gs) * sinE, dot(gNxz, gf)) * dk;
  tilt = clamp(tilt, vec2(-0.12), vec2(0.12));
  ruv += tilt * uReflScale;
  float r = material.roughness;
  // puddles: sharp mirror. Damp asphalt: only a heavily blurred, vertically stretched reflection that tightens a
  // little at grazing angles (so it reads as a sheen, not as a second mirror)
  float graz = pow(1.0 - clamp(gV.y, 0.0, 1.0), 5.0);
  float lodP = clamp(r * 9.5 - 0.45, 0.0, 6.5) + 0.9;      // puddles: a touch soft, never razor sharp
  float lodD = clamp(3.0 + r * 6.5 - 3.4 * graz, 2.0, 7.5);
  float lod = mix(mix(lodD, min(lodD, 2.6 + r * 5.0), gSoak), lodP, gPuddle) + uReflLod;
  vec2 st = vec2(0.0, r * 0.11 + (1.0 - gPuddle) * 0.05);
  vec2 lo = vec2(0.002), hi = vec2(0.998);
  vec3 pr = textureLod(uRefl, clamp(ruv, lo, hi), lod).rgb * 0.5
          + textureLod(uRefl, clamp(ruv + st, lo, hi), lod + 0.6).rgb * 0.25
          + textureLod(uRefl, clamp(ruv - st * 0.6, lo, hi), lod + 0.6).rgb * 0.25;
  pr = min(pr, vec3(48.0));
  float pw = mix(1.0 - smoothstep(0.55, 0.9, r), 1.0, max(gPuddle, gSoak)) * uReflOn;
  radiance = mix(radiance, pr, pw);
}
`;
  function Ib(i, e) {
    let t = {
        uTime: { value: 0 },
        uWetG: (i.mats && i.mats.uniforms && i.mats.uniforms.wet) || {
          value: 1,
        },
        uReflOn: { value: 0 },
        uReflLod: { value: 0 },
        uMarkRes: { value: e.marks.image.width },
        uMaskRes: { value: e.mask.image.width },
        uMask: { value: e.mask },
        uMarks: { value: e.marks },
        uDetail: { value: e.detail },
        uDetailN: { value: e.detailN },
        uRefl: { value: e.black },
        uMaskRect: { value: new W(Li.x0, Li.z0, 1 / Li.size) },
        uMarkRect: { value: new Dt(fa.x0, fa.z0, 1 / fa.w, 1 / fa.h) },
        uReflMatrix: { value: new Ye() },
        uReflScale: { value: new Ae(0.5, 0.5) },
      },
      n = new Qt({ color: 16777215, roughness: 1, metalness: 0 });
    ((n.name = "apron_wet"),
      (n.onBeforeCompile = (r) => {
        (Object.assign(r.uniforms, t),
          (r.vertexShader =
            `varying vec3 vGWorld;
` +
            r.vertexShader.replace(
              "#include <begin_vertex>",
              `#include <begin_vertex>
  vGWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;`,
            )),
          (r.fragmentShader = r.fragmentShader
            .replace(
              "#include <common>",
              `#include <common>
` + TR,
            )
            .replace("#include <map_fragment>", AR)
            .replace(
              "#include <roughnessmap_fragment>",
              "float roughnessFactor = gRough;",
            )
            .replace(
              "#include <normal_fragment_maps>",
              `#include <normal_fragment_maps>
  normal = normalize(mat3(viewMatrix) * normalize(vec3(-gNxz.x, 1.0, -gNxz.y)));`,
            )
            .replace(
              "#include <lights_physical_fragment>",
              `#include <lights_physical_fragment>
  material.specularColor = mix(material.specularColor, vec3(0.075), max(gPuddle, gSoak * 0.5));`,
            )
            .replace(
              "#include <lights_fragment_maps>",
              `#include <lights_fragment_maps>
` + RR,
            )
            .replace(
              "#include <lights_fragment_end>",
              `#include <lights_fragment_end>
  reflectedLight.directSpecular = min(reflectedLight.directSpecular, vec3(40.0));`,
            )));
      }),
      (n.customProgramCacheKey = () => "saltline-apron-3"));
    let s = new rn(400, 400, 1, 1).rotateX(-Math.PI / 2),
      o = new Qe(s, n);
    return (
      (o.receiveShadow = !0),
      (o.castShadow = !1),
      (o.name = "apron"),
      (o.matrixAutoUpdate = !1),
      o.updateMatrix(),
      { mesh: o, material: n, uniforms: t }
    );
  }
  function zb(i, e, t) {
    let n = new Wn();
    (n.layers.set(0), (n.matrixAutoUpdate = !0));
    let s = new si(16, 16, {
      type: js,
      format: _n,
      colorSpace: Er,
      minFilter: Ln,
      magFilter: Zt,
      generateMipmaps: !0,
      depthBuffer: !0,
      stencilBuffer: !1,
      samples: 0,
    });
    s.texture.name = "planarReflection";
    let o = new W(),
      r = new W(),
      a = new Ye(),
      l = new Ae(),
      c = new go(),
      u = new Dt(),
      h = new Dt(),
      f = new Ye().set(
        0.5,
        0,
        0,
        0.5,
        0,
        0.5,
        0,
        0.5,
        0,
        0,
        0.5,
        0.5,
        0,
        0,
        0,
        1,
      ),
      p = [],
      d = { target: s, camera: n, enabled: !0, active: !1 };
    function v(g, x, y) {
      let b = i.quality.planar || 0;
      if (!d.enabled || b <= 0) {
        ((e.uReflOn.value = 0), (d.active = !1));
        return;
      }
      if ((o.setFromMatrixPosition(y.matrixWorld), o.y < 0.03)) {
        ((e.uReflOn.value = 0), (d.active = !1));
        return;
      }
      let m = i.render && i.render.resolution;
      m && m.x > 8 ? l.copy(m) : g.getDrawingBufferSize(l);
      let A = Math.max(64, Math.round((l.x * b) / 16) * 16),
        _ = Math.max(32, Math.round((l.y * b) / 8) * 8);
      ((s.width !== A || s.height !== _) && s.setSize(A, _),
        a.extractRotation(y.matrixWorld),
        r.set(0, 0, -1).applyMatrix4(a).add(o),
        n.position.set(o.x, -o.y, o.z),
        n.up.set(0, 1, 0).applyMatrix4(a),
        (n.up.y = -n.up.y),
        (r.y = -r.y),
        n.lookAt(r),
        (n.near = y.near),
        (n.far = y.far),
        n.updateMatrixWorld(!0),
        n.matrixWorldInverse.copy(n.matrixWorld).invert(),
        n.projectionMatrix.copy(y.projectionMatrix),
        e.uReflMatrix.value
          .copy(f)
          .multiply(n.projectionMatrix)
          .multiply(n.matrixWorldInverse),
        c.normal.set(0, 1, 0),
        (c.constant = 0.01),
        c.applyMatrix4(n.matrixWorldInverse),
        u.set(c.normal.x, c.normal.y, c.normal.z, c.constant));
      let M = n.projectionMatrix.elements;
      ((h.x = (Math.sign(u.x) + M[8]) / M[0]),
        (h.y = (Math.sign(u.y) + M[9]) / M[5]),
        (h.z = -1),
        (h.w = (1 + M[10]) / M[14]),
        u.multiplyScalar(2 / u.dot(h)),
        (M[2] = u.x),
        (M[6] = u.y),
        (M[10] = u.z + 1),
        (M[14] = u.w),
        n.projectionMatrixInverse.copy(n.projectionMatrix).invert());
      let E = y.projectionMatrix.elements;
      (e.uReflScale.value.set(E[0] * 0.5, E[5] * 0.5),
        (e.uReflLod.value = Math.log2(Math.max(_, 1) / 270)));
      for (let w = 0; w < t.length; w++)
        ((p[w] = t[w].visible), (t[w].visible = !1));
      try {
        i.render.renderWorld(n, s);
      } finally {
        for (let w = 0; w < t.length; w++) t[w].visible = p[w];
      }
      ((e.uRefl.value = s.texture), (e.uReflOn.value = 1), (d.active = !0));
    }
    return ((d.pass = v), d);
  }
  var B1 = [
      [-0.92, 0.39, 9.5, 0.06],
      [-0.75, -0.66, 5.7, 0.04],
      [-0.99, 0.12, 3.3, 0.026],
      [-0.5, 0.87, 2, 0.016],
    ],
    Db = [
      [-0.8, 0.6, 1.31, 0.02],
      [-0.95, -0.31, 0.83, 0.014],
      [-0.35, -0.94, 0.57, 0.01],
      [-0.6, 0.8, 0.39, 0.007],
      [-1, 0.05, 0.27, 0.005],
      [0.3, 0.95, 0.47, 0.006],
      [-0.86, -0.51, 0.21, 0.0035],
    ];
  for (let i of B1.concat(Db)) {
    let e = Math.hypot(i[0], i[1]);
    ((i[0] /= e),
      (i[1] /= e),
      (i[4] = (2 * Math.PI) / i[2]),
      (i[5] = Math.sqrt(9.81 * i[4])));
  }
  function Lb(i, e, t) {
    let n = 1 - bs.smoothstep(Math.hypot(i - 30, e), 50, 220),
      s = 0;
    for (let o of B1)
      s += o[3] * Math.sin(o[4] * (o[0] * i + o[1] * e) - o[5] * t);
    return oi.seaY + s * n;
  }
  var Ub = `
uniform vec3 uBoxMin[4]; uniform vec3 uBoxMax[4];
bool wInside(vec3 p){
  for (int i = 0; i < 4; i++) { if (all(greaterThan(p, uBoxMin[i])) && all(lessThan(p, uBoxMax[i]))) return true; }
  return false;
}
float wPhase(float c){ float g = 0.72; return (1.0 - g * g) / (12.566 * pow(1.0 + g * g - 2.0 * g * c, 1.5)); }
`,
    kR = `
uniform float uTime, uRain, uPix; uniform vec3 uVel, uBox, uSunDir, uSunCol, uAmb;
attribute vec4 aSeed;
varying vec3 vCol; varying float vA; varying vec2 vUv;
${Ub}
uniform vec4 uSky[8];   // roof openings (x, z, half w, half d): rain falls through these into the shed
bool wSky(vec3 p){
  for (int i = 0; i < 8; i++) { if (abs(p.x - uSky[i].x) < uSky[i].z && abs(p.z - uSky[i].y) < uSky[i].w) return true; }
  return false;
}
void main(){
  vUv = position.xy;
  float sp = 0.82 + 0.36 * aSeed.w;
  vec3 vel = uVel * sp;
  vec3 p; float len; float kill = 0.0;
  p = aSeed.xyz * uBox + vel * uTime;
  p = mod(p - cameraPosition + 0.5 * uBox, uBox) - 0.5 * uBox + cameraPosition;
  p += vec3(sin(uTime * 0.9 + aSeed.x * 40.0), 0.3 * sin(uTime * 0.7 + aSeed.y * 30.0), cos(uTime * 0.8 + aSeed.z * 35.0)) * 0.6;   // ash flutters on the wind
  len = max(0.06, 0.02 * length(vel));
  if (fract(aSeed.w * 7.13 + aSeed.x) > uRain) kill = 1.0;
  if (wInside(p) && !wSky(p)) kill = 1.0;
  if (p.y < 0.0) kill = 1.0;
  vec3 dir = normalize(vel);
  vec3 toP = p - cameraPosition; float dist = length(toP);
  vec3 side = normalize(cross(dir, toP));
  float w0 = 0.02 + 0.035 * fract(aSeed.w * 3.7);
  float w = max(w0, dist * uPix * 0.75);
  vec3 wp = p + dir * (len * (position.y - 0.5)) + side * (w * position.x);
  float a = (w0 / w) * smoothstep(0.7, 2.6, dist) * (1.0 - smoothstep(0.38, 0.5, dist / uBox.x));
  float c = dot(toP / max(dist, 1e-3), uSunDir);
  float emb = step(0.955, fract(aSeed.w * 17.9 + aSeed.y * 3.1));          // ~4% of flakes are still-glowing embers
  vec3 ash = vec3(0.20, 0.17, 0.16) + uAmb * 0.6 + uSunCol * wPhase(c) * 0.5;
  vCol = mix(ash, vec3(2.4, 0.85, 0.22), emb);
  vA = min(1.0, a * (0.55 + 0.45 * fract(aSeed.w * 13.3)) * (1.0 + emb));
  gl_Position = kill > 0.5 ? vec4(2.0, 2.0, 2.0, 1.0) : projectionMatrix * viewMatrix * vec4(wp, 1.0);
}`,
    FR = `
varying vec3 vCol; varying float vA; varying vec2 vUv;
void main(){
  float r = length(vec2(vUv.x * 2.0, (vUv.y - 0.5) * 2.0));
  gl_FragColor = vec4(vCol, vA * smoothstep(1.0, 0.25, r));
}`;
  function Fb(i, t) {
    let n = new ea();
    (n.setAttribute(
      "position",
      new et(
        new Float32Array([-0.5, 0, 0, 0.5, 0, 0, -0.5, 1, 0, 0.5, 1, 0]),
        3,
      ),
    ),
      n.setIndex([0, 1, 2, 2, 1, 3]));
    let s = new Float32Array(i * 4);
    for (let o = 0; o < i * 4; o++) s[o] = t();
    return (
      n.setAttribute("aSeed", new zs(s, 4)),
      (n.instanceCount = i),
      (n.boundingSphere = new Dn(new W(), 1e5)),
      n
    );
  }
  function Nb(i) {
    let t = i.rng && i.rng.fork ? i.rng.fork() : Math.random,
      n = Math.max(0.15, i.quality.rain || 0.5),
      s = Math.round(14e3 * n),
      a = [0, 1, 2, 3].map(() => new W()),
      l = [0, 1, 2, 3].map(() => new W()),
      c = Mn.color.clone().multiplyScalar(1.9),
      u = en.fog.clone().multiplyScalar(0.15),
      h = {
        uTime: { value: 0 },
        uRain: { value: 0.6 },
        uBoxMin: { value: a },
        uBoxMax: { value: l },
        uSunDir: { value: Mn.dir.clone() },
        uSunCol: { value: c },
        uAmb: { value: u },
      },
      f = [0, 1, 2, 3, 4, 5, 6, 7].map(() => new Dt(0, 0, -1, -1)),
      p = {
        ...h,
        uSky: { value: f },
        uPix: { value: 0.002 },
        uVel: { value: new W(-1.4, -1.5, 0.7) },
        uBox: { value: new W(26, 15, 26) },
      },
      d = new zn({
        uniforms: p,
        vertexShader: kR,
        fragmentShader: FR,
        transparent: !0,
        depthWrite: !1,
        blending: 1, // NormalBlending: ash is dark, rain was additive
        side: Sn,
        fog: !1,
      }),
      v = new Qe(Fb(s, t), d);
    ((v.frustumCulled = !1),
      (v.renderOrder = 900),
      (v.name = "ash"),
      (v.matrixAutoUpdate = !1),
      (v.castShadow = v.receiveShadow = !1));
    let b = 0.6,
      m = 0.6,
      A = 22 + t() * 25,
      _ = 0,
      M = new Ae();
    return {
      rain: v,
      wind: p.uVel.value,
      setRain(w) {
        m = Math.min(1, Math.max(0, w));
      },
      get rainLevel() {
        return b;
      },
      update(w) {
        ((_ += w),
          (b += (m - b) * Math.min(1, w * 0.8)),
          (h.uTime.value = _),
          (h.uRain.value = b),
          (v.visible = b > 0.01));
        let S = i.camera;
        if (S) {
          let O = i.render && i.render.resolution;
          (O && O.x > 8 ? M.copy(O) : i.renderer.getDrawingBufferSize(M),
            (p.uPix.value =
              (2 * Math.tan((S.fov * Math.PI) / 360)) / Math.max(1, M.y)));
        }
        let z = (i.level && i.level.interiorBoxes) || [];
        for (let O = 0; O < 4; O++) {
          let q = z[O];
          q && q.min && q.max
            ? (a[O].set(q.min.x - 0.15, q.min.y - 1, q.min.z - 0.15),
              l[O].set(q.max.x + 0.15, q.max.y + 0.3, q.max.z + 0.15))
            : (a[O].set(0, 0, 0), l[O].set(0, 0, 0));
        }
        let H = (i.level && i.level.skylights) || [];
        for (let O = 0; O < 8; O++) {
          let q = H[O];
          q && q.w > 0
            ? f[O].set(q.x, q.z, q.w * 0.5, (q.d || q.w) * 0.5)
            : f[O].set(0, 0, -1, -1);
        }
        ((A -= w),
          A <= 0 &&
            ((A = 30 + t() * 30),
            i.events.emit("thunder", { intensity: 0.3 + 0.7 * t() })));
      },
    };
  }
  async function O1(i) {
    let e = (i.quality.tex || 512) >= 1024,
      t = Math.min(
        8,
        i.renderer.capabilities.getMaxAnisotropy
          ? i.renderer.capabilities.getMaxAnisotropy()
          : 1,
      ),
      n = e ? 1024 : 512,
      s = Rb(n),
      o = N1(s, n, { repeat: !1, aniso: 2 }),
      r = e ? 512 : 256,
      { det: a, nrm: l } = Cb(r),
      c = N1(a, r, { aniso: t }),
      u = N1(l, r, { aniso: t });
    try {
      document.fonts &&
        document.fonts.load &&
        (await Promise.race([
          document.fonts.load('900 40px "Big Shoulders Display"'),
          new Promise((M) => setTimeout(M, 350)),
        ]));
    } catch {}
    let h = stadiumPaint(e ? 2048 : 1024, t),
      f = new ui(new Uint8Array([0, 0, 0, 255]), 1, 1);
    f.needsUpdate = !0;
    let p = { mask: o, detail: c, detailN: u, marks: h, black: f },
      d = new wt();
    d.name = "ground";
    let v = Ib(i, p),
      x = Nb(i);
    (d.add(v.mesh, x.rain), i.scene.add(d));
    let y = zb(i, v.uniforms, [v.mesh, x.rain]);
    i.render && i.render.addPrePass && i.render.addPrePass(y.pass);
    let b = (M, E) => {
        let w = i.level && i.level.interiorBoxes;
        if (!w) return !1;
        for (let S = 0; S < w.length; S++) {
          let z = w[S];
          if (
            z &&
            z.min &&
            M > z.min.x &&
            M < z.max.x &&
            E > z.min.z &&
            E < z.max.z
          )
            return !0;
        }
        return !1;
      },
      m = (M, E) =>
        M > Li.x0 && M < Li.x0 + Li.size && E > Li.z0 && E < Li.z0 + Li.size,
      A = 0,
      _ = {
        root: d,
        apron: v.mesh,
        rain: x.rain,
        planar: y,
        reflectionTarget: y.target,
        reflectionCamera: y.camera,
        maskTexture: o,
        uniforms: v.uniforms,
        puddleDepth(M, E) {
          return M > oi.quayX || !m(M, E) || b(M, E)
            ? -0.2
            : 0.5 - U1(s, n, M, E, 0);
        },
        isPuddle(M, E) {
          return _.puddleDepth(M, E) > 0.015;
        },
        wetnessAt(M, E) {
          if (M > oi.quayX) return 1;
          if (b(M, E)) return 0.12;
          if (!m(M, E)) return 0.6;
          let w = 0.5 - U1(s, n, M, E, 0);
          if (w > 0.015) return 1;
          let S = bs.smoothstep,
            z = S(w, -0.11, 0),
            H = S(w, -0.65, -0.02),
            O = 1 - S(U1(s, n, M, E, 1) + H * 0.55, 0.2, 0.42);
          return Math.min(0.95, 0.25 + (1 - O) * 0.4 + z * 0.3);
        },
        seaHeight(M, E) {
          return Lb(M, E, A);
        },
        setRain(M) {
          x.setRain(M);
        },
        get rainLevel() {
          return x.rainLevel;
        },
        setReflections(M) {
          y.enabled = !!M;
        },
        update(M) {
          ((A += M),
            x.update(M),
            (v.uniforms.uTime.value = A));
        },
      };
    return _;
  }
  async function BR(i) {
    let e = i.scene.children.find(
      (o) =>
        o.isMesh &&
        o.geometry &&
        o.geometry.type === "PlaneGeometry" &&
        o.geometry.parameters &&
        o.geometry.parameters.width === 80,
    );
    (e && i.scene.remove(e), (i.ground = await O1(i)));
    let t = new wt(),
      n = (o, r, a, l, c, u = 0) => {
        let h = new Qe(o, r);
        return (
          h.position.set(a, l, c),
          (h.rotation.y = u),
          (h.castShadow = h.receiveShadow = !0),
          t.add(h),
          h
        );
      },
      s = (o) => i.mats.get(o);
    return (
      n(new un(6.06, 2.59, 2.44), s("paint_red"), 3, 1.295, -0.2),
      n(new un(6.06, 2.59, 2.44), s("paint_blue"), 9.4, 1.295, -0.2),
      n(new un(6.06, 2.59, 2.44), s("paint_teal"), 9.4, 3.885, -0.2),
      n(new un(12.19, 2.59, 2.44), s("paint_yellow"), 3, 1.295, 11.2),
      n(new un(6.06, 2.59, 2.44), s("paint_white"), 12.4, 1.295, 11.2),
      n(new un(1.1, 1.1, 1.1), s("paint_orange"), 5.6, 0.55, 4.7, 0.4),
      n(new Ys(0.29, 0.29, 0.88, 20), s("plastic_blue"), 3.9, 0.44, 6.3),
      n(new Ys(0.29, 0.29, 0.88, 20), s("steel_rust"), 4.6, 0.44, 6.6),
      n(new Ys(0.06, 0.06, 5, 10), s("steel_galv"), 12.5, 2.5, 6.2),
      n(new un(0.08, 1.6, 0.08), i.mats.emissive(16726556, 6), 6.6, 0.82, 2.6),
      n(new un(0.08, 1.6, 0.08), i.mats.emissive(3524863, 5), 2.2, 0.82, 3.2),
      n(new un(2.4, 0.08, 0.06), i.mats.emissive(16773328, 6), 9.4, 2.2, 1.06),
      n(new un(0.3, 0.12, 0.3), i.mats.emissive(16760944, 12), 12.5, 5, 6.2),
      n(new un(0.06, 1.2, 0.06), i.mats.emissive(5832570, 5), 23, 0.62, 8.2),
      n(new un(1.2, 1.2, 1.2), s("steel_dark"), 22.4, 0.6, 9.6, 0.3),
      i.scene.add(t),
      { cam: [-9, 1.65, 5.6], target: [14, 0.4, 5] }
    );
  }
