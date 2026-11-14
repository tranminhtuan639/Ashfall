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
  var xm = {
    rotors: [
      [0.33, 0.035, 0.3],
      [-0.33, 0.035, 0.3],
      [0.33, 0.035, -0.3],
      [-0.33, 0.035, -0.3],
    ],
    gimbal: [0, -0.095, 0.275],
    ball: [0, -0.072, 0],
    gun: [0, -0.085, -0.1],
    muzzle: [0, -0.032, 0.27],
    lamp: [0, -0.066, 0.025],
  };
  function FC() {
    let i = [
      [0.176, -0.036],
      [0.196, -0.032],
      [0.206, 0],
      [0.202, 0.03],
      [0.19, 0.04],
      [0.178, 0.032],
      [0.173, 0],
      [0.176, -0.036],
    ].map((e) => new Ae(e[0], e[1]));
    return new ar(i, 28);
  }
  function j_() {
    let i = xm,
      e = new iu(),
      t = new iu(),
      n = (l, c, u, h, f) => {
        (e.bone(l, c, u, h, f), t.bone(l, c, u, h, f));
      };
    (n("root", null, 0, 0, 0), n("body", "root", 0, 0, 0));
    for (let l = 0; l < 4; l++)
      n("rotor" + l, "body", i.rotors[l][0], i.rotors[l][1], i.rotors[l][2]);
    (n("gimbalYaw", "body", i.gimbal[0], i.gimbal[1], i.gimbal[2]),
      n("ball", "gimbalYaw", i.ball[0], i.ball[1], i.ball[2]),
      n("lamp", "ball", i.lamp[0], i.lamp[1], i.lamp[2]),
      n("gun", "body", i.gun[0], i.gun[1], i.gun[2]),
      n("strobeG", "body", 0, 0, 0),
      n("strobeR", "body", 0, 0, 0),
      n("strobeW", "body", 0, 0, 0));
    let s = (l, c, u, h, f) => e.add(l, c, u, h, f);
    (s("shell", "body", Ce(Ur(1, 20, 12, 0.118, 0.074, 0.27), 0, 0.02, 0), Ss),
      s(
        "shell",
        "body",
        Ce(ot(1, 0.9, 1, 20), 0, 0.02, 0.165, va, 0, 0, [0.094, 0.05, 0.06]),
        Ts,
      ),
      s(
        "shell",
        "body",
        Ce(ot(1, 1, 1, 20), 0, 0.02, -0.02, va, 0, 0, [0.121, 0.012, 0.0765]),
        s0,
      ),
      s("shell", "body", Ce(ft(0.118, 0.014, 0.2, 0.005), 0, 0.089, -0.03), vm),
      s(
        "shell",
        "body",
        Ce(ft(0.03, 0.006, 0.2, 0.002), 0, 0.0975, -0.03),
        Ts,
      ));
    for (let l of [-0.05, 0.05])
      for (let c of [-0.12, 0.06]) s("metal", "body", Yv(l, 0.097, c), Yn);
    (s(
      "metal",
      "body",
      Ce(ft(0.175, 0.06, 0.37, 0.016), 0, -0.035, -0.005),
      an,
    ),
      s(
        "metal",
        "body",
        Ce(ft(0.12, 0.075, 0.11, 0.014), 0, 0.005, -0.265),
        As,
      ),
      s("shell", "body", Ce(ft(0.124, 0.02, 0.03, 0.005), 0, 0.03, -0.3), Ts),
      s(
        "glow",
        "body",
        Ce(ft(0.05, 0.006, 0.003, 0.001), 0, 0, -0.321),
        [0.3, 1.6, 0.4],
        !1,
      ));
    for (let l of [1, -1]) {
      for (let c = 0; c < 4; c++)
        s(
          "metal",
          "body",
          Ce(
            ft(0.004, 0.01, 0.06, 0.001),
            l * 0.0885,
            -0.045 + c * 0.016,
            -0.06,
          ),
          [0.2, 0.2, 0.2],
        );
      s(
        "metal",
        "body",
        Fn(
          [
            [l * 0.075, -0.055, 0.13],
            [l * 0.135, -0.175, 0.16],
            [l * 0.135, -0.192, 0.11],
            [l * 0.135, -0.192, -0.14],
            [l * 0.135, -0.175, -0.19],
            [l * 0.075, -0.055, -0.15],
          ],
          0.0085,
          6,
          !1,
          0.5,
        ),
        Yn,
      );
      for (let c of [0.07, -0.1])
        s(
          "shell",
          "body",
          Ce(Si(0.0135, 0.0135, 0.07, 8), l * 0.135, -0.192, c),
          ga,
        );
      (s(
        "metal",
        "body",
        su([l * 0.04, 0.07, -0.17], [l * 0.085, 0.37, -0.27], 0.004, 0.002, 5),
        an,
      ),
        s(
          "metal",
          "body",
          Ce(ds(0.008, 0.01, 0.025, 6), l * 0.04, 0.078, -0.17),
          Yn,
        ));
    }
    (s("metal", "body", Ce(ds(0.007, 0.007, 0.04, 6), 0, 0.105, 0.1), Yn),
      s("shell", "body", Ce(ds(0.034, 0.036, 0.018, 14), 0, 0.132, 0.1), Ss),
      s(
        "metal",
        "body",
        Ce(ft(0.07, 0.03, 0.09, 0.008), 0, -0.075, 0.235),
        As,
      ));
    let o = FC();
    for (let l = 0; l < 4; l++) {
      let [c, u, h] = i.rotors[l],
        f = Math.sign(c),
        p = Math.sign(h);
      (s(
        "metal",
        "body",
        su([f * 0.07, 0, p * 0.09], [c, u - 0.05, h], 0.017, 0.015, 8),
        an,
      ),
        s(
          "shell",
          "body",
          Ce(
            ft(0.07, 0.045, 0.07, 0.014),
            f * 0.085,
            0,
            p * 0.1,
            0,
            f * p * 0.74,
            0,
          ),
          Ss,
        ),
        s(
          "shell",
          "body",
          Fn(
            [
              [f * 0.09, 0.02, p * 0.12],
              [f * 0.18, 0.012, p * 0.19],
              [c - f * 0.05, u - 0.03, h - p * 0.04],
            ],
            0.005,
            5,
          ),
          ga,
        ),
        s("metal", "body", Ce(ds(0.04, 0.03, 0.075, 12), c, u - 0.05, h), an),
        s("metal", "body", Ce(ds(0.042, 0.042, 0.012, 12), c, u - 0.02, h), Yn),
        s("shell", "body", Ce(o.clone(), c, u, h), Ss),
        s(
          "shell",
          "body",
          Ce(new Ci(0.196, 0.0085, 6, 28), c, u + 0.036, h, va, 0, 0),
          Ts,
        ));
      for (let v = 0; v < 3; v++) {
        let g = v * 2.094 + 0.5 + l;
        s(
          "metal",
          "body",
          Ce(
            ft(0.145, 0.007, 0.016, 0.002),
            c + Math.cos(g) * 0.105,
            u - 0.022,
            h - Math.sin(g) * 0.105,
            0,
            g,
            0,
          ),
          an,
        );
      }
      for (let v = -1; v <= 1; v++) {
        let g = Math.atan2(p, f) + v * 0.2;
        s(
          "shell",
          "body",
          Ce(
            ft(0.012, 0.05, 0.036, 0.003),
            c + Math.cos(g) * 0.205,
            u,
            h + Math.sin(g) * 0.205,
            0,
            -g,
            0,
          ),
          v === 0 ? s0 : Of,
        );
      }
      (s("metal", "rotor" + l, Ce(ds(0.017, 0.02, 0.03, 8), 0, -0.002, 0), Yn),
        s(
          "metal",
          "rotor" + l,
          Ce(ft(0.158, 0.0035, 0.03, 0.001), 0.088, 0.008, 0, 0.22, 0, 0),
          an,
        ),
        s(
          "metal",
          "rotor" + l,
          Ce(ft(0.158, 0.0035, 0.03, 0.001), -0.088, 0.008, 0, -0.22, 0, 0),
          an,
        ),
        s(
          "shell",
          "rotor" + l,
          Ce(ft(0.02, 0.004, 0.031, 0.001), 0.158, 0.008, 0, 0.22, 0, 0),
          Of,
        ),
        s(
          "shell",
          "rotor" + l,
          Ce(ft(0.02, 0.004, 0.031, 0.001), -0.158, 0.008, 0, -0.22, 0, 0),
          Of,
        ));
      let d = new O0(0.03, 0.168, 24, 1);
      (d.rotateX(-va),
        t.add("disc", "body", Ce(d, c, u + 0.008, h), [1, 1, 1], !1));
    }
    (s(
      "glow",
      "strobeR",
      Ce(Ur(0.012, 8, 6), 0.33 + 0.215, 0.035, 0.3),
      [10, 0.4, 0.2],
      !1,
    ),
      s(
        "glow",
        "strobeR",
        Ce(Ur(0.012, 8, 6), 0.33 + 0.215, 0.035, -0.3),
        [10, 0.4, 0.2],
        !1,
      ),
      s(
        "glow",
        "strobeG",
        Ce(Ur(0.012, 8, 6), -0.33 - 0.215, 0.035, 0.3),
        [0.3, 9, 1],
        !1,
      ),
      s(
        "glow",
        "strobeG",
        Ce(Ur(0.012, 8, 6), -0.33 - 0.215, 0.035, -0.3),
        [0.3, 9, 1],
        !1,
      ),
      s("glow", "strobeW", Ce(Ur(0.011, 8, 6), 0, 0.05, -0.325), [9, 9, 9], !1),
      s(
        "metal",
        "gimbalYaw",
        Ce(ds(0.036, 0.036, 0.014, 12), 0, -0.004, 0),
        an,
      ),
      s(
        "metal",
        "gimbalYaw",
        Ce(ft(0.156, 0.01, 0.03, 0.003), 0, -0.014, 0),
        As,
      ));
    for (let l of [1, -1])
      s(
        "metal",
        "gimbalYaw",
        Ce(ft(0.009, 0.075, 0.03, 0.003), l * 0.0735, -0.05, 0),
        As,
      );
    (s("metal", "ball", Ce(Ur(0.06, 18, 12), 0, 0, 0), an),
      s("metal", "ball", Ce(Ro(0.013, 0.013, 0.142, 8), 0, 0, 0), Yn),
      s("metal", "ball", Ce(Si(0.031, 0.036, 0.03, 14), 0, 0.004, 0.048), As),
      s(
        "lens",
        "ball",
        Ce(Si(0.025, 0.025, 0.004, 14), 0, 0.004, 0.0645),
        [1, 1, 1],
        !1,
      ),
      s(
        "metal",
        "ball",
        Ce(Si(0.012, 0.012, 0.01, 8), 0.03, 0.036, 0.04),
        [0.1, 0.12, 0.2],
      ),
      s(
        "metal",
        "ball",
        Ce(
          Si(0.019, 0.023, 0.045, 10),
          i.lamp[0],
          i.lamp[1],
          i.lamp[2] - 0.022,
        ),
        an,
      ),
      s(
        "glow",
        "lamp",
        Ce(Si(0.016, 0.016, 0.003, 10), 0, 0, 0.001),
        [11, 9.8, 7.6],
        !1,
      ));
    {
      let u = new Ua(1.25, 9, 20, 6, !0);
      (u.translate(0, -9 / 2, 0),
        u.rotateX(-va),
        t.add("cone", "lamp", u, [1, 1, 1], !1));
    }
    (s("metal", "gun", Ce(ft(0.05, 0.03, 0.05, 0.006), 0, 0.012, 0), As),
      s("metal", "gun", Ce(Ro(0.012, 0.012, 0.07, 8), 0, -0.005, 0), Yn),
      s("metal", "gun", Ce(ft(0.052, 0.046, 0.13, 0.008), 0, -0.032, 0), As),
      s(
        "shell",
        "gun",
        Ce(ft(0.054, 0.012, 0.05, 0.003), 0, -0.02, -0.03),
        Ts,
      ));
    for (let l of [-0.014, 0.014])
      (s("metal", "gun", Ce(Si(0.0085, 0.0085, 0.2, 8), l, -0.032, 0.16), an),
        s("metal", "gun", Ce(Si(0.012, 0.012, 0.03, 8), l, -0.032, 0.255), As));
    (s("metal", "gun", Ce(ft(0.045, 0.012, 0.012, 0.002), 0, -0.032, 0.2), Yn),
      s(
        "metal",
        "gun",
        Ce(ft(0.03, 0.05, 0.05, 0.006), 0.04, -0.035, -0.02),
        an,
      ));
    let r = e.build(["shell", "metal", "glow", "lens"]),
      a = t.build(["disc", "cone"]);
    return ((r.extra = a), r);
  }
  var Zv = {
      hp: 45,
      boltDamage: 7,
      boltSpeed: 70,
      burst: 3,
      burstGap: 0.12,
      telegraph: 0.55,
      cooldown: [1.9, 3.3],
      rangeMin: 12,
      rangeMax: 25,
      altMin: 4,
      altMax: 8,
      maxSpeed: 8,
      patrolSpeed: 3,
      accel: 11,
      spreadFar: 0.065,
      spreadNear: 0.018,
      fireRange: 42,
      explodeRadius: 3,
      explodeDamage: 30,
    },
    Pn = Zv,
    $o = new W(),
    iz = new W(),
    Bs = new W(),
    Co = new W(),
    sz = new W(),
    ou = new W(),
    Hf = new W(0, 1, 0),
    J_ = new W(0, -1, 0),
    ym = [8, 4, 0.7],
    UC = [14, 1, 0.35],
    K_ = (i, e) => {
      let t = (i - e) % (Math.PI * 2);
      return (
        t > Math.PI ? (t -= Math.PI * 2) : t < -Math.PI && (t += Math.PI * 2),
        t
      );
    },
    bl = (i, e, t) => (i < e ? e : i > t ? t : i);
  function Q_(i, e, t, n) {
    let s = i.G,
      o = i.rng,
      r = t.lensBase.clone(),
      a = pm(
        e,
        {
          shell: t.shell,
          metal: t.metal,
          glow: t.glow,
          lens: r,
          disc: t.disc,
          cone: t.cone,
        },
        { radius: 0.9, center: [0, 0, 0], extra: { def: e.extra, radius: 10 } },
      ),
      l = a.bones;
    ((a.group.rotation.order = "YXZ"), (a.group.visible = !1));
    let c = s.mats.label("G-" + String(n + 11), {
        color: "black",
        font: "stencil",
        distress: 0.35,
      }),
      u = 0.105,
      h = Math.min(0.045, u / (c.aspect || 3)),
      f = new rn(u, h);
    (f.rotateX(-Math.PI / 2), f.rotateY(Math.PI));
    let p = new Qe(f, c.material);
    (p.position.set(0, 0.0985, -0.085),
      (p.castShadow = !1),
      (p.receiveShadow = !0),
      l.body.add(p));
    let d = {
      id: 0,
      type: "gull",
      pos: a.group.position,
      alive: !1,
      hp: Pn.hp,
      active: !1,
      rig: a,
      lens: r,
      vel: new W(),
      yaw: 0,
      pitch: 0,
      roll: 0,
      home: new W(),
      lastKnown: new W(),
      sensor: new W(),
      fwd: new W(0, 0, 1),
      muzzle: new W(),
      mode: "patrol",
      los: !1,
      seeT: 0,
      noSeeT: 0,
      senseT: 0,
      exposure: 0,
      modeT: 0,
      passive: !1,
      hasToken: !1,
      orbitA: 0,
      orbitDir: 1,
      orbitR: 16,
      alt: 6,
      hoverY: 0,
      phase: 0,
      ceil: 1e9,
      ceilT: 0,
      flipT: 0,
      avoid: new W(),
      atk: "idle",
      atkT: 0,
      cool: 1,
      shots: 0,
      smokeT: 0,
      feeler: 0,
      strobeT: 0,
      flare: 0,
      lensC: [ym[0], ym[1], ym[2]],
      dieT: 0,
      spin: 0,
      lostRotor: 0,
      gy: 0,
      gp: 0,
      loop: null,
      sweep: 0,
      thr: 1,
      damage(y, b, m, A) {
        return d.alive
          ? ((d.hp -= y),
            s.events.emit("enemy:hit", {
              enemy: d,
              point: b,
              part: A || "body",
            }),
            m &&
              (d.vel.addScaledVector(m, Math.min(3, y * 0.09)),
              (d.roll += (o() - 0.5) * 0.5),
              (d.pitch += (o() - 0.5) * 0.4)),
            i.provoke(d),
            d.hp <= 0 ? (v(m), !0) : !1)
          : !1;
      },
      _activate(y, b = {}) {
        ((d.active = !0),
          (d.alive = !0),
          (d.hp = Pn.hp),
          (d.passive = !!b.passive),
          d.pos.copy(y),
          d.home.copy(y),
          d.vel.set(0, 0, 0),
          (d.yaw = b.yaw ?? o() * 6.283),
          (d.pitch = d.roll = 0),
          (d.mode = b.state === "alert" ? "investigate" : "patrol"),
          (d.modeT = 8),
          d.lastKnown.copy(b.target || (s.player ? s.player.pos : y)),
          (d.los = !1),
          (d.seeT = d.noSeeT = 0),
          (d.exposure = 0),
          (d.senseT = o() * 0.2),
          (d.hasToken = !1),
          (d.orbitDir = o() < 0.5 ? 1 : -1),
          (d.orbitR = Pn.rangeMin + 2 + o() * (Pn.rangeMax - Pn.rangeMin - 5)),
          (d.alt =
            b.hover ?? Pn.altMin + 0.8 + o() * (Pn.altMax - Pn.altMin - 1.6)),
          (d.hoverFixed = b.hover != null),
          (d.patrolR = b.patrolRadius ?? 4 + o() * 5),
          (d.phase = o() * 6.283),
          (d.orbitA = o() * 6.283),
          (d.ceil = 1e9),
          (d.flipT = 3 + o() * 4),
          (d.atk = "idle"),
          (d.cool = 1 + o() * 1.5),
          (d.dieT = 0),
          (d.spin = 0),
          (d.lostRotor = -1),
          (d.flare = 0),
          (d.thr = 1));
        for (let m = 0; m < 4; m++) l["rotor" + m].scale.setScalar(1);
        if (
          (l.lamp.scale.setScalar(1),
          l.body.rotation.set(0, 0, 0),
          (a.group.visible = !0),
          a.group.rotation.set(0, d.yaw, 0),
          s.audio && s.audio.loop && !d.loop)
        )
          try {
            d.loop = s.audio.loop("gull_rotor", { pos: d.pos, gain: 0.5 });
          } catch {
            d.loop = null;
          }
      },
      _deactivate() {
        if (
          ((d.active = !1),
          (d.alive = !1),
          (a.group.visible = !1),
          i.releaseToken(d),
          d.loop)
        ) {
          try {
            d.loop.stop();
          } catch {}
          d.loop = null;
        }
      },
      _raycast(y, b, m, A) {
        let E = y.x - d.pos.x,
          w = (y.y - d.pos.y + 0.03) * 2.3,
          S = y.z - d.pos.z,
          z = b.x,
          H = b.y * 2.3,
          O = b.z,
          q = z * z + H * H + O * O,
          U = E * z + w * H + S * O,
          T = E * E + w * w + S * S - 0.5 * 0.5,
          D = U * U - q * T;
        if (D < 0) return !1;
        let C = (-U - Math.sqrt(D)) / q;
        return C < 0 || C > m || C >= A.dist
          ? !1
          : ((A.dist = C),
            (A.part = "body"),
            (A.enemy = d),
            A.point.copy(y).addScaledVector(b, C),
            A.normal.copy(A.point).sub(d.pos),
            (A.normal.y *= 2.3),
            A.normal.normalize(),
            !0);
      },
      _update(y) {
        d.alive ? x(y) : g(y);
      },
    };
    function v(y) {
      ((d.alive = !1),
        i.releaseToken(d),
        (d.dieT = 0),
        (d.lostRotor = Math.floor(o() * 4)),
        l["rotor" + d.lostRotor].scale.setScalar(1e-4),
        $o
          .set(xm.rotors[d.lostRotor][0], 0.05, xm.rotors[d.lostRotor][2])
          .applyAxisAngle(Hf, d.yaw)
          .add(d.pos),
        s.fx.sparks($o, Hf, 14),
        s.fx.debris($o, { count: 3 }),
        s.fx.smoke($o, { size: 0.5, life: 1 }),
        (d.spin = (o() < 0.5 ? -1 : 1) * (5 + o() * 3)),
        (d.vel.y += 1.5),
        y && d.vel.addScaledVector(y, 2.5),
        l.lamp.scale.setScalar(1e-4),
        l.strobeG.scale.setScalar(1e-4),
        l.strobeR.scale.setScalar(1e-4),
        l.strobeW.scale.setScalar(1e-4),
        r.color.setRGB(0.3, 0.05, 0.02),
        s.events.emit("enemy:killed", { enemy: d, pos: d.pos, type: "gull" }));
    }
    function g(y) {
      ((d.dieT += y),
        (d.vel.y -= 9.5 * y),
        (d.vel.x *= 1 - 0.4 * y),
        (d.vel.z *= 1 - 0.4 * y),
        (d.spin += Math.sign(d.spin) * 7 * y),
        (d.yaw += d.spin * y),
        (d.roll += d.spin * 0.35 * y),
        (d.pitch += 0.9 * y));
      let b = d.vel.length(),
        m = b * y,
        A = d.dieT > 5 || d.pos.y < -3;
      if (!A && b > 0.01) {
        Bs.copy(d.vel).multiplyScalar(1 / b);
        let _ = s.physics.raycast(d.pos, Bs, m + 0.3);
        _ && (d.pos.copy(_.point).addScaledVector(_.normal, 0.2), (A = !0));
      }
      (A || d.pos.addScaledVector(d.vel, y),
        a.group.rotation.set(d.pitch, d.yaw, d.roll));
      for (let _ = 0; _ < 4; _++)
        _ !== d.lostRotor &&
          (l["rotor" + _].rotation.y +=
            (_ % 3 === 0 ? 1 : -1) * 30 * Math.max(0.2, 1 - d.dieT * 0.5) * y);
      ((d.smokeT -= y),
        d.smokeT <= 0 &&
          ((d.smokeT = 0.045),
          s.fx.smoke(d.pos, {
            size: 0.45,
            life: 1.3,
            color: 1381914,
            rise: 0.6,
          }),
          o() < 0.5 &&
            ($o.set(o() - 0.5, o(), o() - 0.5).normalize(),
            s.fx.sparks(d.pos, $o, 3))),
        d.loop &&
          (d.loop.setPos(d.pos),
          d.loop.setPitch(Math.max(0.4, 1.25 - d.dieT * 0.4)),
          d.loop.setGain(0.5)),
        A &&
          (s.fx.explosion(d.pos, 1.2),
          !d.passive &&
            s.combat &&
            s.combat.explode &&
            s.combat.explode(
              d.pos,
              Pn.explodeRadius,
              Pn.explodeDamage,
              "enemy",
            ),
          i.retire(d)));
    }
    function x(y) {
      let b = s.player,
        m = i.t;
      (d.fwd.set(Math.sin(d.yaw), 0, Math.cos(d.yaw)),
        d.sensor.set(0, -0.17, 0.27).applyAxisAngle(Hf, d.yaw).add(d.pos),
        i.think(d, y, 0.4));
      let A = d.mode === "engage",
        _ = d.hp < Pn.hp * 0.5,
        M = Pn.patrolSpeed,
        E,
        w,
        S;
      if (A && b) {
        M = Pn.maxSpeed;
        let P = d.atk !== "idle";
        ((d.flipT -= y),
          d.flipT <= 0 &&
            ((d.flipT = 3 + o() * 5),
            o() < 0.6 && (d.orbitDir = -d.orbitDir),
            (d.orbitR = bl(
              d.orbitR + (o() - 0.5) * 6,
              Pn.rangeMin + 1,
              Pn.rangeMax - 2,
            ))),
          d.noSeeT > 1.5
            ? ((E = d.lastKnown.x),
              (S = d.lastKnown.z),
              (w = d.lastKnown.y + d.alt + 1),
              (d.orbitA = Math.atan2(
                d.pos.z - d.lastKnown.z,
                d.pos.x - d.lastKnown.x,
              )))
            : ((d.orbitA += ((d.orbitDir * (P ? 0.9 : 3.6)) / d.orbitR) * y),
              (E = b.pos.x + Math.cos(d.orbitA) * d.orbitR),
              (S = b.pos.z + Math.sin(d.orbitA) * d.orbitR),
              (w = b.pos.y + d.alt)));
      } else
        d.mode === "investigate" || d.mode === "search"
          ? ((M = 5.5),
            (d.orbitA += 0.5 * y),
            (E = d.lastKnown.x + Math.cos(d.orbitA) * 4.5),
            (S = d.lastKnown.z + Math.sin(d.orbitA) * 4.5),
            (w = d.lastKnown.y + Math.min(d.alt, 5.5)))
          : ((d.orbitA += 0.28 * y * d.orbitDir),
            (E = d.home.x + Math.cos(d.orbitA) * d.patrolR),
            (S = d.home.z + Math.sin(d.orbitA) * d.patrolR),
            (w = d.hoverFixed ? d.alt : d.home.y));
      (w > d.ceil && (w = d.ceil),
        !d.hoverFixed && w < 2.2 && (w = 2.2),
        Co.set(
          (E - d.pos.x) * 2.2 - d.vel.x * 2.4,
          (w - d.pos.y) * 5 - d.vel.y * 3.6,
          (S - d.pos.z) * 2.2 - d.vel.z * 2.4,
        ),
        (d.feeler = (d.feeler + 1) % 3));
      let z = Math.hypot(d.vel.x, d.vel.z);
      if (d.feeler === 0 && z > 0.6) {
        Bs.set(d.vel.x / z, 0, d.vel.z / z);
        let P = 2.2 + z * 0.5,
          V = s.physics.raycast(d.pos, Bs, P);
        if (V) {
          let Y = 1 - V.dist / P;
          (d.avoid.copy(V.normal).multiplyScalar(26 * Y),
            (d.avoid.y += 9 * Y),
            Y > 0.5 && ((d.orbitDir = -d.orbitDir), (d.flipT = 2.5)));
        }
      } else if (d.feeler === 1) {
        let P = s.physics.raycast(d.pos, J_, 2.4);
        P && !d.hoverFixed && (d.avoid.y += (2.4 - P.dist) * 10);
      } else if (d.feeler === 2 && ((d.ceilT -= y * 3), d.ceilT <= 0)) {
        d.ceilT = 0.35;
        let P = s.physics.raycast(d.pos, Hf, 4);
        d.ceil = P ? d.pos.y + P.dist - 1.3 : 1e9;
      }
      (Co.add(d.avoid),
        d.avoid.multiplyScalar(Math.exp(-6 * y)),
        _ &&
          ((Co.x += Math.sin(m * 7.3 + d.phase) * 5),
          (Co.z += Math.cos(m * 6.1 + d.phase) * 5),
          (Co.y += Math.sin(m * 9.7) * 3)));
      let H = Co.length();
      (H > Pn.accel && Co.multiplyScalar(Pn.accel / H),
        d.vel.addScaledVector(Co, y));
      let O = d.vel.length();
      O > M && (d.vel.multiplyScalar(M / O), (O = M));
      for (let P = 0; P < 3; P++) {
        let V = P === 0 ? d.vel.x : P === 1 ? d.vel.y : d.vel.z;
        if (Math.abs(V) < 0.02) continue;
        let Y = V > 0 ? 1 : -1,
          L = P === 1 ? 0.35 : 0.62;
        Bs.set(P === 0 ? Y : 0, P === 1 ? Y : 0, P === 2 ? Y : 0);
        let Z = s.physics.raycast(d.pos, Bs, Math.abs(V) * y + L);
        Z &&
          (d.vel.setComponent(P, -V * 0.25),
          d.avoid.setComponent(P, d.avoid.getComponent(P) - Y * 8),
          Z.dist < L &&
            d.pos.setComponent(P, d.pos.getComponent(P) - Y * (L - Z.dist)));
      }
      if ((d.pos.addScaledVector(d.vel, y), !d.hoverFixed)) {
        let P = s.physics.groundHeight(d.pos.x, d.pos.z, d.pos.y + 0.5) + 1.1;
        d.pos.y < P && ((d.pos.y = P), d.vel.y < 0 && (d.vel.y = 0));
      }
      let q = d.yaw;
      if ((A || d.mode === "search" || d.mode === "investigate") && b) {
        let P = A && d.noSeeT < 1.5 ? b.pos : d.lastKnown;
        q = Math.atan2(P.x - d.pos.x, P.z - d.pos.z);
      } else z > 0.4 && (q = Math.atan2(d.vel.x, d.vel.z));
      let U = K_(q, d.yaw);
      d.yaw += bl(U, -3.2 * y, 3.2 * y);
      let T = Math.cos(d.yaw),
        D = Math.sin(d.yaw),
        C = Co.x * D + Co.z * T,
        G = Co.x * T - Co.z * D,
        j = bl(C * 0.04, -0.42, 0.42),
        N = bl(-G * 0.04, -0.42, 0.42);
      _ &&
        ((j += Math.sin(m * 11 + d.phase) * 0.1),
        (N += Math.cos(m * 8.7 + d.phase * 2) * 0.13));
      let Q = 1 - Math.exp(-7 * y);
      ((d.pitch += (j - d.pitch) * Q),
        (d.roll += (N - d.roll) * Q),
        a.group.rotation.set(d.pitch, d.yaw, d.roll),
        (l.body.position.y =
          Math.sin(m * 2.1 + d.phase) * 0.045 +
          Math.sin(m * 3.7 + d.phase * 1.7) * 0.018),
        (d.thr += (1 + bl(Co.y * 0.03, -0.25, 0.4) + z * 0.02 - d.thr) * Q));
      let K = 41 * d.thr * y;
      ((l.rotor0.rotation.y += K),
        (l.rotor1.rotation.y -= K * 1.03),
        (l.rotor2.rotation.y -= K * 0.98),
        (l.rotor3.rotation.y += K * 1.01));
      let ie = (m * 0.9 + d.phase * 0.1) % 1,
        F = ie < 0.05 || (ie > 0.13 && ie < 0.18) ? 1 : 1e-4;
      if (
        (l.strobeR.scale.setScalar(F),
        l.strobeG.scale.setScalar(F),
        l.strobeW.scale.setScalar(ie > 0.5 && ie < 0.56 ? 1 : 1e-4),
        A && b)
      )
        ou.set(b.pos.x, b.pos.y + 1.1, b.pos.z);
      else if (d.mode !== "patrol")
        ((d.sweep += y),
          ou.set(
            d.lastKnown.x + Math.sin(d.sweep * 0.9) * 3,
            d.lastKnown.y,
            d.lastKnown.z + Math.cos(d.sweep * 0.7) * 3,
          ));
      else {
        d.sweep += y;
        let P = d.yaw + Math.sin(d.sweep * 0.5 + d.phase) * 0.9;
        ou.set(
          d.pos.x + Math.sin(P) * 5,
          d.pos.y - (d.hoverFixed ? 1.6 : 5),
          d.pos.z + Math.cos(P) * 5,
        );
      }
      $o.copy(ou).sub(d.sensor);
      let X = $o.x * T - $o.z * D,
        ne = $o.x * D + $o.z * T,
        re = $o.y,
        $ = Math.atan2(X, ne),
        ue = bl(Math.atan2(-re, Math.hypot(X, ne)), -0.5, 1.5),
        me = 1 - Math.exp(-9 * y);
      ((d.gy += K_($, d.gy) * me),
        (d.gp += (ue - d.gp) * me),
        (l.gimbalYaw.rotation.y = d.gy),
        (l.ball.rotation.x = d.gp - d.pitch),
        (l.gun.rotation.x = bl(d.gp, -0.2, 1.3) - d.pitch));
      let ee = A ? UC : ym,
        B = 1 + d.flare * 3.2 + (A ? 0 : Math.sin(m * 3 + d.phase) * 0.15);
      for (let P = 0; P < 3; P++)
        d.lensC[P] += (ee[P] - d.lensC[P]) * (1 - Math.exp(-8 * y));
      if (
        (r.color.setRGB(d.lensC[0] * B, d.lensC[1] * B, d.lensC[2] * B),
        (d.flare = Math.max(0, d.flare - y * 1.5)),
        d.muzzle.set(0, -0.12, 0.17).applyAxisAngle(Hf, d.yaw).add(d.pos),
        (d.cool -= y),
        d.atk === "idle")
      )
        A &&
          d.los &&
          d.cool <= 0 &&
          b &&
          b.alive &&
          Math.abs(U) < 0.35 &&
          d.pos.distanceTo(b.pos) < Pn.fireRange &&
          i.requestToken(d) &&
          ((d.atk = "tele"),
          (d.atkT = Pn.telegraph),
          s.events.emit("enemy:telegraph", {
            enemy: d,
            type: "gull",
            time: Pn.telegraph,
            pos: d.pos,
          }));
      else if (d.atk === "tele")
        ((d.atkT -= y),
          (d.flare = Math.min(1, d.flare + y * 4.5)),
          A
            ? d.atkT <= 0 &&
              ((d.atk = "burst"),
              (d.shots = Pn.burst),
              (d.atkT = 0),
              (d.lead = 0.2 + o() * 0.65))
            : ((d.atk = "idle"), i.releaseToken(d)));
      else if (
        d.atk === "burst" &&
        ((d.atkT -= y), (d.flare = 1), d.atkT <= 0)
      ) {
        if (((d.atkT = Pn.burstGap), d.shots--, b)) {
          let P = d.muzzle.distanceTo(b.pos),
            V = P / Pn.boltSpeed;
          (ou.set(
            b.pos.x + b.vel.x * V * d.lead,
            b.pos.y + 1.05,
            b.pos.z + b.vel.z * V * d.lead,
          ),
            Bs.copy(ou).sub(d.muzzle).normalize());
          let Y =
            (Pn.spreadFar + (Pn.spreadNear - Pn.spreadFar) * d.exposure) *
            (1 + i.playerSpeed * 0.45) *
            (_ ? 1.5 : 1);
          ((Bs.x += (o() - 0.5) * 2 * Y),
            (Bs.y += (o() - 0.5) * 2 * Y),
            (Bs.z += (o() - 0.5) * 2 * Y),
            Bs.normalize(),
            i.fireBolt(d.muzzle, Bs, d),
            s.fx.muzzleFlash(d.muzzle, Bs, { scale: 0.55 }),
            s.events.emit("enemy:fire", {
              enemy: d,
              pos: d.muzzle,
              dir: Bs,
              type: "gull",
            }),
            d.vel.addScaledVector(Bs, -0.35));
        }
        d.shots <= 0 &&
          ((d.atk = "idle"),
          (d.cool = Pn.cooldown[0] + o() * (Pn.cooldown[1] - Pn.cooldown[0])),
          i.releaseToken(d));
      }
      (_ &&
        ((d.smokeT -= y),
        d.smokeT <= 0 &&
          ((d.smokeT = 0.16),
          s.fx.smoke(d.pos, {
            size: 0.3,
            life: 1.1,
            color: 2500652,
            rise: 0.8,
          }),
          o() < 0.15 && s.fx.sparks(d.pos, J_, 2))),
        d.loop &&
          (d.loop.setPos(d.pos),
          d.loop.setPitch(
            0.85 + d.thr * 0.2 + (_ ? Math.sin(m * 13) * 0.05 : 0),
          )));
    }
    return d;
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
        type: "hound",
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
          return (i.provoke(m), m.hp <= 0 ? (q(C), !0) : !1);
        },
        _activate(T, D = {}) {
          m.size = D.size ?? ANKYLOSAURUS_SIZE;
          m.maxHp = Gt.hp * (D.hpScale ?? 1);
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
              m.loop = s.audio.loop("hound_servo", { pos: m.pos, gain: 0 });
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
            i.releaseToken(m),
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
    function _(T, D) {
      (!D && m.hasGoal && m.goal.distanceToSquared(T) < 0.25) ||
        (m.goal.copy(T), (m.hasGoal = !0), (m.planT = 0), (m.stuckT = 0));
    }
    function M() {
      m.planT = Gt.replan + o() * 0.15;
      let T = null;
      try {
        T = s.physics.nav.findPath(m.pos, m.goal);
      } catch {
        T = null;
      }
      ((m.path = T && T.length ? T : null),
        (m.wp = 0),
        m.path &&
          m.path.length > 1 &&
          m.path[0].distanceToSquared(m.pos) < 0.36 &&
          (m.wp = 1));
    }
    function E(T, D) {
      if (!m.hasGoal) return ((m.maxSpeed = 0), !0);
      ((m.planT -= T), m.planT <= 0 && M());
      let C = m.goal;
      if (m.path) {
        for (
          ;
          m.wp < m.path.length - 1 &&
          Math.hypot(m.path[m.wp].x - m.pos.x, m.path[m.wp].z - m.pos.z) < 0.55;

        )
          m.wp++;
        C = m.path[Math.min(m.wp, m.path.length - 1)];
      }
      let G = m.goal.x - m.pos.x,
        j = m.goal.z - m.pos.z,
        N = Math.hypot(G, j);
      if (N < 0.45) return ((m.hasGoal = !1), (m.maxSpeed = 0), !0);
      let Q = C.x - m.pos.x,
        K = C.z - m.pos.z;
      m.wantYaw = Math.atan2(Q, K);
      let ie = Math.abs(Mm(m.wantYaw, m.yaw));
      return (
        (m.maxSpeed =
          ie > 1.1 ? 0 : Math.min(D * (1 - ie * 0.5), 0.4 + N * 2.6)),
        !1
      );
    }
    function w() {
      let T = s.player;
      if (!T) return;
      let D = 1 / 0,
        C = T.eye || T.pos,
        G = (Q, K) => {
          let ie = Math.hypot(Q.x - T.pos.x, Q.z - T.pos.z);
          if (
            ie < Gt.rangeMin ||
            ie > Gt.rangeMax ||
            (s.physics.nav.isWalkable && !s.physics.nav.isWalkable(Q.x, Q.z))
          )
            return;
          let F = Math.hypot(Q.x - m.pos.x, Q.z - m.pos.z) * 0.9 + K + o() * 3,
            X = Q.x - T.pos.x,
            ne = Q.z - T.pos.z;
          for (let re of i.list) {
            if (
              re === m ||
              !re.alive ||
              re.type !== "hound" ||
              re.mode !== "engage"
            )
              continue;
            let $ = re.es === "move" ? re.firePos : re.pos,
              ue = $.x - T.pos.x,
              me = $.z - T.pos.z,
              ee =
                (X * ue + ne * me) /
                (Math.hypot(X, ne) * Math.hypot(ue, me) + 1e-4);
            (ee > 0.86 && (F += (14 * (ee - 0.86)) / 0.14),
              Math.hypot(Q.x - $.x, Q.z - $.z) < 3 && (F += 16));
          }
          F >= D ||
            (Vf.set(Q.x, Q.y + 0.95, Q.z),
            s.physics.lineOfSight(Vf, C) || (F += 22),
            F < D && ((D = F), m.firePos.set(Q.x, Q.y, Q.z)));
        },
        j = s.level && s.level.coverPoints;
      if (j) for (let Q = 0; Q < j.length; Q++) G(j[Q], -2);
      for (let Q = 0; Q < 7; Q++) {
        let K = s.physics.nav.randomPoint(T.pos, Gt.rangeMax);
        K && G(K, 0);
      }
      let N = Math.atan2(m.pos.z - T.pos.z, m.pos.x - T.pos.x);
      for (let Q = 0; Q < 5; Q++) {
        let K = N + (o() - 0.5) * 2.6,
          ie = Gt.rangeMin + 1 + o() * (Gt.rangeMax - Gt.rangeMin - 2);
        (Io.set(
          T.pos.x + Math.cos(K) * ie,
          T.pos.y,
          T.pos.z + Math.sin(K) * ie,
        ),
          (Io.y = s.physics.groundHeight(Io.x, Io.z, T.pos.y + 1)),
          G(Io, 1));
      }
      (D === 1 / 0 && m.firePos.copy(m.pos),
        m.firePlayer.copy(T.pos),
        _(m.firePos, !0),
        (m.es = "move"),
        (m.esT = 0),
        (m.moveT = 0),
        (m.bursts = 0));
    }
    function S(T) {
      let D = s.player,
        C = i.t;
      (m.fwd.set(Math.sin(m.yaw), 0, Math.cos(m.yaw)),
        m.sensor.copy(m.headPos),
        i.think(m, T, 0.55),
        m.mode !== m.modeSeen &&
          ((m.modeSeen = m.mode),
          (m.hasGoal = !1),
          (m.path = null),
          (m.waitT = 0),
          m.mode === "engage"
            ? w()
            : (m.es === "tele" || m.es === "burst") &&
              (i.releaseToken(m), (m.es = "move"))),
        (m.wantYaw = m.yaw),
        (m.maxSpeed = 0),
        (m.cool -= T),
        (m.lungeCd -= T));
      let G = null,
        j = null,
        N = 0,
        Q = !1,
        K = D ? Math.hypot(D.pos.x - m.pos.x, D.pos.z - m.pos.z) : 1e9;
      if (m.mode === "patrol") {
        if (m.hasGoal) E(T, Gt.patrolSpeed) && (m.waitT = 1.5 + o() * 3);
        else if (((m.waitT -= T), m.waitT <= 0))
          if (m.patrolLine)
            ((m.patrolI = (m.patrolI + 1) % m.patrolLine.length),
              _(m.patrolLine[m.patrolI], !0));
          else {
            let I = s.physics.nav.randomPoint(m.home, m.patrolR);
            I ? _(I, !0) : (m.waitT = 1);
          }
      } else if (m.mode === "investigate" || m.mode === "search") {
        j = m.lastKnown;
        let I = Math.hypot(m.lastKnown.x - m.pos.x, m.lastKnown.z - m.pos.z);
        I > 2.2
          ? (_(m.lastKnown), E(T, I < 8 ? Gt.stalkSpeed : Gt.runSpeed))
          : ((m.hasGoal = !1),
            (m.scan += T),
            (m.wantYaw = m.yaw + Math.sin(m.scan * 0.8) * 0.9),
            (j = null));
      } else if (D) {
        ((G = D.pos), (j = D.pos));
        let I = Math.atan2(D.pos.x - m.pos.x, D.pos.z - m.pos.z);
        switch (
          ((m.es === "move" || m.es === "aim" || m.es === "cool") &&
            K < Gt.lungeRange &&
            m.lungeCd <= 0 &&
            D.alive &&
            ((m.es = "wind"),
            (m.esT = 0.28),
            i.releaseToken(m),
            s.events.emit("enemy:telegraph", {
              enemy: m,
              type: "hound",
              time: 0.28,
              pos: m.pos,
              melee: !0,
            })),
          m.es)
        ) {
          case "move": {
            m.moveT += T;
            let se = E(T, Gt.runSpeed),
              ae = K > Gt.rangeMin - 1 && K < Gt.rangeMax + 2;
            se || (m.moveT > 1.4 && m.los && ae && o() < T * 0.7) || m.moveT > 7
              ? ((m.es = "aim"), (m.esT = 0), (m.hasGoal = !1))
              : D.pos.distanceToSquared(m.firePlayer) > 49 && w();
            break;
          }
          case "aim":
          case "cool": {
            ((m.wantYaw = I),
              (m.esT += T),
              m.los
                ? K < Gt.rangeMin - 3 && m.esT > 0.8
                  ? w()
                  : m.cool <= 0 &&
                    D.alive &&
                    Math.abs(Mm(I - m.yaw, m.tyaw)) < 0.14 &&
                    i.requestToken(m) &&
                    ((m.es = "tele"),
                    (m.esT = Gt.telegraph),
                    s.events.emit("enemy:telegraph", {
                      enemy: m,
                      type: "hound",
                      time: Gt.telegraph,
                      pos: m.pos,
                    }))
                : (m.noSeeT > 1.1 || m.esT > 3) && w());
            break;
          }
          case "tele": {
            ((m.wantYaw = I),
              (m.esT -= T),
              (m.flare = Math.min(1, m.flare + T * 5)),
              (N = 0.05),
              m.esT <= 0 &&
                ((m.es = "burst"), (m.shots = Gt.burst), (m.esT = 0)));
            break;
          }
          case "burst": {
            ((m.wantYaw = I),
              (m.esT -= T),
              (m.flare = 1),
              (N = 0.05),
              m.esT <= 0 && ((m.esT = Gt.burstGap), m.shots--, z(D)),
              m.shots <= 0 &&
                (i.releaseToken(m),
                (m.cool =
                  Gt.cooldown[0] + o() * (Gt.cooldown[1] - Gt.cooldown[0])),
                m.bursts++,
                m.bursts >= 1 + (o() < 0.4 ? 1 : 0)
                  ? w()
                  : ((m.es = "cool"), (m.esT = 0))));
            break;
          }
          case "wind": {
            ((m.wantYaw = I),
              (m.esT -= T),
              (N = 0.16),
              (m.sP.v += 3 * T),
              m.esT <= 0 &&
                ((m.es = "lunge"),
                (m.esT = 0.36),
                (m.speed = Gt.lungeSpeed),
                (m.yaw = I)));
            break;
          }
          case "lunge": {
            ((Q = !0),
              (m.esT -= T),
              (m.wantYaw = I),
              (m.maxSpeed = Gt.lungeSpeed),
              (m.speed = Gt.lungeSpeed),
              K < 1.35 &&
                D.alive &&
                (D.damage(Gt.lungeDamage * m.damageScale, m.pos),
                s.events.emit("enemy:melee", { enemy: m, pos: m.pos }),
                (m.esT = 0),
                (m.sP.v -= 4)),
              m.esT <= 0 &&
                ((m.es = "recover"),
                (m.esT = 0.55),
                (m.lungeCd = Gt.lungeCooldown),
                (m.speed *= 0.3)));
            break;
          }
          case "recover": {
            ((m.esT -= T), (m.wantYaw = I), m.esT <= 0 && w());
            break;
          }
        }
      }
      let ie = Mm(m.wantYaw, m.yaw),
        F = uo(ie * 6, -Gt.turnRate, Gt.turnRate) * (Q ? 2 : 1);
      ((m.yawRate += (F - m.yawRate) * (1 - Math.exp(-10 * T))),
        (m.yaw += m.yawRate * T));
      let X = m.maxSpeed > m.speed ? Gt.accel : -Gt.accel * 1.4;
      ((m.prevSpeed = m.speed),
        (m.speed = Q
          ? m.speed
          : uo(m.speed + X * T, 0, Math.max(m.maxSpeed, 0))),
        !Q && X < 0 && m.speed < m.maxSpeed && (m.speed = m.maxSpeed));
      let ne = Math.sin(m.yaw),
        re = Math.cos(m.yaw);
      for (let I of i.list) {
        if (I === m || I.type !== "hound" || !I.active) continue;
        let se = m.pos.x - I.pos.x,
          ae = m.pos.z - I.pos.z,
          k = Math.hypot(se, ae);
        if (k < 1.7 && k > 0.001) {
          let ce = ((1.7 - k) * 2.2) / k;
          ((m.push.x += se * ce * T * 6), (m.push.z += ae * ce * T * 6));
        }
      }
      if (D && !Q && K < 1.25 && K > 0.001) {
        let I = ((1.25 - K) * 3) / K;
        ((m.push.x += (m.pos.x - D.pos.x) * I * T * 6),
          (m.push.z += (m.pos.z - D.pos.z) * I * T * 6));
      }
      m.push.multiplyScalar(Math.exp(-5 * T));
      let $ = m.pos.x + (ne * m.speed + m.push.x) * T,
        ue = m.pos.z + (re * m.speed + m.push.z) * T,
        me = s.physics.nav;
      if (((m.feelT -= T), m.feelT <= 0 && m.speed > 0.3)) {
        ((m.feelT = 0.12),
          Io.set(m.pos.x, m.pos.y + 0.55, m.pos.z),
          Po.set(ne, 0, re));
        let I = s.physics.raycast(Io, Po, 0.75 + m.speed * 0.12);
        m.blocked = !!I;
      } else m.speed <= 0.3 && (m.blocked = !1);
      (((me.isWalkable && !me.isWalkable($, ue)) ||
        (m.blocked && !Q) ||
        (m.blocked && Q && m.esT < 0.3)) &&
        (m.blocked
          ? (($ = m.pos.x + m.push.x * T),
            (ue = m.pos.z + m.push.z * T),
            (m.yawRate += (m.phase > 3.14 ? 1 : -1) * 4 * T))
          : me.isWalkable($, m.pos.z)
            ? (ue = m.pos.z)
            : me.isWalkable(m.pos.x, ue)
              ? ($ = m.pos.x)
              : (($ = m.pos.x), (ue = m.pos.z)),
        (m.speed *= 0.6),
        (m.stuckT += T),
        m.stuckT > 0.5 &&
          ((m.stuckT = 0),
          (m.planT = 0),
          m.mode === "engage" && m.es === "move"
            ? w()
            : m.mode === "patrol" && (m.hasGoal = !1))),
        (m.pos.x = $),
        (m.pos.z = ue),
        (m.pos.y +=
          (s.physics.groundHeight($, ue, m.pos.y + 0.6) - m.pos.y) *
          (1 - Math.exp(-12 * T))),
        H(T),
        (m.crouch += (N - m.crouch) * (1 - Math.exp(-12 * T))));
      let ee = Math.cos(m.yaw),
        B = Math.sin(m.yaw),
        P = 0,
        V = 0,
        Y = 0,
        L = 0.05,
        Z = m.pos.y + ni.stand + m.sY.x - m.crouch;
      if (G) {
        let I = G.x - m.pos.x,
          se = G.z - m.pos.z,
          ae = G.y + 1 - (Z + 0.25);
        ((P = Math.atan2(I * ee - se * B, I * B + se * ee)),
          (V = uo(Math.atan2(-ae, Math.hypot(I, se)), -0.9, 0.35)));
      } else
        ((m.scan += T * 0.5), (P = Math.sin(m.scan * 0.9 + m.phase) * 1.1));
      if (j) {
        let I = j.x - m.pos.x,
          se = j.z - m.pos.z,
          ae = j.y + 1.2 - (Z + 0.2);
        ((Y = uo(Math.atan2(I * ee - se * B, I * B + se * ee), -1.2, 1.2)),
          (L = uo(Math.atan2(-ae, Math.hypot(I, se)), -0.6, 0.5)));
      } else
        Y =
          Math.sin(i.t * 0.7 + m.phase) * 0.5 + uo(m.yawRate * 0.25, -0.6, 0.6);
      let J = uo(4.5 * T, 0, 1);
      ((m.tyaw += uo(Mm(P, m.tyaw), -J, J)),
        (m.tpitch += (V - m.tpitch) * (1 - Math.exp(-10 * T))));
      let oe = 1 - Math.exp(-7 * T);
      ((m.hyaw += (Y - m.hyaw) * oe), (m.hpitch += (L - m.hpitch) * oe), O(T));
      let fe = (i.t * (m.mode === "patrol" ? 0.8 : 2.2) + m.phase) % 1;
      l.beacon.scale.setScalar(fe < 0.12 || (fe > 0.22 && fe < 0.3) ? 1 : 1e-4);
      let le = m.mode === "engage" ? NC : _m,
        R = 1 + m.flare * 3.5;
      for (let I = 0; I < 3; I++)
        m.lensC[I] += (le[I] - m.lensC[I]) * (1 - Math.exp(-8 * T));
      (r.color.setRGB(m.lensC[0] * R, m.lensC[1] * R, m.lensC[2] * R),
        (m.flare = Math.max(0, m.flare - T * 2)),
        m.hp < m.maxHp * Gt.smokeBelow &&
          ((m.smokeT -= T),
          m.smokeT <= 0 &&
            ((m.smokeT = 0.2),
            ps.set(m.pos.x - ne * 0.3, Z + 0.2, m.pos.z - re * 0.3),
            s.fx.smoke(ps, {
              size: 0.35,
              life: 1.3,
              color: 2303272,
              rise: 0.9,
            }),
            o() < 0.2 && s.fx.sparks(ps, jv, 3))),
        m.loop &&
          (m.loop.setPos(m.pos),
          m.loop.setGain(
            uo(0.12 + m.speed * 0.12 + Math.abs(m.yawRate) * 0.1, 0, 0.8),
          ),
          m.loop.setPitch(0.8 + m.speed * 0.08)));
    }
    function z(T) {
      visual.muzzle.getWorldPosition(m.muzzle);
      Vf.set(T.pos.x, T.pos.y + 1, T.pos.z);
      Po.copy(Vf).sub(m.muzzle).normalize();
      let G =
        (Gt.spreadFar + (Gt.spreadNear - Gt.spreadFar) * m.exposure) *
        (1 + i.playerSpeed * 0.3);
      ((Po.x += (o() - 0.5) * 2 * G),
        (Po.y += (o() - 0.5) * 2 * G),
        (Po.z += (o() - 0.5) * 2 * G),
        Po.normalize());
      let j = s.physics.raycast(m.muzzle, Po, 200),
        Q = s.combat.enemyShot(m.muzzle, Po, {
          damage: Gt.shotDamage * m.damageScale,
          range: 200,
        })
          ? m.muzzle.distanceTo(Vf)
          : j
            ? j.dist
            : 90;
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
          type: "hound",
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
        s.events.emit("enemy:step", { pos, type: "hound", enemy: m, ankylosaurus: true });
      });
      visual.head.getWorldPosition(m.headPos);
    }
    function q(T) {
      ((m.alive = !1),
        i.releaseToken(m),
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
        s.events.emit("enemy:killed", { enemy: m, pos: m.pos, type: "hound", turretPos: visual.turret.getWorldPosition(new W()) }),
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
                type: "hound",
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
      gull: Zv,
      hound: Kv,
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
      poolGulls: 10,
      poolHounds: 8,
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
        tokens: 0,
        tokenT: -9,
        lastType: "",
        wantT: { gull: -9, hound: -9 },
        mergeSimple: (T) => sa(T, !1),
        requestToken(T) {
          if (T.hasToken) return !0;
          let D = 0;
          for (let Q of t) Q.alive && D++;
          let C = D > 5 ? Ui.maxTokensCrowd : Ui.maxTokens,
            G = h.t - h.tokenT,
            j = T.type === "gull" ? "hound" : "gull",
            N =
              h.lastType === T.type &&
              h.t - h.wantT[j] < 0.5 &&
              G < Ui.tokenGap * 2.2;
          return h.tokens >= C || G < Ui.tokenGap || N
            ? ((h.wantT[T.type] = h.t), !1)
            : (h.tokens++,
              (h.tokenT = h.t),
              (h.lastType = T.type),
              (T.hasToken = !0),
              !0);
        },
        releaseToken(T) {
          T.hasToken &&
            ((T.hasToken = !1), (h.tokens = Math.max(0, h.tokens - 1)));
        },
        think(T, D, C) {
          let G = i.player;
          if (T.passive || !G) {
            T.los = !1;
            return;
          }
          if (((T.senseT -= D), T.senseT <= 0)) {
            T.senseT = 0.11 + e() * 0.08;
            let j = !1;
            if (G.alive !== !1) {
              let N = G.eye || G.pos,
                Q = N.x - T.sensor.x,
                K = N.y - T.sensor.y,
                ie = N.z - T.sensor.z,
                F = Math.hypot(Q, K, ie);
              if (F < Ui.sightRange) {
                let X = Math.hypot(Q, ie) || 1e-4,
                  ne = (Q * T.fwd.x + ie * T.fwd.z) / X;
                (T.mode === "engage" || ne > BC || F < 3.5) &&
                  (j = i.physics.lineOfSight(T.sensor, N));
              }
            }
            T.los = j;
          }
          (T.los
            ? ((T.seeT += D),
              (T.noSeeT = 0),
              T.lastKnown.copy(G.pos),
              (T.exposure = Math.min(1, T.exposure + D * Ui.exposureUp)))
            : ((T.noSeeT += D),
              (T.seeT = Math.max(0, T.seeT - D * 0.6)),
              (T.exposure = Math.max(0, T.exposure - D * Ui.exposureDown))),
            T.mode === "engage"
              ? (T.noSeeT > Ui.loseSight || G.alive === !1) &&
                ((T.mode = "search"),
                (T.modeT = Ui.searchTime + e() * 3),
                h.releaseToken(T))
              : T.los && T.seeT > (T.mode === "patrol" ? C : C * 0.45)
                ? ((T.mode = "engage"),
                  (T.noSeeT = 0),
                  i.events.emit("enemy:alert", { enemy: T }),
                  h.rally(T.pos, 18, G.pos, T))
                : T.mode !== "patrol" &&
                  ((T.modeT -= D),
                  T.modeT <= 0 &&
                    ((T.mode = "patrol"),
                    (T.home.x = T.pos.x),
                    (T.home.z = T.pos.z))));
        },
        rally(T, D, C, G) {
          for (let j of t)
            j === G ||
              !j.alive ||
              j.passive ||
              j.mode === "engage" ||
              j.pos.distanceToSquared(T) > D * D ||
              (j.lastKnown.copy(C),
              (j.mode = "investigate"),
              (j.modeT = 9 + e() * 4));
        },
        provoke(T) {
          let D = i.player;
          !D ||
            T.passive ||
            !T.alive ||
            (T.mode !== "engage" &&
              (T.lastKnown.copy(D.pos),
              (T.mode = "investigate"),
              (T.modeT = 10),
              (T.seeT = 1),
              (T.senseT = 0)),
            h.rally(T.pos, 20, D.pos, T));
        },
        fireBolt(T, D, C) {
          let G = null;
          for (let j = 0; j < g.length; j++)
            if (!g[j].on) {
              G = g[j];
              break;
            }
          G &&
            ((G.on = !0),
            (G.life = 1.3),
            G.pos.copy(T),
            G.dir.copy(D),
            G.from.copy(T),
            (G.len = 0));
        },
        addWreck(T) {
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
      f = j_(),
      p = Z_(),
      d = [],
      v = [];
    for (let T = 0; T < Ui.poolGulls; T++) {
      let D = Q_(h, f, u, T);
      (d.push(D), s.add(D.rig.group));
    }
    const createAnkylosaurus = await loadAnkylosaurus();
    for (let T = 0; T < Ui.poolHounds; T++) {
      let D = iM(h, p, u, T, createAnkylosaurus);
      (v.push(D), s.add(D.rig.group));
    }
    let g = [];
    for (let T = 0; T < Ui.maxBolts; T++)
      g.push({
        on: !1,
        life: 0,
        len: 0,
        pos: new W(),
        dir: new W(),
        from: new W(),
      });
    let x = new Ys(0.016, 0.03, 1, 6, 1);
    (x.rotateX(Math.PI / 2), x.translate(0, 0, -0.5));
    let y = i.mats.emissive(16738858, 14),
      b =
        y && y.isMeshBasicMaterial
          ? y
          : new Nn({ color: new Ve(16738858).multiplyScalar(14) }),
      m = new Sr(x, b, Ui.maxBolts);
    ((m.frustumCulled = !1),
      (m.castShadow = !1),
      (m.receiveShadow = !1),
      (m.count = 0),
      m.instanceMatrix.setUsage(bo),
      s.add(m));
    let A = {
      point: new W(),
      normal: new W(),
      dist: 0,
      surface: "concrete",
      enemy: null,
      part: null,
      dir: new W(),
      from: "enemy",
    };
    function _(T) {
      let D = i.player,
        C = 0;
      for (let G = 0; G < g.length; G++) {
        let j = g[G];
        if (!j.on) continue;
        let N = Ui.gull.boltSpeed * T;
        j.life -= T;
        let Q = i.physics.raycast(j.pos, j.dir, N),
          K = Q ? Q.dist : N,
          ie = !1;
        if (
          (D &&
            D.alive !== !1 &&
            (oM.copy(j.pos).addScaledVector(j.dir, K),
            cM.set(D.pos.x, D.pos.y + 0.35, D.pos.z),
            uM.set(D.pos.x, D.pos.y + (D.crouching ? 1 : 1.5), D.pos.z),
            HC(j.pos, oM, cM, uM) < 0.36 * 0.36 && (ie = !0)),
          ie)
        ) {
          (D.damage(Ui.gull.boltDamage, j.from), (j.on = !1));
          continue;
        }
        if (Q) {
          (A.point.copy(Q.point),
            A.normal.copy(Q.normal),
            (A.dist = Q.dist),
            (A.surface = Q.surface),
            A.dir.copy(j.dir),
            i.events.emit("impact", A),
            (j.on = !1));
          continue;
        }
        if (j.life <= 0) {
          j.on = !1;
          continue;
        }
        (j.pos.addScaledVector(j.dir, N),
          (j.len = Math.min(1.5, j.len + N)),
          rM.setFromUnitVectors(OC, j.dir),
          lM.set(1, 1, Math.max(0.2, j.len)),
          aM.compose(j.pos, rM, lM),
          m.setMatrixAt(C++, aM));
      }
      (C || m.count) && ((m.count = C), (m.instanceMatrix.needsUpdate = !0));
    }
    let M = null,
      E = !1,
      w = 0,
      S = new W(),
      z = 0;
    function H(T) {
      if (!E) {
        E = !0;
        try {
          M =
            i.render && i.render.lightPool && i.render.lightPool.acquire
              ? i.render.lightPool.acquire()
              : null;
        } catch {
          M = null;
        }
        M &&
          M.light &&
          (M.light.color.setRGB(1, 0.9, 0.75), (M.light.distance = 9));
      }
      if (!M || !M.light) return;
      let D = null,
        C = 3600,
        G = i.camera ? i.camera.position : null;
      for (let N of t) {
        if (N.type !== "gull" || !N.alive) continue;
        let Q = G ? N.pos.distanceToSquared(G) : 0;
        Q < C && ((C = Q), (D = N));
      }
      let j = 0;
      if (D) {
        if (((w -= T), w <= 0)) {
          w = 0.1;
          let N = D.yaw + D.gy,
            Q = Math.cos(D.gp);
          Qv.set(Math.sin(N) * Q, -Math.sin(D.gp), Math.cos(N) * Q).normalize();
          let K = i.physics.raycast(D.sensor, Qv, 14);
          (S.copy(D.sensor).addScaledVector(Qv, (K ? K.dist : 8) - 0.6),
            (z = K ? 1 : 0.3));
        }
        ((j = 26 * z), M.light.position.lerp(S, 1 - Math.exp(-12 * T)));
      }
      M.light.intensity += (j - M.light.intensity) * (1 - Math.exp(-8 * T));
    }
    let O = 1,
      q = 0,
      U = {
        list: t,
        TUNE: Ui,
        spawn(T, D, C = {}) {
          let G = T === "gull" ? d : T === "hound" ? v : null;
          if (!G) return null;
          let j = null;
          for (let N of G)
            if (!N.active) {
              j = N;
              break;
            }
          if (!j && T === "hound" && n.length) {
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
            const reach = N.type === "hound" ? 1.3 * N.size : 1.5;
            let Q = N.pos.x - T.x,
              K = N.pos.y + (N.type === "hound" ? .49 * N.size : 0) - T.y,
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
          const raptorHit = i.defense?.raycast(T, D, Math.min(C, G?.dist ?? C));
          const gigaHit = i.giga?.raycast(T, D, raptorHit?.dist ?? Math.min(C, G?.dist ?? C));
          return gigaHit || raptorHit || (G && G.enemy ? G : null);
        },
        aliveCount() {
          let T = 0;
          for (let D of t) D.alive && T++;
          return T;
        },
        clear() {
          for (let T of d) T.active && T._deactivate();
          for (let T of v) T.active && T._deactivate();
          ((t.length = 0), (n.length = 0), (h.tokens = 0));
          for (let T of g) T.on = !1;
          ((m.count = 0), M && M.light && (M.light.intensity = 0));
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
          for (let C = t.length - 1; C >= 0; C--) t[C]._update(T);
          (_(T), H(T));
        },
        debug: {
          ctx: h,
          gulls: d,
          hounds: v,
          wrecks: n,
          bolts: g,
          mats: u,
          tris: { gull: f.tris + f.extra.tris, hound: p.tris },
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
    if (n === "gull")
      (e.spawn("gull", t(0, 1.6, 0), {
        passive: !0,
        hover: 1.6,
        patrolRadius: 0.02,
        yaw: 0.7,
      }),
        (s = [1.25, 1.95, 1.45]),
        (o = [0, 1.52, 0]),
        (r = 1.2));
    else if (n === "hound")
      (e.spawn("hound", t(0, 0, 0), {
        passive: !0,
        yaw: 0.9,
        patrolLine: [t(1.6, 0, 1.3), t(-1.6, 0, -1.3)],
      }),
        (s = [2.1, 1, 2.3]),
        (o = [0.5, 0.62, 0.4]),
        (r = 1.25));
    else if (n === "fight")
      (e.spawn("hound", t(-7, 0, -9), { state: "alert" }),
        e.spawn("hound", t(8, 0, -7), { state: "alert" }),
        e.spawn("hound", t(0, 0, -14), { state: "alert" }),
        e.spawn("gull", t(-5, 6, -13), { state: "alert" }),
        e.spawn("gull", t(9, 6, -11), { state: "alert" }),
        (s = [5, 2.6, 10]),
        (o = [0, 2.2, -5]),
        (r = 7));
    else if (n === "dead") {
      let l = e.spawn("hound", t(0, 0, 0), { passive: !0, yaw: 0.8 }),
        c = e.spawn("gull", t(-1.6, 3.4, -0.5), {
          passive: !0,
          hover: 3.4,
          patrolRadius: 0.02,
        });
      e.spawn("hound", t(2.2, 0, -1.6), {
        passive: !0,
        yaw: -0.6,
        patrolLine: [t(2.2, 0, -1.6), t(3.4, 0, -3)],
      });
      for (let u = 0; u < 30; u++) e.update(1 / 60);
      l.damage(999, l.pos, t(0.6, 0, -0.8), "body");
      for (let u = 0; u < 110; u++) e.update(1 / 60);
      (c.damage(999, c.pos, t(0, 0, 1), "body"),
        (s = [2.6, 1.3, 3.2]),
        (o = [0, 0.5, 0]),
        (r = 0.42));
    } else
      (e.spawn("gull", t(-0.9, 2.2, -0.2), {
        passive: !0,
        hover: 2.2,
        patrolRadius: 0.25,
        yaw: 0.5,
      }),
        e.spawn("hound", t(0.2, 0, 0.6), {
          passive: !0,
          yaw: 1.2,
          patrolLine: [t(2.6, 0, 1.2), t(-1.8, 0, 0.2)],
        }));
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
      '<span class="comms-who">Control</span><span class="comms-t"></span>',
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
      radio(k, ce = 4.5) {
        k && me.push({ text: k, secs: ce });
      },
      clearRadio() {
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
        ((me.length = 0), (ee = null), j.classList.remove("on"));
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
      if (!ee) {
        if (!me.length) return;
        ((ee = me.shift()),
          (B = 0),
          (P = 0),
          (V = ee.secs),
          (N.textContent = ""),
          j.classList.add("on"),
          i.events.emit("radio:line", { text: ee.text }));
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

    <section class="m-screen m-title" data-s="title" aria-label="Saltline">
      <div class="m-title-main">
        <div class="m-eyebrow"><span class="m-tag">B4</span><span>Đi tự do</span><span class="m-dim">Sân bê tông · 05:42</span></div>
        <h1 class="m-word">SÂN MƯA</h1>
        <p class="m-premise">Đối đầu Ankylosaurus trong đấu trường.</p>
        <div class="m-actions">
          <button class="btn primary" data-act="deploy">Vào sân</button>
          <button class="btn" data-act="settings">Settings</button>
          <button class="btn m-only-narrow" data-act="controls">Controls</button>
        </div>
        <p class="m-note">Dựng trên Saltline của Felix Rieseberg.</p>
      </div>
      <aside class="m-legend" aria-label="Controls at a glance">
        <div><span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> Move</span><span><kbd>Mouse</kbd> Look</span><span><kbd>LMB</kbd> Fire</span><span><kbd>RMB</kbd> Aim</span><span><kbd>R</kbd> Reload</span></div>
        <div><span><kbd>Space</kbd> Jump</span><span><kbd>Shift</kbd> Sprint</span><span><kbd>C</kbd> Crouch</span><span><kbd>Esc</kbd> Pause</span></div>
        <div class="lg-touch"><em>Touch</em><span>Left thumb moves</span><span>Right thumb looks</span><span>Fire \xB7 Aim \xB7 Reload \xB7 Jump on screen</span></div>
      </aside>
    </section>

    <section class="m-screen m-card" data-s="paused" aria-label="Paused">
      <div class="m-k">Operation on hold</div>
      <h2 class="m-h">Paused</h2>
      <p class="m-line" data-f="lookmode"></p>
      <div class="m-actions col">
        <button class="btn primary" data-act="resume">Resume</button>
        <button class="btn" data-act="settings">Settings</button>
        <button class="btn" data-act="controls">Controls</button>
        <button class="btn" data-act="restart">Về điểm xuất phát</button>
      </div>
    </section>

    <section class="m-screen m-card m-dead" data-s="dead" aria-label="Signal lost">
      <div class="m-k">Nhiệm vụ thất bại</div>
      <h2 class="m-h" data-f="dead-reason">Signal lost</h2>
      <dl class="m-stats"><div><dt>Time survived</dt><dd data-f="dead-time">00:00</dd></div><div><dt>Relays cut</dt><dd data-f="dead-relays">0/3</dd></div></dl>
      <div class="m-actions col"><button class="btn primary" data-act="retry">Retry</button></div>
    </section>

    <section class="m-screen m-card m-debrief" data-s="complete" aria-label="Debrief">
      <div class="m-k">Kết quả đấu trường</div>
      <h2 class="m-h">Chiến thắng</h2>
      <div class="m-rating"><span>Rating</span><b data-f="rating">Clean</b></div>
      <dl class="m-stats">
        <div><dt>Time</dt><dd data-f="time">00:00</dd></div>
        <div><dt>Accuracy</dt><dd data-f="acc">0%</dd></div>
        <div><dt>Machines destroyed</dt><dd data-f="kills">0</dd></div>
        <div><dt>Retries</dt><dd data-f="retries">0</dd></div>
      </dl>
      <div class="m-actions col"><button class="btn primary" data-act="redeploy">Chơi lại</button></div>
    </section>

    <div class="panel" role="dialog" aria-modal="true" aria-label="Settings and controls" tabindex="-1" hidden>
      <header class="panel-h">
        <div class="tabs" role="tablist">
          <button class="tab" role="tab" data-tab="settings" aria-selected="true">Settings</button>
          <button class="tab" role="tab" data-tab="controls" aria-selected="false">Controls</button>
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
    </div>

    <div class="loc-card" aria-hidden="true"><i></i><b>Saltline Terminal \xB7 Berth 4 \xB7 05:42</b><span>Đi tự do \u2014 one breacher, no backup</span></div>
  `),
      t.appendChild(s));
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
        setDead({ time: U, relays: T, total: D, reason = "Signal lost" }) {
          c("dead-reason").textContent = reason;
          ((c("dead-time").textContent = O(U)),
            (c("dead-relays").textContent = `${T}/${D}`));
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
      patrol: { gull: 2, hound: 1 },
      waves: [
        { gull: 3, hound: 1 },
        { gull: 3, hound: 2 },
        { gull: 4, hound: 3 },
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
        "Breacher, this is Control. The Harbormaster holds the berth. Cut its three uplinks \u2014 yard, shed, quay.",
      contact: "It has seen you. Gulls fly, Hounds walk. Put them down.",
      cut: [
        "One relay dark. It felt that \u2014 machines inbound.",
        "Two dark. It is throwing everything it has left at you.",
      ],
      all: "All three dark. The boat is holding at the quay ladder, south end. Run.",
      low: "You are hit hard. Get behind steel and breathe.",
      done: "Breacher is aboard. Chiến thắng. Good work.",
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
    let boss = null;
    let bossMaxHp = 0;
    let split = null;
    const offspring = new Set();

    function spawnAnkylo(position, options) {
      const towardPlayer = new W().subVectors(n.pos, position);
      return i.enemies.spawn("hound", position, {
        state: "alert",
        target: n.pos,
        yaw: Math.atan2(towardPlayer.x, towardPlayer.z),
        ...options,
      });
    }

    function spawnBoss() {
      const side = s.enemySpawns.find(point => point.type === "ground")?.pos;
      const spawn = side ? side.clone().multiplyScalar(.72) : new W(12, 0, 0);
      boss = spawnAnkylo(spawn, { hpScale: 10 });
      if (boss) {
        bossMaxHp = boss.maxHp;
        o.setObjective("Hạ Ankylosaurus lớn");
      }
    }

    function splitPosition(origin, yaw, side, occupied) {
      const nav = i.physics.nav;
      for (let radius = 3.2; radius <= 20; radius += 1.2) {
        for (const offset of [0, .4, -.4, .8, -.8, 1.2, -1.2, Math.PI]) {
          const angle = yaw + side * Math.PI / 2 + offset;
          const point = new W(origin.x + Math.sin(angle) * radius, 0,
            origin.z + Math.cos(angle) * radius);
          if (point.distanceToSquared(n.pos) < 4 ||
              occupied.some(other => other.distanceToSquared(point) < 4) ||
              !nav.isWalkable(point.x, point.z) || !nav.findPath(point, n.pos)) continue;
          return point;
        }
      }
      return null;
    }

    function spawnOffspring() {
      while (split.spawned < 2) {
        const side = split.spawned === 0 ? -1 : 1;
        const point = splitPosition(split.origin, split.yaw, side, split.positions);
        if (!point) { split.at = c.time + .25; return; }
        const child = spawnAnkylo(point, { size: 1, damageScale: .2 });
        if (!child) { split.at = c.time + .25; return; }
        split.positions.push(point);
        split.spawned++;
        offspring.add(child);
      }
      split = null;
      o.setObjective("Hạ Ankylosaurus nhỏ · Còn " + offspring.size);
    }

    i.events.on("enemy:killed", ({ enemy, turretPos }) => {
      if (_.state !== "playing") return;
      if (enemy === boss && !split) {
        i.fx?.explosion?.(turretPos || enemy.pos, 2.3);
        split = { at: c.time + .55, origin: enemy.pos.clone(), yaw: enemy.yaw, spawned: 0, positions: [] };
        o.setObjective("Hai Ankylosaurus nhỏ sắp xuất hiện");
      } else if (offspring.delete(enemy)) {
        if (!split && !offspring.size) {
          const spawn = s.enemySpawns.filter(point => point.type === "ground").at(-1)?.pos;
          i.giga.start(spawn ? spawn.clone().multiplyScalar(.7) : new W(28, 0, 0), 3500);
        }
        else if (!split) o.setObjective("Hạ Ankylosaurus nhỏ · Còn " + offspring.size);
      }
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
      i.defense.reset();
      i.giga.reset();
      boss = null;
      split = null;
      offspring.clear();
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
        o.setObjective("Tiến vào đấu trường"),
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
    function N(P) {
      let V = P === "gull" ? "air" : "ground",
        Y = (s && s.enemySpawns) || [],
        L = Y.filter((Z) => Z.type === V);
      return L.length ? L : Y;
    }
    function Q(
      P,
      { minDist: V = Yi.spawnFar, from: Y = n.pos, preferHidden: L = !0 } = {},
    ) {
      let Z = N(P),
        J = null,
        oe = -1e9;
      for (let le of Z) {
        let R = Math.hypot(le.pos.x - Y.x, le.pos.z - Y.z),
          I = i.rng() * 1.5;
        if (
          ((I += R >= V ? 2 + Math.min(1, (R - V) / 30) * 0.5 : -(V - R) / 4),
          L)
        ) {
          (b.copy(le.pos), (b.y += P === "gull" ? 0 : 1));
          let ae = !0;
          try {
            ae = i.physics.lineOfSight(b, n.eye);
          } catch {}
          ae || (I += 2.5);
        }
        let se = c.used.get(le);
        (se !== void 0 && c.time - se < 6 && (I -= 3),
          I > oe && ((oe = I), (J = le)));
      }
      let fe = new W();
      if (J) {
        (c.used.set(J, c.time), fe.copy(J.pos));
        let le = (i.rng() - 0.5) * 2.4,
          R = (i.rng() - 0.5) * 2.4,
          I = P === "gull";
        try {
          I || (I = i.physics.nav.isWalkable(fe.x + le, fe.z + R));
        } catch {
          I = !1;
        }
        I && ((fe.x += le), (fe.z += R));
      } else {
        let le = i.rng() * Math.PI * 2;
        fe.set(
          Zn(Y.x + Math.cos(le) * 26, -34, 26),
          0,
          Zn(Y.z + Math.sin(le) * 26, -26, 24),
        );
      }
      return (P === "gull" && fe.y < 2.5 && (fe.y = 6 + i.rng() * 3), fe);
    }
    function K(P, V, Y) {
      let L = null;
      try {
        L = i.enemies.spawn(P, V, Y);
      } catch (Z) {
        console.error("[game] enemies.spawn threw", Z);
      }
      return L;
    }
    function ie() {
      let P = (s.playerStart && s.playerStart.pos) || n.pos;
      for (let V of ["gull", "hound"])
        for (let Y = 0; Y < Yi.patrol[V]; Y++)
          K(V, Q(V, { minDist: 32, from: P, preferHidden: !0 }), {
            state: "patrol",
          });
    }
    function F(P) {
      let V = Yi.waves[Math.min(P, Yi.waves.length - 1)],
        Y = [];
      for (let oe = 0; oe < V.gull; oe++) Y.push("gull");
      for (let oe = 0; oe < V.hound; oe++)
        Y.splice(Math.min(Y.length, 1 + oe * 2), 0, "hound");
      let L = 0,
        Z = 0;
      (Y.forEach((oe, fe) => {
        let le = Q(oe);
        ((L += le.x - n.pos.x),
          (Z += le.z - n.pos.z),
          c.queue.push({
            type: oe,
            pos: le,
            at: c.time + 1.6 + fe * Yi.spawnStagger,
          }));
      }),
        (c.waveHot = 30));
      let J = ((Math.atan2(L, -Z) * 180) / Math.PI + 360) % 360;
      o.warn && o.warn("Contact \u2014 " + jC[Math.round(J / 45) % 8], 3.4);
    }
    function X(P) {
      let V = ne();
      for (let Y = 0; Y < c.queue.length; Y++) {
        let L = c.queue[Y];
        if (c.time < L.at) continue;
        if (V >= Yi.maxAlive) {
          L.at = c.time + 1;
          continue;
        }
        if (
          !K(L.type, L.pos, { state: "alert", target: n.pos }) &&
          !i.enemies.stub &&
          (L.tries = (L.tries || 0) + 1) < 6
        ) {
          L.at = c.time + 1.5;
          continue;
        }
        (c.queue.splice(Y, 1), a(i.enemies, "alert", n.pos, 60));
        break;
      }
      if (c.allCut) {
        if (
          ((c.pursuitT -= P),
          c.pursuitT <= 0 &&
            c.pursuitLeft > 0 &&
            !c.queue.length &&
            V < Yi.pursuitMinAlive)
        ) {
          ((c.pursuitT = Yi.pursuitEvery), c.pursuitLeft--);
          let Y = i.rng() < 0.6 ? "gull" : "hound";
          c.queue.push({ type: Y, pos: Q(Y), at: c.time + 0.5 });
        }
        c.pursuitT <= 0 && ((c.pursuitT = 4), a(i.enemies, "alert", n.pos, 90));
      }
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
      ((c.alertT = 10),
        _.state === "playing" &&
          !c.contactSaid &&
          ((c.contactSaid = !0), o.radio && o.radio(_l.contact, 3.2)));
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
        F(c.cut - 1),
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
            const defense = i.defense;
            if (!defense.started) defense.start();
            if (!defense.done) {
              defense.update(P);
              if (defense.health === 0) {
                o.setPrompt?.(null);
                o.show(false);
                r.setGameplay?.(false);
                r.exitLock();
                n.enabled = false;
                l.setDead({ time: c.time, relays: c.cut, total: c.relays.length,
                  reason: "Xe tiếp tế đã bị phá hủy" });
                M("dead");
                return false;
              }
              if (!defense.done) o.setObjective("Bảo vệ xe · " + defense.health + "%" +
                (defense.warning ? " · Raptor đang tích điện!" : ""));
            }
            defense.updateAmmoPickup();
            if (defense.done && !boss) spawnBoss();
          }
          if (split && c.time >= split.at) spawnOffspring();
          if (i.giga.started) {
            i.giga.update(P);
            if (_.state !== "playing") return false;
            if (i.giga.done) {
              if (i.giga.purple) return (ee(), false);
              const side = n.pos.x >= 0 ? -1 : 1;
              const spawn = new W(side * Math.min(28, s.arena.A * .6), 0, 0);
              i.giga.start(spawn, i.giga.maxHealth, { purpleBoss: true });
              o.message("Giganotosaurus tím xuất hiện", 3);
            }
            const name = i.giga.purple ? "Giganotosaurus tím" : "Giganotosaurus";
            o.setObjective("Hạ " + name + " · " + Math.ceil(i.giga.health) + "/" + i.giga.maxHealth +
              (i.giga.burning ? " · Đang phun lửa!" : i.giga.windingUp ? " · Sắp phun lửa!" : i.giga.biting ? " · Đang cắn!" : ""));
          }
          (X(P),
            (c.alertT = Math.max(0, c.alertT - P)),
            (c.waveHot = Math.max(0, c.waveHot - P)));
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
              (l.show("complete"), a(i.audio, "setIntensity", 0.15)),
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
