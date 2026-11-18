// LAN_CAMPAIGN_FULL
  // ==========================================================================
  //  SPINO LIGHTNING BEAM v2 — hiệu ứng nhìn cho tia sét của Spinosaurus
  //
  //  Logic (hướng khoá, độ dài theo raycast, sát thương, âm thanh) vẫn nằm trong
  //  AI-spinosaurus.js. API giữ nguyên: charge / fire / fan / hide / firing, và
  //  frame đồng bộ LAN giữ nguyên. Module này chỉ vẽ:
  //    • thân beam: 3 lớp ống shader (lõi trắng nóng / plasma có gân điện / quầng sáng)
  //      + 2 sợi "xương sống" trắng + 5 sợi sét bện quanh beam (hội tụ vào điểm chạm)
  //    • sét phân nhánh kiểu fractal (midpoint displacement, nhánh con 2 cấp),
  //      lõi trắng + quầng tím, nhấp nháy ~26 Hz nhưng khung chính giữ ổn định ~0.12s
  //    • khoảnh khắc châm ngòi: chớp sáng, vòng xung kích, sét toả hình nan hoa, rung camera
  //    • giai đoạn nạp: cầu plasma có gân điện, hạt hút xoáy vào miệng, 2 vòng sét xoay,
  //      sét nhảy quanh cầu càng nạp càng dày
  //    • điểm chạm: flare, đĩa năng lượng xoáy, sóng xung kích vỡ nhiễu, sét bò trên mặt đất,
  //      sét bật ngược lên
  //    • đèn môi trường nháy ngẫu nhiên theo từng nhát sét (game.render.lightPool.flash)
  //  Hạt, đèn động liên tục, vết cháy, heat haze do game.fx.beamJet (90-fx-gameplay.js) lo.
  //  Đổi màu / độ dày / độ sáng ở SPINO_BEAM bên dưới.
  // ==========================================================================
  const SPINO_BEAM = {
    coreColor:   [0.85, 0.68, 1.00],   // lõi: trắng ngả tím nóng
    coreHot:     [1.00, 0.97, 1.00],
    plasmaColor: [0.55, 0.16, 1.00],   // plasma tím điện
    plasmaHot:   [0.90, 0.68, 1.00],
    glowColor:   [0.38, 0.07, 0.85],   // quầng tím đậm
    glowHot:     [0.62, 0.28, 1.00],
    boltColor:   [0.72, 0.38, 1.00],   // viền tia sét
    boltHot:     [1.00, 0.92, 1.00],
    accent:      [0.72, 0.40, 1.00],   // flare / sprite / gân điện
    discColor:   [0.52, 0.18, 1.00],   // đĩa sáng ở điểm chạm
    ringColor:   [0.82, 0.55, 1.00],   // sóng xung kích
    fringeColor: [0.40, 0.46, 1.00],   // viền xanh-tím rất nhẹ quanh sét (plasma thật ngả xanh ở rìa)
    coreRadius: 0.22, plasmaRadius: 0.55, glowRadius: 1.30,   // mét (sát thương lấy theo logic gốc: 0.82)
    intensity: 1,                      // nhân độ sáng toàn bộ thân + sprite
    boltGain: 1.8,                     // độ sáng các nhát sét ribbon
    strobe: 1,                         // nhân độ mạnh đèn môi trường nháy theo nhát sét (0 = tắt)
    shake: 0.035,                      // rung camera khi bắn (giảm theo khoảng cách)
  };

  const SPINO_BEAM_YELLOW = {
    ...SPINO_BEAM,
    coreColor: [1, .89, .36], coreHot: [1, .98, .77],
    plasmaColor: [1, .56, .04], plasmaHot: [1, .9, .32],
    glowColor: [.95, .32, .01], glowHot: [1, .7, .06],
    boltColor: [1, .76, .13], boltHot: [1, .98, .65],
    accent: [1, .7, .12], discColor: [1, .55, .05], ringColor: [1, .86, .31],
    fringeColor: [1, .42, .06],
  };

  const BEAM_NOISE_GLSL = `
    float h31(vec3 p){ p = fract(p * .3183099 + .1); p *= 17.; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
    float vnoise(vec3 x){
      vec3 i = floor(x), f = fract(x); f = f * f * (3. - 2. * f);
      return mix(mix(mix(h31(i), h31(i + vec3(1,0,0)), f.x), mix(h31(i + vec3(0,1,0)), h31(i + vec3(1,1,0)), f.x), f.y),
                 mix(mix(h31(i + vec3(0,0,1)), h31(i + vec3(1,0,1)), f.x), mix(h31(i + vec3(0,1,1)), h31(i + vec3(1,1,1)), f.x), f.y), f.z);
    }
    float fbm(vec3 p){ float a = .5, s = 0.; for (int i = 0; i < 4; i++){ s += a * vnoise(p); p = p * 2.03 + vec3(1.7, 9.2, 3.1); a *= .5; } return s; }
    float ridge(vec3 p){ return 1. - abs(2. * vnoise(p) - 1.); }   // nếp gấp nhiễu -> đường gân điện mảnh
  `;

  // --------------------------------------------------------------------------
  //  Thư viện nhỏ: RNG có seed, sét fractal, bộ ghi ribbon camera-facing.
  //  Gói trong 1 tên toàn cục duy nhất để không đụng tên của các file khác khi build.
  // --------------------------------------------------------------------------
  const SPINO_BEAM_LIB = (() => {
    let rs = 1;
    function rand() {                                   // mulberry32
      rs = (rs + 0x6D2B79F5) | 0;
      let t = Math.imul(rs ^ (rs >>> 15), 1 | rs);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    function seedRng(n) { rs = (Math.imul(n | 0, 0x9E3779B1) ^ 0x5BD1E995) | 0; rand(); rand(); }
    const rr = (a, b) => a + rand() * (b - a);

    // Midpoint displacement 3D: ghi (2^levels + 1) điểm vào out (xyz xyz ...), trả về số điểm.
    // Các level < coarse dùng seed `sc` (khung chính, đổi chậm), level còn lại dùng `sf` (chi tiết, đổi nhanh).
    function frac(out, ax, ay, az, bx, by, bz, levels, amp, sc, sf, coarse) {
      const n = 1 << levels;
      out[0] = ax; out[1] = ay; out[2] = az;
      out[n * 3] = bx; out[n * 3 + 1] = by; out[n * 3 + 2] = bz;
      let dx = bx - ax, dy = by - ay, dz = bz - az;
      const dl = Math.hypot(dx, dy, dz) || 1;
      dx /= dl; dy /= dl; dz /= dl;
      let hx = 0, hy = 1, hz = 0;
      if (Math.abs(dy) > .95) { hx = 1; hy = 0; }
      let e1x = dy * hz - dz * hy, e1y = dz * hx - dx * hz, e1z = dx * hy - dy * hx;
      const e1l = Math.hypot(e1x, e1y, e1z) || 1;
      e1x /= e1l; e1y /= e1l; e1z /= e1l;
      const e2x = dy * e1z - dz * e1y, e2y = dz * e1x - dx * e1z, e2z = dx * e1y - dy * e1x;
      for (let lv = 0, step = n; step > 1; lv++, step >>= 1) {
        seedRng((lv < coarse ? sc : sf) + lv * 7919);
        const half = step >> 1;
        for (let i = half; i < n; i += step) {
          const i0 = (i - half) * 3, i1 = (i + half) * 3, m = i * 3;
          const kink = rand() < .14 ? 1.9 : 1;
          const sl = Math.hypot(out[i1] - out[i0], out[i1 + 1] - out[i0 + 1], out[i1 + 2] - out[i0 + 2]) * amp * kink;
          const r1 = (rand() * 2 - 1) * sl, r2 = (rand() * 2 - 1) * sl;
          out[m]     = (out[i0]     + out[i1])     * .5 + e1x * r1 + e2x * r2;
          out[m + 1] = (out[i0 + 1] + out[i1 + 1]) * .5 + e1y * r1 + e2y * r2;
          out[m + 2] = (out[i0 + 2] + out[i1 + 2]) * .5 + e1z * r1 + e2z * r2;
        }
      }
      return n + 1;
    }

    // Bộ ghi ribbon: mỗi polyline -> dải tam giác quay mặt về camera, dựng lại MỖI FRAME
    // nên sét luôn bám đúng miệng/đầu dù đầu Spino đang vung.
    function makeRibbons(maxPts, camPos) {
      const pos = new Float32Array(maxPts * 6), side = new Float32Array(maxPts * 2), inten = new Float32Array(maxPts * 2);
      const core = new Float32Array(maxPts * 2), seed = new Float32Array(maxPts * 2), idx = new Uint32Array(maxPts * 6);
      const geo = new lt.BufferGeometry();
      const A = {
        position: new lt.BufferAttribute(pos, 3).setUsage(lt.DynamicDrawUsage),
        aSide: new lt.BufferAttribute(side, 1).setUsage(lt.DynamicDrawUsage),
        aInt: new lt.BufferAttribute(inten, 1).setUsage(lt.DynamicDrawUsage),
        aCore: new lt.BufferAttribute(core, 1).setUsage(lt.DynamicDrawUsage),
        aSeed: new lt.BufferAttribute(seed, 1).setUsage(lt.DynamicDrawUsage),
      };
      for (const k in A) geo.setAttribute(k, A[k]);
      const iAttr = new lt.BufferAttribute(idx, 1).setUsage(lt.DynamicDrawUsage);
      geo.setIndex(iAttr);
      geo.setDrawRange(0, 0);
      let cur = 0, ni = 0;
      function begin() { cur = 0; ni = 0; }
      // P: xyz liên tiếp, n điểm. halfW: nửa bề rộng (m). I: độ sáng. coreR: tỉ lệ lõi/quầng (0..1).
      // endK: hệ số bề rộng+độ sáng ở đầu cuối (1 = không đổi). pinch: thu nhỏ cả hai đầu.
      function poly(P, n, halfW, I, coreR, sd, endK, pinch) {
        if (n < 2 || cur + n > maxPts || I <= .001) return;
        const cp = camPos(), cx = cp.x, cy = cp.y, cz = cp.z;
        for (let j = 0; j < n; j++) {
          const k = j * 3, a = Math.max(j - 1, 0) * 3, b = Math.min(j + 1, n - 1) * 3;
          const px = P[k], py = P[k + 1], pz = P[k + 2];
          const tx = P[b] - P[a], ty = P[b + 1] - P[a + 1], tz = P[b + 2] - P[a + 2];
          const vx = cx - px, vy = cy - py, vz = cz - pz;
          let sx = ty * vz - tz * vy, sy = tz * vx - tx * vz, sz = tx * vy - ty * vx;
          const sl = Math.hypot(sx, sy, sz) || 1;
          sx /= sl; sy /= sl; sz /= sl;
          const u = j / (n - 1);
          let kk = 1 - (1 - endK) * u;
          if (pinch) kk *= Math.max(.25, Math.pow(Math.sin(Math.PI * u), .5));
          const dist = Math.hypot(vx, vy, vz);
          const w = halfW * Math.min(3, Math.max(1, dist / 12)) * kk;
          const o = (cur + j) * 2, o3 = o * 3;
          pos[o3] = px - sx * w; pos[o3 + 1] = py - sy * w; pos[o3 + 2] = pz - sz * w;
          pos[o3 + 3] = px + sx * w; pos[o3 + 4] = py + sy * w; pos[o3 + 5] = pz + sz * w;
          side[o] = -1; side[o + 1] = 1;
          inten[o] = inten[o + 1] = I * kk;
          core[o] = core[o + 1] = coreR;
          seed[o] = seed[o + 1] = sd;
          if (j < n - 1) {
            const q = o;
            idx[ni++] = q; idx[ni++] = q + 1; idx[ni++] = q + 2;
            idx[ni++] = q + 1; idx[ni++] = q + 3; idx[ni++] = q + 2;
          }
        }
        cur += n;
      }
      function end() {
        geo.setDrawRange(0, ni);
        if (!cur) return;
        for (const k in A) {
          const at = A[k];
          if (at.clearUpdateRanges) { at.clearUpdateRanges(); at.addUpdateRange(0, at.itemSize * cur * 2); }
          at.needsUpdate = true;
        }
        if (iAttr.clearUpdateRanges) { iAttr.clearUpdateRanges(); iAttr.addUpdateRange(0, ni); }
        iAttr.needsUpdate = true;
      }
      function clear() { cur = 0; ni = 0; geo.setDrawRange(0, 0); }
      return { geo, begin, poly, end, clear, get points() { return cur; } };
    }
    return { rand, seedRng, rr, frac, makeRibbons };
  })();

  function createSpinoBeamFx(game, yellow = false, boltsOnly = false, replica = false) {
    const LIB = SPINO_BEAM_LIB, rand = LIB.rand, rr = LIB.rr;
    let lanId;
    const sync = frame => {
      if (replica || !game.lan) return;
      lanId ??= game.lan.allocateBeam();
      game.lan.beam(lanId, frame);
    };
    const cfg = yellow ? SPINO_BEAM_YELLOW : SPINO_BEAM;
    const V3 = (a) => new lt.Vector3(a[0], a[1], a[2]);
    const glslColor = color => "vec3(" + color.map(value => value.toFixed(3)).join(",") + ")";
    const U = { uTime: { value: 0 }, uLen: { value: 30 }, uEnd: { value: 0 }, uFlick: { value: 1 } };
    const root = new lt.Group();
    root.name = "spino-beam-fx";
    game.scene.add(root);
    const add = (m, order = 20) => { m.frustumCulled = false; m.renderOrder = order; m.visible = false; root.add(m); return m; };
    const additive = { transparent: true, blending: lt.AdditiveBlending, depthWrite: false, toneMapped: false };
    const camPos = () => game.camera.position;
    let firing = false, clock = 0, impactClock = 0, fireT = -1;
    const tmp = new lt.Vector3(), tmp2 = new lt.Vector3(), tmp3 = new lt.Vector3();
    const axisR = new lt.Vector3(), axisU = new lt.Vector3();
    const endP = new lt.Vector3(), endN = new lt.Vector3(0, 1, 0);
    const Z = new lt.Vector3(0, 0, 1), Yup = new lt.Vector3(0, 1, 0);

    // ---------------- nhịp thời gian: khung chính đổi chậm, chi tiết + độ chớp đổi nhanh ----------------
    let accF = 0, accC = 0, seedF = 1, seedC = 1, flickT = 1, flick = 1, newTick = true;
    function advance(dt) {
      clock += dt; U.uTime.value = clock;
      accF += dt; accC += dt; newTick = false;
      if (accF >= 1 / 26) {
        accF %= 1 / 26; newTick = true;
        seedF = (Math.random() * 1e9) | 0;
        flickT = .8 + .3 * Math.random() + (Math.random() < .07 ? .5 : 0);   // thỉnh thoảng 1 nhát "surge"
      }
      if (accC >= .12) { accC = 0; seedC = (Math.random() * 1e9) | 0; }
      flick += (flickT - flick) * Math.min(1, dt * 45);
      U.uFlick.value = flick;
    }
    function basis(dir) {
      axisR.crossVectors(dir, Math.abs(dir.y) > .95 ? Z : Yup).normalize();
      axisU.crossVectors(axisR, dir).normalize();
    }
    // đèn môi trường nháy theo nhát sét (dùng pool đèn sẵn có của game.render, không thêm đèn mới)
    function strobe(x, y, z, k, dist) {
      if (!cfg.strobe) return;
      const pool = game.render && game.render.lightPool;
      if (pool && pool.flash) { tmp3.set(x, y, z); pool.flash(tmp3, yellow ? 0xffb830 : 0xa468ff, k * cfg.strobe, dist || 60, .07); }
    }

    // ---------------- thân beam: 3 lớp ống shader ----------------
    const tubeGeo = new lt.CylinderGeometry(1, 1, 1, 24, 128, true);
    const tubeVS = `
      uniform float uTime, uLen, uWobble;
      varying vec3 vN, vV; varying float vM; varying vec2 vCs;
      void main(){
        float along = position.y + .5, m = along * uLen;
        float ang = atan(position.z, position.x);
        float taper = mix(.3, 1., smoothstep(0., 3.2, m));
        float wob = 1. + uWobble * (sin(m * 1.3 - uTime * 38.) * .5 + sin(m * 3.1 + uTime * 57. + ang * 2.) * .25);
        vec3 p = vec3(position.x * taper * wob, position.y, position.z * taper * wob);
        vec4 wp = modelMatrix * vec4(p, 1.);
        vN = normalize(normalMatrix * normal);
        vV = normalize(cameraPosition - wp.xyz);
        vM = m; vCs = normalize(position.xz);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`;
    const tubeFS = `
      uniform float uTime, uLen, uInt, uNoise, uSpiral, uRim, uStart, uEnd, uErode, uPulse, uVein, uFlick;
      uniform vec3 uCol, uHot, uAcc;
      varying vec3 vN, vV; varying float vM; varying vec2 vCs;
      ${BEAM_NOISE_GLSL}
      void main(){
        float nv = abs(dot(normalize(vN), normalize(vV)));
        float ang = atan(vCs.y, vCs.x), t = uTime;
        float dens = pow(nv, uRim);
        // nhiễu chảy ra xa miệng, lấy theo (cos,sin) nên không có đường nối trên ống
        float n  = fbm(vec3(vCs * 1.5, vM * .45 - t * 14.));
        float n2 = fbm(vec3(vCs * 3.2, vM * 1.3 - t * 28.) + 7.3);
        float fil = pow(vnoise(vec3(vCs * 7., vM * 2.4 - t * 50.)), 2.);
        // gân điện: nếp gấp nhiễu mảnh chạy dọc beam (giống tia lửa điện bên trong plasma)
        float vein = 0.;
        if (uVein > 0.) {
          float r1 = ridge(vec3(vCs * 2.4, vM * .8 - t * 34.));
          float r2 = ridge(vec3(vCs * 5.3 + 3.1, vM * 1.8 - t * 61.) + 4.7);
          vein = pow(r1, 8.) * .9 + pow(r2, 10.) * .8;
        }
        float stripe = smoothstep(.72, 1., sin(ang * 3. + vM * .8 - t * 26.) * .5 + .5);
        float wave = pow(sin(vM * .42 - t * 34.) * .5 + .5, 6.);        // xung năng lượng chạy dọc beam
        float heat = dens * (.5 + uNoise * (n - .35) * 1.6 + n2 * .22 + fil * .35)
                   + uSpiral * stripe * dens * .85 + uPulse * wave * dens
                   + uVein * vein * (.3 + .7 * dens);
        heat *= smoothstep(0., .22, dens - uErode * (.25 + .75 * n2));  // mép bị xói thành các lưỡi plasma
        heat = max(heat, 0.);
        // sáng dồn ở miệng và ở chỗ chạm (năng lượng tụ lại)
        heat *= 1. + 1.4 * exp(-vM * .55) + (1. - uEnd) * .9 * smoothstep(uLen - 5., uLen, vM);
        vec3 col = mix(uCol, uHot, smoothstep(.55, 1.05, heat));
        col = mix(col, uAcc, fil * .22 * uNoise);
        col += uHot * vein * uVein * .25;
        float fade = smoothstep(0., uStart, vM) * (1. - uEnd * smoothstep(uLen - 7., uLen, vM));
        gl_FragColor = vec4(col * heat * uInt * fade * uFlick, 1.);
      }`;
    function tubeMat(col, hot, o) {
      return new lt.ShaderMaterial({
        uniforms: { uTime: U.uTime, uLen: U.uLen, uEnd: U.uEnd, uFlick: U.uFlick, uCol: { value: V3(col) }, uHot: { value: V3(hot) }, uAcc: { value: V3(cfg.accent) },
          uInt: { value: o.int }, uNoise: { value: o.noise }, uSpiral: { value: o.spiral }, uRim: { value: o.rim },
          uWobble: { value: o.wobble }, uStart: { value: o.start }, uErode: { value: o.erode }, uPulse: { value: o.pulse }, uVein: { value: o.vein } },
        vertexShader: tubeVS, fragmentShader: tubeFS, side: lt.DoubleSide, ...additive,
      });
    }
    const BODY_INT = { core: 3.4, plasma: 2.8, glow: 1.1 };
    const core = add(new lt.Mesh(tubeGeo, tubeMat(cfg.coreColor, cfg.coreHot, { int: BODY_INT.core, noise: .5, spiral: 0, rim: 1.6, wobble: .06, start: 1.2, erode: 0, pulse: .55, vein: .25 })), 22);
    const plasma = add(new lt.Mesh(tubeGeo, tubeMat(cfg.plasmaColor, cfg.plasmaHot, { int: BODY_INT.plasma, noise: 1, spiral: 1, rim: 1.2, wobble: .14, start: 1.6, erode: .38, pulse: .35, vein: 1 })), 21);
    const glow = add(new lt.Mesh(tubeGeo, tubeMat(cfg.glowColor, cfg.glowHot, { int: BODY_INT.glow, noise: .3, spiral: 0, rim: 1.4, wobble: .05, start: 2.6, erode: .25, pulse: .15, vein: .4 })), 20);

    // ---------------- sprite hướng camera (flare) + đĩa/sóng xung kích ----------------
    const quad = new lt.PlaneGeometry(1, 1);
    const flareMat = (col) => new lt.ShaderMaterial({
      uniforms: { uCol: { value: V3(col) }, uInt: { value: 1 }, uSpike: { value: 1 } },
      vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }",
      fragmentShader: `varying vec2 vUv; uniform vec3 uCol; uniform float uInt, uSpike;
        void main(){ vec2 p = (vUv - .5) * 2.; float d = length(p);
          float cr = pow(max(1. - d, 0.), 2.5), hl = exp(-d * d * 3.5) * .5;
          float sp = uSpike * (exp(-abs(p.x) * 14.) * exp(-abs(p.y) * 1.6) + exp(-abs(p.y) * 14.) * exp(-abs(p.x) * 1.6)) * (1. - d);
          gl_FragColor = vec4(uCol * uInt * (cr * 1.4 + hl + sp), 1.); }`,
      side: lt.DoubleSide, ...additive,
    });
    const flareMouth = add(new lt.Mesh(quad, flareMat(cfg.accent)), 24);
    const flareHit = add(new lt.Mesh(quad, flareMat(cfg.accent)), 24);
    flareMouth.material.uniforms.uSpike.value = .3; flareHit.material.uniforms.uSpike.value = .22;
    // uR = 0: đĩa năng lượng xoáy (có gân điện) · uR > 0: vòng sóng, bị nhiễu làm đứt đoạn
    const discMat = (col) => new lt.ShaderMaterial({
      uniforms: { uTime: U.uTime, uCol: { value: V3(col) }, uInt: { value: 1 }, uR: { value: 0 }, uW: { value: .1 } },
      vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }",
      fragmentShader: `varying vec2 vUv; uniform vec3 uCol; uniform float uInt, uR, uW, uTime;
        ${BEAM_NOISE_GLSL}
        void main(){ vec2 p = (vUv - .5) * 2.; float d = length(p); if (d > 1.) discard;
          float v;
          if (uR > 0.) {
            float a = atan(p.y, p.x);
            float j = .55 + .9 * vnoise(vec3(cos(a) * 3., sin(a) * 3., uTime * 6. + uR * 9.));
            v = exp(-pow((d - uR) / uW, 2.)) * (1. - uR) * j;
          } else {
            float sw = fbm(vec3(p * 2.8, uTime * 3.));
            float vein = pow(ridge(vec3(p * 5.2, uTime * 9.)), 6.);
            v = pow(1. - d, 2.2) * (.7 + .9 * sw) + pow(1. - d, 1.6) * vein * .9;
          }
          gl_FragColor = vec4(uCol * uInt * v, 1.); }`,
      side: lt.DoubleSide, ...additive,
    });
    const hitDisc = add(new lt.Mesh(quad, discMat(cfg.discColor)), 19);
    const rings = [0, 1].map(() => add(new lt.Mesh(quad, discMat(cfg.ringColor)), 19));
    const ignRing = add(new lt.Mesh(quad, discMat(cfg.ringColor)), 19);          // sóng xung kích lúc châm ngòi

    // ---------------- sét ribbon: lõi trắng gaussian + quầng, nhấp nháy theo không gian ----------------
    const rib = LIB.makeRibbons(4096, camPos);
    const bolts = add(new lt.Mesh(rib.geo, new lt.ShaderMaterial({
      uniforms: { uTime: U.uTime, uCol: { value: V3(cfg.boltColor) }, uHot: { value: V3(cfg.boltHot) }, uHalo: { value: V3(cfg.glowHot) },
        uFringe: { value: V3(cfg.fringeColor) }, uGain: { value: cfg.boltGain } },
      vertexShader: "attribute float aSide, aInt, aCore, aSeed; varying float vS, vI, vC, vK; varying vec3 vW; void main(){ vS = aSide; vI = aInt; vC = aCore; vK = aSeed; vW = position; gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.); }",
      fragmentShader: `varying float vS, vI, vC, vK; varying vec3 vW; uniform vec3 uCol, uHot, uHalo, uFringe; uniform float uGain, uTime;
        void main(){
          float s = abs(vS), c = max(vC, .02);
          float core = exp(-s * s / (c * c));            // sợi trắng nóng mảnh
          float mid  = exp(-s * s / (c * c * 7.));       // vùng phát sáng sát lõi
          float halo = pow(max(1. - s, 0.), 3.);         // quầng rộng, tắt dần về mép ribbon
          float sh = .8 + .2 * sin(dot(vW, vec3(1.7, 2.3, 1.9)) - uTime * 70. + vK * 6.283);
          vec3 col = uHot * core * 1.3 + mix(uCol, uHot, .22) * mid * 1.1 + uHalo * halo * .6 + uFringe * halo * halo * .2 * (1. - core);
          gl_FragColor = vec4(col * vI * sh * uGain, 1.); }`,
      side: lt.DoubleSide, ...additive,
    })), 23);

    // ---- bộ dựng sét ----
    const SP = new Float32Array(160 * 3);                                    // sợi chạy dọc beam
    const TB = [0, 1, 2].map(() => new Float32Array(17 * 3));                // nhánh theo cấp
    const FB = new Float32Array(33 * 3), RB = new Float32Array(49 * 3);

    // cây sét: 1 nhánh fractal + tối đa 2 cấp nhánh con tạt ra phía trước
    function tree(ox, oy, oz, dx, dy, dz, len, depth, halfW, I, sd) {
      const out = TB[depth];
      const n = LIB.frac(out, ox, oy, oz, ox + dx * len, oy + dy * len, oz + dz * len, 4, .27, seedC + sd * 53, seedF + sd * 57, 1);
      rib.poly(out, n, halfW, I, .12, (sd * .6180339) % 1, .1, 0);
      if (depth >= 2) return;
      LIB.seedRng(seedF + sd * 71 + depth * 13);
      const nb = depth === 0 ? 3 : 2;
      for (let b = 0; b < nb; b++) {
        if (rand() > .7) continue;
        const k = (3 + ((rand() * 9) | 0)) * 3;
        const a = rr(.35, .95) * (rand() < .5 ? -1 : 1), ca = Math.cos(a), sa = Math.sin(a);
        const rx = rand() - .5, ry = rand() - .5, rz = rand() - .5;
        let px = dy * rz - dz * ry, py = dz * rx - dx * rz, pz = dx * ry - dy * rx;
        const pl = Math.hypot(px, py, pz) || 1; px /= pl; py /= pl; pz /= pl;
        tree(out[k], out[k + 1], out[k + 2], dx * ca + px * sa, dy * ca + py * sa, dz * ca + pz * sa,
          len * rr(.35, .55), depth + 1, halfW * .62, I * .72, sd * 3 + b + 1);
      }
    }
    // sét bò sát mặt đất quanh điểm chạm
    function crawl(gx, gy, gz, nx, ny, nz, len, halfW, I, sd) {
      const out = TB[0];
      LIB.seedRng(seedF + sd * 113 + 7);
      const rx = rand() - .5, ry = rand() - .5, rz = rand() - .5;
      let tx = ny * rz - nz * ry, ty = nz * rx - nx * rz, tz = nx * ry - ny * rx;
      const tl = Math.hypot(tx, ty, tz) || 1; tx /= tl; ty /= tl; tz /= tl;
      const n = LIB.frac(out, gx, gy, gz, gx + tx * len, gy + ty * len, gz + tz * len, 4, .3, seedC + sd * 59, seedF + sd * 61, 1);
      for (let j = 0; j < n; j++) {
        const k = j * 3, dn = (out[k] - gx) * nx + (out[k + 1] - gy) * ny + (out[k + 2] - gz) * nz, lift = .09 - dn;
        out[k] += nx * lift; out[k + 1] += ny * lift; out[k + 2] += nz * lift;
      }
      rib.poly(out, n, halfW, I, .13, (sd * .7548777) % 1, .12, 0);
    }
    // sợi chạy dọc beam: bện quanh trục (khung chính ổn định, răng cưa re-roll mỗi nhịp), hội tụ về cuối beam
    function strand(mouth, dir, Lh, sdv, rad, jit, halfW, I, coreR) {
      LIB.seedRng(seedC + sdv * 977);
      const phase = rand() * 6.283, pitch = rr(.16, .46) * (rand() < .5 ? -1 : 1), spin = rr(3, 8) * (rand() < .5 ? -1 : 1), seedPh = rand() * 6;
      LIB.seedRng(seedF + sdv * 131);
      const n = Math.min(Math.max(Math.floor(Lh / .9), 8), 150) + 1;
      let d1 = 0, d2 = 0;
      for (let j = 0; j < n; j++) {
        const t = j / (n - 1), s = t * Lh;
        const conv = 1 - .85 * Math.min(1, Math.max(0, (s - (Lh - 5)) / 5));
        const rd = rad * Math.min(1, s / 3) * (.75 + .25 * Math.sin(s * .7 + seedPh)) * conv;
        const ang = phase + s * pitch + clock * spin;
        d1 = d1 * .55 + (rand() - .5) * jit; d2 = d2 * .55 + (rand() - .5) * jit;
        if (rand() < .06) { d1 *= 2.6; d2 *= 2.6; }
        const ox = Math.cos(ang) * rd + d1 * conv, oy = Math.sin(ang) * rd + d2 * conv, k = j * 3;
        SP[k]     = mouth.x + dir.x * s + axisR.x * ox + axisU.x * oy;
        SP[k + 1] = mouth.y + dir.y * s + axisR.y * ox + axisU.y * oy;
        SP[k + 2] = mouth.z + dir.z * s + axisR.z * ox + axisU.z * oy;
      }
      rib.poly(SP, n, halfW, I, coreR, (sdv * .41) % 1, 1, 0);
    }
    // nhát sét toả ra từ 1 điểm trong hình nón quanh trục
    function coneBolt(ox, oy, oz, dir, cosMin, cosMax, len, depth, halfW, I, sd) {
      const c = rr(cosMin, cosMax), a = rand() * 6.2832, sn = Math.sqrt(Math.max(0, 1 - c * c)), ca = Math.cos(a) * sn, sa = Math.sin(a) * sn;
      tree(ox, oy, oz, dir.x * c + axisR.x * ca + axisU.x * sa, dir.y * c + axisR.y * ca + axisU.y * sa, dir.z * c + axisR.z * ca + axisU.z * sa,
        len, depth, halfW, I, sd);
    }

    function buildBeam(mouth, dir, Lh, hitting, boosted) {
      rib.begin();
      basis(dir);
      // xương sống: 2 sợi trắng gần thẳng (lõi nóng nhất)
      strand(mouth, dir, Lh, 1, 0, .1, .75, 1.25, .12);
      strand(mouth, dir, Lh, 2, .07, .12, .7, 1.1, .12);
      // 5 sợi bện quanh thân
      for (let k = 0; k < 5; k++) strand(mouth, dir, Lh, 3 + k, .5 + .22 * k, .22 + .05 * k, .5, .8 + .06 * k, .1);
      // nhánh tạt ra từ thân
      const nFork = Math.min(30, 12 + Math.floor(Lh / 6)), forkLen = 1 + Lh / 200;   // beam càng dài càng nhiều nhánh
      for (let k = 0; k < nFork; k++) {
        LIB.seedRng(seedF + k * 31 + 5);
        if (rand() > .8) continue;
        const s = Lh * (.03 + .95 * Math.pow(rand(), 1.25)), a = rand() * 6.2832, ca = Math.cos(a), sa = Math.sin(a), lean = rr(-.9, .9);
        const dx = (axisR.x * ca + axisU.x * sa) * Math.cos(lean) + dir.x * Math.sin(lean);
        const dy = (axisR.y * ca + axisU.y * sa) * Math.cos(lean) + dir.y * Math.sin(lean);
        const dz = (axisR.z * ca + axisU.z * sa) * Math.cos(lean) + dir.z * Math.sin(lean);
        tree(mouth.x + dir.x * s + (axisR.x * ca + axisU.x * sa) * .5, mouth.y + dir.y * s + (axisR.y * ca + axisU.y * sa) * .5,
          mouth.z + dir.z * s + (axisR.z * ca + axisU.z * sa) * .5, dx, dy, dz, rr(3, 11) * forkLen, 1, .38, .9, 100 + k);
      }
      // sét phụt quanh miệng
      for (let k = 0; k < 4; k++) { LIB.seedRng(seedF + k * 47 + 900); coneBolt(mouth.x, mouth.y, mouth.z, dir, .1, .9, rr(1.5, 5.5), 0, .3, 1.4, 200 + k); }
      // châm ngòi: sét toả hình nan hoa, tắt rất nhanh
      if (boosted > .02) {
        for (let k = 0; k < 12; k++) { LIB.seedRng(seedF + k * 59 + 1300); coneBolt(mouth.x, mouth.y, mouth.z, dir, -.25, .8, rr(6, 22) * (.5 + .5 * boosted), 1, .55, 2.2 * boosted, 300 + k); }
      }
      // điểm chạm: sét bò trên mặt đất + sét bật ngược lên
      if (hitting) {
        const gx = endP.x + endN.x * .1, gy = endP.y + endN.y * .1, gz = endP.z + endN.z * .1;
        for (let k = 0; k < 9; k++) {
          LIB.seedRng(seedF + k * 67 + 1700);
          if (rand() < .2) continue;
          crawl(gx, gy, gz, endN.x, endN.y, endN.z, rr(3, 11), .4, 1.1, 400 + k);
        }
        for (let k = 0; k < 3; k++) {
          LIB.seedRng(seedF + k * 73 + 2100);
          const ta = rand() * 6.2832, lift = rr(.4, 1);
          tmp.set(Math.cos(ta), 0, Math.sin(ta));
          tmp.addScaledVector(endN, -tmp.dot(endN)).normalize().multiplyScalar(Math.sqrt(1 - lift * lift)).addScaledVector(endN, lift);
          tree(gx, gy, gz, tmp.x, tmp.y, tmp.z, rr(4, 10), 0, .45, 1.3, 500 + k);
        }
      }
      rib.end();
    }

    // ---------------- giai đoạn nạp: cầu plasma + hạt hút xoáy + vòng sét xoay ----------------
    const ball = add(new lt.Mesh(new lt.IcosahedronGeometry(1, 3), new lt.ShaderMaterial({
      uniforms: { uTime: U.uTime, uFlick: U.uFlick, uInt: { value: 1 } },
      vertexShader: "varying vec3 vN, vV, vO; void main(){ vO = position; vN = normalize(normalMatrix * normal); vec4 wp = modelMatrix * vec4(position, 1.); vV = normalize(cameraPosition - wp.xyz); gl_Position = projectionMatrix * viewMatrix * wp; }",
      fragmentShader: `uniform float uTime, uInt, uFlick; varying vec3 vN, vV, vO; ${BEAM_NOISE_GLSL}
        void main(){ float nv = abs(dot(normalize(vN), normalize(vV))); float rim = pow(1. - nv, 2.2);
          float n = fbm(vO * 2.4 + vec3(0., uTime * 5., uTime * 2.)); float n2 = fbm(vO * 5.5 - vec3(uTime * 7., 0., uTime * 3.));
          float vein = pow(ridge(vO * 3.4 + vec3(uTime * 6., 0., uTime * 4.)), 6.);
          float heat = .25 + .8 * n + .45 * n2 + 1.0 * pow(nv, 2.) + .35 * rim + .9 * vein;
          vec3 col = mix(${glslColor(cfg.plasmaColor)}, ${glslColor(cfg.coreHot)}, smoothstep(.95, 2.1, heat));
          gl_FragColor = vec4(col * heat * uInt * uFlick, 1.); }`,
      side: lt.FrontSide, ...additive,
    })), 25);
    const NP = 200;
    const pDir = Array.from({ length: NP }, () => new lt.Vector3(Math.random() - .5, Math.random() - .5, Math.random() - .5).normalize());
    const pPhase = Float32Array.from({ length: NP }, () => Math.random()), pSpeed = Float32Array.from({ length: NP }, () => rr(.9, 1.7));
    const ppos = new Float32Array(NP * 3), pfade = new Float32Array(NP);
    const pointGeo = new lt.BufferGeometry();
    pointGeo.setAttribute("position", new lt.BufferAttribute(ppos, 3).setUsage(lt.DynamicDrawUsage));
    pointGeo.setAttribute("aFade", new lt.BufferAttribute(pfade, 1).setUsage(lt.DynamicDrawUsage));
    const inflow = add(new lt.Points(pointGeo, new lt.ShaderMaterial({
      uniforms: { uSize: { value: 1 } },
      vertexShader: "attribute float aFade; varying float vF; uniform float uSize; void main(){ vF = aFade; vec4 mv = viewMatrix * vec4(position, 1.); gl_PointSize = uSize * aFade * 420. / max(-mv.z, .5); gl_Position = projectionMatrix * mv; }",
      fragmentShader: `varying float vF; void main(){ vec2 p = gl_PointCoord - .5; float d = length(p) * 2.; if (d > 1.) discard; float a = pow(1. - d, 2.); gl_FragColor = vec4(${glslColor(cfg.accent)} * a * vF * 5., 1.); }`,
      ...additive,
    })), 24);

    function billboard(mesh, pos, size) { mesh.position.copy(pos); mesh.quaternion.copy(game.camera.quaternion); mesh.scale.setScalar(size); }
    function lookDir(mesh, from, dir) { mesh.position.copy(from); mesh.quaternion.setFromUnitVectors(Z, dir); }

    function hide() {
      if (lanId != null) game.lan.beam(lanId, null);
      firing = false; fireT = -1;
      for (const m of [core, plasma, glow, flareMouth, flareHit, hitDisc, ball, inflow, bolts, ignRing, ...rings]) m.visible = false;
      rib.clear();
    }
    hide();

    // ---- nạp: p = 0..1, aim = hướng từ miệng tới mục tiêu ----
    function charge(mouth, aim, p, dt) {
      sync([yellow, boltsOnly, "charge", mouth.toArray(), aim.toArray(), p]);
      advance(dt);
      firing = false; fireT = -1;
      for (const m of [core, plasma, glow, flareHit, hitDisc, ignRing, ...rings]) m.visible = false;
      const pulse = 1 + .08 * Math.sin(clock * 42), r = (.25 + 1.85 * p) * pulse;
      ball.visible = flareMouth.visible = inflow.visible = bolts.visible = true;
      ball.position.copy(mouth); ball.scale.setScalar(r);
      ball.material.uniforms.uInt.value = .6 + .8 * p;
      game.fx?.beamCharge?.(mouth, p, { dt, radius: r, yellow });
      flareMouth.material.uniforms.uInt.value = (.5 + 1.5 * p) * cfg.intensity * flick;
      billboard(flareMouth, mouth, r * (5 + 4 * p));
      // hạt hút xoáy vào miệng (xoáy quanh trục ngắm, càng gần càng xoáy nhiều)
      const R0 = 13 + 6 * p, shown = Math.floor(NP * Math.min(1, .15 + p));
      for (let i = 0; i < NP; i++) {
        const u = (pPhase[i] + clock * pSpeed[i] * .9) % 1, rad = R0 * Math.pow(1 - u, 1.6) + r * .9;
        tmp.copy(pDir[i]).applyAxisAngle(aim, (1 - u) * (1 - u) * 3.2 * (1 + p));
        ppos[i * 3] = mouth.x + tmp.x * rad; ppos[i * 3 + 1] = mouth.y + tmp.y * rad; ppos[i * 3 + 2] = mouth.z + tmp.z * rad;
        pfade[i] = i < shown ? Math.min(1, u * 5) * (.5 + .5 * u) : 0;
      }
      pointGeo.attributes.position.needsUpdate = true; pointGeo.attributes.aFade.needsUpdate = true;
      inflow.material.uniforms.uSize.value = .1 + .08 * p;
      // sét: vòng điện xoay + tia nhảy quanh cầu (càng nạp càng dày, càng dài)
      rib.begin();
      basis(aim);
      const mx = mouth.x, my = mouth.y, mz = mouth.z;
      for (let k = 0; k < 2; k++) {
        LIB.seedRng(seedF + 5000 + k * 17);
        const N = 44, R = (2.6 - 1.2 * p) * (k ? 1.35 : 1) * Math.max(.6, r), rot = clock * (k ? -5.5 : 4);
        for (let i = 0; i <= N; i++) {
          const th = (i % N) / N * 6.2832 + rot, jr = R + (rand() - .5) * .14 * R, ax = Math.cos(th) * jr, ay = Math.sin(th) * jr, k3 = i * 3;
          RB[k3]     = mx + axisR.x * ax + axisU.x * ay;
          RB[k3 + 1] = my + axisR.y * ax + axisU.y * ay;
          RB[k3 + 2] = mz + axisR.z * ax + axisU.z * ay;
          if (i === N) { RB[k3] = RB[0]; RB[k3 + 1] = RB[1]; RB[k3 + 2] = RB[2]; }
        }
        rib.poly(RB, N + 1, .09 + .03 * R, (.5 + .9 * p) * (k ? .8 : 1), .16, k * .5 + .1, 1, 0);
      }
      const nA = 3 + Math.floor(p * 11);
      for (let k = 0; k < nA; k++) {
        LIB.seedRng(seedF + k * 977 + 30);
        tmp.set(rand() - .5, rand() - .5, rand() - .5).normalize();
        tree(mx + tmp.x * r * .85, my + tmp.y * r * .85, mz + tmp.z * r * .85, tmp.x, tmp.y, tmp.z,
          r * rr(.9, 2.2 + 2.2 * p), p > .45 ? 1 : 2, .1 + .07 * p, (.55 + .9 * p) * rr(.6, 1.2), 600 + k);
      }
      if (p > .55) for (let k = 0; k < 2; k++) {                      // vài nhát dài vươn ra khi gần nạp đầy
        LIB.seedRng(seedF + k * 389 + 70);
        tmp.set(rand() - .5, rand() - .5, rand() - .5).normalize();
        tree(mx + tmp.x * r, my + tmp.y * r, mz + tmp.z * r, tmp.x, tmp.y, tmp.z, rr(6, 12) * p, 1, .22, 1.1 * p, 700 + k);
      }
      rib.end();
      if (newTick && p > .35 && Math.random() < .3) strobe(mx, my, mz, 120 + 420 * p, 45);
      game.player?.addShake?.(.004 * p);
    }

    // ---- bắn: dir đã khoá, length theo raycast, hit = {point, normal, dist} hoặc null ----
    // (trên máy replica LAN hit chỉ có normal, không có point -> suy ra từ mouth + dir * length)
    function fire(mouth, dir, length, hit, dt) {
      sync([yellow, boltsOnly, "fire", mouth.toArray(), dir.toArray(), length, hit?.normal?.toArray()]);
      const starting = !firing;
      advance(dt);
      impactClock += dt;
      if (starting) {
        fireT = 0;
        if (!boltsOnly) {
          strobe(mouth.x, mouth.y, mouth.z, 1400, 90);
          const dc = camPos().distanceTo(mouth);
          game.player?.addShake?.(.11 * Math.max(0, 1 - dc / 80));
        }
      } else fireT += dt;
      firing = true;
      const Lh = Math.max(.1, length), pulse = 1 + .1 * Math.sin(clock * 115);
      U.uLen.value = Lh;
      U.uEnd.value = hit ? 0 : 1;
      const hitting = !!hit;
      if (hitting) {
        if (hit.point) endP.copy(hit.point); else endP.copy(mouth).addScaledVector(dir, Lh);
        endN.copy(hit.normal && hit.normal.isVector3 ? hit.normal : Yup);
        if (endN.lengthSq() < 1e-6) endN.copy(Yup); else endN.normalize();
      }
      const ig = fireT >= 0 && fireT < .45 ? Math.exp(-fireT * 8) : 0;      // năng lượng châm ngòi, tắt dần
      if (!boltsOnly) {
        core.visible = plasma.visible = glow.visible = true;
        inflow.visible = false;
        const place = (mesh, radius) => {
          mesh.position.copy(mouth).addScaledVector(dir, Lh / 2);
          mesh.quaternion.setFromUnitVectors(Yup, dir);
          mesh.scale.set(radius * pulse, Lh, radius * pulse);
        };
        place(core, cfg.coreRadius); place(plasma, cfg.plasmaRadius); place(glow, cfg.glowRadius);
        core.material.uniforms.uInt.value = BODY_INT.core * cfg.intensity;
        plasma.material.uniforms.uInt.value = BODY_INT.plasma * cfg.intensity;
        glow.material.uniforms.uInt.value = BODY_INT.glow * cfg.intensity;
        // cầu + flare ở miệng (to và chói hơn lúc châm ngòi)
        ball.visible = true; ball.position.copy(mouth); ball.scale.setScalar((1.3 + .9 * ig) * pulse); ball.material.uniforms.uInt.value = (1.15 + 1.4 * ig) * cfg.intensity;
        flareMouth.visible = true; flareMouth.material.uniforms.uInt.value = (1.1 + .3 * Math.sin(clock * 60) + 2.2 * ig) * cfg.intensity * flick;
        billboard(flareMouth, mouth, 7.5 * pulse * (1 + 1.2 * ig));
        // vòng xung kích lúc châm ngòi
        ignRing.visible = ig > .01;
        if (ignRing.visible) {
          const u = Math.min(1, fireT / .45);
          lookDir(ignRing, mouth, dir); ignRing.scale.setScalar(36);
          ignRing.material.uniforms.uR.value = Math.max(.03, u); ignRing.material.uniforms.uW.value = .05 + .07 * u;
          ignRing.material.uniforms.uInt.value = 3.2 * (1 - u) * cfg.intensity;
        }
        // điểm chạm
        flareHit.visible = hitDisc.visible = rings[0].visible = rings[1].visible = hitting;
        if (hitting) {
          const n = endN;
          tmp2.copy(endP).addScaledVector(n, .12);
          flareHit.material.uniforms.uInt.value = (1.3 + .4 * Math.sin(clock * 70)) * cfg.intensity * flick;
          billboard(flareHit, tmp.copy(tmp2).addScaledVector(n, .5), 5.2 + .9 * Math.sin(clock * 50));
          hitDisc.position.copy(tmp2); hitDisc.quaternion.setFromUnitVectors(Z, n); hitDisc.scale.setScalar(7 + .8 * Math.sin(clock * 33));
          hitDisc.material.uniforms.uInt.value = 1.25 * cfg.intensity * flick;
          rings.forEach((m, k) => {
            const u = (impactClock * 1.9 + k * .5) % 1;
            m.position.copy(tmp2); m.quaternion.setFromUnitVectors(Z, n); m.scale.setScalar(18);
            m.material.uniforms.uR.value = Math.max(.02, u); m.material.uniforms.uW.value = .06 + .08 * u;
            m.material.uniforms.uInt.value = 2.2 * cfg.intensity;
          });
        }
      }
      // sét: xương sống + bện + nhánh + châm ngòi + sét mặt đất
      bolts.visible = true;
      buildBeam(mouth, dir, Lh, hitting, ig);
      if (newTick && Math.random() < .3) {                               // nháy đèn môi trường theo nhát sét
        const s = Lh * Math.random() * Math.min(1, 40 / Lh);
        strobe(mouth.x + dir.x * s, mouth.y + dir.y * s, mouth.z + dir.z * s, 380 + 320 * Math.random(), 55);
      }
      if (hitting && newTick && Math.random() < .35) strobe(endP.x, endP.y + .8, endP.z, 600 + 400 * Math.random(), 50);
      // hạt + đèn + vết cháy
      if (boltsOnly) return;
      game.fx?.beamJet?.(mouth, dir, { dt, length: Lh, yellow, scale: 1.8, hit: hit ? endP : null, normal: hit ? endN : undefined });
      const d = camPos().distanceTo(mouth);
      game.player?.addShake?.(cfg.shake * Math.max(0, 1 - d / 70));
    }

    // ---- roar lightning: quạt sét từ miệng xuống đất (7 tia) ----
    function fan(mouth, arcs, dt) {
      sync([yellow, boltsOnly, "fan", mouth.toArray(), arcs.map(arc => arc.end.toArray())]);
      advance(dt);
      bolts.visible = true;
      firing = true;
      rib.begin();
      let idx = 0;
      for (const arc of arcs) {
        const e = arc.end;
        if (mouth.distanceToSquared(e) < .04) continue;
        idx++;
        const n = LIB.frac(FB, mouth.x, mouth.y, mouth.z, e.x, e.y, e.z, 5, .2, seedC + idx * 131, seedF + idx * 137, 3);
        rib.poly(FB, n, .6, 1.6, .1, (idx * .37) % 1, .4, 0);
        const n2 = LIB.frac(RB, mouth.x, mouth.y, mouth.z, e.x, e.y, e.z, 5, .26, seedC + idx * 139 + 7, seedF + idx * 149, 2);
        rib.poly(RB, n2, .4, 1.05, .12, (idx * .53) % 1, .4, 0);
        // nhánh tạt ra từ thân tia: lấy từ các điểm của nhát chính
        tmp2.subVectors(e, mouth).normalize();
        basis(tmp2);
        LIB.seedRng(seedF + idx * 83 + 11);
        for (let f = 0; f < 3; f++) {
          const k = (6 + ((rand() * 18) | 0)) * 3;
          coneBolt(FB[k], FB[k + 1], FB[k + 2], tmp2, .15, .9, rr(4, 12), 1, .4, 1, 800 + idx * 5 + f);
        }
        // nan hoa toả ra ở chỗ sét đánh xuống
        for (let f = 0; f < 4; f++) {
          LIB.seedRng(seedF + idx * 97 + f * 13 + 3);
          const ax = rand() - .5, az = rand() - .5, ay = rr(.15, 1);
          const l = Math.hypot(ax, ay, az) || 1;
          tree(e.x, e.y + .15, e.z, ax / l, ay / l, az / l, rr(1.5, 5), 2, .32, 1.1, 900 + idx * 7 + f);
        }
        if (newTick && Math.random() < .18) strobe(e.x, e.y + .8, e.z, 500 + 300 * Math.random(), 45);
      }
      rib.end();
    }

    return { charge, fire, fan, hide, get firing() { return firing; } };
  }