  var ex = {};
  br(ex, { TUNE: () => Ui, create: () => Em, showcase: () => VC });
  var iu = class {
    constructor() {
      ((this.bones = []),
        (this.index = {}),
        (this.slots = {}),
        (this.order = []));
    }
    bone(e, t, n = 0, s = 0, o = 0) {
      let r = t ? this.bones[this.index[t]] : null;
      if (t && !r) throw new Error("rig: unknown parent bone " + t);
      let a = {
        name: e,
        parent: r ? r.i : -1,
        local: [n, s, o],
        world: [
          n + (r ? r.world[0] : 0),
          s + (r ? r.world[1] : 0),
          o + (r ? r.world[2] : 0),
        ],
        i: this.bones.length,
      };
      return ((this.index[e] = a.i), this.bones.push(a), a);
    }
    add(e, t, n, s = [1, 1, 1], o = !0) {
      let r = this.bones[this.index[t]];
      if (!r) throw new Error("rig: unknown bone " + t);
      let a = n;
      a.attributes.normal || a.computeVertexNormals();
      for (let p of Object.keys(a.attributes))
        p !== "position" &&
          p !== "normal" &&
          p !== "uv" &&
          a.deleteAttribute(p);
      let l = a.attributes.position.count;
      (a.attributes.uv ||
        a.setAttribute("uv", new et(new Float32Array(l * 2), 2)),
        a.translate(r.world[0], r.world[1], r.world[2]));
      let c = new Float32Array(l * 3),
        u = new Uint16Array(l * 4),
        h = new Float32Array(l * 4),
        f = a.attributes.normal;
      for (let p = 0; p < l; p++) {
        let d = o ? 0.74 + 0.26 * (f.getY(p) * 0.5 + 0.5) : 1;
        ((c[p * 3] = s[0] * d),
          (c[p * 3 + 1] = s[1] * d),
          (c[p * 3 + 2] = s[2] * d),
          (u[p * 4] = r.i),
          (h[p * 4] = 1));
      }
      return (
        a.setAttribute("color", new et(c, 3)),
        a.setAttribute("skinIndex", new et(u, 4)),
        a.setAttribute("skinWeight", new et(h, 4)),
        this.slots[e] || ((this.slots[e] = []), this.order.push(e)),
        this.slots[e].push(a),
        this
      );
    }
    build(e) {
      let t = (e || this.order).filter(
          (o) => this.slots[o] && this.slots[o].length,
        ),
        n = t.map((o) => {
          let r = this.slots[o],
            l = r.some((u) => !u.index)
              ? r.map((u) => (u.index ? u.toNonIndexed() : u))
              : r,
            c = sa(l, !1);
          return c.index ? c.toNonIndexed() : c;
        }),
        s = sa(n, !0);
      return (
        s.computeBoundingSphere(),
        s.computeBoundingBox(),
        {
          geometry: s,
          slots: t,
          bones: this.bones,
          tris: s.attributes.position.count / 3,
        }
      );
    }
  };
  function pm(
    i,
    e,
    {
      castShadow: t = !0,
      receiveShadow: n = !0,
      radius: s = 1.5,
      center: o = [0, 0.5, 0],
      extra: r = null,
    } = {},
  ) {
    let a = i.bones.map((p) => {
      let d = new Fa();
      return (
        (d.name = p.name),
        d.position.set(p.local[0], p.local[1], p.local[2]),
        d
      );
    });
    i.bones.forEach((p, d) => {
      p.parent >= 0 && a[p.parent].add(a[d]);
    });
    let l = new wt(),
      c = new ka(
        i.geometry,
        i.slots.map((p) => e[p]),
      );
    ((c.castShadow = t),
      (c.receiveShadow = n),
      l.add(c),
      i.bones.forEach((p, d) => {
        p.parent < 0 && c.add(a[d]);
      }),
      l.updateMatrixWorld(!0));
    let u = new k0(a);
    (c.bind(u),
      (c.boundingSphere = new Dn(new W(o[0], o[1], o[2]), s)),
      (c.boundingBox = new $n(
        new W(o[0] - s, o[1] - s, o[2] - s),
        new W(o[0] + s, o[1] + s, o[2] + s),
      )));
    let h = {};
    a.forEach((p) => {
      h[p.name] = p;
    });
    let f = { group: l, mesh: c, bones: h, skeleton: u, extraMesh: null };
    if (r) {
      let p = new ka(
        r.def.geometry,
        r.def.slots.map((d) => e[d]),
      );
      ((p.castShadow = !1),
        (p.receiveShadow = !1),
        (p.renderOrder = 5),
        l.add(p),
        p.updateMatrixWorld(!0),
        p.bind(u, c.bindMatrix),
        (p.boundingSphere = new Dn(new W(o[0], o[1], o[2]), r.radius || s)),
        (p.boundingBox = new $n().setFromCenterAndSize(
          p.boundingSphere.center,
          new W(1, 1, 1).multiplyScalar(2 * (r.radius || s)),
        )),
        (f.extraMesh = p));
    }
    return f;
  }
  function q_(i, e, t, n, s, o, r, a) {
    let l = e * e + t * t,
      c = Math.sqrt(Math.max(l - o * o, 1e-6));
    ((i.abd = Math.atan2(t, e) - Math.atan2(-c, s * o)),
      i.abd > Math.PI
        ? (i.abd -= 2 * Math.PI)
        : i.abd < -Math.PI && (i.abd += 2 * Math.PI));
    let u = Math.hypot(c, n),
      h = (r + a) * 0.995,
      f = Math.abs(r - a) + 0.03;
    ((i.reach = u / (r + a)), u > h ? (u = h) : u < f && (u = f));
    let p = Math.atan2(n, c),
      d = (r * r + u * u - a * a) / (2 * r * u),
      v = (r * r + a * a - u * u) / (2 * r * a),
      g = Math.acos(d < -1 ? -1 : d > 1 ? 1 : d),
      x = Math.acos(v < -1 ? -1 : v > 1 ? 1 : v);
    return ((i.hip = g - p), (i.knee = -(Math.PI - x)), i);
  }
  var Ss = [1.15, 1.15, 1.15],
    vm = [0.95, 0.96, 0.97],
    Ts = [1, 0.34, 0.08],
    s0 = [0.1, 0.11, 0.12],
    ga = [0.035, 0.035, 0.038],
    Of = [1, 0.7, 0.07],
    As = [1, 1, 1],
    Yn = [2.4, 2.5, 2.6],
    an = [0.45, 0.46, 0.48],
    IC = [9, 9, 9.6],
    zC = [5.5, 4, 1.6],
    va = Math.PI / 2,
    ft = (i, e, t, n = 0.008) => Wi(i, e, t, n),
    Ce = (i, e, t, n, s = 0, o = 0, r = 0, a = 1) =>
      Dc(i, { p: [e, t, n], r: [s, o, r], s: a }),
    ds = (i, e, t, n = 12) => ot(i, e, t, n),
    Ro = (i, e, t, n = 12) => Dc(ot(i, e, t, n), { r: [0, 0, -va] }),
    Si = (i, e, t, n = 12) => Dc(ot(i, e, t, n), { r: [va, 0, 0] }),
    mm = new W(),
    gm = new W(),
    X_ = new Lt(),
    DC = new W(0, 1, 0),
    Y_ = new Ye(),
    LC = new W(1, 1, 1);
  function su(i, e, t, n = t, s = 8) {
    (mm.set(i[0], i[1], i[2]), gm.set(e[0], e[1], e[2]));
    let o = mm.distanceTo(gm),
      r = ot(n, t, o, s);
    return (
      X_.setFromUnitVectors(DC, gm.clone().sub(mm).normalize()),
      Y_.compose(mm.clone().add(gm).multiplyScalar(0.5), X_, LC),
      r.applyMatrix4(Y_),
      r
    );
  }
  var Ur = (i, e = 14, t = 10, n = 1, s = 1, o = 1) => {
      let r = new ls(i, e, t);
      return (r.scale(n, s, o), r);
    },
    $_ = (i, e, t) => Ce(Ro(0.0075, 0.0075, 0.006, 6), i, e, t),
    Yv = (i, e, t) => Ce(ds(0.0075, 0.0075, 0.006, 6), i, e, t),
    kC = (i, e, t) => Ce(Si(0.0075, 0.0075, 0.006, 6), i, e, t),
    $v = {
      stand: 0.72,
      L1: 0.4,
      L2: 0.42,
      l0: 0.075,
      hipX: 0.165,
      hipY: -0.01,
      hipZ: 0.4,
      footX: 0.275,
      footZ: [0.37, 0.37, -0.42, -0.42],
      legs: ["FL", "FR", "RL", "RR"],
      side: [1, -1, 1, -1],
      fore: [1, 1, -1, -1],
      muzzle: [0, 0, 0.43],
      eye: [0, 0, 0.14],
      footR: 0.046,
    };
  function Z_() {
    let i = $v,
      e = new iu();
    (e.bone("root", null, 0, 0, 0),
      e.bone("body", "root", 0, i.stand, 0),
      e.bone("neck", "body", 0, 0.06, 0.49),
      e.bone("head", "neck", 0, 0.13, 0.12),
      e.bone("turret", "body", 0, 0.152, -0.03),
      e.bone("gun", "turret", 0, 0.095, 0.02),
      e.bone("antenna", "body", -0.105, 0.15, -0.46),
      e.bone("beacon", "body", 0.105, 0.2, -0.455));
    for (let n = 0; n < 4; n++) {
      let s = i.legs[n],
        o = i.side[n];
      (e.bone("abd" + s, "body", o * i.hipX, i.hipY, i.fore[n] * i.hipZ),
        e.bone("thigh" + s, "abd" + s, o * i.l0, 0, 0),
        e.bone("shin" + s, "thigh" + s, 0, -i.L1, 0));
    }
    let t = (n, s, o, r, a) => e.add(n, s, o, r, a);
    (t("metal", "body", Ce(ft(0.27, 0.2, 0.98, 0.02), 0, -0.01, 0), an),
      t("shell", "body", Ce(ft(0.35, 0.05, 0.3, 0.014), 0, 0.125, 0.33), Ss),
      t("shell", "body", Ce(ft(0.35, 0.05, 0.36, 0.014), 0, 0.125, -0.012), Ss),
      t(
        "shell",
        "body",
        Ce(ft(0.1, 0.052, 0.36, 0.01), 0, 0.126, -0.012 + 0),
        vm,
      ));
    for (let n of [-0.15, 0.15])
      for (let s of [0.21, 0.45, -0.17, 0.145])
        t("metal", "body", Yv(n, 0.152, s), Yn);
    t("metal", "body", Ce(ft(0.31, 0.03, 0.25, 0.006), 0, 0.112, -0.335), As);
    for (let n = 0; n < 10; n++)
      t(
        "metal",
        "body",
        Ce(ft(0.007, 0.062, 0.225, 0.002), -0.126 + n * 0.028, 0.155, -0.335),
        Yn,
      );
    (t("metal", "body", Ce(ft(0.3, 0.012, 0.02, 0.003), 0, 0.186, -0.24), an),
      t("metal", "body", Ce(ft(0.3, 0.012, 0.02, 0.003), 0, 0.186, -0.43), an));
    for (let n of [1, -1]) {
      (t(
        "shell",
        "body",
        Ce(ft(0.032, 0.15, 0.31, 0.012), n * 0.15, 0.022, -0.075),
        Ss,
      ),
        t(
          "shell",
          "body",
          Ce(ft(0.032, 0.15, 0.135, 0.012), n * 0.15, 0.022, 0.1625),
          vm,
        ),
        t(
          "metal",
          "body",
          Fn(
            [
              [n * 0.168, 0.06, 0.125],
              [n * 0.182, 0.06, 0.135],
              [n * 0.182, 0.06, 0.19],
              [n * 0.168, 0.06, 0.2],
            ],
            0.005,
            5,
          ),
          Yn,
        ),
        t(
          "shell",
          "body",
          Ce(ft(0.034, 0.016, 0.135, 0.004), n * 0.151, -0.035, 0.1625),
          Of,
        ),
        t(
          "shell",
          "body",
          Ce(ft(0.034, 0.042, 0.46, 0.008), n * 0.151, -0.078, 0),
          Ts,
        ),
        t(
          "shell",
          "body",
          Ce(ft(0.028, 0.1, 0.11, 0.008), n * 0.146, 0.01, 0.305),
          s0,
        ));
      for (let s = 0; s < 4; s++)
        t(
          "metal",
          "body",
          Ce(
            ft(0.004, 0.012, 0.085, 0.001),
            n * 0.161,
            -0.02 + s * 0.022,
            0.305,
          ),
          an,
        );
      for (let s of [-0.035, 0.08])
        for (let o of [-0.21, 0.06, 0.115, 0.21])
          t("metal", "body", $_(n * 0.167, s, o), Yn);
      t(
        "metal",
        "body",
        Fn(
          [
            [n * 0.135, 0.148, -0.19],
            [n * 0.135, 0.205, -0.16],
            [n * 0.135, 0.212, 0],
            [n * 0.135, 0.205, 0.43],
            [n * 0.135, 0.148, 0.465],
          ],
          0.0105,
          6,
        ),
        Yn,
      );
      for (let s of [0, 0.26])
        t(
          "metal",
          "body",
          Ce(ds(0.008, 0.008, 0.06, 6), n * 0.135, 0.178, s),
          Yn,
        );
      (t(
        "shell",
        "body",
        Fn(
          [
            [n * 0.118, -0.105, -0.36],
            [n * 0.132, -0.118, -0.2],
            [n * 0.13, -0.112, 0.1],
            [n * 0.118, -0.1, 0.36],
          ],
          0.009,
          5,
        ),
        ga,
      ),
        t(
          "metal",
          "body",
          Ce(new Ci(0.02, 0.005, 5, 10), n * 0.17, 0.085, -0.335, 0, va, 0),
          Yn,
        ));
    }
    (t("shell", "body", Ce(ft(0.3, 0.15, 0.075, 0.018), 0, -0.005, 0.505), Ts),
      t("shell", "body", Ce(ft(0.2, 0.07, 0.02, 0.006), 0, 0.012, 0.545), s0));
    for (let n = 0; n < 6; n++)
      t(
        "shell",
        "body",
        Ce(
          ft(0.05, 0.034, 0.014, 0.003),
          -0.125 + n * 0.05,
          -0.098,
          0.538,
          0,
          0,
          0,
        ),
        n % 2 ? s0 : Of,
      );
    for (let n of [-0.115, 0.115])
      (t("metal", "body", Ce(Si(0.021, 0.021, 0.014, 10), n, 0.012, 0.547), an),
        t(
          "glow",
          "body",
          Ce(Si(0.015, 0.015, 0.004, 10), n, 0.012, 0.556),
          [6.5, 4.6, 2.2],
          !1,
        ));
    (t("metal", "body", Ce(ft(0.24, 0.095, 0.56, 0.02), 0, -0.145, 0), As),
      t("shell", "body", Ce(ft(0.246, 0.03, 0.09, 0.006), 0, -0.14, 0.12), Ts),
      t("shell", "body", Ce(ft(0.246, 0.03, 0.09, 0.006), 0, -0.14, -0.12), Ts),
      t("shell", "body", Ce(ft(0.29, 0.15, 0.05, 0.014), 0, 0, -0.495), Ss),
      t("shell", "body", Ce(ft(0.17, 0.05, 0.012, 0.004), 0, 0.03, -0.523), s0),
      t(
        "glow",
        "body",
        Ce(ft(0.13, 0.012, 0.004, 0.001), 0, 0.03, -0.531),
        [5, 0.3, 0.1],
        !1,
      ),
      t(
        "metal",
        "body",
        Ce(Si(0.022, 0.022, 0.02, 10), 0.085, -0.035, -0.525),
        Yn,
      ),
      t(
        "metal",
        "body",
        Ce(new Ci(0.024, 0.006, 5, 10), -0.07, -0.05, -0.528, va, 0, 0),
        Yn,
      ));
    for (let n of [-0.125, 0.125])
      for (let s of [-0.055, 0.055]) t("metal", "body", kC(n, s, -0.523), Yn);
    (t(
      "shell",
      "body",
      Fn(
        [
          [0.09, 0.15, -0.2],
          [0.13, 0.2, -0.16],
          [0.12, 0.2, -0.08],
          [0.09, 0.165, -0.05],
        ],
        0.009,
        5,
      ),
      ga,
    ),
      t(
        "metal",
        "neck",
        su([0, -0.02, -0.02], [0, 0.11, 0.1], 0.045, 0.036, 10),
        an,
      ));
    for (let n = 0; n < 3; n++) {
      let s = 0.2 + n * 0.28;
      t(
        "shell",
        "neck",
        su(
          [0, -0.02 + 0.13 * s - 0.008, -0.02 + 0.12 * s - 0.0075],
          [0, -0.02 + 0.13 * s + 0.008, -0.02 + 0.12 * s + 0.0075],
          0.052,
          0.052,
          10,
        ),
        ga,
      );
    }
    (t("shell", "neck", Ce(ft(0.13, 0.05, 0.1, 0.012), 0, -0.01, -0.03), Ss),
      t(
        "shell",
        "neck",
        Fn(
          [
            [0.05, -0.02, -0.04],
            [0.07, 0.05, 0.02],
            [0.06, 0.11, 0.07],
            [0.045, 0.12, 0.1],
          ],
          0.007,
          5,
        ),
        ga,
      ),
      t("shell", "head", Ce(ft(0.19, 0.118, 0.25, 0.03), 0, 0, 0), Ss),
      t(
        "shell",
        "head",
        Ce(ft(0.168, 0.074, 0.03, 0.012), 0, -0.004, 0.118),
        s0,
      ),
      t(
        "lens",
        "head",
        Ce(ft(0.128, 0.024, 0.006, 0.002), 0, 0.006, 0.1345),
        [1, 1, 1],
        !1,
      ));
    for (let n of [-0.056, 0.056])
      (t(
        "metal",
        "head",
        Ce(Si(0.015, 0.015, 0.012, 10), n, -0.022, 0.132),
        an,
      ),
        t(
          "metal",
          "head",
          Ce(Si(0.009, 0.009, 0.004, 8), n, -0.022, 0.139),
          [0.1, 0.12, 0.2],
        ));
    (t("shell", "head", Ce(ft(0.062, 0.008, 0.2, 0.003), 0, 0.06, -0.005), Ts),
      t("metal", "head", Ce(Ro(0.032, 0.032, 0.214, 12), 0, 0, -0.055), an));
    for (let n of [1, -1])
      t(
        "shell",
        "head",
        Ce(Ro(0.022, 0.022, 0.006, 10), n * 0.108, 0, -0.055),
        Ts,
      );
    (t("metal", "head", Ce(ds(0.036, 0.036, 0.026, 14), 0, 0.072, -0.05), an),
      t(
        "metal",
        "head",
        Ce(ds(0.037, 0.037, 0.006, 14), 0, 0.074, -0.05),
        [0.2, 0.3, 0.5],
      ),
      t("metal", "head", Ce(ft(0.12, 0.03, 0.13, 0.008), 0, -0.068, 0.02), As));
    for (let n of [-0.08, 0.08])
      for (let s of [-0.09, 0.07]) t("metal", "head", Yv(n, 0.061, s), Yn);
    (t("metal", "turret", Ce(ds(0.105, 0.118, 0.034, 18), 0, 0, 0), an),
      t("metal", "turret", Ce(ft(0.18, 0.02, 0.16, 0.005), 0, 0.026, 0), As));
    for (let n of [1, -1])
      (t(
        "shell",
        "turret",
        Ce(ft(0.028, 0.115, 0.15, 0.012), n * 0.078, 0.085, 0.005),
        Ss,
      ),
        t(
          "metal",
          "turret",
          Ce(Ro(0.022, 0.022, 0.008, 10), n * 0.094, 0.095, 0.02),
          Yn,
        ));
    (t("shell", "gun", Ce(ft(0.108, 0.086, 0.21, 0.016), 0, 0, -0.012), Ss),
      t(
        "shell",
        "gun",
        Ce(ft(0.11, 0.02, 0.212, 0.006), 0, -0.022, -0.012),
        Ts,
      ),
      t("metal", "gun", Ce(Si(0.035, 0.035, 0.11, 12), 0, 0, 0.145), an));
    for (let n = 0; n < 4; n++)
      t(
        "metal",
        "gun",
        Ce(Si(0.039, 0.039, 0.008, 12), 0, 0, 0.105 + n * 0.026),
        As,
      );
    (t("metal", "gun", Ce(Si(0.022, 0.024, 0.3, 12), 0, 0, 0.25), As),
      t("metal", "gun", Ce(Si(0.036, 0.036, 0.06, 10), 0, 0, 0.395), an),
      t(
        "metal",
        "gun",
        Ce(ft(0.08, 0.012, 0.025, 0.003), 0, 0, 0.395),
        [0.15, 0.15, 0.15],
      ),
      t(
        "metal",
        "gun",
        Ce(Ro(0.056, 0.056, 0.06, 14), 0.084, -0.004, -0.045),
        an,
      ),
      t(
        "metal",
        "gun",
        Ce(Ro(0.02, 0.02, 0.066, 8), 0.084, -0.004, -0.045),
        zC,
      ),
      t("metal", "gun", Ce(ft(0.036, 0.036, 0.095, 0.008), -0.03, 0.06, 0), an),
      t(
        "glow",
        "gun",
        Ce(Si(0.011, 0.011, 0.003, 8), -0.03, 0.06, 0.049),
        [1.6, 0.12, 0.05],
        !1,
      ),
      t(
        "shell",
        "gun",
        Fn(
          [
            [0.05, -0.03, -0.11],
            [0.06, -0.07, -0.13],
            [0.04, -0.09, -0.1],
          ],
          0.008,
          5,
        ),
        ga,
      ),
      t(
        "metal",
        "body",
        Ce(ds(0.022, 0.026, 0.05, 10), 0.105, 0.175, -0.455),
        an,
      ),
      t(
        "glow",
        "beacon",
        Ce(Ur(0.02, 10, 6, 1, 1.25, 1), 0, 0.012, 0),
        [14, 5.5, 0.5],
        !1,
      ),
      t("metal", "antenna", Ce(ds(0.011, 0.014, 0.05, 8), 0, 0.025, 0), an),
      t("metal", "antenna", Ce(ds(0.0028, 0.005, 0.62, 5), 0, 0.36, 0), an),
      t("shell", "antenna", Ce(Ur(0.009, 6, 4), 0, 0.67, 0), Ts));
    for (let n = 0; n < 4; n++) {
      let s = i.legs[n],
        o = i.side[n],
        r = "abd" + s,
        a = "thigh" + s,
        l = "shin" + s;
      (t("metal", r, Ce(Si(0.06, 0.06, 0.17, 14), -o * 0.02, 0, 0), an),
        t("shell", r, Ce(ft(0.11, 0.05, 0.155, 0.014), o * 0, 0.058, 0), Ss),
        t("metal", r, Ce(Si(0.03, 0.03, 0.18, 8), -o * 0.02, 0, 0), Yn),
        t("shell", a, Ce(Ro(0.078, 0.078, 0.07, 18), 0, 0, 0), Ss),
        t("shell", a, Ce(Ro(0.081, 0.081, 0.016, 18), o * 0.012, 0, 0), Ts),
        t("metal", a, Ce(Ro(0.048, 0.048, 0.082, 12), 0, 0, 0), an));
      for (let c = 0; c < 5; c++) {
        let u = c * 1.2566;
        t(
          "metal",
          a,
          $_(o * 0.039, Math.cos(u) * 0.062, Math.sin(u) * 0.062),
          Yn,
        );
      }
      (t(
        "shell",
        a,
        Ce(ft(0.062, i.L1 - 0.07, 0.1, 0.022), 0, -i.L1 * 0.5 - 0.005, 0.004),
        Ss,
      ),
        t(
          "metal",
          a,
          Ce(ft(0.044, i.L1 - 0.04, 0.06, 0.012), 0, -i.L1 * 0.5, -0.035),
          an,
        ),
        t("shell", a, Ce(ft(0.065, 0.045, 0.103, 0.01), 0, -0.145, 0.004), Ts),
        t("shell", a, Ce(ft(0.064, 0.012, 0.102, 0.004), 0, -0.26, 0.004), s0),
        t(
          "metal",
          a,
          su([0, -0.06, -0.082], [0, -i.L1 * 0.62, -0.078], 0.021, 0.021, 10),
          Yn,
        ),
        t(
          "metal",
          a,
          su(
            [0, -i.L1 * 0.62, -0.078],
            [0, -i.L1 + 0.025, -0.058],
            0.009,
            0.009,
            6,
          ),
          IC,
        ),
        t("metal", a, Ce(ft(0.05, 0.03, 0.035, 0.006), 0, -0.055, -0.07), As),
        t(
          "shell",
          a,
          Fn(
            [
              [o * 0.036, -0.02, 0.05],
              [o * 0.044, -0.13, 0.062],
              [o * 0.042, -0.28, 0.058],
              [o * 0.034, -i.L1 + 0.03, 0.035],
            ],
            0.0065,
            5,
          ),
          ga,
        ),
        t("metal", a, Ce(Ro(0.05, 0.05, 0.086, 14), 0, -i.L1, 0), an),
        t("shell", a, Ce(Ro(0.036, 0.036, 0.092, 12), 0, -i.L1, 0), vm),
        t(
          "metal",
          l,
          Ce(ds(0.03, 0.021, i.L2 - 0.08, 10), 0, -(i.L2 - 0.08) / 2 - 0.01, 0),
          an,
        ),
        t("shell", l, Ce(ft(0.052, 0.21, 0.04, 0.014), 0, -0.14, 0.02), Ss),
        t("shell", l, Ce(ft(0.054, 0.02, 0.042, 0.006), 0, -0.215, 0.02), Ts),
        t("metal", l, Ce(ft(0.03, 0.06, 0.05, 0.008), 0, -0.02, -0.03), As),
        t("metal", l, Ce(ds(0.024, 0.03, 0.03, 10), 0, -i.L2 + 0.085, 0), Yn),
        t(
          "shell",
          l,
          Ce(
            Ur(i.footR + 0.002, 12, 8, 1, 0.86, 1.08),
            0,
            -i.L2 + i.footR * 0.86,
            0.004,
          ),
          ga,
        ));
    }
    return e.build(["shell", "metal", "glow", "lens"]);
  }
  var Kv = {
      hp: 140,
      shotDamage: 5,
      burst: 4,
      burstGap: 0.11,
      telegraph: 0.5,
      cooldown: [1.8, 3],
      runSpeed: 4.5,
      stalkSpeed: 2,
      patrolSpeed: 1.5,
      accel: 7,
      turnRate: 2.5,
      rangeMin: 8,
      rangeMax: 18,
      spreadFar: 0.12,
      spreadNear: 0.045,
      lungeRange: 3,
      lungeDamage: 15,
      lungeCooldown: 3.5,
      lungeSpeed: 9.5,
      replan: 0.6,
      smokeBelow: 0.4,
    },
    Gt = Kv,
    ni = $v,
    ps = new W(),
    ru = new W(),
    Po = new W(),
    Io = new W(),
    eM = new W(),
    Vf = new W(),
    jv = new W(0, 1, 0),
    bm = { abd: 0, hip: 0, knee: 0, reach: 0 },
    _m = [8, 4, 0.7],
    NC = [14, 1, 0.35],
    Mm = (i, e) => {
      let t = (i - e) % (Math.PI * 2);
      return (
        t > Math.PI ? (t -= Math.PI * 2) : t < -Math.PI && (t += Math.PI * 2),
        t
      );
    },
    uo = (i, e, t) => (i < e ? e : i > t ? t : i),
    wm = [
      [0, 3],
      [1, 2],
    ];
  function xa(i, e, t, n, s) {
    return ((i.v += ((e - i.x) * t - i.v * n) * s), (i.x += i.v * s), i.x);
  }
  function iM(i, e, t, n, createVisual) {
    let s = i.G,
      o = i.rng,
      r = t.lensBase.clone(),
      a = pm(
        e,
        { shell: t.shell, metal: t.metal, glow: t.glow, lens: r },
        { radius: 1.5, center: [0, 0.6, 0] },
      ),
      l = a.bones;
    a.group.visible = !1;
    let c = [],
      u = [],
      h = [];
    for (let T = 0; T < 4; T++)
      (c.push(l["abd" + ni.legs[T]]),
        u.push(l["thigh" + ni.legs[T]]),
        h.push(l["shin" + ni.legs[T]]));
    let f = s.mats.label("H-" + String(n + 3).padStart(2, "0"), {
        color: "black",
        font: "stencil",
        distress: 0.3,
      }),
      p = 0.2,
      d = Math.min(0.085, p / (f.aspect || 3)),
      v = new rn(p, d);
    (v.rotateY(Math.PI / 2), v.translate(0.1675, 0.03, -0.085));
    let g = new rn(p, d);
    (g.rotateY(-Math.PI / 2), g.translate(-0.1675, 0.03, -0.085));
    let x = i.mergeSimple([v, g]),
      y = new Qe(x, f.material);
    ((y.castShadow = !1), (y.receiveShadow = !0), l.body.add(y));
    const visual = createVisual();
    a.group.traverse(object => {
      if (object.isMesh) object.visible = false;
    });
    a.group.add(visual.mount);
    let b = [0, 1, 2, 3].map(() => ({
        p: new W(),
        from: new W(),
        to: new W(),
        slide: new W(),
      })),
      m = {
        id: 0,
        type: "ankylosaurus",
        pos: a.group.position,
        alive: !1,
        hp: Gt.hp,
        maxHp: Gt.hp,
        size: ANKYLOSAURUS_SIZE,
        damageScale: 1,
        active: !1,
        rig: a,
        lens: r,
        feet: b,
        yaw: 0,
        speed: 0,
        yawRate: 0,
        home: new W(),
        lastKnown: new W(),
        goal: new W(),
        firePos: new W(),
        firePlayer: new W(),
        sensor: new W(),
        fwd: new W(0, 0, 1),
        muzzle: new W(),
        headPos: new W(),
        push: new W(),
        mode: "patrol",
        los: !1,
        seeT: 0,
        noSeeT: 0,
        senseT: 0,
        exposure: 0,
        modeT: 0,
        passive: !1,
        hasToken: !1,
        es: "move",
        esT: 0,
        cool: 1,
        shots: 0,
        bursts: 0,
        lungeCd: 0,
        path: null,
        wp: 0,
        planT: 0,
        hasGoal: !1,
        waitT: 0,
        moveT: 0,
        stuckT: 0,
        sw: -1,
        swT: 0,
        swDur: 0.2,
        lastPair: 1,
        idleT: 0,
        lift: 0.08,
        sY: { x: 0, v: 0 },
        sP: { x: 0, v: 0 },
        sR: { x: 0, v: 0 },
        sL: { x: 0, v: 0 },
        sA: { x: 0, v: 0 },
        sA2: { x: 0, v: 0 },
        crouch: 0,
        tyaw: 0,
        tpitch: 0,
        hyaw: 0,
        hpitch: 0,
        flare: 0,
        lensC: [_m[0], _m[1], _m[2]],
        smokeT: 0,
        phase: 0,
        scan: 0,
        dieT: 0,
        vy: 0,
        dieRoll: 0,
        diePitch: 0,
        wreck: !1,
        sink: 0,
        loop: null,
        prevSpeed: 0,
        maxSpeed: Gt.patrolSpeed,
        damage(T, D, C, G) {
          if (!m.alive) return !1;
          if (
            ((m.hp -= T),
            s.events.emit("enemy:hit", {
              enemy: m,
              point: D,
              part: G || "body",
            }),
            C)
          ) {
            let j = Math.cos(m.yaw),
              N = Math.sin(m.yaw),
              Q = Math.min(1.6, T / 28),
              K = C.x * N + C.z * j,
              ie = C.x * j - C.z * N;
            ((m.sL.v += ie * 1.4 * Q),
              (m.sR.v += -ie * 3.2 * Q),
              (m.sP.v += K * 2.4 * Q * (G === "weak" ? 1.6 : 1)),
              (m.sY.v -= 0.5 * Q));
          }
          return m.hp <= 0 ? (q(C), !0) : !1;
        },
        _activate(T, D = {}) {
          route = [];
          waypoint = replan = shotsLeft = windup = 0;
          m.size = D.size ?? ANKYLOSAURUS_SIZE;
          m.maxHp = D.hp ?? Gt.hp * (D.hpScale ?? 1);
          m.damageScale = D.damageScale ?? 1;
          ((m.active = !0),
            (m.alive = !0),
            (m.wreck = !1),
            (m.hp = m.maxHp),
            (m.passive = !!D.passive),
            (m.sink = 0),
            m.pos.copy(T),
            (m.pos.y = s.physics.groundHeight(T.x, T.z, T.y + 1)),
            m.home.copy(m.pos),
            (m.yaw = D.yaw ?? o() * 6.283),
            (m.speed = 0),
            (m.yawRate = 0),
            m.push.set(0, 0, 0),
            (m.mode = D.state === "alert" ? "investigate" : "patrol"),
            (m.modeT = 10),
            (m.modeSeen = m.mode),
            m.lastKnown.copy(D.target || (s.player ? s.player.pos : T)),
            (m.los = !1),
            (m.seeT = m.noSeeT = 0),
            (m.exposure = 0),
            (m.senseT = o() * 0.2),
            (m.hasToken = !1),
            (m.patrolR = D.patrolRadius ?? 7),
            (m.patrolLine = D.patrolLine || null),
            (m.patrolI = 0),
            (m.es = "move"),
            (m.cool = 0.6 + o()),
            (m.lungeCd = 0.3),
            (m.path = null),
            (m.hasGoal = !1),
            (m.waitT = o() * 1.5),
            (m.planT = 0),
            (m.sw = -1),
            (m.idleT = 0),
            (m.crouch = 0),
            (m.feelT = 0),
            (m.blocked = !1),
            (m.flare = 0),
            (m.phase = o() * 6.283),
            (m.dieT = 0),
            (m.tyaw = m.hyaw = 0),
            (m.tpitch = m.hpitch = 0));
          for (let C of [m.sY, m.sP, m.sR, m.sL, m.sA, m.sA2])
            ((C.x = 0), (C.v = 0));
          for (let C = 0; C < 4; C++) A(b[C].p, C, m.pos.x, m.pos.z, m.yaw);
          if (
            (l.neck.rotation.set(0, 0, 0),
            l.gun.rotation.set(0, 0, 0),
            visual.reset(m.size),
            (a.group.visible = !0),
            O(0.016),
            s.audio && s.audio.loop && !m.loop)
          )
            try {
              m.loop = s.audio.loop("ankylosaurus_servo", { pos: m.pos, gain: 0 });
            } catch {
              m.loop = null;
            }
        },
        _deactivate() {
          if (
            ((m.active = !1),
            (m.alive = !1),
            (m.wreck = !1),
            (a.group.visible = !1),
            m.loop)
          ) {
            try {
              m.loop.stop();
            } catch {}
            m.loop = null;
          }
        },
        _raycast(T, D, C, G) {
          const scale = m.size;
          let hit = false;
          if (sM(T, D, m.headPos, .155 * scale, C, G)) {
            G.part = "weak";
            G.enemy = m;
            hit = true;
          }
          const forwardX = Math.sin(m.yaw) * scale;
          const forwardZ = Math.cos(m.yaw) * scale;
          const height = m.pos.y + .49 * scale;
          ps.set(m.pos.x - forwardX * .42, height, m.pos.z - forwardZ * .42);
          ru.set(m.pos.x + forwardX * .40, height, m.pos.z + forwardZ * .40);
          if (nM(T, D, ps, ru, .26 * scale, C, G)) {
            G.part = "body";
            G.enemy = m;
            hit = true;
          }
          ps.y = ru.y = m.pos.y + .24 * scale;
          if (nM(T, D, ps, ru, .22 * scale, C, G)) {
            G.part = "body";
            G.enemy = m;
            hit = true;
          }
          return hit;
        },
        _update(T) {
          m.alive ? S(T) : U(T);
        },
      };
    function A(T, D, C, G, j) {
      let N = ni.side[D] * ni.footX,
        Q = ni.footZ[D],
        K = Math.cos(j),
        ie = Math.sin(j);
      return (T.set(C + N * K + Q * ie, 0, G - N * ie + Q * K), T);
    }
    const firingPoint = new W();
    const targetPoint = new W();
    const shotDirection = new W();
    const sightOrigin = new W();
    let route = [], waypoint = 0, replan = 0, shotsLeft = 0, windup = 0;
    function clearShot(from, to) {
      shotDirection.subVectors(to, from);
      const distance = shotDirection.length();
      if (distance < .05) return false;
      shotDirection.multiplyScalar(1 / distance);
      return !s.physics.raycast(from, shotDirection, distance) &&
        !s.level?.raycastArena?.(from, shotDirection, distance);
    }
    function findFiringRoute(player, distance, preferred) {
      const nav = s.physics.nav;
      const bearing = Math.atan2(m.pos.x - player.pos.x, m.pos.z - player.pos.z);
      const radii = distance < preferred ? [preferred, preferred + 3] : [preferred, preferred - 3];
      let best = null, bestScore = Infinity, escape = null, escapeScore = Infinity;
      for (const radius of radii) {
        for (const turn of [0, .5, -.5, 1, -1, 1.65, -1.65, 2.5, -2.5, Math.PI]) {
          const angle = bearing + turn;
          firingPoint.set(player.pos.x + Math.sin(angle) * radius, 0,
            player.pos.z + Math.cos(angle) * radius);
          if (!nav.isWalkable(firingPoint.x, firingPoint.z)) continue;
          sightOrigin.copy(firingPoint).y += Math.max(.6, m.size * .62);
          const visible = clearShot(sightOrigin, targetPoint);
          let score = m.pos.distanceToSquared(firingPoint);
          for (const ally of i.list) {
            if (ally !== m && ally.alive && ally.type === "ankylosaurus" &&
                ally.pos.distanceToSquared(firingPoint) < 16) score += 110;
          }
          if (score >= escapeScore && (!visible || score >= bestScore)) continue;
          const path = nav.findPath(m.pos, firingPoint);
          if (!path?.length) continue;
          if (score < escapeScore) {
            escapeScore = score;
            escape = path;
          }
          if (visible && score < bestScore) {
            bestScore = score;
            best = path;
          }
        }
      }
      return best || escape || (distance > preferred ? nav.findPath(m.pos, player.pos) : null) || [];
    }
    function S(dt) {
      const player = s.player;
      const distance = player ? Math.hypot(player.pos.x - m.pos.x, player.pos.z - m.pos.z) : Infinity;
      const small = m.size === 1;
      const near = small ? 6 : 10, far = small ? 15 : 22;
      const preferred = (near + far) * .5;
      m.prevSpeed = m.speed;
      m.speed = 0;
      m.cool -= dt;
      const oldYaw = m.yaw;
      let canFire = false;
      if (!m.passive && player?.alive) {
        targetPoint.copy(player.pos).y += 1;
        visual.muzzle.getWorldPosition(m.muzzle);
        canFire = distance >= near && distance <= far && clearShot(m.muzzle, targetPoint);
        m.mode = "engage";
        if (canFire) {
          m.wantYaw = Math.atan2(player.pos.x - m.pos.x, player.pos.z - m.pos.z);
          replan = 0;
        } else {
          shotsLeft = 0;
          windup = 0;
          if ((replan -= dt) <= 0) {
            route = findFiringRoute(player, distance, preferred);
            waypoint = 0;
            replan = .7 + o() * .2;
          }
          while (waypoint < route.length && route[waypoint].distanceToSquared(m.pos) < .5 ** 2) waypoint++;
          const next = route[waypoint];
          if (next) {
            const dx = next.x - m.pos.x, dz = next.z - m.pos.z;
            const length = Math.hypot(dx, dz);
            m.wantYaw = Math.atan2(dx, dz);
            const step = Math.min(length, dt * (small ? 4.8 : 3.5));
            if (length > .001 && Math.abs(Mm(m.wantYaw, m.yaw)) < .65 &&
                s.physics.nav.isWalkable(m.pos.x + dx * step / length, m.pos.z + dz * step / length)) {
              m.pos.x += dx * step / length;
              m.pos.z += dz * step / length;
              m.pos.y = s.physics.groundHeight(m.pos.x, m.pos.z, m.pos.y + .6);
              m.speed = step / dt;
            }
          }
        }
        m.yaw += uo(Mm(m.wantYaw, m.yaw), -Gt.turnRate * dt, Gt.turnRate * dt);
        if (canFire) {
          const dx = targetPoint.x - m.muzzle.x, dz = targetPoint.z - m.muzzle.z;
          m.tyaw = Mm(Math.atan2(dx, dz), m.yaw);
          m.tpitch = uo(Math.atan2(m.muzzle.y - targetPoint.y, Math.hypot(dx, dz)), -.9, .65);
        } else {
          m.tyaw = 0;
          m.tpitch = 0;
        }
      }
      m.yawRate = (m.yaw - oldYaw) / dt;
      m.fwd.set(Math.sin(m.yaw), 0, Math.cos(m.yaw));
      m.sensor.copy(m.headPos);
      H(dt);
      O(dt);
      if (canFire && Math.abs(m.tyaw) < .55) {
        if (!shotsLeft && m.cool <= 0) {
          shotsLeft = small ? 2 : 4;
          windup = small ? .35 : .6;
          s.events.emit("enemy:telegraph", { enemy: m, pos: m.muzzle, time: windup });
        }
        if (shotsLeft && (windup -= dt) <= 0) {
          visual.muzzle.getWorldPosition(m.muzzle);
          if (clearShot(m.muzzle, targetPoint)) z(player);
          shotsLeft--;
          windup = .16;
          if (!shotsLeft) m.cool = small ? 2.2 : 2.8;
        }
      }
      m.loop?.setPos(m.pos);
      m.loop?.setGain(.12 + m.speed * .1);
    }
    function z(T) {
      visual.muzzle.getWorldPosition(m.muzzle);
      Vf.set(T.pos.x, T.pos.y + 1, T.pos.z);
      Po.copy(Vf).sub(m.muzzle).normalize();
      let G =
        (m.size === 1 ? .025 : .016) * (1 + i.playerSpeed * .07);
      ((Po.x += (o() - 0.5) * 2 * G),
        (Po.y += (o() - 0.5) * 2 * G),
        (Po.z += (o() - 0.5) * 2 * G),
        Po.normalize());
      const wall = s.physics.raycast(m.muzzle, Po, 28);
      const j = s.level?.raycastArena?.(m.muzzle, Po, wall?.dist ?? 28) || wall;
      const Q = s.combat.enemyShot(m.muzzle, Po, {
          damage: Math.max(0, Gt.shotDamage * m.damageScale - (m.size === 1 ? 0 : 1)),
          range: 28,
        })
          ? m.muzzle.distanceTo(Vf)
          : j
            ? j.dist
            : 28;
      (eM.copy(m.muzzle).addScaledVector(Po, Q),
        s.fx.tracer(m.muzzle, eM, {
          color: 16760944,
          speed: 260,
          width: 0.035,
        }),
        s.fx.muzzleFlash(m.muzzle, Po, { scale: 0.9 }),
        s.render &&
          s.render.lightPool &&
          s.render.lightPool.flash(m.muzzle, 16756832, 22, 7, 0.05),
        s.events.emit("enemy:fire", {
          enemy: m,
          pos: m.muzzle,
          dir: Po,
          type: "ankylosaurus",
        }),
        (m.sP.v += 1.1),
        (m.sY.v -= 0.25));
    }
    function H(T) {
      let D = Math.sin(m.yaw) * m.speed + m.push.x,
        C = Math.cos(m.yaw) * m.speed + m.push.z,
        G = m.speed > 0.15 || Math.abs(m.yawRate) > 0.25;
      if (m.sw < 0) {
        m.idleT = G ? 0 : m.idleT + T;
        let j = m.speed + Math.abs(m.yawRate) * 0.5,
          N = uo(0.27 - j * 0.026, 0.14, 0.27),
          Q = -1,
          K = 0;
        for (let F = 0; F < 2; F++) {
          let X = 0;
          for (let ne of wm[F]) {
            A(ps, ne, m.pos.x + D * N, m.pos.z + C * N, m.yaw + m.yawRate * N);
            let re = Math.hypot(ps.x - b[ne].p.x, ps.z - b[ne].p.z);
            re > X && (X = re);
          }
          (F !== m.lastPair && (X *= 1.25), X > K && ((K = X), (Q = F)));
        }
        let ie = G ? 0.09 : m.idleT > 0.25 ? 0.035 : 1e9;
        if (Q >= 0 && K > ie) {
          ((m.sw = Q),
            (m.swT = 0),
            (m.swDur = N),
            (m.lift = 0.065 + Math.min(0.09, j * 0.02)));
          for (let F of wm[Q]) {
            let X = b[F];
            (X.from.copy(X.p),
              A(
                X.to,
                F,
                m.pos.x + D * N * 1.5,
                m.pos.z + C * N * 1.5,
                m.yaw + m.yawRate * N * 1.5,
              ),
              (X.to.y = s.physics.groundHeight(X.to.x, X.to.z, m.pos.y + 0.6)));
          }
        }
      } else {
        m.swT += T / m.swDur;
        let j = m.swT >= 1 ? 1 : m.swT,
          N = j * j * (3 - 2 * j);
        for (let Q of wm[m.sw]) {
          let K = b[Q];
          (K.p.lerpVectors(K.from, K.to, N),
            (K.p.y += Math.sin(Math.PI * j) * m.lift));
        }
        if (m.swT >= 1) {
          ((m.sY.v -= 0.12 + m.speed * 0.03),
            (m.lastPair = m.sw),
            (m.sw = -1));
        }
      }
    }
    function O(T) {
      let D = Math.cos(m.yaw),
        C = Math.sin(m.yaw),
        G = (b[0].p.y + b[1].p.y) * 0.5,
        j = (b[2].p.y + b[3].p.y) * 0.5,
        N = (b[0].p.y + b[2].p.y) * 0.5,
        Q = (b[1].p.y + b[3].p.y) * 0.5,
        K = (G + j) * 0.5 - m.pos.y,
        ie = T > 0 ? (m.speed - m.prevSpeed) / T : 0,
        F = Math.atan2(j - G, 0.8) * 0.6 + uo(ie * 0.006, -0.07, 0.07),
        X =
          Math.atan2(N - Q, 0.55) * 0.6 +
          uo(m.yawRate * m.speed * 0.02, -0.12, 0.12),
        ne = K * 0.45 - Math.min(0.05, m.speed * 0.011);
      (m.alive || ((F = m.diePitch), (X = m.dieRoll), (ne = 0)),
        m.alive &&
          (xa(m.sY, ne, 160, 17, T),
          xa(m.sP, F, 130, 15, T),
          xa(m.sR, X, 130, 15, T),
          xa(m.sL, 0, 110, 13, T)));
      let re = m.alive ? Math.sin(i.t * 1.7 + m.phase) * 0.004 : 0,
        $ = m.sL.x,
        ue = ni.stand + m.sY.x - m.crouch + re,
        me = m.sP.x,
        ee = m.sR.x;
      ((a.group.rotation.y = m.yaw),
        l.body.position.set($, ue, 0),
        l.body.rotation.set(me, 0, ee),
        (l.turret.rotation.y = m.tyaw),
        (l.gun.rotation.x = m.tpitch - me * 0.5),
        l.head.rotation.set(m.hpitch, m.hyaw, 0),
        xa(m.sA, uo(-ie * 0.03 - me, -0.6, 0.6), 60, 5, T),
        xa(m.sA2, uo(m.yawRate * 0.12 - ee, -0.6, 0.6), 60, 5, T),
        l.antenna.rotation.set(m.sA.x, 0, m.sA2.x));
      let B = Math.cos(me),
        P = Math.sin(me),
        V = Math.cos(ee),
        Y = Math.sin(ee);
      for (let L = 0; L < 4; L++) {
        let Z = b[L].p,
          J = Z.x - m.pos.x,
          oe = Z.y + ni.footR * 0.6 - m.pos.y,
          fe = Z.z - m.pos.z,
          le = J * D - fe * C - $,
          R = oe - ue,
          I = J * C + fe * D,
          se = R * B + I * P,
          ae = -R * P + I * B,
          k = le * V + se * Y,
          ce = -le * Y + se * V;
        (q_(
          bm,
          k - ni.side[L] * ni.hipX,
          ce - ni.hipY,
          ae - ni.fore[L] * ni.hipZ,
          ni.side[L],
          ni.l0,
          ni.L1,
          ni.L2 - ni.footR * 0.6,
        ),
          (c[L].rotation.z = bm.abd),
          (u[L].rotation.x = bm.hip),
          (h[L].rotation.x = bm.knee));
      }
      visual.update(T, m.speed, m.tyaw, m.tpitch, !m.alive, ee, pos => {
        s.events.emit("enemy:step", { pos, type: "ankylosaurus", enemy: m, ankylosaurus: true });
      });
      visual.head.getWorldPosition(m.headPos);
    }
    function q(T) {
      ((m.alive = !1),
        (m.dieT = 0),
        (m.vy = 0),
        (m.es = "move"),
        l.beacon.scale.setScalar(1e-4),
        (m.dieRoll = (o() < 0.5 ? -1 : 1) * (0.25 + o() * 0.3)),
        (m.diePitch = (o() - 0.5) * 0.25),
        (m.sR.v += m.dieRoll * 3),
        (m.sP.v += (o() - 0.5) * 2));
      for (let D = 0; D < 4; D++) {
        let C = b[D];
        m.sw >= 0 && (C.p.y = m.pos.y);
        let G = m.yaw,
          j = ni.side[D] * (0.16 + o() * 0.2),
          N = ni.fore[D] * (0.05 + o() * 0.22) + (o() - 0.5) * 0.1;
        C.slide.set(
          j * Math.cos(G) + N * Math.sin(G),
          0,
          -j * Math.sin(G) + N * Math.cos(G),
        );
      }
      ((m.sw = -1),
        (m.speed *= 0.3),
        ps.copy(m.headPos),
        s.fx.sparks(ps, jv, 16),
        s.fx.debris(ps, { count: 4 }),
        s.events.emit("enemy:killed", { enemy: m, pos: m.pos, type: "ankylosaurus", turretPos: visual.turret.getWorldPosition(new W()) }),
        i.addWreck(m));
    }
    function U(T) {
      if (m.sink > 0) {
        ((m.sink += T), (m.pos.y -= 0.22 * T), m.sink > 3.2 && i.retire(m));
        return;
      }
      m.dieT += T;
      let D = m.dieT;
      if (D < 2.2) {
        let C = 0.215 - ni.stand;
        ((m.vy -= 9.8 * T * (D < 0.12 ? 0.3 : 1)),
          (m.sY.x += m.vy * T),
          m.sY.x < C &&
            ((m.sY.x = C),
            m.vy < -1.2 &&
              (s.events.emit("enemy:step", {
                pos: m.pos,
                type: "ankylosaurus",
                enemy: m,
                speed: 5,
                crash: !0,
              }),
              s.fx.dust(m.pos, jv)),
            (m.vy = -m.vy * 0.22)),
          xa(m.sP, m.diePitch, 60, 9, T),
          xa(m.sR, m.dieRoll, 60, 9, T),
          xa(m.sL, 0, 40, 8, T));
        let G = Math.exp(-3.2 * T);
        for (let N = 0; N < 4; N++) {
          let Q = b[N];
          ((Q.p.x += Q.slide.x * (1 - G)),
            (Q.p.z += Q.slide.z * (1 - G)),
            Q.slide.multiplyScalar(G));
        }
        ((m.pos.x += Math.sin(m.yaw) * m.speed * T),
          (m.pos.z += Math.cos(m.yaw) * m.speed * T),
          (m.speed *= Math.exp(-5 * T)),
          (m.hpitch += (0.55 - m.hpitch) * (1 - Math.exp(-5 * T))),
          (m.hyaw += (m.dieRoll - m.hyaw) * (1 - Math.exp(-3 * T))),
          (m.tpitch += (0.3 - m.tpitch) * (1 - Math.exp(-4 * T))));
        let j = D < 1.2 ? (Math.sin(D * 60) > 0.2 ? 1 - D / 1.2 : 0.05) : 0.02;
        (r.color.setRGB(6 * j + 0.05, 0.6 * j + 0.01, 0.2 * j), O(T));
      }
      if (D < 6.5)
        ((m.smokeT -= T),
          m.smokeT <= 0 &&
            ((m.smokeT = D < 2 ? 0.09 : 0.2),
            ps.set(
              m.pos.x + (o() - 0.5) * 0.4,
              m.pos.y + 0.42,
              m.pos.z + (o() - 0.5) * 0.4,
            ),
            s.fx.smoke(ps, {
              size: 0.5 + o() * 0.3,
              life: 1.8,
              color: 1513499,
              rise: 1.1,
            }),
            D < 4 &&
              o() < 0.55 &&
              (ru.set(o() - 0.5, 1, o() - 0.5).normalize(),
              s.fx.sparks(ps, ru, D < 1 ? 8 : 3)),
            D < 3.5 &&
              o() < 0.4 &&
              s.fx.smoke(ps, {
                size: 0.22,
                life: 0.45,
                color: 16742946,
                rise: 1.6,
              })));
      else if (!m.wreck && ((m.wreck = !0), m.loop)) {
        try {
          m.loop.stop();
        } catch {}
        m.loop = null;
      }
      m.loop && m.loop.setGain(Math.max(0, 0.4 - D * 0.3));
    }
    return m;
  }
  function sM(i, e, t, n, s, o) {
    let r = i.x - t.x,
      a = i.y - t.y,
      l = i.z - t.z,
      c = r * e.x + a * e.y + l * e.z,
      u = r * r + a * a + l * l - n * n,
      h = c * c - u;
    if (h < 0) return !1;
    let f = -c - Math.sqrt(h);
    return f < 0 || f > s || f >= o.dist
      ? !1
      : ((o.dist = f),
        o.point.copy(i).addScaledVector(e, f),
        o.normal.copy(o.point).sub(t).normalize(),
        !0);
  }
  var au = new W(),
    Jv = new W(),
    tM = new W();
  function nM(i, e, t, n, s, o, r) {
    (au.copy(n).sub(t), Jv.copy(i).sub(t));
    let a = au.dot(au),
      l = au.dot(e),
      c = au.dot(Jv),
      u = e.dot(Jv),
      h = a - l * l,
      f = h > 1e-8 ? (c - l * u) / h : 0;
    return (
      (f = f < 0 ? 0 : f > 1 ? 1 : f),
      tM.copy(t).addScaledVector(au, f),
      sM(i, e, tM, s, o, r)
    );
  }
  var Ui = {
      ankylosaurus: Kv,
      sightRange: 45,
      sightCone: 200,
      loseSight: 4,
      searchTime: 8,
      hearRadius: 45,
      maxTokens: 2,
      maxTokensCrowd: 3,
      tokenGap: 1.25,
      exposureUp: 0.1,
      exposureDown: 0.45,
      poolAnkylosaurus: 10,
      maxWrecks: 5,
      maxBolts: 32,
    },
    BC = Math.cos(((Ui.sightCone / 2) * Math.PI) / 180),
    oM = new W(),
    pz = new W(),
    Qv = new W(),
    rM = new Lt(),
    aM = new Ye(),
    lM = new W(1, 1, 1),
    OC = new W(0, 0, 1),
    mz = new W(0, -1, 0),
    cM = new W(),
    uM = new W();
  async function Em(i) {
    let e = il(+((i.params && i.params.eseed) || 9001)),
      t = [],
      n = [],
      s = new wt();
    ((s.name = "enemies"), i.scene.add(s));
    let o = i.mats.emissive(16777215, 1),
      r = o && o.isMeshBasicMaterial ? o.clone() : new Nn();
    (r.color.setRGB(1, 1, 1), (r.vertexColors = !0), (r.needsUpdate = !0));
    let a = i.mats.emissive(16752704, 6),
      l = a && a.isMeshBasicMaterial ? a : new Nn({ color: 16752704 }),
      c = o && o.toneMapped !== void 0 ? o.toneMapped : !0,
      u = {
        shell: i.mats.get("armor_white", { triplanar: !0, vertexColors: !0 }),
        metal: i.mats.get("gunmetal", { triplanar: !0, vertexColors: !0 }),
        glow: r,
        lensBase: l,
        disc: new Nn({
          color: 789775,
          transparent: !0,
          opacity: 0.42,
          depthWrite: !1,
          side: Sn,
          toneMapped: c,
        }),
        cone: new zn({
          uniforms: {
            uColor: { value: new Ve(1, 0.9, 0.74) },
            uGain: { value: 0.085 },
          },
          vertexShader: `
        #include <common>
        #include <skinning_pars_vertex>
        varying float vT; varying vec3 vN; varying vec3 vV;
        void main() {
          #include <beginnormal_vertex>
          #include <skinbase_vertex>
          #include <skinnormal_vertex>
          #include <begin_vertex>
          #include <skinning_vertex>
          vec4 mv = modelViewMatrix * vec4(transformed, 1.0);
          vN = normalMatrix * objectNormal; vV = -mv.xyz; vT = 1.0 - uv.y;
          gl_Position = projectionMatrix * mv;
        }`,
          fragmentShader: `
        uniform vec3 uColor; uniform float uGain;
        varying float vT; varying vec3 vN; varying vec3 vV;
        void main() {
          float f = abs(dot(normalize(vN), normalize(vV)));
          f = f * f * (3.0 - 2.0 * f);
          float t = clamp(vT, 0.0, 1.0);
          float k = pow(1.0 - t, 1.7) * (0.35 + 0.65 * smoothstep(0.0, 0.06, t));
          gl_FragColor = vec4(uColor * (uGain * f * k), 1.0);
        }`,
          transparent: !0,
          blending: hr,
          depthWrite: !1,
          side: Sn,
          fog: !1,
        }),
      },
      h = {
        G: i,
        rng: e,
        list: t,
        t: 0,
        playerSpeed: 0,
        mergeSimple: (T) => sa(T, !1),
        addWreck(T) {
          if (i.campaign) {
            // Leave the pool intact during the damage callback; retire at the next update.
            n.push(T);
            return;
          }
          for (n.push(T); n.length > Ui.maxWrecks; ) {
            let D = n.shift();
            D.active && (D.sink = 0.001);
          }
        },
        retire(T) {
          T._deactivate();
          let D = t.indexOf(T);
          (D >= 0 && t.splice(D, 1),
            (D = n.indexOf(T)),
            D >= 0 && n.splice(D, 1));
        },
      },
      p = Z_(),
      v = [];
    const createAnkylosaurus = await loadAnkylosaurus();
    for (let T = 0; T < Ui.poolAnkylosaurus; T++) {
      let D = iM(h, p, u, T, createAnkylosaurus);
      (v.push(D), s.add(D.rig.group));
    }
    let O = 1,
      q = 0,
      U = {
        list: t,
        TUNE: Ui,
        spawn(T, D, C = {}) {
          const G = T === "ankylosaurus" ? v : null;
          if (!G) return null;
          let j = null;
          for (let N of G)
            if (!N.active) {
              j = N;
              break;
            }
          if (!j && T === "ankylosaurus" && n.length) {
            let N = n[0];
            (h.retire(N), (j = N));
          }
          return j
            ? ((j.id = O++),
              t.push(j),
              j._activate(D, C),
              i.events.emit("enemy:spawn", { enemy: j }),
              j)
            : null;
        },
        raycast(T, D, C = 300) {
          let G = null;
          for (let j = 0; j < t.length; j++) {
            let N = t[j];
            if (!N.alive) continue;
            const reach = N.type === "ankylosaurus" ? 1.3 * N.size : 1.5;
            let Q = N.pos.x - T.x,
              K = N.pos.y + (N.type === "ankylosaurus" ? .49 * N.size : 0) - T.y,
              ie = N.pos.z - T.z,
              F = Q * D.x + K * D.y + ie * D.z;
            F < -reach ||
              F > C + reach ||
              Q * Q + K * K + ie * ie - F * F > reach * reach ||
              (G ||
                (G = {
                  dist: 1 / 0,
                  point: new W(),
                  normal: new W(),
                  enemy: null,
                  part: "body",
                }),
              N._raycast(T, D, C, G));
          }
          let closest = G?.enemy ? G : null;
          for (const unit of [...(i.defense?.raptors || []), ...(i.gigas || []), i.spino]) {
            closest = unit?.raycast(T, D, closest?.dist ?? C) || closest;
          }
          return closest;
        },
        aliveCount() {
          let T = 0;
          for (let D of t) D.alive && T++;
          return T;
        },
        clear() {
          for (let T of v) T.active && T._deactivate();
          t.length = n.length = 0;
        },
        alert(T, D = 40) {
          for (let C of t)
            !C.alive ||
              C.passive ||
              C.mode === "engage" ||
              C.pos.distanceToSquared(T) > D * D ||
              (C.lastKnown.copy(T),
              (C.lastKnown.y = Math.max(0, T.y - 1.6)),
              C.mode === "patrol" &&
                i.events.emit("enemy:alert", { enemy: C, noise: !0 }),
              (C.mode = "investigate"),
              (C.modeT = 9 + e() * 4));
        },
        update(T) {
          if (T <= 0) return;
          (T > 0.05 && (T = 0.05), (h.t += T), (q -= T));
          let D = i.player;
          if (D) {
            let C = D.vel ? Math.hypot(D.vel.x, D.vel.z) : D.speed || 0;
            h.playerSpeed += (C - h.playerSpeed) * (1 - Math.exp(-6 * T));
          }
          if (i.campaign) while (n.length) h.retire(n[n.length - 1]);
          for (let C = t.length - 1; C >= 0; C--) t[C]._update(T);
        },
        debug: {
          ctx: h,
          ankylosauruses: v,
          wrecks: n,
          mats: u,
          tris: { ankylosaurus: p.tris },
        },
      };
    return (
      i.events.on("weapon:fire", (T) => {
        if (q > 0) return;
        q = 0.3;
        let D = (T && (T.origin || T.muzzle)) || (i.player && i.player.pos);
        D && U.alert(D, Ui.hearRadius);
      }),
      i.events.on("explosion", (T) => {
        T && T.pos && U.alert(T.pos, 30);
      }),
      i.events.on("game:state", (T) => {
        T && T.state === "title" && U.clear();
      }),
      U
    );
  }
  var o0 = new W(),
    r0 = new W(),
    a0 = new W();
  function HC(i, e, t, n) {
    (o0.copy(e).sub(i), r0.copy(n).sub(t), a0.copy(i).sub(t));
    let s = o0.dot(o0),
      o = r0.dot(r0),
      r = r0.dot(a0),
      a,
      l;
    if (s <= 1e-9 && o <= 1e-9) return a0.dot(a0);
    if (s <= 1e-9) ((a = 0), (l = Math.min(1, Math.max(0, r / o))));
    else {
      let f = o0.dot(a0);
      if (o <= 1e-9) ((l = 0), (a = Math.min(1, Math.max(0, -f / s))));
      else {
        let p = o0.dot(r0),
          d = s * o - p * p;
        ((a = d > 1e-9 ? Math.min(1, Math.max(0, (p * r - f * o) / d)) : 0),
          (l = (p * a + r) / o),
          l < 0
            ? ((l = 0), (a = Math.min(1, Math.max(0, -f / s))))
            : l > 1 && ((l = 1), (a = Math.min(1, Math.max(0, (p - f) / s)))));
      }
    }
    let c = a0.x + o0.x * a - r0.x * l,
      u = a0.y + o0.y * a - r0.y * l,
      h = a0.z + o0.z * a - r0.z * l;
    return c * c + u * u + h * h;
  }
  async function VC(i) {
    let e = await Em(i);
    i.enemies = e;
    let t = (l, c, u) => new W(l, c, u),
      n = i.params.eshow || "both",
      s = [3, 1.45, 3.9],
      o = [0.5, 0.95, 0],
      r = 2.6;
    if (n === "fight") {
      for (const [x, z] of [[-7, -9], [8, -7], [0, -14]]) {
        e.spawn("ankylosaurus", t(x, 0, z), { state: "alert" });
      }
      s = [5, 2.6, 10];
      o = [0, 2.2, -5];
      r = 7;
    } else {
      const unit = e.spawn("ankylosaurus", t(0, 0, 0), { passive: true, yaw: .9 });
      if (n === "dead") unit.damage(unit.hp, unit.pos, t(0, 0, 1), "body");
    }
    i.params.epre != null && (r = +i.params.epre);
    for (let l = 0, c = Math.round(r * 60); l < c; l++) e.update(1 / 60);
    let a = !!i.params.efreeze;
    return {
      cam: s,
      target: o,
      update(l) {
        a || e.update(l);
      },
    };
  }
  var tx = 4,
    nx = -90,
    WC = 450,
    GC = {
      0: "N",
      45: "NE",
      90: "E",
      135: "SE",
      180: "S",
      225: "SW",
      270: "W",
      315: "NW",
    },
    ix = 2 * Math.PI * 19;
  function li(i, e, t) {
    let n = document.createElement(i);
    return (e && (n.className = e), t != null && (n.innerHTML = t), n);
  }
  function hM(i) {
    let e = document.getElementById("ui"),
      t = li("div", "hud");
    t.setAttribute("aria-hidden", "true");
    const bossHealth = li("div", "h-boss-health", "<i></i>");
    const transportHealth = li("div", "h-transport-health",
      '<span>Transport</span><div style="height:9px;background:#132334;border:1px solid #7396ad;margin-top:4px"><i style="display:block;height:100%;background:#32a6ee;transform-origin:left"></i></div>');
    transportHealth.style.width = "min(360px, 65vw)";
    transportHealth.style.textAlign = "center";
    bossHealth.hidden = transportHealth.hidden = true;
    const roundCountdown = li("div", "h-round-countdown");
    roundCountdown.hidden = true;
    t.append(bossHealth, transportHealth, roundCountdown);
    let n = li("div", "h-compass"),
      s = li("div", "h-tape"),
      o = "";
    for (let k = nx; k <= WC; k += 5) {
      let ce = (k - nx) * tx,
        ve = ((k % 360) + 360) % 360,
        _e = ve % 45 === 0,
        Te = ve % 15 === 0;
      ((o += `<i class="${_e ? "mj" : Te ? "md" : "mn"}" style="left:${ce}px"></i>`),
        _e
          ? (o += `<b class="${ve % 90 === 0 ? "card" : "ic"}" style="left:${ce}px">${GC[ve]}</b>`)
          : ve % 15 === 0 &&
            (o += `<b class="num" style="left:${ce}px">${String(ve).padStart(3, "0")}</b>`));
    }
    s.innerHTML = o;
    let r = li("div", "h-tape-wrap");
    r.appendChild(s);
    let a = li("div", "h-cmarks"),
      l = li("div", "h-heading", "000");
    n.append(r, li("i", "h-needle"), a, l);
    let c = li(
        "div",
        "h-obj",
        '<div class="h-k">Objective</div><div class="h-obj-t"></div><div class="h-relays"><span>Relays</span><i></i><i></i><i></i><b>0/3</b></div>',
      ),
      u = c.querySelector(".h-obj-t"),
      h = c.querySelector(".h-relays"),
      f = h.querySelector("b"),
      p = [...h.querySelectorAll("i")],
      d = li("div", "h-warn"),
      v = li(
        "div",
        "h-cross",
        '<i class="c-t"></i><i class="c-b"></i><i class="c-l"></i><i class="c-r"></i><i class="c-dot"></i>',
      ),
      g = v.querySelectorAll("i"),
      x = li("div", "h-hit", "<i></i><i></i><i></i><i></i>"),
      y = li("div", "h-arcs"),
      b = [];
    for (let k = 0; k < 4; k++) {
      let ce = li(
        "div",
        "h-arc",
        '<svg viewBox="-100 -100 200 200"><path d="M -38 -84 A 92 92 0 0 1 38 -84" /><path class="tip" d="M -7 -97 L 0 -106 L 7 -97" /></svg>',
      );
      (y.appendChild(ce),
        b.push({ el: ce, life: 0, src: new W(), op: -1, rot: 1e9 }));
    }
    let m = li(
        "div",
        "h-prompt",
        `<svg viewBox="-24 -24 48 48"><circle class="bg" r="19"/><circle class="fg" r="19" stroke-dasharray="${ix.toFixed(2)}" stroke-dashoffset="${ix.toFixed(2)}" transform="rotate(-90)"/></svg><span class="h-key">E</span><span class="h-plabel"></span>`,
      ),
      promptRing = m.querySelector("svg"),
      A = m.querySelector(".fg"),
      _ = m.querySelector(".h-key"),
      M = m.querySelector(".h-plabel"),
      E = li("div", "h-feed"),
      w = li("div", "h-msg"),
      S = li(
        "div",
        "h-health",
        '<div class="h-k">Vitals</div><div class="h-hp-row"><b class="h-hp-n">100</b><div class="h-hp-bar">' +
          "<i></i>".repeat(10) +
          "</div></div>",
      ),
      z = S.querySelector(".h-hp-n"),
      H = [...S.querySelectorAll(".h-hp-bar i")],
      O = li(
        "div",
        "h-ammo",
        '<div class="h-cue"></div><div class="h-ammo-row"><b class="h-ammo-n">30</b><span class="h-ammo-r">120</span></div><div class="h-pips"></div><div class="h-wname"></div>',
      ),
      q = O.querySelector(".h-ammo-n"),
      U = O.querySelector(".h-ammo-r"),
      T = O.querySelector(".h-pips"),
      D = O.querySelector(".h-wname"),
      C = O.querySelector(".h-cue"),
      G = li("div", "h-marks");
    (t.append(G, n, c, d, y, v, x, m, E, w, S, O), e.appendChild(t));
    let j = li(
      "div",
      "comms",
      '<span class="comms-who">Handler</span><span class="comms-t"></span>',
    );
    (j.setAttribute("role", "status"), j.setAttribute("aria-live", "polite"));
    let N = j.querySelector(".comms-t");
    e.appendChild(j);
    let Q = !1,
      K = 420,
      ie = innerWidth,
      F = innerHeight,
      X = {
        ammo: -1,
        mag: -1,
        reserve: -1,
        name: null,
        cue: null,
        low: null,
        hp: -1,
        hpSeg: -1,
        hurt: null,
        head: -1,
        tapeX: 1e9,
        gap: -1,
        crossOn: null,
        promptOn: null,
        promptText: null,
        promptT: -1,
        promptKey: null,
        marksOn: null,
        done: -1,
        total: -1,
      },
      ne = [],
      re = "",
      $ = 0,
      ue = 0,
      me = [],
      ee = null,
      B = 0,
      P = 0,
      V = 0,
      Y = 0,
      L = 0,
      Z = [],
      J = [],
      oe = new W(),
      fe = null,
      le = -1;
    function R() {
      ((ie = innerWidth),
        (F = innerHeight),
        (K = n.clientWidth || Math.min(420, ie * 0.6)),
        (X.tapeX = 1e9),
        (X.gap = -1));
      for (let k of J) ((k.lastC = 1e9), (k.lastW = ""));
    }
    (addEventListener("resize", R),
      i.events.on("player:hitEnemy", (k) => {
        (I.hitmarker(
          k && k.killed
            ? "kill"
            : k && (k.weak || k.part === "weak")
              ? "weak"
              : "hit",
        ),
          k &&
            k.killed &&
            k.weak &&
            fe &&
            le === i.time.frame &&
            !fe.weak &&
            ((fe.weak = !0), (fe.el.innerHTML += "<em>Weak point</em>")));
      }),
      i.events.on("enemy:killed", (k) => {
        let ce = String(
          (k && (k.type || (k.enemy && k.enemy.type))) || "machine",
        ).toUpperCase();
        ((fe = I.feed(`<b>${ce}</b> destroyed`)), (le = i.time.frame));
      }),
      i.events.on("player:hit", (k) => {
        if (!k || !k.fromPos) return;
        let ce = b[0];
        for (let ve of b) {
          if (ve.life <= 0) {
            ce = ve;
            break;
          }
          ve.life < ce.life && (ce = ve);
        }
        (ce.src.copy(k.fromPos), (ce.life = 1.5), (ce.max = 1.5));
      }));
    let I = {
      root: t,
      show(k) {
        ((k = !!k),
          k !== Q && ((Q = k), t.classList.toggle("on", k), k && R()));
      },
      setStageCountdown(stage, seconds) {
        roundCountdown.hidden = stage == null;
        if (stage == null) return;
        const label = "Stage " + stage + " will start in " + seconds +
          (seconds === 1 ? " second." : " seconds.");
        if (roundCountdown.textContent !== label) roundCountdown.textContent = label;
      },
      setBossHealth(value) {
        bossHealth.hidden = value == null;
        if (value != null) bossHealth.firstElementChild.style.transform = "scaleX(" + value + ")";
      },
      setTransportHealth(value) {
        transportHealth.hidden = value == null;
        if (value != null) transportHealth.querySelector("i").style.transform = "scaleX(" + (value / 100) + ")";
      },
      setObjective(k) {
        ((k = k || ""),
          k !== re &&
            ((re = k),
            ($ = 0),
            (ue = 0),
            (u.textContent = ""),
            c.classList.toggle("has", !!k),
            c.classList.remove("flash"),
            c.offsetWidth,
            c.classList.add("flash")));
      },
      setRelays(k, ce) {
        if (!(k === X.done && ce === X.total)) {
          if (ce !== X.total) {
            (p.forEach((ve) => ve.remove()), (p = []));
            for (let ve = 0; ve < ce; ve++) {
              let _e = document.createElement("i");
              (h.insertBefore(_e, f), p.push(_e));
            }
          }
          ((X.done = k),
            (X.total = ce),
            p.forEach((ve, _e) => ve.classList.toggle("cut", _e < k)),
            (f.textContent = `${k}/${ce}`),
            h.classList.toggle("all", k >= ce && ce > 0));
        }
      },
      setMarkers(k) {
        for (let ce of J) (ce.cEl.remove(), ce.wEl.remove());
        J = (k || []).map((ce) => {
          let ve = li(
              "div",
              "h-cm " + (ce.kind || "relay"),
              `<i></i><b>${ce.short || ""}</b><span></span>`,
            ),
            _e = li(
              "div",
              "h-wm " + (ce.kind || "relay"),
              `<i></i><b>${ce.short || ""}</b><span></span>`,
            );
          return (
            a.appendChild(ve),
            G.appendChild(_e),
            {
              ...ce,
              cEl: ve,
              wEl: _e,
              cDist: ve.querySelector("span"),
              wDist: _e.querySelector("span"),
              lastD: -1,
              lastC: 1e9,
              lastW: "",
              vis: null,
            }
          );
        });
      },
      setPrompt(k, ce = 0, mode = "hold") {
        let ve = !!k;
        i.input.setPrompt?.(ve && mode !== "status");
        if (
          (ve !== X.promptOn &&
            ((X.promptOn = ve),
            m.classList.toggle("on", ve)),
          !ve)
        )
          return;
        const hold = mode === "hold";
        promptRing.style.display = _.style.display = hold ? "" : "none";
        let _e = mode === "status" ? "" : i.input.touch
          ? "USE"
          : i.input.gamepad && !i.input.locked
            ? "Y"
            : "E";
        _e !== X.promptKey &&
          ((X.promptKey = _e),
          (_.textContent = _e),
          _.classList.toggle("wide", _e.length > 1));
        let Te = mode === "status" ? k : mode === "press" ? `[${_e}] ${k}` : `Hold ${_e} \u2014 ${k}`;
        Te !== X.promptText && ((X.promptText = Te), (M.textContent = Te));
        let Pe = Math.round(ce * 200) / 200;
        Pe !== X.promptT &&
          ((X.promptT = Pe),
          A.setAttribute("stroke-dashoffset", (ix * (1 - Pe)).toFixed(2)),
          m.classList.toggle("busy", Pe > 0));
      },
      radio(k, ce = 4.5, voice = null) {
        k && me.push({ text: k, secs: ce, voice });
      },
      clearRadio() {
        i.audio?.stopHandlerVoice?.();
        ((me.length = 0), (ee = null), j.classList.remove("on"));
      },
      warn(k, ce = 3) {
        ((d.textContent = k),
          (Y = ce),
          d.classList.remove("on"),
          d.offsetWidth,
          d.classList.add("on"));
      },
      message(k, ce = 3) {
        ((w.textContent = k || ""),
          (L = k ? ce : 0),
          w.classList.toggle("on", !!k));
      },
      feed(k) {
        let ce = li("div", "h-fl", k);
        E.appendChild(ce);
        let ve = { el: ce, life: 4.2, weak: !1 };
        for (Z.push(ve); Z.length > 4; ) Z.shift().el.remove();
        return ve;
      },
      hitmarker(k = "hit") {
        x.className = "h-hit " + k;
        let ce = k === "weak" || k === "kill" ? 1.5 : 1.15;
        try {
          x.animate(
            [
              { opacity: 1, transform: `translate(-50%,-50%) scale(${ce})` },
              {
                opacity: 1,
                transform: "translate(-50%,-50%) scale(1)",
                offset: 0.35,
              },
              { opacity: 0, transform: "translate(-50%,-50%) scale(0.92)" },
            ],
            { duration: k === "kill" ? 420 : 240, easing: "ease-out" },
          );
        } catch {}
      },
      reset() {
        I.clearRadio();
        for (let k of Z) k.el.remove();
        Z.length = 0;
        for (let k of b) k.life = 0;
        ((Y = 0),
          d.classList.remove("on"),
          I.message(""),
          I.setPrompt(null),
          I.setObjective(""),
          (X.hp = -1));
      },
      update: se,
    };
    function se(k) {
      if ((ae(k), !Q)) return;
      let ce = i.player,
        ve = i.weapon || {},
        _e = i.camera,
        Te = ce.ads || 0,
        Pe = ((-ce.yaw * 180) / Math.PI) % 360;
      Pe < 0 && (Pe += 360);
      let Re = Math.round((K / 2 - (Pe - nx) * tx) * 2) / 2;
      Re !== X.tapeX &&
        ((X.tapeX = Re), (s.style.transform = `translate3d(${Re}px,0,0)`));
      let Fe = Math.round(Pe) % 360;
      Fe !== X.head &&
        ((X.head = Fe), (l.textContent = String(Fe).padStart(3, "0")));
      let ze = Te < 0.5;
      if (
        (ze !== X.marksOn && ((X.marksOn = ze), G.classList.toggle("off", !ze)),
        J.length)
      ) {
        (_e.updateMatrixWorld(),
          _e.matrixWorldInverse.copy(_e.matrixWorld).invert());
        let we = K / 2 - 14;
        for (let be of J) {
          let Oe = be.pos.x - ce.pos.x,
            pt = be.pos.z - ce.pos.z,
            ut = Math.round(Math.hypot(Oe, pt));
          if (ut !== be.lastD) {
            be.lastD = ut;
            let Un = ut + "m";
            ((be.cDist.textContent = Un), (be.wDist.textContent = Un));
          }
          let nn = (Math.atan2(Oe, -pt) * 180) / Math.PI - Pe;
          nn = ((nn + 540) % 360) - 180;
          let bt = Math.round(Math.max(-we, Math.min(we, nn * tx)));
          (bt !== be.lastC &&
            ((be.lastC = bt),
            (be.cEl.style.transform = `translate3d(${bt}px,0,0)`),
            be.cEl.classList.toggle("edge", Math.abs(bt) >= we)),
            oe
              .set(
                be.pos.x,
                be.pos.y + (be.kind === "extract" ? 1.2 : 1.9),
                be.pos.z,
              )
              .project(_e));
          let Os,
            pn,
            Ti = !1;
          if (
            (oe.z > 1 && ((Ti = !0), (oe.x = -oe.x), (oe.y = -oe.y)),
            Ti || Math.abs(oe.x) > 0.9 || Math.abs(oe.y) > 0.82)
          ) {
            Ti = !0;
            let Un = Math.max(
              Math.abs(oe.x) / 0.9,
              Math.abs(oe.y) / 0.82,
              0.001,
            );
            if (((oe.x /= Un), (oe.y /= Un), oe.z > 1)) {
              let zo = Math.max(Math.abs(oe.x) / 0.9, Math.abs(oe.y) / 0.82);
              zo < 0.999 && ((oe.x /= zo), (oe.y /= zo));
            }
          }
          ((Os = Math.round((oe.x * 0.5 + 0.5) * ie)),
            (pn = Math.round((-oe.y * 0.5 + 0.5) * F)));
          let ho = !Ti && Math.hypot(oe.x, oe.y * 0.6) < 0.16,
            Rs =
              Os +
              "," +
              pn +
              (Ti ? "o" : "") +
              (ut < 3 ? "n" : "") +
              (ho ? "d" : "");
          Rs !== be.lastW &&
            ((be.lastW = Rs),
            (be.wEl.style.transform = `translate3d(${Os}px,${pn}px,0)`),
            be.wEl.classList.toggle("offscreen", Ti),
            be.wEl.classList.toggle("near", ut < 3),
            be.wEl.classList.toggle("dim", ho));
        }
      }
      let We = Te <= 0.6 && ce.alive && ve.state !== "reloading_hidden";
      if (
        (We !== X.crossOn && ((X.crossOn = We), v.classList.toggle("off", !We)),
        We)
      ) {
        let we = typeof ve.spread == "number" ? ve.spread : 0.012,
          be = (_e.fov * Math.PI) / 360,
          Oe =
            (Math.tan(we) / Math.tan(be)) * (F / 2) +
            4 +
            (ce.sprinting ? 10 : 0);
        ((Oe = Math.round(Math.max(4, Math.min(70, Oe)) * 2) / 2),
          Oe !== X.gap &&
            ((X.gap = Oe),
            (g[0].style.transform = `translate3d(-50%,${-Oe}px,0) translateY(-100%)`),
            (g[1].style.transform = `translate3d(-50%,${Oe}px,0)`),
            (g[2].style.transform = `translate3d(${-Oe}px,-50%,0) translateX(-100%)`),
            (g[3].style.transform = `translate3d(${Oe}px,-50%,0)`)));
      }
      let Ne = Math.max(1, Math.min(60, ve.magSize | 0 || 30)),
        dt = Math.max(0, ve.ammo | 0),
        xe = Math.max(0, ve.reserve | 0);
      if (
        (Ne !== X.mag &&
          ((X.mag = Ne),
          (T.innerHTML = "<i></i>".repeat(Ne)),
          (ne = [...T.children]),
          (X.ammo = -1)),
        dt !== X.ammo)
      ) {
        ((X.ammo = dt), (q.textContent = String(dt).padStart(2, "0")));
        for (let we = 0; we < ne.length; we++)
          ne[we].className = we < dt ? "" : "off";
      }
      (xe !== X.reserve &&
        ((X.reserve = xe), (U.textContent = String(xe).padStart(3, "0"))),
        ve.name !== X.name &&
          ((X.name = ve.name), (D.textContent = ve.name || "")));
      let Ie = dt <= Math.ceil(Ne * 0.27),
        Be =
          ve.state === "reloading"
            ? "Reloading"
            : dt === 0
              ? xe > 0
                ? i.input.touch
                  ? "Reload"
                  : "R \u2014 Reload"
                : "Empty"
              : Ie
                ? "Low ammo"
                : "";
      (Be !== X.cue &&
        ((X.cue = Be),
        (C.textContent = Be),
        (C.className =
          "h-cue" +
          (Be ? " on" : "") +
          (dt === 0 && ve.state !== "reloading" ? " urgent" : ""))),
        Ie !== X.low && ((X.low = Ie), O.classList.toggle("low", Ie)));
      let Xe = Math.max(0, Math.ceil(ce.health)),
        Me = ce.health < ce.maxHealth - 0.5;
      if (Xe !== X.hp) {
        ((X.hp = Xe), (z.textContent = String(Xe)));
        let we = Math.ceil((Xe / ce.maxHealth) * H.length);
        if (we !== X.hpSeg) {
          X.hpSeg = we;
          for (let be = 0; be < H.length; be++)
            H[be].className = be < we ? "" : "off";
          S.classList.toggle("crit", we <= 3);
        }
      }
      Me !== X.hurt && ((X.hurt = Me), S.classList.toggle("on", Me));
      for (let we of b) {
        if (we.life <= 0) {
          we.op !== 0 && ((we.op = 0), (we.el.style.opacity = "0"));
          continue;
        }
        we.life -= k;
        let be =
            Math.atan2(we.src.x - ce.pos.x, -(we.src.z - ce.pos.z)) + ce.yaw,
          Oe = Math.round((be * 180) / Math.PI);
        Oe !== we.rot &&
          ((we.rot = Oe),
          (we.el.style.transform = `translate(-50%,-50%) rotate(${Oe}deg)`));
        let pt = Math.round(Math.min(1, Math.max(0, we.life / 0.6)) * 20) / 20;
        pt !== we.op && ((we.op = pt), (we.el.style.opacity = String(pt)));
      }
      if ($ < re.length) {
        ue += k * 46;
        let we = Math.min(re.length, Math.floor(ue));
        we !== $ && (($ = we), (u.textContent = re.slice(0, we)));
      }
      (Y > 0 && ((Y -= k), Y <= 0 && d.classList.remove("on")),
        L > 0 && ((L -= k), L <= 0 && w.classList.remove("on")));
      for (let we = Z.length - 1; we >= 0; we--) {
        let be = Z[we];
        ((be.life -= k),
          be.life <= 0
            ? (be.el.remove(), Z.splice(we, 1))
            : be.life < 0.6 &&
              !be.out &&
              ((be.out = !0), be.el.classList.add("out")));
      }
    }
    function ae(k) {
      if (i.game?.state === "paused") return;
      if (!ee) {
        if (!me.length) return;
        ((ee = me.shift()),
          (B = 0),
          (P = 0),
          (V = ee.secs),
          (N.textContent = ee.voice ? ee.text : ""),
          j.classList.add("on"),
          i.events.emit("radio:line", { text: ee.text }));
        if (ee.voice) {
          B = ee.text.length;
          i.audio?.playHandlerVoice?.(ee.voice);
        }
      }
      let ce = ee.text;
      if (B < ce.length) {
        P += k * 58;
        let ve = Math.min(ce.length, Math.floor(P));
        ve !== B && ((B = ve), (N.textContent = ce.slice(0, ve)));
      } else
        ((V -= k),
          V <= 0 && ((ee = null), me.length || j.classList.remove("on")));
    }
    return (R(), I);
  }
  var fM = "saltline.settings.v1",
    XC = { quality: "auto", sens: 1, invertY: !1, volume: 0.8, fov: Pi.fov },
    dM = ["low", "medium", "high", "ultra"];
  function YC() {
    let i = { ...XC };
    try {
      let e = JSON.parse(localStorage.getItem(fM) || "null");
      e &&
        typeof e == "object" &&
        ((e.quality === "auto" || dM.includes(e.quality)) &&
          (i.quality = e.quality),
        Number.isFinite(e.sens) &&
          (i.sens = Math.min(3, Math.max(0.2, e.sens))),
        (i.invertY = !!e.invertY),
        Number.isFinite(e.volume) &&
          (i.volume = Math.min(1, Math.max(0, e.volume))),
        Number.isFinite(e.fov) && (i.fov = Math.min(95, Math.max(60, e.fov))));
    } catch {}
    return i;
  }
  function Wf(i) {
    try {
      localStorage.setItem(fM, JSON.stringify(i));
    } catch {}
  }
  var $C = `
  <dl class="keys">
    <div><dt>Move</dt><dd><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></dd></div>
    <div><dt>Look</dt><dd>Mouse</dd></div>
    <div><dt>Fire</dt><dd>Left button</dd></div>
    <div><dt>Aim</dt><dd>Right button</dd></div>
    <div><dt>Reload</dt><dd><kbd>R</kbd></dd></div>
    <div><dt>Jump</dt><dd><kbd>Space</kbd></dd></div>
    <div><dt>Sprint</dt><dd><kbd>Shift</kbd></dd></div>
    <div><dt>Crouch</dt><dd><kbd>C</kbd> or <kbd>Ctrl</kbd></dd></div>
    <div><dt>Melee</dt><dd><kbd>F</kbd></dd></div>
    <div><dt>Deploy sentry (max 4)</dt><dd><kbd>1</kbd></dd></div>
    <div><dt>Resupply at an ammo crate</dt><dd><kbd>E</kbd></dd></div>
    <div><dt>Extract at the transport when cleared</dt><dd><kbd>2</kbd></dd></div>
    <div><dt>Pause</dt><dd><kbd>Esc</kbd> or <kbd>P</kbd></dd></div>
  </dl>`,
    ZC = `
  <dl class="keys">
    <div><dt>Move</dt><dd>Left thumb, anywhere</dd></div>
    <div><dt>Look</dt><dd>Drag the right side</dd></div>
    <div><dt>Fire</dt><dd>Hold FIRE, drag to track</dd></div>
    <div><dt>Aim</dt><dd>AIM toggles</dd></div>
    <div><dt>Reload</dt><dd>RLD</dd></div>
    <div><dt>Jump</dt><dd>JUMP</dd></div>
    <div><dt>Sprint</dt><dd>Push the stick fully forward</dd></div>
  </dl>`;
  function pM(i, e) {
    let t = document.getElementById("ui"),
      n = YC(),
      s = document.createElement("div");
    ((s.className = "menu"),
      (s.dataset.screen = "none"),
      (s.innerHTML = `
    <div class="m-veil"></div>
    <div class="m-bars"><i></i><i></i></div>

    <section class="m-screen m-title" data-s="title" aria-label="Saltline Ashfall">
      <div class="m-title-main">
        <h1 class="ashfall-title">Ashfall</h1>
        <p class="ashfall-brief">Defend the transport. Survive four stages. Take down the Apex Spinosaurus.</p>
        <nav class="ashfall-actions" aria-label="Main menu">
          <button class="btn primary" data-act="deploy">Play</button>
          <button class="btn" data-act="settings">Settings</button>
          <button class="btn" data-act="controls">Controls</button>
          <button class="btn" data-act="intel">Intel</button>
        </nav>
        <button class="btn small ashfall-audio" data-act="audio" hidden>Enable audio</button>
        <p class="m-note">Based on <strong>Saltline</strong> by Felix Rieseberg</p>
      </div>
    </section>

    <section class="m-screen m-card" data-s="paused" aria-label="Paused">
      <div class="m-k">Operation on hold</div>
      <h2 class="m-h">Paused</h2>
      <p class="m-line" data-f="lookmode"></p>
      <div class="m-actions col">
        <button class="btn primary" data-act="resume">Resume</button>
        <button class="btn" data-act="settings">Settings</button>
        <button class="btn" data-act="controls">Controls</button>
        <button class="btn" data-act="restart">Restart campaign</button>
      </div>
    </section>

    <section class="m-screen m-card m-dead" data-s="dead" aria-label="Signal lost">
      <div class="m-k">Mission failed</div>
      <h2 class="m-h" data-f="dead-reason">Signal lost</h2>
      <dl class="m-stats"><div><dt>Time survived</dt><dd data-f="dead-time">00:00</dd></div></dl>
      <div class="m-actions col"><button class="btn primary" data-act="retry">Retry</button></div>
    </section>

    <section class="m-screen m-card m-debrief" data-s="complete" aria-label="Debrief">
      <div class="m-k">Campaign debrief</div>
      <h2 class="m-h">Challenge Complete!</h2>
      <div class="m-rating"><span>Rating</span><b data-f="rating">Clean</b></div>
      <dl class="m-stats">
        <div><dt>Time</dt><dd data-f="time">00:00</dd></div>
        <div><dt>Accuracy</dt><dd data-f="acc">0%</dd></div>
        <div><dt>Machines destroyed</dt><dd data-f="kills">0</dd></div>
        <div><dt>Retries</dt><dd data-f="retries">0</dd></div>
      </dl>
      <div class="m-actions col"><button class="btn primary" data-act="redeploy">Play again</button></div>
    </section>

    <div class="panel" role="dialog" aria-modal="true" aria-label="Settings, controls and enemy intel" tabindex="-1" hidden>
      <header class="panel-h">
        <div class="tabs" role="tablist">
          <button class="tab" role="tab" data-tab="settings" aria-selected="true">Settings</button>
          <button class="tab" role="tab" data-tab="controls" aria-selected="false">Controls</button>
          <button class="tab" role="tab" data-tab="intel" aria-selected="false">Intel</button>
        </div>
        <button class="btn small" data-act="close-panel">Close</button>
      </header>
      <div class="panel-b" data-pane="settings">
        <div class="row"><label id="l-q">Graphics quality</label>
          <div class="seg" role="group" aria-labelledby="l-q">${dM.map((U) => `<button data-q="${U}" aria-pressed="false">${U}</button>`).join("")}</div></div>
        <div class="row"><label for="s-sens">Mouse sensitivity</label><div class="slider"><input id="s-sens" type="range" min="0.2" max="3" step="0.05"><output data-o="sens"></output></div></div>
        <div class="row"><label id="l-inv">Invert Y</label><button class="toggle" data-act="invert" aria-labelledby="l-inv" aria-pressed="false"><i></i><span>Off</span></button></div>
        <div class="row"><label for="s-vol">Master volume</label><div class="slider"><input id="s-vol" type="range" min="0" max="100" step="1"><output data-o="vol"></output></div></div>
        <div class="row"><label for="s-fov">Field of view</label><div class="slider"><input id="s-fov" type="range" min="60" max="95" step="1"><output data-o="fov"></output></div></div>
        <div class="row" data-row="fs"><label id="l-fs">Display</label><button class="btn small" data-act="fullscreen" aria-labelledby="l-fs fs-t"><span id="fs-t">Enter fullscreen</span></button></div>
        <p class="panel-note" data-f="qnote"></p>
      </div>
      <div class="panel-b" data-pane="controls" hidden>
        <h3>Keyboard \xB7 Mouse</h3>${$C}
        <p class="panel-note">If the browser will not capture the mouse, hold a mouse button and drag to look (left also fires, right also aims). Arrow keys or <kbd>I</kbd><kbd>J</kbd><kbd>K</kbd><kbd>L</kbd> turn, <kbd>Enter</kbd> fires.</p>
        <h3>Touch</h3>${ZC}
        <h3>Gamepad</h3>
        <p class="panel-note">Sticks move and look \xB7 RT fire \xB7 LT aim \xB7 A jump \xB7 B crouch \xB7 X reload \xB7 L3 sprint \xB7 Start pause.</p>
      </div>
      <div class="panel-b" data-pane="intel" hidden>
        <div class="ashfall-intel">
          <article><h3>Raptor</h3><p>Small Raptors rush the transport. Raptors are the only enemies that can damage it. Intercept them before they detonate.</p></article>
          <article><h3>Large Raptor</h3><p>The oversized hunter pursues you and tries to catch you in its blast. Back away when it starts charging.</p></article>
          <article><h3>Ankylosaurus</h3><p>Priority target. Its dorsal machine gun fires accurate bursts, and larger units split into smaller Ankylo when destroyed.</p></article>
          <article><h3>Giganotosaurus</h3><p>Breathes fire at long range and bites if you get too close.</p></article>
          <article><h3>Purple Giganotosaurus</h3><p>Twice the size of a standard Giga, with more health and the same long-range fire and close-range bite.</p></article>
          <article><h3>Purple Giga Minion</h3><p>As large as a standard Giga, with more health. Spino can summon another pair while it is alive.</p></article>
          <article><h3>Apex Spinosaurus</h3><p>The campaign's final target. It summons Purple Giga Minions with its roar, breathes fire and fires a charged lightning beam. Clear its reinforcements before extracting.</p></article>
        </div>
      </div>
    </div>

    <div class="loc-card" aria-hidden="true"><i></i><b>Ashfall Arena</b><span>Secure the transport</span></div>
  `),
      t.appendChild(s));
    const audioButton = s.querySelector('[data-act="audio"]');
    const audioContext = i.audio?.ctx;
    function syncAudioButton() {
      audioButton.hidden = !audioContext || audioContext.state === "running" || audioContext.state === "closed";
    }
    audioContext?.addEventListener("statechange", syncAudioButton);
    syncAudioButton();
    let o = (U) => s.querySelector(U),
      r = (U) => [...s.querySelectorAll(U)],
      a = o(".panel"),
      l = o(".loc-card"),
      c = (U) => s.querySelector(`[data-f="${U}"]`),
      u = o("#s-sens"),
      h = o("#s-vol"),
      f = o("#s-fov"),
      p = "none",
      d = null;
    function v(U) {
      if (
        ((!U || U === "sens") && (i.input.sensitivity = n.sens),
        (!U || U === "invertY") && (i.input.invertY = n.invertY),
        !U || U === "volume")
      )
        try {
          i.audio && i.audio.setVolume && i.audio.setVolume(n.volume);
        } catch (T) {
          console.error(T);
        }
      if (
        ((!U || U === "fov") &&
          i.player &&
          i.player.setFov &&
          i.player.setFov(n.fov),
        U === "quality" ||
          (!U &&
            n.quality !== "auto" &&
            !i.params.shot &&
            !i.params.q &&
            n.quality !== (i.quality && i.quality.name)))
      ) {
        let T = Pr[n.quality];
        if (T)
          try {
            i.render && i.render.setQuality
              ? i.render.setQuality({ ...T })
              : (i.quality = { ...T });
          } catch (D) {
            console.error("[game] setQuality failed", D);
          }
      }
    }
    function g() {
      let U = n.quality === "auto" ? i.quality && i.quality.name : n.quality;
      for (let D of r(".seg button"))
        D.setAttribute("aria-pressed", String(D.dataset.q === U));
      ((u.value = n.sens),
        (h.value = Math.round(n.volume * 100)),
        (f.value = n.fov),
        (o('[data-o="sens"]').textContent = n.sens.toFixed(2) + "\xD7"),
        (o('[data-o="vol"]').textContent = Math.round(n.volume * 100) + "%"),
        (o('[data-o="fov"]').textContent = Math.round(n.fov) + "\xB0"));
      let T = o('[data-act="invert"]');
      (T.setAttribute("aria-pressed", String(n.invertY)),
        (T.querySelector("span").textContent = n.invertY ? "On" : "Off"),
        (c("qnote").textContent =
          n.quality === "auto"
            ? `Quality was picked for this device (${U || "default"}). Lower it if the frame rate struggles.`
            : "Quality changes apply at once; shadows and reflections may take a moment to rebuild."));
    }
    (u.addEventListener("input", () => {
      ((n.sens = +u.value), v("sens"), g(), Wf(n));
    }),
      h.addEventListener("input", () => {
        ((n.volume = +h.value / 100), v("volume"), g(), Wf(n));
      }),
      f.addEventListener("input", () => {
        ((n.fov = +f.value), v("fov"), g(), Wf(n));
      }));
    let x = o('[data-row="fs"]'),
      y = o("#fs-t"),
      b = () =>
        document.fullscreenElement || document.webkitFullscreenElement || null,
      m = document.getElementById("app") || document.documentElement;
    (m &&
      (m.requestFullscreen || m.webkitRequestFullscreen) &&
      document.fullscreenEnabled !== !1 &&
      document.webkitFullscreenEnabled !== !1) ||
      (x.hidden = !0);
    function _() {
      y.textContent = "Fullscreen is not available here";
    }
    function M() {
      try {
        if (b()) {
          (document.exitFullscreen || document.webkitExitFullscreen).call(
            document,
          );
          return;
        }
        let U = (m.requestFullscreen || m.webkitRequestFullscreen).call(m);
        U && U.catch && U.catch(_);
      } catch {
        _();
      }
    }
    let E = () => {
      y.textContent = b() ? "Exit fullscreen" : "Enter fullscreen";
    };
    (document.addEventListener("fullscreenchange", E),
      document.addEventListener("webkitfullscreenchange", E));
    function w(U) {
      ((d = document.activeElement),
        (a.hidden = !1),
        s.classList.add("panel-open"),
        z(U || "settings"));
      try {
        a.focus({ preventScroll: !0 });
      } catch {}
    }
    function S() {
      return a.hidden
        ? !1
        : ((a.hidden = !0),
          s.classList.remove("panel-open"),
          d && d.focus && s.contains(d) ? d.focus() : H(),
          !0);
    }
    function z(U) {
      for (let T of r(".tab"))
        T.setAttribute("aria-selected", String(T.dataset.tab === U));
      for (let T of r(".panel-b")) T.hidden = T.dataset.pane !== U;
    }
    function H() {
      let U = s.querySelector(`.m-screen[data-s="${p}"] .btn.primary`);
      if (U)
        try {
          U.focus({ preventScroll: !0 });
        } catch {}
    }
    (s.addEventListener("click", (U) => {
      let T = U.target.closest("button");
      if (!T || !s.contains(T)) return;
      if ((i.events.emit("ui:click", {}), T.dataset.q)) {
        ((n.quality = T.dataset.q), v("quality"), g(), Wf(n));
        return;
      }
      if (T.dataset.tab) {
        z(T.dataset.tab);
        return;
      }
      let D = T.dataset.act;
      if (D === "intel") { w("intel"); return; }
      if (D === "audio") { i.audio?.resume?.(); return; }
      D === "settings"
        ? w("settings")
        : D === "controls"
          ? w("controls")
          : D === "close-panel"
            ? S()
            : D === "invert"
              ? ((n.invertY = !n.invertY), v("invertY"), g(), Wf(n))
              : D === "fullscreen"
                ? M()
                : D && e[D] && e[D](U);
    }),
      s.addEventListener("mouseover", (U) => {
        let T = U.target.closest("button");
        T &&
          U.relatedTarget &&
          !T.contains(U.relatedTarget) &&
          i.events.emit("ui:hover", {});
      }),
      s.addEventListener("keydown", (U) => {
        if (
          (U.code === "Escape" &&
            !a.hidden &&
            (S(), U.stopPropagation(), U.preventDefault()),
          U.code === "Tab" && !a.hidden)
        ) {
          let T = [...a.querySelectorAll("button, input")].filter(
            (G) => G.offsetParent !== null,
          );
          if (!T.length) return;
          let D = T[0],
            C = T[T.length - 1];
          U.shiftKey && document.activeElement === D
            ? (C.focus(), U.preventDefault())
            : !U.shiftKey &&
              document.activeElement === C &&
              (D.focus(), U.preventDefault());
        }
      }));
    let O = (U) => (
        (U = Math.max(0, Math.floor(U))),
        String(Math.floor(U / 60)).padStart(2, "0") +
          ":" +
          String(U % 60).padStart(2, "0")
      ),
      q = {
        root: s,
        settings: n,
        fmtTime: O,
        get screen() {
          return p;
        },
        get panelOpen() {
          return !a.hidden;
        },
        closePanel: S,
        show(U) {
          U !== p &&
            ((p = U),
            (s.dataset.screen = U),
            S(),
            s.classList.toggle("open", U !== "none"),
            U !== "none"
              ? (g(), setTimeout(H, 30))
              : document.activeElement &&
                s.contains(document.activeElement) &&
                document.activeElement.blur());
        },
        locationCard(U) {
          l.classList.toggle("on", !!U);
        },
        setLookMode(U) {
          c("lookmode").textContent = U || "";
        },
        setDead({ time: U, reason = "Signal lost" }) {
          c("dead-reason").textContent = reason;
          c("dead-time").textContent = O(U);
        },
        setDebrief({ time: U, accuracy: T, kills: D, retries: C, rating: G }) {
          ((c("time").textContent = O(U)),
            (c("acc").textContent =
              T == null ? "\u2014" : Math.round(T * 100) + "%"),
            (c("kills").textContent = String(D)),
            (c("retries").textContent = String(C)),
            (c("rating").textContent = G));
        },
        applySettings: v,
      };
    return (g(), q);
  }
  var Yi = {
      introSeconds: 3.5,
      retryIntroSeconds: 1.3,
      interactRange: 2.2,
      interactFacing: 0.45,
      cutSeconds: 2.4,
        waves: [
      ],
      maxAlive: 9,
      spawnStagger: 0.85,
      spawnFar: 18,
      pursuitEvery: 7,
      pursuitMinAlive: 4,
      pursuitExtra: 5,
      titleSpeed: 1.15,
      titleFov: 50,
    },
    jC = [
      "NORTH",
      "NORTH-EAST",
      "EAST",
      "SOUTH-EAST",
      "SOUTH",
      "SOUTH-WEST",
      "WEST",
      "NORTH-WEST",
    ],
    _l = {
      intro:
        "Private, this is Handler. Move into the arena and secure the transport.",
      contact: "It has seen you. Gulls fly, Ankylosauruss walk. Put them down.",
      cut: [
        "One relay dark. It felt that \u2014 machines inbound.",
        "Two dark. It is throwing everything it has left at you.",
      ],
      all: "All three dark. The boat is holding at the quay ladder, south end. Run.",
      low: "You are hit hard. Get behind steel and breathe.",
      done: "Breacher is aboard. Mission complete. Good work.",
    };
  function mM(i) {
    let e = (i.render && i.render.post) || {},
      t = typeof e.saturation == "number" ? e.saturation : 1,
      n = i.player,
      s = i.level,
      o = i.hud,
      r = i.input,
      a = (P, V, ...Y) => {
        try {
          if (P && typeof P[V] == "function") return P[V](...Y);
        } catch (L) {
          console.error(`[game] ${V} threw`, L);
        }
      },
      l = pM(i, {
        deploy() {
          (a(i.audio, "resume"), r.requestLock(), U({}));
        },
        resume() {
          j(!0);
        },
        restart() {
          (a(i.audio, "resume"),
            r.requestLock(),
            c.retries++,
            U({ quick: !0, keepRetries: !0 }));
        },
        retry() {
          (a(i.audio, "resume"),
            r.requestLock(),
            c.retries++,
            U({ quick: !0, keepRetries: !0 }));
        },
        redeploy() {
          (a(i.audio, "resume"), r.requestLock(), U({ quick: !0 }));
        },
      });
    l.applySettings();
    let c = {
        time: 0,
        retries: 0,
        relays: [],
        cut: 0,
        allCut: !1,
        queue: [],
        waveHot: 0,
        alertT: 0,
        pursuitT: 0,
        pursuitLeft: 0,
        contactSaid: !1,
        lowSaid: !1,
        extractHint: 0,
        intensity: 0.15,
        used: new Map(),
      },
      u = 0,
      h = Yi.introSeconds,
      f = !1,
      p = !1,
      d = 0,
      v = 0,
      g = !1,
      x = "",
      y = 0.8,
      b = new W(),
      m = new W(),
      A = () => [],
      _ = {
        state: "title",
        flow: Yi,
        run: c,
        menus: l,
        start(P = {}) {
          U({ skipIntro: !!P.skipIntro, quick: !!P.quick });
        },
        pause() {
          G();
        },
        resume() {
          j(!1);
        },
        update: B,
        debugCut() {
          let P = c.relays.find((V) => !V.cut);
          P && me(P);
        },
      };
    function M(P) {
      let V = _.state;
      P !== V &&
        ((_.state = P),
        (u = 0),
        i.events.emit("game:state", { state: P, prev: V }));
    }
    const sentries = createArenaSentries(i);
    const campaign = i.campaign = createArenaCampaign(i, ee, () => {
      o.setPrompt(null);
      o.show(false);
      r.setGameplay?.(false);
      r.exitLock();
      n.enabled = false;
      l.setDead({ time: c.time, relays: 0, total: 0, reason: "The transport was destroyed" });
      M("dead");
    });
    let E = { pos: [], look: [], len: 1, t: 0 };
    function w() {
      let P = (s && s.cinematicPath) || [];
      if (
        ((E.pos = P.map((Y) => new W(...Y.pos))),
        (E.look = P.map((Y) => new W(...Y.look))),
        E.pos.length < 2)
      ) {
        let Y = (s && s.playerStart && s.playerStart.pos) || new W();
        ((E.pos = [new W(Y.x, 2.2, Y.z), new W(Y.x + 8, 2, Y.z)]),
          (E.look = [
            new W(Y.x + 30, 2.5, Y.z - 2),
            new W(Y.x + 40, 3, Y.z - 2),
          ]));
      }
      let V = 0;
      for (let Y = 1; Y < E.pos.length; Y++)
        V += E.pos[Y].distanceTo(E.pos[Y - 1]);
      E.len = Math.max(V, 4);
    }
    function S(P, V, Y) {
      let L = P.length - 1,
        Z = Zn(V, 0, 1) * L,
        J = Math.min(L - 1, Math.floor(Z)),
        oe = Z - J,
        fe = P[Math.max(0, J - 1)],
        le = P[J],
        R = P[J + 1],
        I = P[Math.min(L, J + 2)],
        se = oe * oe,
        ae = se * oe,
        k = (ce, ve, _e, Te) =>
          0.5 *
          (2 * ve +
            (-ce + _e) * oe +
            (2 * ce - 5 * ve + 4 * _e - Te) * se +
            (-ce + 3 * ve - 3 * _e + Te) * ae);
      return Y.set(
        k(fe.x, le.x, R.x, I.x),
        k(fe.y, le.y, R.y, I.y),
        k(fe.z, le.z, R.z, I.z),
      );
    }
    function z(P) {
      let V = Math.max(26, E.len / Yi.titleSpeed);
      ((E.t += P), E.t >= V && (E.t = 0));
      let Y = E.t / V,
        L = Y * Y * (3 - 2 * Y) * 0.25 + Y * 0.75,
        Z = i.camera,
        J = i.time.t;
      (S(E.pos, L, b),
        S(E.look, L, m),
        (b.x += Math.sin(J * 0.31) * 0.05),
        (b.y += Math.sin(J * 0.43 + 1.7) * 0.035),
        (b.z += Math.sin(J * 0.27 + 0.6) * 0.05),
        (m.y += Math.sin(J * 0.19) * 0.12),
        (m.x += Math.sin(J * 0.13 + 2) * 0.2),
        Z.position.copy(b),
        Z.lookAt(m),
        (Z.rotation.z += Math.sin(J * 0.21) * 0.006),
        !i.params.fov &&
          Math.abs(Z.fov - Yi.titleFov) > 0.01 &&
          ((Z.fov = Yi.titleFov), Z.updateProjectionMatrix()),
        (e.fade = Math.max(1 - sl(0, 1.8, E.t), sl(V - 1.6, V, E.t))));
    }
    function H() {
      (a(i.enemies, "clear"),
        a(i.fx, "clear"),
        a(i.combat, "reset"),
        a(i.weapon, "reset"),
        (c.time = 0),
        (c.cut = 0),
        (c.allCut = !1),
        (c.queue.length = 0),
        (c.waveHot = 0),
        (c.alertT = 0),
        (c.pursuitT = 0),
        (c.pursuitLeft = 0),
        (c.contactSaid = !1),
        (c.lowSaid = !1),
        (c.extractHint = 0),
        c.used.clear(),
        (c.relays = A().map((P, V) => {
          let Y = (/([a-z0-9])$/i.exec(String(P.id || "")) || [
            0,
            String.fromCharCode(65 + V),
          ])[1].toUpperCase();
          return (
            O(P, "live"),
            {
              o: P,
              id: P.id || "relay_" + V,
              short: Y,
              t: 0,
              cut: !1,
              cutting: !1,
            }
          );
        })),
        s.resetArenaEntry?.(),
        n.reset(s.playerStart),
        o.reset && o.reset(),
        (e.saturation = t),
        (e.flash = 0),
        q(),
        o.setRelays && o.setRelays(0, c.relays.length));
      sentries.reset();
      campaign.reset();
    }
    function O(P, V) {
      try {
        let Y = P && P.object && P.object.userData;
        Y && typeof Y.setState == "function" && Y.setState(V);
      } catch (Y) {
        console.error("[game] relay setState threw", Y);
      }
    }
    function q() {
      if (!o.setMarkers) return;
      let P = c.relays
        .filter((V) => !V.cut)
        .map((V) => ({
          id: V.id,
          short: V.short,
          label: V.o.label || "Relay " + V.short,
          pos: V.o.pos,
          kind: "relay",
        }));
      (c.allCut &&
        s.extraction &&
        P.push({
          id: "extract",
          short: "EX",
          label: "Boat",
          pos: s.extraction.pos,
          kind: "extract",
        }),
        o.setMarkers(P));
    }
    function U({ skipIntro: P = !0, quick: V = !1, keepRetries: Y = !1 } = {}) {
      if (
        (Y || (c.retries = 0),
        l.show("none"),
        l.locationCard(!1),
        a(i.audio, "setPaused", !1),
        H(),
        a(i.weapon, "setVisible", !0),
        (g = !1),
        P)
      ) {
        ((e.fade = 0), T());
        return;
      }
      ((h = V ? Yi.retryIntroSeconds : Yi.introSeconds),
        (f = V),
        (p = V),
        (n.enabled = !1),
        r.setGameplay && r.setGameplay(!1),
        o.show(!1),
        (e.fade = 1),
        a(i.audio, "setIntensity", 0.15),
        M("intro"));
    }
    function T() {
      ((n.enabled = !0),
        o.show(!0),
        r.setGameplay && r.setGameplay(!0),
        C(!0),
        o.setObjective("Enter the arena"),
        M("playing"));
    }
    function D() {
      if (c.allCut) return "Get to the boat";
      let P = c.relays.length - c.cut;
      return c.cut === 0
        ? "Cut the three uplink relays"
        : P === 1
          ? "Cut the last relay"
          : `Cut the remaining ${P} relays`;
    }
    function C(P) {
      let V = r.describeMode ? r.describeMode() : "";
      (l.setLookMode(V),
        !(!P && V === x) &&
          ((x = V),
          _.state === "playing" &&
          (r.mode === "drag" ||
            (r.mode === "lock" &&
              !r.locked &&
              !i.params.shot &&
              !i.params.autostart))
            ? o.message(V, r.mode === "drag" ? 7 : 4)
            : _.state === "playing" && r.locked && o.message("", 0)));
    }
    (r.onModeChange && r.onModeChange(() => C(!1)),
      i.events.on("input:lock", (P) => {
        if (P.locked) {
          ((g = !0), C(!1));
          return;
        }
        (_.state === "playing" && g && G(), (g = !1));
      }),
      document.addEventListener("visibilitychange", () => {
        document.hidden && _.state === "playing" && G();
      }),
      addEventListener("keydown", (P) => {
        _.state !== "title" ||
          l.panelOpen ||
          (P.code !== "Enter" && P.code !== "NumpadEnter") ||
          (P.target && P.target.tagName === "BUTTON") ||
          (a(i.audio, "resume"), r.requestLock(), U({}));
      }));
    function G() {
      _.state === "playing" &&
        (r.setGameplay && r.setGameplay(!1),
        r.exitLock(),
        a(i.audio, "setPaused", !0),
        l.setLookMode(
          r.mode === "drag"
            ? r.describeMode()
            : r.touch
              ? ""
              : "Resume recaptures the mouse.",
        ),
        o.show(!1),
        l.show("paused"),
        (d = 0.35),
        M("paused"));
    }
    function j(P) {
      _.state === "paused" &&
        (l.show("none"),
        a(i.audio, "setPaused", !1),
        o.show(!0),
        r.setGameplay && r.setGameplay(!0),
        (g = !1),
        r.requestLock(),
        M("playing"),
        setTimeout(() => C(!0), 700));
    }
    function ne() {
      try {
        return i.enemies.aliveCount
          ? i.enemies.aliveCount()
          : i.enemies.list.filter((P) => P.alive).length;
      } catch {
        return 0;
      }
    }
    function re(P) {
      let V = (i.enemies && i.enemies.list) || [];
      for (let Y = 0; Y < V.length; Y++) {
        let L = V[Y];
        if (
          L &&
          L.alive &&
          L.pos &&
          Math.hypot(L.pos.x - n.pos.x, L.pos.z - n.pos.z) < P
        )
          return !0;
      }
      return !1;
    }
    (i.events.on("enemy:alert", () => {
      c.alertT = 10;
    }),
      i.events.on("player:hit", () => {
        c.alertT = Math.max(c.alertT, 8);
      }),
      i.events.on("player:rescued", () => {
        _.state === "playing" && o.message("Hauled out of the water", 2.5);
      }));
    function $() {
      let P = null,
        V = Yi.interactRange;
      for (let Y of c.relays) {
        if (Y.cut) continue;
        let L = Y.o.pos.x - n.pos.x,
          Z = Y.o.pos.z - n.pos.z,
          J = Math.hypot(L, Z);
        J > V ||
          Math.abs((Y.o.pos.y || 0) - n.pos.y) > 2.5 ||
          (J > 0.9 &&
            (L * n.forward.x + Z * n.forward.z) /
              (J * Math.max(0.2, Math.hypot(n.forward.x, n.forward.z))) <
              Yi.interactFacing) ||
          ((P = Y), (V = J));
      }
      return P;
    }
    function ue(P) {
      let V = n.alive ? $() : null;
      for (let L of c.relays)
        L.cut ||
          (L === V && r.down("interact")
            ? (L.cutting || ((L.cutting = !0), O(L.o, "cutting")),
              (L.t += P / Yi.cutSeconds),
              i.events.emit("objective:progress", {
                id: L.id,
                t: Math.min(1, L.t),
              }),
              L.t >= 1 && me(L))
            : L.t > 0 &&
              ((L.t = Math.max(0, L.t - P * 1.6)),
              L.cutting &&
                ((L.cutting = !1),
                O(L.o, "live"),
                i.events.emit("objective:progress", { id: L.id, t: 0 }))));
      V && !V.cut
        ? o.setPrompt && o.setPrompt("Cut relay " + V.short, Fo(V.t))
        : o.setPrompt && o.setPrompt(null);
      let Y = s.extraction;
      if (Y && Y.pos) {
        let L = Math.hypot(Y.pos.x - n.pos.x, Y.pos.z - n.pos.z),
          Z = L < (Y.radius || 2.5) && Math.abs(Y.pos.y - n.pos.y) < 3.5;
        (Z && c.allCut && n.alive
          ? ee()
          : Z &&
            !c.allCut &&
            c.extractHint <= 0 &&
            ((c.extractHint = 8),
            o.message(
              "Relays still live \u2014 the boat will not wait under fire",
              3.5,
            )),
          (c.extractHint = Math.max(0, c.extractHint - P)));
      }
    }
    function me(P) {
      ((P.cut = !0), (P.cutting = !1), (P.t = 1), c.cut++, O(P.o, "cut"));
      let V = c.relays.length;
      (i.events.emit("objective:done", { id: P.id, index: c.cut, total: V }),
        o.setRelays && o.setRelays(c.cut, V),
        o.setPrompt && o.setPrompt(null),
        n.addShake(0.18),
        c.cut >= V
          ? ((c.allCut = !0),
            (c.pursuitLeft = Yi.pursuitExtra),
            (c.pursuitT = 12),
            i.events.emit("objective:all", {}),
            o.radio && o.radio(_l.all, 4.5))
          : o.radio &&
            o.radio(_l.cut[Math.min(c.cut - 1, _l.cut.length - 1)], 3.6),
        o.setObjective(D()),
        q());
    }
    i.events.on("player:dead", () => {
      (_.state !== "playing" && _.state !== "paused") ||
        (r.setGameplay && r.setGameplay(!1),
        r.exitLock(),
        o.setPrompt && o.setPrompt(null),
        o.show(!1),
        o.clearRadio && o.clearRadio(),
        l.setDead({ time: c.time, relays: c.cut, total: c.relays.length }),
        M("dead"));
    });
    function ee() {
      ((n.invulnerable = !0),
        (n.enabled = !1),
        r.setGameplay && r.setGameplay(!1),
        r.exitLock(),
        o.setPrompt && o.setPrompt(null),
        o.show(!1),
        o.clearRadio && o.clearRadio());
      let P = (i.combat && i.combat.stats) || { shots: 0, hits: 0, kills: 0 },
        V = P.shots > 0 ? Zn(P.hits / P.shots, 0, 1) : null,
        Y =
          (c.time < 270 ? 2 : c.time < 400 ? 1 : 0) +
          (V >= 0.5 ? 2 : V >= 0.3 ? 1 : 0) +
          (c.retries === 0 ? 1 : 0),
        L = ["Messy", "Loud", "Steady", "Clean", "Sharp", "Surgical"][Y];
      (l.setDebrief({
        time: c.time,
        accuracy: V,
        kills: P.kills || 0,
        retries: c.retries,
        rating: L,
      }),
        M("complete"));
    }
    function B(P) {
      switch (((u += P), _.state)) {
        case "title":
          return (z(P), !1);
        case "intro":
          return (
            (e.fade = 1 - sl(0.25, Math.min(h, 2.6), u)),
            !f && u > 0.5 && ((f = !0), l.locationCard(!0)),
            !p && u > 1.3 && ((p = !0), o.radio && o.radio(_l.intro, 4.2)),
            u > h - 0.6 &&
              !o.root?.classList.contains("on") &&
              (o.show(!0), o.setObjective(D())),
            u >= h && (l.locationCard(!1), (e.fade = 0), T()),
            !0
          );
        case "playing": {
          if (
            ((c.time += P),
            (e.fade = kn(e.fade || 0, 0, 6, P)),
            d > 0 && (d -= P),
            r.pressed("pause"))
          )
            return (G(), !1);
          if (!s.hasEnteredArena || s.hasEnteredArena()) {
            if (!campaign.update(P)) return false;
            sentries.update(P);
          }
          c.alertT = Math.max(0, c.alertT - P);
          let V = ne();
          c.waveHot > 0 &&
            V === 0 &&
            !c.queue.length &&
            c.waveHot < 24 &&
            (c.waveHot = 0);
          let Y =
            c.allCut || c.queue.length || (c.waveHot > 0 && V > 0)
              ? 1
              : c.alertT > 0 || (V > 0 && re(26))
                ? 0.6
                : 0.15;
          return (
            Y !== c.intensity &&
              ((c.intensity = Y), a(i.audio, "setIntensity", Y)),
            r.mode === "lock" &&
            !r.locked &&
            !r.touch &&
            !i.params.shot &&
            !i.params.autostart
              ? ((y -= P),
                y <= 0 && ((y = 2), o.message(r.describeMode(), 2.6)))
              : (y = 0.8),
            !c.lowSaid &&
              n.alive &&
              n.health < 30 &&
              ((c.lowSaid = !0), o.radio && o.radio(_l.low, 3)),
            !0
          );
        }
        case "paused":
          return (
            d > 0 ? (d -= P) : r.pressed("pause") && (l.closePanel() || j(!1)),
            !1
          );
        case "dead":
          return (
            (e.saturation = kn(e.saturation ?? 1, 0.12, 2.2, P)),
            (e.fade = kn(e.fade || 0, 0.55, 1.4, P)),
            u > 1.5 &&
              l.screen !== "dead" &&
              (l.show("dead"), a(i.audio, "setIntensity", 0.15)),
            !0
          );
        case "complete":
          return (
            (e.fade = kn(e.fade || 0, 0.72, 0.9, P)),
            (e.saturation = kn(e.saturation ?? 1, t * 0.7, 1, P)),
            u > 3.3 &&
              l.screen !== "complete" &&
              (l.show("complete"), i.events.emit("arena:music", { track: "ambient" })),
            !0
          );
      }
      return !1;
    }
    return (
      w(),
      (n.enabled = !1),
      o.show(!1),
      a(i.weapon, "setVisible", !1),
      r.setGameplay && r.setGameplay(!1),
      a(i.audio, "setIntensity", 0.15),
      i.params.shot || i.params.autostart || l.show("title"),
      _
    );
  }
  var gM = {
    mats: qg,
    level: cv,
    backdrop: mv,
    ground: vv,
    fx: Sv,
    weapon: Xv,
    enemies: ex,
    props: $g,
    render: Vg,
  };
  window.__frames = 0;
  window.__ready = !1;
