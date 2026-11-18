// LAN_CAMPAIGN_FULL
  const giganotosaurusData = /*@inline:data/giganotosaurus.json*/ null;

  const gigaPurpleColor = /*@inline:data/giga-purple-color.json*/ null;

  const gigaYellowColor = /*@inline:data/giga-yellow-color.json*/ null;
  const gigaWalkRig = /*@inline:data/giga-walk-rig.json*/ null;
  const gigaBiteRigData = /*@inline:data/giga-bite-rig.json*/ null;
  const gigaWalkData = { ...gigaBiteRigData, ...gigaWalkRig };
  const loadGigaYellowMaps = () => Promise.all([
    akGoldTexture(gigaYellowColor.base, lt.SRGBColorSpace),
    akGoldTexture(gigaYellowColor.emissive, lt.SRGBColorSpace),
  ]);
  const bossAnimationGeometries = new WeakMap();

  function createBossAnimationRig(data, material) {
    let geometry = bossAnimationGeometries.get(data);
    if (!geometry) {
      geometry = new lt.BufferGeometry();
      const attr = (name, key, Type, size, normalized = false) => {
        geometry.setAttribute(name, new lt.BufferAttribute(new Type(assetBytes(data[key])), size, normalized));
      };
      attr("position", "position", Float32Array, 3);
      attr("normal", "normal", Int16Array, 3, true);
      attr("uv", "uv", Uint16Array, 2, true);
      attr("skinIndex", "joints", Uint16Array, 4);
      attr("skinWeight", "weights", Uint16Array, 4, true);
      geometry.setIndex(new lt.BufferAttribute(new Uint32Array(assetBytes(data.index)), 1));
      bossAnimationGeometries.set(data, geometry);
    }
    const mesh = new lt.SkinnedMesh(geometry, material);
    mesh.castShadow = mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    return bindDefenseRig(data, mesh);
  }

  async function setupGiganotosaurus(game, { reinforcement = false, assets } = {}) {
    const [template, purpleMap, [yellowMap, yellowEmissive]] = await (assets || Promise.all([
      loadDefenseMesh(giganotosaurusData, true),
      akGoldTexture(gigaPurpleColor, lt.SRGBColorSpace),
      loadGigaYellowMaps(),
    ]));
    const mesh = template.clone();
    mesh.material = template.material.clone();
    const originalMap = mesh.material.map;
    const normalSize = 13;
    let purple = false, yellow = false, giant = false;
    let lightning;
    const emitAudio = (event, data) => {
      if (!reinforcement) game.events.emit(event, data);
    };
    const legacy = bindDefenseRig(giganotosaurusData, mesh);
    const { rig } = legacy;
    const biteRig = createBossAnimationRig(gigaBiteRigData, mesh.material);
    const walkRig = createBossAnimationRig(gigaWalkData, mesh.material);
    let activeRig = legacy;
    const biteHead = biteRig.rig.getObjectByName("HeadEnd");
    const biteJaw = biteRig.rig.getObjectByName("JawEnd");
    const model = new lt.Group();
    model.name = "giganotosaurus";
    model.scale.setScalar(normalSize);
    model.add(rig, biteRig.rig, walkRig.rig);
    walkRig.rig.visible = false;
    biteRig.rig.visible = false;
    const head = rig.getObjectByName("Head");
    const mouth = new lt.Object3D();
    // Head-local offset below the nose, between the upper and lower jaws.
    mouth.position.set(-.003, .114, .035);
    head.add(mouth);
    game.scene.add(model);

    const flameCount = 56;
    const flame = new lt.InstancedMesh(new lt.IcosahedronGeometry(1, 1),
      new lt.MeshBasicMaterial({ blending: lt.AdditiveBlending, transparent: true,
        opacity: .55, depthWrite: false, toneMapped: false }), flameCount);
    flame.frustumCulled = false;
    game.events.on("player:dead", () => {
      flame.visible = false;
      lightning?.hide();
      emitAudio("giga:reset");
    });
    flame.instanceMatrix.setUsage(lt.DynamicDrawUsage);
    game.scene.add(flame);

    const biteImpact = .56;
    const flameStart = 3.1, flameEnd = 6.1;
    // ---- Chỉnh tầm / phạm vi ở đây (gốc: detect 14, range 16, góc .27, scale 1, rộng .45) ----
    const detectRange = 32, giantDetectRange = 64;          // tầm phát hiện: cách người chơi bao xa (m) thì nó dừng lại gầm + phun lửa
    const range = 34, giantRange = 62;                // tầm bắn lửa tối đa (m)
    const coneSlope = Math.tan(.42); // độ loe của nón lửa (góc nửa nón ~24°), cả hiệu ứng lẫn vùng gây sát thương
    const flameScale = 1.6;          // kích thước hạt lửa (hiệu ứng hình ảnh)
    const hitWidth = 1.2;            // độ rộng vùng gây sát thương ngay tại miệng (m)
    const forward = new W(), origin = new W(), aim = new W(), delta = new W();
    const side = new W(), up = new W(), point = new W(), target = new W();
    const facing = new W();
    const footPosition = new W();
    const footfalls = [
      [.19, walkRig.rig.getObjectByName("foot_R")],
      [.89, walkRig.rig.getObjectByName("foot_L")],
    ];
    const matrix = new lt.Matrix4();
    const color = new lt.Color();
    const ray = new lt.Ray();
    const hit = new W();
    const spheres = [
      { bone: rig.getObjectByName("Spine_2001"), radius: 1.65 },
      { bone: rig.getObjectByName("Hips"), radius: 1.55 },
      { bone: head, radius: 1.1 },
    ].map(part => ({ ...part, sphere: new lt.Sphere(new W(), part.radius) }));
    const biteSpheres = ["Spine2", "Hips", "Head"].map((name, index) => ({
      bone: biteRig.rig.getObjectByName(name), radius: spheres[index].radius, sphere: new lt.Sphere(new W()),
    }));
    const walkSpheres = ["spine2", "pelvis", "head"].map((name, index) => ({
      bone: walkRig.rig.getObjectByName(name), radius: spheres[index].radius, sphere: new lt.Sphere(new W()),
    }));
    const walkMouth = new lt.Object3D();
    walkMouth.position.set(0, -.025, .10);
    walkRig.rig.getObjectByName("head").add(walkMouth);
    const mouthAt = () => (activeRig === walkRig ? walkMouth : mouth).getWorldPosition(origin);
    const currentSpheres = () => activeRig === biteRig ? biteSpheres : activeRig === walkRig ? walkSpheres : spheres;
    const particles = Array.from({ length: flameCount }, (_, index) => {
      const angle = index * 2.399963;
      const spread = .22 + (index % 9) / 12;
      return { x: Math.cos(angle) * spread, y: Math.sin(angle) * spread, phase: index / flameCount };
    });

    let state, cooldown, repath, path, waypoint, action, corpseTime, corpseSeconds;
    const enemy = {
      type: "giganotosaurus", pos: model.position, alive: false, hp: 0, maxHp: 0,
      damage(amount, impact) {
        if (!this.alive || !(amount > 0) || state === "intro") return false;
        this.hp = Math.max(0, this.hp - amount);
        game.events.emit("enemy:hit", { enemy: this, pos: impact, damage: amount });
        if (this.hp) return false;
        this.alive = false;
        flame.visible = false;
        state = "dying";
        play("Death");
        emitAudio("giga:breath", { active: false });
        emitAudio("giga:motion", { moving: false });
        emitAudio("giga:death", { pos: mouthAt() });
        game.events.emit("enemy:killed", { enemy: this, pos: this.pos, type: this.type });
        return true;
      },
    };

    let lanClip, lanSerial = 0;
    function play(name) {
      lanClip = name;
      lanSerial++;
      activeRig.mixer.stopAllAction();
      activeRig = name === "Bite" ? biteRig : name === "Walk" ? walkRig : legacy;
      lightning?.hide();
      rig.visible = activeRig === legacy;
      biteRig.rig.visible = activeRig === biteRig;
      walkRig.rig.visible = activeRig === walkRig;
      action = activeRig.actions.get(name).reset();
      const loop = name === "Walk";
      action.setLoop(loop ? lt.LoopRepeat : lt.LoopOnce, loop ? Infinity : 1);
      action.clampWhenFinished = !loop;
      action.play();
      activeRig.mixer.update(0);
    }

    function cast(origin, direction, maxDistance) {
      const hit = game.physics.raycast(origin, direction, maxDistance);
      return game.level.raycastArena?.(origin, direction, hit?.dist ?? maxDistance) || hit;
    }

    function face(direction, dt) {
      const desired = Math.atan2(direction.x, direction.z);
      const angle = desired - model.rotation.y;
      model.rotation.y += lt.MathUtils.clamp(Math.atan2(Math.sin(angle), Math.cos(angle)), -2.6 * dt, 2.6 * dt);
    }

    function breathe(dt) {
      mouthAt();
      if (!yellow) emitAudio("giga:breath", { active: true, pos: origin });
      forward.copy(facing).normalize();
      // Follow the animated mouth while keeping the shot aimed at the spot
      // telegraphed when Roar began.
      forward.y = lt.MathUtils.clamp((aim.y - origin.y) / Math.max(5, origin.distanceTo(aim)), -.75, .18);
      forward.normalize();
      side.crossVectors(forward, lt.Object3D.DEFAULT_UP).normalize();
      up.crossVectors(side, forward).normalize();
      const limit = giant ? giantRange : range;
      const shot = cast(origin, forward, limit);
      const length = shot?.dist ?? limit;
      const elapsed = action.time - flameStart;
      const reach = Math.min(length, .8 + elapsed * 36);
      if (yellow) {
        flame.visible = false;
        if (reach > .05) {
          lightning ||= createSpinoBeamFx(game, true, true);
          lightning.fire(origin, forward, reach, shot && reach >= length - .01 ? shot : null, dt);
        }
      } else {
        flame.visible = true;
        const jet = game.fx?.flameJet;
        if (jet) {
          // AAA flame: rendered by the FX particle engine (lobes + glow + embers + smoke + light).
          flame.count = 0;
          const blocked = shot && length < limit - .2 && reach >= length - .01;
          jet(origin, forward, {
            dt, reach, slope: coneSlope, scale: flameScale, purple,
            hit: blocked ? point.copy(origin).addScaledVector(forward, length) : null,
            normal: shot?.normal,
          });
        } else particles.forEach((p, index) => {
          const t = (p.phase + elapsed * 2.2) % 1;
          const distance = t * reach;
          const width = distance * coneSlope;
          point.copy(origin).addScaledVector(forward, distance)
            .addScaledVector(side, p.x * width).addScaledVector(up, p.y * width);
          const radius = (.13 + .49 * t) * (1 - .3 * t * t);
          matrix.makeScale(radius, radius, radius).setPosition(point);
          flame.setMatrixAt(index, matrix);
          if (purple) color.setRGB(.65 + .35 * (1 - t), .15 + .45 * (1 - t), 1);
          else color.setRGB(1, .1 + .78 * (1 - t), .025 + .24 * (1 - t) ** 3);
          flame.setColorAt(index, color);
        });
        if (!jet) {
          flame.instanceMatrix.needsUpdate = true;
          flame.instanceColor.needsUpdate = true;
        }
      }

      game.woodAnkylos?.cone(origin, forward, reach, hitWidth, coneSlope, 34 * dt);
      const player = game.lan?.target(model.position) || game.player;
      target.copy(player.pos);
      target.y += .9;
      delta.subVectors(target, origin);
      const depth = delta.dot(forward);
      const distance = delta.length();
      if (depth > 0 && depth <= reach &&
          distance * distance - depth * depth <= (hitWidth + depth * coneSlope) ** 2 &&
          !cast(origin, delta.normalize(), distance)) player.damage(34 * dt, origin);
    }

    function bite() {
      const player = game.lan?.target(model.position) || game.player;
      biteHead.getWorldPosition(origin).lerp(biteJaw.getWorldPosition(point), .4);
      const scale = giant ? 2 : 1;
      target.copy(player.pos);
      target.y += .9;
      point.subVectors(target, origin);
      const distance = point.length();
      forward.set(Math.sin(model.rotation.y), 0, Math.cos(model.rotation.y));
      game.woodAnkylos?.bite(origin, model.position, forward, scale, 32);
      const depth = point.dot(forward);
      const lateral = Math.abs(point.x * forward.z - point.z * forward.x);
      const underHead = target.distanceToSquared(model.position) < (2.9 * scale) ** 2;
      if (!player.alive || distance < .001 || Math.abs(point.y) > 4.1 * scale ||
          (!underHead && (depth < -2.2 * scale || depth > 3.3 * scale || lateral > 3.65 * scale))) return;
      if (!cast(origin, point.multiplyScalar(1 / distance), distance)) {
        player.damage(32, origin);
      }
    }

    function reset() {
      model.visible = flame.visible = enemy.alive = false;
      activeRig.mixer.stopAllAction();
      state = "ready";
      purple = yellow = giant = false;
      lightning?.hide();
      emitAudio("giga:reset");
    }
    reset();

    return {
      reset,
      // SPINO_BOUND_GIGA_DEATH_V1: scripted cleanup also applies during the spawn intro.
      endWithSpino() {
        if (!enemy.alive) return;
        state = "move";
        enemy.damage(enemy.hp, enemy.pos);
      },

      lanSnapshot() {
        if (!model.visible) return null;
        return [model.position.toArray(), model.rotation.y, state, enemy.hp,
          lanClip, action?.time ?? 0, lanSerial, [purple ? 'purple' : yellow ? 'yellow' : 'normal', giant, enemy.maxHp]];
      },
      lanApply(snapshot) {
        if (!snapshot) { if (model.visible) reset(); return; }
        const [pos, yaw, nextState, hp, clip, time, serial, extra] = snapshot;
        if (!model.visible || purple !== (extra[0] === "purple") ||
            yellow !== (extra[0] === "yellow") || giant !== extra[1]) {
          this.start(model.position.fromArray(pos), extra[2], { variant: extra[0], giant: extra[1], replica: true });
          lanSerial = -1;
        }
        model.visible = true;
        model.position.fromArray(pos);
        model.rotation.y = yaw;
        state = nextState;
        enemy.hp = hp;
        enemy.alive = hp > 0;
        if (clip) {
          if (lanClip !== clip || lanSerial !== serial) play(clip);
          action.time = time;
          activeRig.mixer.update(0);
        }
        lanSerial = serial;
      },
      get available() { return state === "ready" || (state === "done" && !model.visible); },
      get invulnerable() { return state === "intro"; },
      get alive() { return enemy.alive; },
      get sentryTarget() {
        return enemy.alive && state !== "intro" ? { enemy: enemy, aimAt: out => currentSpheres()[0].bone.getWorldPosition(out) } : null;
      },
      get started() { return state !== "ready"; },
      get purple() { return purple; },
      get position() { return model.position; },
      get done() { return state === "done"; },
      get biting() { return state === "bite"; },
      get burning() { return flame.visible; },
      get windingUp() { return state === "roar" && action.time < flameStart; },
      get health() { return enemy.hp; },
      get maxHealth() { return enemy.maxHp; },
      start(position, health, { variant = "normal", giant: large = false, corpse = Infinity, replica = false } = {}) {
        purple = variant === "purple";
        yellow = variant === "yellow";
        giant = large;
        corpseSeconds = corpse;
        corpseTime = 0;
        model.scale.setScalar(normalSize * (giant ? 2 : 1));
        mesh.material.map = yellow ? yellowMap : purple ? purpleMap : originalMap;
        mesh.material.emissiveMap = yellow ? yellowEmissive : null;
        mesh.material.emissive.setHex(yellow ? 0xffffff : 0);
        mesh.material.emissiveIntensity = yellow ? .85 : 1;
        mesh.material.needsUpdate = true;
        flame.visible = false;
        model.position.copy(position);
        model.rotation.y = Math.atan2(game.player.pos.x - position.x, game.player.pos.z - position.z);
        model.visible = enemy.alive = true;
        enemy.hp = enemy.maxHp = health;
        state = "intro";
        cooldown = 1;
        path = [];
        repath = waypoint = 0;
        play("Roar");
        if (replica) return;
        game.events.emit("giga:roar", { pos: mouthAt() });
        game.events.emit("enemy:spawn", { enemy });
      },
      raycast(start, direction, maxDistance) {
        if (!enemy.alive || state === "intro") return null;
        ray.set(start, direction);
        let closest = null;
        for (const { bone, radius, sphere } of currentSpheres()) {
          sphere.radius = radius * (giant ? 2 : 1);
          bone.getWorldPosition(sphere.center);
          if (!ray.intersectSphere(sphere, hit)) continue;
          const dist = start.distanceTo(hit);
          if (dist > (closest?.dist ?? maxDistance)) continue;
          closest = { dist, point: hit.clone(), normal: hit.clone().sub(sphere.center).normalize(),
            enemy, part: "body" };
        }
        return closest;
      },
      update(dt) {
        if (!model.visible) return;
        if (state === "done") {
          if ((corpseTime += dt) >= corpseSeconds) model.visible = false;
          return;
        }
        const previousTime = action.time;
        if (state !== "walk") activeRig.mixer.update(dt);
        if (state === "dying") {
          if (action.time >= action.getClip().duration - .001) state = "done";
          return;
        }
        if (state === "intro") {
          if (action.time >= action.getClip().duration - .001) {
            state = "walk";
            play("Walk");
          }
          return;
        }
        if (state === "bite") {
          if (previousTime < biteImpact && action.time >= biteImpact) bite();
          if (action.time >= action.getClip().duration - .001) {
            state = "walk";
            cooldown = 1.1;
            repath = 0;
            play("Walk");
          }
          return;
        }
        if (state === "roar") {
          flame.visible = false;
          if (action.time >= flameStart && action.time < flameEnd) breathe(dt);
          else {
            lightning?.hide();
            if (!yellow) emitAudio("giga:breath", { active: false });
          }
          if (action.time >= action.getClip().duration - .001) {
            state = "walk";
            cooldown = 2;
            repath = 0;
            play("Walk");
          }
          return;
        }
        if (state !== "walk") return;
        cooldown -= dt;
        repath -= dt;
        const player = game.lan?.target(model.position) || game.player;
        target.copy(player.pos);
        target.y += .9;
        delta.subVectors(target, model.position);
        delta.y = 0;
        const biteRange = giant ? 13 : 6.5;
        const close = delta.lengthSq() <= biteRange ** 2;
        if (cooldown <= 0 && delta.lengthSq() <= (giant ? giantDetectRange : detectRange) ** 2) {
          face(delta, dt);
          mouthAt();
          point.subVectors(target, origin);
          const distance = point.length();
          forward.set(Math.sin(model.rotation.y), 0, Math.cos(model.rotation.y));
          if ((delta.lengthSq() < 9 || delta.normalize().dot(forward) > .97) && !cast(origin, point.normalize(), distance)) {
            if (close) {
              state = "bite";
              play("Bite");
              game.events.emit("giga:bite", { pos: biteHead.getWorldPosition(origin) });
              emitAudio("giga:motion", { moving: false });
              return;
            }
            aim.copy(target);
            facing.copy(forward);
            state = "roar";
            play("Roar");
            emitAudio("giga:motion", { moving: false });
            emitAudio("giga:roar", { pos: mouthAt() });
            return;
          }
        }
        if (repath <= 0) {
          path = game.physics.nav.findPath(model.position, player.pos) || [];
          waypoint = 0;
          repath = .35;
        }
        const next = path[waypoint];
        let moving = false;
        if (next) {
          delta.subVectors(next, model.position);
          delta.y = 0;
          const distance = delta.length();
          if (distance <= .15) {
            waypoint++;
          } else {
            face(delta, dt);
            if (model.position.distanceToSquared(player.pos) > (biteRange - .5) ** 2) {
              model.position.addScaledVector(delta, Math.min(distance, 3.8 * dt) / distance);
              moving = true;
            }
          }
        }
        emitAudio("giga:motion", { moving, pos: model.position });
        if (!moving) return;
        walkRig.mixer.update(dt);
        const now = action.time;
        for (const [at, bone] of footfalls) {
          if (now >= previousTime ? at > previousTime && at <= now : at > previousTime || at <= now) {
            emitAudio("giga:step", { pos: bone.getWorldPosition(footPosition) });
          }
        }
      },
    };
  }
