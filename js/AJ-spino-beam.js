  // ==========================================================================
  //  SPINO LIGHTNING BEAM — hiệu ứng nhìn cho tia sét của Spinosaurus
  //
  //  Logic (hướng khoá, độ dài theo raycast, sát thương, âm thanh) vẫn nằm trong
  //  AI-spinosaurus.js. Module này chỉ vẽ:
  //    • thân beam: 3 lớp ống shader (lõi trắng nóng / plasma xoắn ốc / quầng sáng)
  //    • sét ribbon quấn quanh beam + nhánh tạt ra, tính lại ~28 lần/giây
  //    • giai đoạn nạp: cầu plasma, hạt hút vào miệng, 2 vòng xoay, tia sét ngắn
  //    • điểm chạm: flare, đĩa sáng, sóng xung kích, rung camera
  //  Hạt, đèn động, vết cháy do game.fx.beamJet (90-fx-gameplay.js) lo.
  //  Đổi màu / độ dày ở SPINO_BEAM bên dưới.
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
    accent:      [0.72, 0.40, 1.00],   // flare / sprite
    discColor:   [0.52, 0.18, 1.00],   // đĩa sáng ở điểm chạm
    ringColor:   [0.82, 0.55, 1.00],   // sóng xung kích
    coreRadius: 0.30, plasmaRadius: 0.80, glowRadius: 1.75,   // mét (sát thương lấy theo logic gốc: 0.82)
    intensity: 1,                      // nhân độ sáng toàn bộ
    shake: 0.035,                      // rung camera khi bắn (giảm theo khoảng cách)
  };

  const BEAM_NOISE_GLSL = `
    float h31(vec3 p){ p = fract(p * .3183099 + .1); p *= 17.; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
    float vnoise(vec3 x){
      vec3 i = floor(x), f = fract(x); f = f * f * (3. - 2. * f);
      return mix(mix(mix(h31(i), h31(i + vec3(1,0,0)), f.x), mix(h31(i + vec3(0,1,0)), h31(i + vec3(1,1,0)), f.x), f.y),
                 mix(mix(h31(i + vec3(0,0,1)), h31(i + vec3(1,0,1)), f.x), mix(h31(i + vec3(0,1,1)), h31(i + vec3(1,1,1)), f.x), f.y), f.z);
    }
    float fbm(vec3 p){ float a = .5, s = 0.; for (int i = 0; i < 4; i++){ s += a * vnoise(p); p = p * 2.03 + vec3(1.7, 9.2, 3.1); a *= .5; } return s; }
  `;

  function createSpinoBeamFx(game) {
    const cfg = SPINO_BEAM;
    const V3 = (a) => new lt.Vector3(a[0], a[1], a[2]);
    const U = { uTime: { value: 0 }, uLen: { value: 30 }, uEnd: { value: 0 } };
    const root = new lt.Group();
    root.name = "spino-beam-fx";
    game.scene.add(root);
    const add = (m, order = 20) => { m.frustumCulled = false; m.renderOrder = order; m.visible = false; root.add(m); return m; };
    const additive = { transparent: true, blending: lt.AdditiveBlending, depthWrite: false, toneMapped: false };
    const camPos = () => game.camera.position;
    let firing = false, regen = 0, clock = 0, impactClock = 0;
    const tmp = new lt.Vector3(), tmp2 = new lt.Vector3(), axisR = new lt.Vector3(), axisU = new lt.Vector3();
    const Z = new lt.Vector3(0, 0, 1), Yup = new lt.Vector3(0, 1, 0);
    const rnd = (a, b) => a + Math.random() * (b - a);

    // ---------------- thân beam: 3 lớp ống shader ----------------
    const tubeGeo = new lt.CylinderGeometry(1, 1, 1, 28, 48, true);
    const tubeVS = `
      uniform float uTime, uLen, uWobble;
      varying vec3 vN, vV; varying float vM, vAng;
      void main(){
        float along = position.y + .5, m = along * uLen;
        float ang = atan(position.z, position.x);
        float taper = mix(.3, 1., smoothstep(0., 3.2, m));
        float wob = 1. + uWobble * (sin(m * 1.3 - uTime * 38.) * .5 + sin(m * 3.1 + uTime * 57. + ang * 2.) * .25);
        vec3 p = vec3(position.x * taper * wob, position.y, position.z * taper * wob);
        vec4 wp = modelMatrix * vec4(p, 1.);
        vN = normalize(normalMatrix * normal);
        vV = normalize(cameraPosition - wp.xyz);
        vM = m; vAng = ang;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`;
    const tubeFS = `
      uniform float uTime, uLen, uInt, uNoise, uSpiral, uRim, uStart, uEnd;
      uniform vec3 uCol, uHot;
      varying vec3 vN, vV; varying float vM, vAng;
      ${BEAM_NOISE_GLSL}
      void main(){
        float nv = abs(dot(normalize(vN), normalize(vV)));
        float body = pow(nv, uRim);
        float n  = fbm(vec3(vAng * 1.6, vM * .55 - uTime * 16., uTime * 2.));
        float n2 = fbm(vec3(vAng * 3. + uTime * 4., vM * 1.4 - uTime * 30., 7.));
        float stripe = smoothstep(.72, 1., sin(vAng * 3. + vM * .8 - uTime * 26.) * .5 + .5);
        float heat = body * (.55 + uNoise * (n - .35) * 1.6 + n2 * .22) + uSpiral * stripe * body * .85;
        heat = max(heat, 0.);
        vec3 col = mix(uCol, uHot, smoothstep(.55, 1.05, heat));
        float fade = smoothstep(0., uStart, vM) * (1. - uEnd * smoothstep(uLen - 7., uLen, vM));
        gl_FragColor = vec4(col * heat * uInt * fade, 1.);
      }`;
    function tubeMat(col, hot, o) {
      return new lt.ShaderMaterial({
        uniforms: { uTime: U.uTime, uLen: U.uLen, uEnd: U.uEnd, uCol: { value: V3(col) }, uHot: { value: V3(hot) },
          uInt: { value: o.int }, uNoise: { value: o.noise }, uSpiral: { value: o.spiral }, uRim: { value: o.rim },
          uWobble: { value: o.wobble }, uStart: { value: o.start } },
        vertexShader: tubeVS, fragmentShader: tubeFS, side: lt.DoubleSide, ...additive,
      });
    }
    const core = add(new lt.Mesh(tubeGeo, tubeMat(cfg.coreColor, cfg.coreHot, { int: 5.6, noise: .5, spiral: 0, rim: 1.6, wobble: .06, start: 1.2 })), 22);
    const plasma = add(new lt.Mesh(tubeGeo, tubeMat(cfg.plasmaColor, cfg.plasmaHot, { int: 3.6, noise: 1, spiral: 1, rim: 1.2, wobble: .12, start: 1.6 })), 21);
    const glow = add(new lt.Mesh(tubeGeo, tubeMat(cfg.glowColor, cfg.glowHot, { int: 1.4, noise: .3, spiral: 0, rim: .9, wobble: .05, start: 2.6 })), 20);

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
    const discMat = (col) => new lt.ShaderMaterial({
      uniforms: { uCol: { value: V3(col) }, uInt: { value: 1 }, uR: { value: 0 }, uW: { value: .1 } },
      vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }",
      fragmentShader: `varying vec2 vUv; uniform vec3 uCol; uniform float uInt, uR, uW;
        void main(){ vec2 p = (vUv - .5) * 2.; float d = length(p); if (d > 1.) discard;
          float v = uR > 0. ? exp(-pow((d - uR) / uW, 2.)) * (1. - uR) : pow(1. - d, 2.2);
          gl_FragColor = vec4(uCol * uInt * v, 1.); }`,
      side: lt.DoubleSide, ...additive,
    });
    const hitDisc = add(new lt.Mesh(quad, discMat(cfg.discColor)), 19);
    const rings = [0, 1].map(() => add(new lt.Mesh(quad, discMat(cfg.ringColor)), 19));

    // ---------------- sét ribbon (B tia × M điểm) ----------------
    const B = 18, M = 22;
    const bpos = new Float32Array(B * M * 2 * 3), bside = new Float32Array(B * M * 2), bint = new Float32Array(B * M * 2);
    const bidx = [];
    for (let b = 0; b < B; b++) for (let j = 0; j < M; j++) {
      bside[(b * M + j) * 2] = -1; bside[(b * M + j) * 2 + 1] = 1;
      if (j < M - 1) { const a = (b * M + j) * 2, c2 = a + 2; bidx.push(a, a + 1, c2, a + 1, c2 + 1, c2); }
    }
    const boltGeo = new lt.BufferGeometry();
    boltGeo.setAttribute("position", new lt.BufferAttribute(bpos, 3).setUsage(lt.DynamicDrawUsage));
    boltGeo.setAttribute("aSide", new lt.BufferAttribute(bside, 1));
    boltGeo.setAttribute("aInt", new lt.BufferAttribute(bint, 1).setUsage(lt.DynamicDrawUsage));
    boltGeo.setIndex(new lt.BufferAttribute(new Uint16Array(bidx), 1));
    const bolts = add(new lt.Mesh(boltGeo, new lt.ShaderMaterial({
      uniforms: { uCol: { value: V3(cfg.boltColor) }, uHot: { value: V3(cfg.boltHot) }, uGain: { value: 6 } },
      vertexShader: "attribute float aSide, aInt; varying float vS, vI; void main(){ vS = aSide; vI = aInt; gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.); }",
      fragmentShader: `varying float vS, vI; uniform vec3 uCol, uHot; uniform float uGain;
        void main(){ float a = pow(max(1. - abs(vS), 0.), 1.5); gl_FragColor = vec4(mix(uCol, uHot, a * a) * a * vI * uGain, 1.); }`,
      side: lt.DoubleSide, ...additive,
    })), 23);
    const pts = Array.from({ length: M }, () => new lt.Vector3());
    function writeBolt(b, width, intensity) {
      const cp = camPos();
      for (let j = 0; j < M; j++) {
        const p = pts[j], pa = pts[Math.max(j - 1, 0)], pb = pts[Math.min(j + 1, M - 1)];
        tmp.subVectors(pb, pa);
        tmp2.subVectors(cp, p);
        const dist = tmp2.length();
        tmp.cross(tmp2).normalize();
        const u = j / (M - 1), taper = Math.max(.2, Math.pow(Math.sin(Math.PI * u), .6));
        const w = width * Math.min(4, Math.max(1, dist / 12)) * taper;
        const i0 = (b * M + j) * 2;
        bpos[i0 * 3] = p.x - tmp.x * w; bpos[i0 * 3 + 1] = p.y - tmp.y * w; bpos[i0 * 3 + 2] = p.z - tmp.z * w;
        bpos[i0 * 3 + 3] = p.x + tmp.x * w; bpos[i0 * 3 + 4] = p.y + tmp.y * w; bpos[i0 * 3 + 5] = p.z + tmp.z * w;
        bint[i0] = bint[i0 + 1] = intensity * taper;
      }
    }
    function hideBolt(b) { for (let j = 0; j < M * 2; j++) bint[b * M * 2 + j] = 0; }
    function hideAllBolts() { for (let b = 0; b < B; b++) hideBolt(b); boltGeo.attributes.aInt.needsUpdate = true; }
    // đoạn thẳng a→b có zigzag vuông góc (kiểu tia sét)
    function jag(a, b, sag) {
      tmp.subVectors(b, a);
      const len = tmp.length();
      tmp.normalize();
      tmp2.crossVectors(tmp, Math.abs(tmp.y) > .95 ? Z : Yup).normalize();
      axisU.crossVectors(tmp, tmp2).normalize();
      for (let j = 0; j < M; j++) {
        const t = j / (M - 1), e = sag * (.3 + .7 * Math.sin(Math.PI * t)) * (j === 0 || j === M - 1 ? 0 : 1);
        const r1 = (Math.random() - .5) * 2 * e, r2 = (Math.random() - .5) * 2 * e;
        pts[j].set(a.x + (b.x - a.x) * t + tmp2.x * r1 + axisU.x * r2, a.y + (b.y - a.y) * t + tmp2.y * r1 + axisU.y * r2,
          a.z + (b.z - a.z) * t + tmp2.z * r1 + axisU.z * r2);
      }
      return len;
    }

    // ---------------- giai đoạn nạp: cầu plasma + hạt hút vào + vòng xoay ----------------
    const ball = add(new lt.Mesh(new lt.IcosahedronGeometry(1, 3), new lt.ShaderMaterial({
      uniforms: { uTime: U.uTime, uInt: { value: 1 } },
      vertexShader: "varying vec3 vN, vV, vO; void main(){ vO = position; vN = normalize(normalMatrix * normal); vec4 wp = modelMatrix * vec4(position, 1.); vV = normalize(cameraPosition - wp.xyz); gl_Position = projectionMatrix * viewMatrix * wp; }",
      fragmentShader: `uniform float uTime, uInt; varying vec3 vN, vV, vO; ${BEAM_NOISE_GLSL}
        void main(){ float nv = abs(dot(normalize(vN), normalize(vV))); float rim = pow(1. - nv, 2.2);
          float n = fbm(vO * 2.4 + vec3(0., uTime * 5., uTime * 2.)); float n2 = fbm(vO * 5.5 - vec3(uTime * 7., 0., uTime * 3.));
          float heat = .55 + .9 * n + .5 * n2 + 1.4 * rim;
          vec3 col = mix(vec3(.5, .13, 1.), vec3(1., .88, 1.), smoothstep(.9, 1.7, heat));
          gl_FragColor = vec4(col * heat * uInt * 2.6, 1.); }`,
      side: lt.FrontSide, ...additive,
    })), 25);
    const ringMat = () => new lt.MeshBasicMaterial({ color: new lt.Color(), ...additive });
    const ringGeo = new lt.TorusGeometry(1, .035, 8, 64);
    const ringMeshes = [0, 1].map(() => add(new lt.Mesh(ringGeo, ringMat()), 21));
    const NP = 150;
    const pDir = Array.from({ length: NP }, () => new lt.Vector3(Math.random() - .5, Math.random() - .5, Math.random() - .5).normalize());
    const pPhase = Float32Array.from({ length: NP }, () => Math.random()), pSpeed = Float32Array.from({ length: NP }, () => rnd(.9, 1.7));
    const ppos = new Float32Array(NP * 3), pfade = new Float32Array(NP);
    const pointGeo = new lt.BufferGeometry();
    pointGeo.setAttribute("position", new lt.BufferAttribute(ppos, 3).setUsage(lt.DynamicDrawUsage));
    pointGeo.setAttribute("aFade", new lt.BufferAttribute(pfade, 1).setUsage(lt.DynamicDrawUsage));
    const inflow = add(new lt.Points(pointGeo, new lt.ShaderMaterial({
      uniforms: { uSize: { value: 1 } },
      vertexShader: "attribute float aFade; varying float vF; uniform float uSize; void main(){ vF = aFade; vec4 mv = viewMatrix * vec4(position, 1.); gl_PointSize = uSize * aFade * 420. / max(-mv.z, .5); gl_Position = projectionMatrix * mv; }",
      fragmentShader: "varying float vF; void main(){ vec2 p = gl_PointCoord - .5; float d = length(p) * 2.; if (d > 1.) discard; float a = pow(1. - d, 2.); gl_FragColor = vec4(vec3(.78, .38, 1.) * a * vF * 5., 1.); }",
      ...additive,
    })), 24);

    function billboard(mesh, pos, size) { mesh.position.copy(pos); mesh.quaternion.copy(game.camera.quaternion); mesh.scale.setScalar(size); }
    function frameClock(dt) { clock += dt; U.uTime.value = clock; }
    function lookDir(mesh, from, dir) { mesh.position.copy(from); mesh.quaternion.setFromUnitVectors(Z, dir); }

    function hide() {
      firing = false;
      for (const m of [core, plasma, glow, flareMouth, flareHit, hitDisc, ball, inflow, bolts, ...rings, ...ringMeshes]) m.visible = false;
      hideAllBolts();
    }
    hide();

    // ---- nạp: p = 0..1, aim = hướng từ miệng tới mục tiêu ----
    function charge(mouth, aim, p, dt) {
      frameClock(dt);
      firing = false;
      for (const m of [core, plasma, glow, flareHit, hitDisc, ...rings]) m.visible = false;
      const pulse = 1 + .08 * Math.sin(clock * 42), r = (.25 + 1.85 * p) * pulse;
      ball.visible = flareMouth.visible = inflow.visible = bolts.visible = true;
      ball.position.copy(mouth); ball.scale.setScalar(r);
      ball.material.uniforms.uInt.value = .6 + .8 * p;
      flareMouth.material.uniforms.uInt.value = (.5 + 1.5 * p) * cfg.intensity;
      billboard(flareMouth, mouth, r * (5 + 4 * p));
      // hạt hút vào miệng
      const R0 = 13 + 6 * p, shown = Math.floor(NP * Math.min(1, .15 + p));
      for (let i = 0; i < NP; i++) {
        const u = (pPhase[i] + clock * pSpeed[i] * .9) % 1, rad = R0 * Math.pow(1 - u, 1.6) + r * .9;
        ppos[i * 3] = mouth.x + pDir[i].x * rad; ppos[i * 3 + 1] = mouth.y + pDir[i].y * rad; ppos[i * 3 + 2] = mouth.z + pDir[i].z * rad;
        pfade[i] = i < shown ? Math.min(1, u * 5) * (.5 + .5 * u) : 0;
      }
      pointGeo.attributes.position.needsUpdate = true; pointGeo.attributes.aFade.needsUpdate = true;
      inflow.material.uniforms.uSize.value = .1 + .08 * p;
      // 2 vòng xoay vuông góc hướng bắn, co lại khi nạp đầy
      ringMeshes.forEach((m, k) => {
        m.visible = true;
        lookDir(m, mouth, aim);
        m.rotateZ(clock * (k ? -5.5 : 4));
        m.scale.setScalar((2.6 - 1.2 * p) * (k ? 1.35 : 1) * Math.max(.6, r));
        m.material.color.setRGB(2.2 * (.4 + p), .8 * (.4 + p), 3.4 * (.4 + p));
      });
      // sét ngắn nhảy quanh cầu
      regen += dt;
      if (regen > 1 / 28) {
        regen = 0;
        const n = 2 + Math.floor(p * 8);
        for (let b = 0; b < B; b++) {
          if (b >= n) { hideBolt(b); continue; }
          tmp2.set(Math.random() - .5, Math.random() - .5, Math.random() - .5).normalize();
          const start = mouth.clone().addScaledVector(tmp2, r * .85), end = mouth.clone().addScaledVector(tmp2, r * rnd(1.8, 3.6 + 3 * p));
          end.x += rnd(-.6, .6) * r; end.y += rnd(-.6, .6) * r;
          jag(start, end, r * .35);
          writeBolt(b, .05 + .03 * p, rnd(.5, 1.2) * (.5 + p));
        }
        boltGeo.attributes.position.needsUpdate = true; boltGeo.attributes.aInt.needsUpdate = true;
      }
      game.player?.addShake?.(.004 * p);
    }

    // ---- bắn: dir đã khoá, length theo raycast, hit = {point, normal, dist} hoặc null ----
    function fire(mouth, dir, length, hit, dt) {
      frameClock(dt);
      impactClock += dt;
      firing = true;
      const L = Math.max(.1, length), pulse = 1 + .1 * Math.sin(clock * 115);
      U.uLen.value = L;
      U.uEnd.value = hit ? 0 : 1;
      core.visible = plasma.visible = glow.visible = true;
      inflow.visible = ringMeshes[0].visible = ringMeshes[1].visible = false;
      const place = (mesh, radius) => {
        mesh.position.copy(mouth).addScaledVector(dir, L / 2);
        mesh.quaternion.setFromUnitVectors(Yup, dir);
        mesh.scale.set(radius * pulse, L, radius * pulse);
      };
      place(core, cfg.coreRadius); place(plasma, cfg.plasmaRadius); place(glow, cfg.glowRadius);
      core.material.uniforms.uInt.value = 5.6 * cfg.intensity;
      plasma.material.uniforms.uInt.value = 3.6 * cfg.intensity;
      glow.material.uniforms.uInt.value = 1.4 * cfg.intensity;
      // cầu + flare ở miệng
      ball.visible = true; ball.position.copy(mouth); ball.scale.setScalar(1.8 * pulse); ball.material.uniforms.uInt.value = 1.4 * cfg.intensity;
      flareMouth.visible = true; flareMouth.material.uniforms.uInt.value = (1.6 + .4 * Math.sin(clock * 60)) * cfg.intensity;
      billboard(flareMouth, mouth, 13 * pulse);
      // điểm chạm
      const hitting = !!hit;
      flareHit.visible = hitDisc.visible = rings[0].visible = rings[1].visible = hitting;
      if (hitting) {
        const pt = hit.point || tmp.copy(mouth).addScaledVector(dir, L), n = hit.normal && hit.normal.isVector3 ? hit.normal : Yup;
        tmp2.copy(pt).addScaledVector(n, .12);
        flareHit.material.uniforms.uInt.value = (1.8 + .6 * Math.sin(clock * 70)) * cfg.intensity;
        billboard(flareHit, tmp2.clone().addScaledVector(n, .5), 8.5 + 1.5 * Math.sin(clock * 50));
        hitDisc.position.copy(tmp2); hitDisc.quaternion.setFromUnitVectors(Z, n); hitDisc.scale.setScalar(7 + .8 * Math.sin(clock * 33));
        hitDisc.material.uniforms.uInt.value = 1.6 * cfg.intensity;
        rings.forEach((m, k) => {
          const u = (impactClock * 1.9 + k * .5) % 1;
          m.position.copy(tmp2); m.quaternion.setFromUnitVectors(Z, n); m.scale.setScalar(18);
          m.material.uniforms.uR.value = Math.max(.02, u); m.material.uniforms.uW.value = .06 + .08 * u;
          m.material.uniforms.uInt.value = 2.2 * cfg.intensity;
        });
      }
      // sét quấn quanh beam + nhánh tạt ra
      bolts.visible = true;
      regen += dt;
      if (regen > 1 / 28) {
        regen = 0;
        axisR.crossVectors(dir, Math.abs(dir.y) > .95 ? Z : Yup).normalize();
        axisU.crossVectors(axisR, dir).normalize();
        const a = new lt.Vector3(), b = new lt.Vector3();
        for (let k = 0; k < B; k++) {
          if (k < 7) {                                           // sét xoắn quanh thân
            const ph = Math.random() * 6.283, pitch = rnd(.18, .5) * (Math.random() < .5 ? -1 : 1), rad = rnd(.55, 1.5), seed = Math.random() * 6;
            for (let j = 0; j < M; j++) {
              const t = j / (M - 1), s = L * t, ang = ph + s * pitch, rr = rad * (.75 + .25 * Math.sin(s * .7 + seed)) * Math.min(1, t * 8) + rnd(-.18, .18);
              pts[j].copy(mouth).addScaledVector(dir, s).addScaledVector(axisR, Math.cos(ang) * rr).addScaledVector(axisU, Math.sin(ang) * rr);
            }
            writeBolt(k, .12, rnd(.7, 1.3));
          } else if (Math.random() < .85) {                       // nhánh tạt ra khỏi beam
            const s0 = L * rnd(.04, .98), ang = Math.random() * 6.283;
            a.copy(mouth).addScaledVector(dir, s0).addScaledVector(axisR, Math.cos(ang) * .5).addScaledVector(axisU, Math.sin(ang) * .5);
            b.copy(a).addScaledVector(axisR, Math.cos(ang) * rnd(2.5, 9)).addScaledVector(axisU, Math.sin(ang) * rnd(2.5, 9)).addScaledVector(dir, rnd(-2, 5));
            jag(a, b, rnd(.5, 1.1));
            writeBolt(k, rnd(.07, .12), rnd(.6, 1.2));
          } else hideBolt(k);
        }
        boltGeo.attributes.position.needsUpdate = true; boltGeo.attributes.aInt.needsUpdate = true;
      }
      // hạt + đèn + vết cháy
      game.fx?.beamJet?.(mouth, dir, { dt, length: L, scale: 1.8, hit: hit ? (hit.point || tmp.copy(mouth).addScaledVector(dir, L)) : null, normal: hit?.normal });
      const d = camPos().distanceTo(mouth);
      game.player?.addShake?.(cfg.shake * Math.max(0, 1 - d / 70));
    }

    return { charge, fire, hide, get firing() { return firing; } };
  }
