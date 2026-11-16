  // ===========================================================================
  //  COLOSSEUM — ruined dark-medieval arena. Replaces buildStadium().
  //  Floor: ellipse 85 x 50 m (x = long axis, z = short axis). Outer shell ~148 x 114 m, ~48 m tall.
  //  North = -z. The south tunnel leads into the playable floor.
  //  Physics only knows axis-aligned boxes, so curved walls are approximated by short chord boxes.
  //  All the numbers you are likely to tweak live in COLOSSEUM.
  // ===========================================================================
  const COLOSSEUM = {
    A: 54, B: 30,            // floor semi-axes -> 85 x 50 m
    PODIUM_H: 3.4,             // height of the wall round the floor (blocks bullets + players)
    PODIUM_T: 1.4,             // its thickness
    TIERS: 20, RISE: 0.85, RUN: 1.35,
    SECTORS: 28,
    TOP: 48,                   // height of the outer wall
    SEG: 192,                  // curve resolution of the lofted bands
    GATE_HALF: 4,              // south gate: 8 m wide
    TUNNEL_LEN: 17,            // gate tunnel length
  };

  const colosseumRuins = /*@inline:data/colosseum-ruins.json*/ null;

  async function buildColosseum(game) {
    const C = COLOSSEUM;
    const A = C.A, B = C.B, TAU = Math.PI * 2;
    const root = new lt.Group();
    root.name = "colosseum";

    // ---- materials (fall back to plain concrete if a name does not exist) ----
    const mat = (name) => {
      try { return game.mats.get(name) || game.mats.get("concrete"); }
      catch (e) { return game.mats.get("concrete"); }
    };
    const stone = mat("concrete_dirty");
    const stone2 = mat("concrete");
    const steel = mat("steel_dark");
    const rustMat = mat("steel_galv");
    const voidMat = new lt.MeshBasicMaterial({ color: 0x050607 });
    const ember = new lt.MeshBasicMaterial({ color: new lt.Color(0xff8a3c).multiplyScalar(5) });

    // ---- small helpers ----
    const hash2 = (i, j) => {
      let h = (Math.imul(i, 374761393) + Math.imul(j, 668265263)) >>> 0;
      h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
      return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
    };
    let seed = 7331;
    const rnd = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
    const angDiff = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));

    // point on the ellipse (t) pushed `d` metres outward along the true normal, at height y
    const nrm = (t) => {
      const nx = Math.cos(t) / A, nz = Math.sin(t) / B, l = Math.hypot(nx, nz);
      return [nx / l, nz / l];
    };
    const ep = (t, d, y) => {
      const n = nrm(t);
      return [A * Math.cos(t) + n[0] * d, y, B * Math.sin(t) + n[1] * d];
    };
    const inward = (t) => { const n = nrm(t); return [-n[0], 0, -n[1]]; };

    // ---- lofted bands: a quad strip between two curves, flat-shaded, UV in metres ----
    const acc = new Map();
    const bucket = (m) => {
      let b = acc.get(m);
      if (!b) { b = { p: [], n: [], u: [] }; acc.set(m, b); }
      return b;
    };
    function band(m, pA, pB, hint, skip) {
      const b = bucket(m), S = C.SEG;
      let u0 = 0, a0 = pA(0), c0 = pB(0);
      for (let i = 1; i <= S; i++) {
        const t = (i / S) * TAU, tm = ((i - 0.5) / S) * TAU;
        const a1 = pA(t), c1 = pB(t);
        const du = Math.hypot(a1[0] - a0[0], a1[2] - a0[2]);
        const u1 = u0 + du;
        const mx = (a0[0] + a1[0] + c0[0] + c1[0]) / 4, mz = (a0[2] + a1[2] + c0[2] + c1[2]) / 4;
        if (!skip || !skip(tm, mx, mz)) {
          const h = typeof hint === "function" ? hint(tm) : hint;
          const v0 = Math.hypot(c0[0] - a0[0], c0[1] - a0[1], c0[2] - a0[2]);
          const v1 = Math.hypot(c1[0] - a1[0], c1[1] - a1[1], c1[2] - a1[2]);
          // triangle 1: a0 c0 a1   triangle 2: a1 c0 c1
          const tri = (P, Q, R, uP, vP, uQ, vQ, uR, vR) => {
            let ex = Q[0] - P[0], ey = Q[1] - P[1], ez = Q[2] - P[2];
            let fx = R[0] - P[0], fy = R[1] - P[1], fz = R[2] - P[2];
            let nx = ey * fz - ez * fy, ny = ez * fx - ex * fz, nz = ex * fy - ey * fx;
            const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
            let flip = nx * h[0] + ny * h[1] + nz * h[2] < 0;
            const V = flip ? [P, R, Q] : [P, Q, R];
            const U = flip ? [[uP, vP], [uR, vR], [uQ, vQ]] : [[uP, vP], [uQ, vQ], [uR, vR]];
            if (flip) { nx = -nx; ny = -ny; nz = -nz; }
            for (let k = 0; k < 3; k++) { b.p.push(V[k][0], V[k][1], V[k][2]); b.n.push(nx, ny, nz); b.u.push(U[k][0], U[k][1]); }
          };
          tri(a0, c0, a1, u0, 0, u0, v0, u1, 0);
          tri(a1, c0, c1, u1, 0, u0, v0, u1, v1);
        }
        u0 = u1; a0 = a1; c0 = c1;
      }
    }

    // ---- where things are broken / cut ----
    const gx = C.GATE_HALF;
    const inGate = (x, z) => Math.abs(x) < gx && z > 0;
    // [angle, half-width (rad), first tier that is missing] — collapsed wedges of the seating bowl
    const wedges = [[-0.95, 0.34, 12], [-2.55, 0.30, 16], [0.85, 0.24, 12], [2.2, 0.30, 7], [4.1, 0.2, 14], [-0.1, 0.16, 16]];
    // [angle, half-width, depth of the missing outer wall]
    const wallBreaks = [[-0.95, 0.42, 20], [-2.55, 0.38, 24], [0.85, 0.3, 17], [2.2, 0.36, 21], [-0.1, 0.22, 14], [4.1, 0.26, 15]];
    const broken = (t, k) => {
      for (const w of wedges) {
        if (k >= w[2] && angDiff(t, w[0]) < w[1] * (0.55 + 0.45 * (k / C.TIERS))) return true;
      }
      return k > 5 && hash2(Math.floor(t * 46), k) > 0.955;
    };
    const topH = (t, yTop) => {
      let h = C.TOP - 4 * hash2(Math.floor(t * 30), 9);
      for (const w of wallBreaks) {
        const dt = angDiff(t, w[0]);
        if (dt < w[1]) h -= w[2] * (1 - dt / w[1]);
      }
      return Math.max(h, yTop + 1.2);
    };

    // ---- podium wall (inner face + cap), with the gate gap ----
    const sidePortal = (x, z) => Math.abs(x) > A - 2 && Math.abs(z) < 2.25;
    const podSkip = (tm, x, z) => inGate(x, z) || sidePortal(x, z);
    band(stone, (t) => ep(t, 0, 0), (t) => ep(t, 0, C.PODIUM_H), inward, podSkip);
    band(stone2, (t) => ep(t, 0, C.PODIUM_H), (t) => ep(t, C.PODIUM_T, C.PODIUM_H), [0, 1, 0], podSkip);

    // Treads and risers are two surfaces of a shared stone block. Scale and orient
    // each block along the ellipse instead of making individual seat meshes.
    const tierDepth = C.RUN * C.TIERS;
    const yTop = C.PODIUM_H + C.RISE * C.TIERS;
    const dBack = C.PODIUM_T + tierDepth;
    const stepGeometry = $e(1, 1, 1);
    const steps = new lt.InstancedMesh(stepGeometry, stone, C.SECTORS * C.TIERS);
    // Plain dark rubble core under every step, so a lowered / missing block never shows a hollow.
    const cores = new lt.InstancedMesh(stepGeometry, new lt.MeshStandardMaterial({ color: 0x3b3731, roughness: 0.96 }), C.SECTORS * C.TIERS);
    const step = new lt.Object3D();
    const core = new lt.Object3D();
    const tint = new lt.Color();
    let count = 0;
    for (let tier = 0; tier < C.TIERS; tier++) {
      const depth = C.PODIUM_T + C.RUN * (tier + 0.5);
      for (let sector = 0; sector < C.SECTORS; sector++) {
        const first = sector * TAU / C.SECTORS;
        const last = (sector + 1) * TAU / C.SECTORS;
        const angle = (first + last) / 2;
        const from = ep(first, depth, 0);
        const to = ep(last, depth, 0);
        const x = (from[0] + to[0]) / 2;
        const z = (from[2] + to[2]) / 2;
        const nearTunnel = z > 0 && Math.abs(x) < gx + 5 && depth < C.TUNNEL_LEN;
        if (nearTunnel) continue;
        // Collapsed zones: a few blocks are gone, the rest slump 1-3 steps lower, so the
        // staircase stays ragged but continuous all the way up to the outer wall.
        let level = tier;
        if (broken(angle, tier)) {
          if (hash2(sector * 7 + 3, tier * 5 + 1) < 0.2) continue;
          level = Math.max(0, tier - 1 - Math.floor(hash2(sector, tier + 99) * 3));
        }
        const y = C.PODIUM_H + C.RISE * (level + 0.5);
        const width = Math.hypot(to[0] - from[0], to[2] - from[2]) * .995;
        const rotY = Math.atan2(from[2] - to[2], to[0] - from[0]);
        step.position.set(x, y, z);
        step.rotation.y = rotY;
        step.scale.set(width, C.RISE, C.RUN * 1.12);
        step.updateMatrix();
        steps.setMatrixAt(count, step.matrix);
        const coreH = y - C.RISE / 2;
        core.position.set(x, coreH / 2, z);
        core.rotation.y = rotY;
        core.scale.set(width * .98, Math.max(coreH, 0.001), C.RUN * 1.1);
        core.updateMatrix();
        cores.setMatrixAt(count, core.matrix);
        steps.setColorAt(count++, tint.setScalar(.72 + hash2(sector, tier) * .28));
      }
    }
    cores.count = count;
    cores.name = "stone terrace cores";
    cores.castShadow = cores.receiveShadow = true;
    cores.computeBoundingSphere();
    root.add(cores);
    steps.count = count;
    steps.name = "instanced stone terraces";
    steps.castShadow = steps.receiveShadow = true;
    steps.computeBoundingSphere();
    root.add(steps);

    const ruinsAngles = [-.95, 2.2];
    const ruinsGap = t => ruinsAngles.some(angle => angDiff(t, angle) < .22);
    band(stone, t => ep(t, dBack, yTop - C.RISE * 4), t => ep(t, dBack, topH(t, yTop)), inward, ruinsGap);
    band(stone2, t => ep(t, dBack, topH(t, yTop)), t => ep(t, dBack + 3.2, topH(t, yTop)), [0, 1, 0], ruinsGap);

    const decode = (key, type) => new type(assetBytes(colosseumRuins[key]));
    const ruinsGeometry = new lt.BufferGeometry();
    ruinsGeometry.setAttribute("position", new lt.BufferAttribute(decode("position", Float32Array), 3));
    ruinsGeometry.setAttribute("normal", new lt.BufferAttribute(decode("normal", Float32Array), 3));
    ruinsGeometry.setAttribute("uv", new lt.BufferAttribute(decode("uv", Float32Array), 2));
    ruinsGeometry.setIndex(new lt.BufferAttribute(decode("index", Uint16Array), 1));
    const [ruinColor, ruinNormal, ruinSurface] = await Promise.all([
      akGoldTexture(colosseumRuins.base, lt.SRGBColorSpace),
      akGoldTexture(colosseumRuins.normalMap, lt.NoColorSpace),
      akGoldTexture(colosseumRuins.metal, lt.NoColorSpace),
    ]);
    const ruins = new lt.InstancedMesh(ruinsGeometry, new lt.MeshStandardMaterial({
      map: ruinColor, normalMap: ruinNormal, roughnessMap: ruinSurface, side: lt.DoubleSide,
    }), ruinsAngles.length);
    ruinsAngles.forEach((angle, index) => {
      const normal = nrm(angle);
      step.position.fromArray(ep(angle, dBack - .8, yTop - 2.8));
      step.rotation.set(0, Math.atan2(-normal[0], -normal[1]), 0);
      step.scale.setScalar(1.35);
      step.updateMatrix();
      ruins.setMatrixAt(index, step.matrix);
    });
    ruins.name = "GLB stone ruins";
    ruins.castShadow = ruins.receiveShadow = true;
    root.add(ruins);

    const arenaShotMeshes = [steps, cores, ruins];
    // flush the bands into meshes
    for (const [m, b] of acc) {
      const g = new lt.BufferGeometry();
      g.setAttribute("position", new lt.Float32BufferAttribute(b.p, 3));
      g.setAttribute("normal", new lt.Float32BufferAttribute(b.n, 3));
      g.setAttribute("uv", new lt.Float32BufferAttribute(b.u, 2));
      g.computeBoundingSphere();
      const mesh = Qi(g, m);
      mesh.frustumCulled = false;
      root.add(mesh);
      arenaShotMeshes.push(mesh);
    }

    // ---- solid / decorative boxes (merged), same helper as the old stadium ----
    const staticGeometry = new lt.Group();
    function box(name, material, x, y0, z, w, h, dd, solid = false, bevel = 0, rotY = 0) {
      const mesh = Qi(bevel ? Wi(w, h, dd, bevel) : $e(w, h, dd), material);
      mesh.name = name;
      mesh.position.set(x, y0 + h / 2, z);
      mesh.rotation.y = rotY;
      staticGeometry.add(mesh);
      if (solid) game.physics.addBox([x - w / 2, y0, z - dd / 2], [x + w / 2, y0 + h, z + dd / 2], { surface: "concrete", tag: name });
      return mesh;
    }

    // ---- physics: podium wall as short chord boxes; extension above it blocks players only ----
    {
      const N = 128;
      for (let i = 0; i < N; i++) {
        const t0 = (i / N) * TAU, t1 = ((i + 1) / N) * TAU;
        const P = [ep(t0, 0, 0), ep(t0, C.PODIUM_T, 0), ep(t1, 0, 0), ep(t1, C.PODIUM_T, 0)];
        const x0 = Math.min(P[0][0], P[1][0], P[2][0], P[3][0]), x1 = Math.max(P[0][0], P[1][0], P[2][0], P[3][0]);
        const z0 = Math.min(P[0][2], P[1][2], P[2][2], P[3][2]), z1 = Math.max(P[0][2], P[1][2], P[2][2], P[3][2]);
        if (inGate((x0 + x1) / 2, (z0 + z1) / 2)) continue;
        game.physics.addBox([x0, 0, z0], [x1, 14, z1], { playerOnly: true, tag: "arena boundary" });
      }
    }

    // The tunnel is a starting area. After entering the floor, a movement-only
    // barrier closes the route back until a restart.
    const southEnd = B + C.TUNNEL_LEN;
    const spawnZ = B + 7;
    let entryBarrier = null;
    for (const side of [-1, 1]) {
      box("gate wall", stone, side * (gx + .8), 0, (B + southEnd) / 2, 1.6, 5.6, C.TUNNEL_LEN + 1, true, .05);
      box("portal pier", stone2, side * (gx + .9), 0, B + .3, 1.8, 6.6, 1.6, true, .08);
    }
    box("gate roof", stone, 0, 4.8, (B + southEnd) / 2, gx * 2, .8, C.TUNNEL_LEN, true, .04);
    box("gate lintel", stone2, 0, 4.8, B + .3, gx * 2 + 3.6, 1.4, 1.6, true, .06);
    box("gate seal", steel, 0, 0, southEnd, gx * 2 + 3.2, 5.6, .7, true);
    const lamp = new lt.PointLight(0xffa25d, 115, 19, 2);
    lamp.position.set(0, 3.3, B + 5);
    root.add(lamp);

    const enemySpawns = [];
    for (const side of [-1, 1]) {
      box("closed side gate", steel, side * (A + .85), 0, 0, .35, C.PODIUM_H, 4.9, true, .05);
      for (const z of [-2.35, 2.35]) {
        box("side gate pier", stone2, side * A, 0, z, 1.45, C.PODIUM_H, .6, true, .08);
      }
      box("side gate lintel", stone2, side * A, 2.85, 0, 1.45, .55, 4.8, true, .06);
      for (let bar = -5; bar <= 5; bar++) {
        box("side gate bar", rustMat, side * (A + .3), 0, bar * .39, .13, 2.85, .13, true);
      }
      enemySpawns.push({type: "ground", pos: new W(side * (A - 3), 0, 0)});
    }

    // ---- gothic window recesses + buttresses on the outer wall, arch openings on the podium ----
    {
      const mk = (w, h) => {
        const s = new lt.Shape();
        s.moveTo(-w / 2, 0); s.lineTo(-w / 2, h * 0.58);
        s.quadraticCurveTo(-w / 2, h * 0.93, 0, h);
        s.quadraticCurveTo(w / 2, h * 0.93, w / 2, h * 0.58);
        s.lineTo(w / 2, 0); s.lineTo(-w / 2, 0);
        return new lt.ShapeGeometry(s);
      };
      const g1 = mk(3.6, 7.5), g2 = mk(3.0, 6), g3 = mk(2.6, 2.6);
      const decor = new lt.Group();
      const ARCHES = 56;
      for (let i = 0; i < ARCHES; i++) {
        const t = ((i + 0.5) / ARCHES) * TAU, n = nrm(t);
        const th = topH(t, yTop);
        const rotY = Math.atan2(-n[0], -n[1]);
        const place = (g, yy, hh, dOff) => {
          if (ruinsGap(t) || yy + hh > th - 0.6) return;
          const p = ep(t, dBack - 0.05 - dOff, yy);
          const m = new lt.Mesh(g, voidMat);
          m.position.set(p[0], p[1], p[2]); m.rotation.y = rotY;
          decor.add(m);
        };
        place(g1, yTop + 2.2, 7.5, 0);
        place(g2, yTop + 11.5, 6, 0);
        // buttress between arches
        const tb = (i / ARCHES) * TAU, nb = nrm(tb), thb = topH(tb, yTop);
        if (thb > yTop + 4) {
          const hh = thb - yTop;
          const pb = ep(tb, dBack - 0.5, yTop + hh / 2);
          const m = Qi(Wi(1.4, hh, 1.1, 0.05), stone2);
          m.position.set(pb[0], pb[1], pb[2]); m.rotation.y = Math.atan2(nb[0], nb[1]);
          decor.add(m);
        }
        // arched openings in the podium wall (skip near the gate)
        const [wallX, , wallZ] = ep(t, 0, 0);
        if (!inGate(wallX, wallZ) && !sidePortal(wallX, wallZ) && i % 2 === 0) {
          const p = ep(t, -0.04, 0.2);
          const m = new lt.Mesh(g3, voidMat);
          m.position.set(p[0], p[1], p[2]); m.rotation.y = Math.atan2(-n[0], -n[1]) + Math.PI;
          // (these face outward from the wall into the floor, so flip to face the arena)
          m.rotation.y = Math.atan2(-n[0], -n[1]);
          decor.add(m);
        }
      }
      root.add(By(decor));
    }

    // Arena cover, leaving the middle and the side-gate approaches open.
    const standingColumns = [[-17, 11, 4.2], [17, 13, 4.5], [19, -13, 4.1]];
    const newBrokenColumns = [[-22, -12, 4.1], [10, 17, 4.4], [25, 8, 4.3]];
    const largeBrokenColumns = [[-33, 12, 4.2], [2, -15, 4.4], [36, -9, 4.3]];
    const intactColumns = [[-12, -17, 4.8], [12, -17, 4.8]];
    const fallenColumns = [[-9, 9, 4.7], [10, -8, 5.2]];
    const cover = new lt.Group();

    function stoneCylinder(x, z, bottom, height, radius, topRadius, broken = false, scale = 1) {
      const geometry = new lt.CylinderGeometry(topRadius, radius, height, 14);
      if (broken) {
        const positions = geometry.attributes.position;
        for (let vertex = 0; vertex < positions.count; vertex++) {
          if (positions.getY(vertex) <= 0) continue;
          const vx = positions.getX(vertex), vz = positions.getZ(vertex);
          positions.setY(vertex, height / 2 - .22 + vx * .13 + .1 * Math.cos(vz * 8));
        }
        geometry.computeVertexNormals();
      }
      geometry.scale(scale, scale, scale);
      const mesh = Qi(geometry, broken ? stone : stone2);
      mesh.position.set(x, (bottom + height / 2) * scale, z);
      cover.add(mesh);
    }

    function placeRoundColumn(x, z, height, broken, scale = 1) {
      stoneCylinder(x, z, 0, .29, 1.28, 1.28, false, scale);
      stoneCylinder(x, z, .29, .19, 1.28, 1.09, false, scale);
      const shaftTop = broken ? height : height - .42;
      stoneCylinder(x, z, .48, shaftTop - .48, 1.06, .96, broken, scale);
      if (!broken) {
        stoneCylinder(x, z, shaftTop, .22, .96, 1.19, false, scale);
        stoneCylinder(x, z, height - .2, .2, 1.19, 1.19, false, scale);
      }
      addRoundColumnCollision(x, z, (broken ? height - .25 : height) * scale, scale);
    }

    function addRoundColumnCollision(x, z, height, scale) {
      const options = { playerOnly: true, tag: "round column" };
      game.physics.addBox([x - 1.1 * scale, 0, z - .78 * scale], [x + 1.1 * scale, height, z + .78 * scale], options);
      game.physics.addBox([x - .78 * scale, 0, z - 1.1 * scale], [x + .78 * scale, height, z + 1.1 * scale], options);
    }

    function placeFlutedRuin(x, z, height, angle) {
      const scale = 2;
      stoneCylinder(x, z, 0, .22, 1.28, 1.28, false, scale);
      stoneCylinder(x, z, .22, .22, 1.28, 1.14, false, scale);
      stoneCylinder(x, z, .44, .16, 1.14, 1.06, false, scale);
      const shaftHeight = height - .6;
      const geometry = new lt.CylinderGeometry(.94, 1.08, shaftHeight, 48, 4);
      const vertices = geometry.attributes.position;
      for (let index = 0; index < vertices.count; index++) {
        const vx = vertices.getX(index), vz = vertices.getZ(index);
        const theta = Math.atan2(vz, vx);
        const radial = 1 - .12 * (.5 + .5 * Math.cos(theta * 12)) ** 2;
        const y = vertices.getY(index) + shaftHeight / 2;
        const breakProfile = Math.min(1, (y / shaftHeight) ** 4);
        const notch = Math.max(0, 1 - Math.abs(Math.atan2(Math.sin(theta - .5), Math.cos(theta - .5))) / .58);
        vertices.setXYZ(index, vx * radial, y - breakProfile * (.28 + vx * .28 + .7 * notch), vz * radial);
      }
      geometry.computeVertexNormals();
      geometry.scale(scale, scale, scale);
      const shaft = Qi(geometry, stone);
      shaft.position.set(x, .6 * scale, z);
      shaft.rotation.y = angle;
      cover.add(shaft);
      addRoundColumnCollision(x, z, (height - .68) * scale, scale);
    }
    for (const [x, z, height] of [...standingColumns, ...newBrokenColumns]) {
      placeRoundColumn(x, z, height, true);
    }
    for (const [x, z, height] of intactColumns) placeRoundColumn(x, z, height, false);
    largeBrokenColumns.forEach(([x, z, height], index) => placeFlutedRuin(x, z, height, .3 + index * 1.2));
    for (const [x, z, length] of fallenColumns) {
      const mesh = Qi(Wi(length, 1.12, 1.45, .15), stone);
      mesh.position.set(x, .56, z);
      cover.add(mesh);
      game.physics.addBox([x - length / 2, 0, z - .725],
        [x + length / 2, 1.12, z + .725], { playerOnly: true, tag: "fallen column" });
    }
    const coverMeshes = By(cover);
    root.add(coverMeshes);
    arenaShotMeshes.push(...coverMeshes.children);

    // ---- rusted scaffolding hugging the wall (decor only) ----
    {
      const scaffold = (t0, t1, levels) => {
        const n = 7;
        for (let i = 0; i <= n; i++) {
          const t = t0 + ((t1 - t0) * i) / n, nn = nrm(t), p = ep(t, 0.9, 0), rot = Math.atan2(nn[0], nn[1]);
          for (let l = 0; l < levels; l++) {
            if (l === 0) box("scaffold post", rustMat, p[0], 0, p[2], 0.16, 3.1 * levels, 0.16);
          }
          for (let l = 1; l <= levels; l++) {
            if (i < n) {
              const q = ep(t0 + ((t1 - t0) * (i + 1)) / n, 0.9, 0);
              const cx = (p[0] + q[0]) / 2, cz = (p[2] + q[2]) / 2;
              const len = Math.hypot(q[0] - p[0], q[2] - p[2]);
              const ang = Math.atan2(q[0] - p[0], q[2] - p[2]);
              box("scaffold deck", steel, cx, 3.1 * l - 0.1, cz, 0.9, 0.12, len, false, 0, ang);
              box("scaffold rail", rustMat, cx, 3.1 * l + 0.9, cz, 0.08, 0.08, len, false, 0, ang);
            }
          }
        }
      };
      scaffold(-0.55, -0.1, 3);
      scaffold(2.75, 3.2, 2);
      scaffold(-2.35, -1.95, 3);
    }

    const merged = By(staticGeometry);
    root.add(merged);

    // ---- braziers (emissive + small lights) ----
    for (const [bx, bz] of [[-26, -15], [26, -15], [-26, 15], [26, 15]]) {
      // Đã bỏ thân lò và lửa (vật cản trên sàn), chỉ giữ đèn để sân không bị tối. Bỏ comment 2 dòng dưới để trả lò về.
      // const stand = Qi($e(0.7, 1.1, 0.7), steel); stand.position.set(bx, 0.55, bz); root.add(stand);
      // const fire = Qi($e(0.5, 0.45, 0.5), ember, { cast: false }); fire.position.set(bx, 1.35, bz); root.add(fire);
      const l = new lt.PointLight(0xff9a50, 120, 26, 2); l.position.set(bx, 2.1, bz); root.add(l);
    }

    // Small rubble stays at the edges of cover and has no collision.
    {
      const clusters = [
        ...standingColumns.map(([x, z]) => [x, z, 1.5]),
        ...fallenColumns.map(([x, z, length]) => [x + length / 2, z, .8]),
      ];
      const countPerCluster = 13;
      const rub = new lt.InstancedMesh(new lt.IcosahedronGeometry(1, 0), stone,
        clusters.length * countPerCluster);
      const rock = new lt.Object3D();
      let index = 0;
      for (const [x, z, radius] of clusters) {
        for (let i = 0; i < countPerCluster; i++) {
          const angle = rnd() * TAU, distance = radius + rnd() * .8;
          const size = .08 + rnd() ** 1.5 * .32;
          rock.position.set(x + Math.cos(angle) * distance, size * .3, z + Math.sin(angle) * distance);
          rock.scale.set(size, size * .65, size * (1 + rnd() * .55));
          rock.rotation.set(rnd() * 2, angle, rnd() * 2);
          rock.updateMatrix();
          rub.setMatrixAt(index++, rock.matrix);
        }
      }
      rub.castShadow = rub.receiveShadow = true;
      root.add(rub);
    }

    game.scene.add(root);

    root.updateMatrixWorld(true);
    const shotRay = new lt.Raycaster();
    const normalMatrix = new lt.Matrix3();
    const instanceMatrix = new lt.Matrix4();
    const worldMatrix = new lt.Matrix4();
    return {
      root,
      playerStart: { pos: new W(0, 0, spawnZ), yaw: 0 },
      cinematicPath: [
        { pos: [3.2, 2.4, spawnZ], look: [0, 2.2, 0] },
        { pos: [1.2, 2.2, B + 1.5], look: [0, 3.2, -12] },
        { pos: [-6, 3.2, B - 8], look: [8, 3, -6] },
      ],
      interiorBoxes: [{ min: new W(-gx, 0, B + .2), max: new W(gx, 5, southEnd) }],
      objectives: [], enemySpawns, zones: [], coverPoints: [],
      skylights: [], shedLights: [], placed: [],
      arena: { A, B, gate: [0, B], spawn: [0, spawnZ] },
      stats: { containers: 0, props: count, meshes: merged.children.length + root.children.length },
      groundSurfaceAt() { return "concrete"; },
      raycastArena(origin, direction, maxDistance) {
        shotRay.set(origin, direction);
        shotRay.far = maxDistance;
        const hit = shotRay.intersectObjects(arenaShotMeshes, false)[0];
        if (!hit) return null;
        worldMatrix.copy(hit.object.matrixWorld);
        if (hit.instanceId !== undefined) {
          hit.object.getMatrixAt(hit.instanceId, instanceMatrix);
          worldMatrix.multiply(instanceMatrix);
        }
        const normal = hit.face.normal.clone().applyMatrix3(normalMatrix.getNormalMatrix(worldMatrix)).normalize();
        if (normal.dot(direction) > 0) normal.negate();
        return {dist: hit.distance, point: hit.point, normal, surface: "concrete"};
      },
      hasEnteredArena() { return entryBarrier !== null; },
      resetArenaEntry() {
        if (entryBarrier) game.physics.removeBox(entryBarrier);
        entryBarrier = null;
      },
      update() {
        if (!entryBarrier && game.game?.state === "playing" && game.player.pos.z < B - 1.15) {
          entryBarrier = game.physics.addBox([-gx - .5, 0, B - .3], [gx + .5, 14, B + .5],
            {playerOnly: true, tag: "arena entry"});
        }
      },
    };
  }
