  const giganotosaurusData = /*@inline:data/giganotosaurus.json*/ null;

  const gigaPurpleColor = /*@inline:data/giga-purple-color.json*/ null;

  const gigaBiteClip = /*@inline:data/giga-bite.json*/ null;

  async function setupGiganotosaurus(game, { reinforcement = false, assets } = {}) {
    const [template, purpleMap] = await (assets || Promise.all([
      loadDefenseMesh(giganotosaurusData, true),
      akGoldTexture(gigaPurpleColor, lt.SRGBColorSpace),
    ]));
    const mesh = template.clone();
    mesh.material = template.material.clone();
    const originalMap = mesh.material.map;
    const normalSize = 13;
    let purple = false;
    const emitAudio = (event, data) => {
      if (!reinforcement) game.events.emit(event, data);
    };
    const { rig, mixer, actions } = bindDefenseRig({ ...giganotosaurusData, clips: [...giganotosaurusData.clips, gigaBiteClip] }, mesh);
    const model = new lt.Group();
    model.name = "giganotosaurus";
    model.scale.setScalar(normalSize);
    model.add(rig);
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
      emitAudio("giga:reset");
    });
    flame.instanceMatrix.setUsage(lt.DynamicDrawUsage);
    game.scene.add(flame);

    const biteImpact = .5;
    const flameStart = 3.1, flameEnd = 6.1;
    // ---- Chỉnh tầm / phạm vi ở đây (gốc: detect 14, range 16, góc .27, scale 1, rộng .45) ----
    const detectRange = 32;          // tầm phát hiện: cách người chơi bao xa (m) thì nó dừng lại gầm + phun lửa
    const range = 34;                // tầm bắn lửa tối đa (m)
    const coneSlope = Math.tan(.42); // độ loe của nón lửa (góc nửa nón ~24°), cả hiệu ứng lẫn vùng gây sát thương
    const flameScale = 1.6;          // kích thước hạt lửa (hiệu ứng hình ảnh)
    const hitWidth = 1.2;            // độ rộng vùng gây sát thương ngay tại miệng (m)
    const forward = new W(), origin = new W(), aim = new W(), delta = new W();
    const side = new W(), up = new W(), point = new W(), target = new W();
    const facing = new W();
    const footPosition = new W();
    const footfalls = [
      [0.28, rig.getObjectByName("Back_Leg_Foot_R")],
      [2.2, rig.getObjectByName("Back_Leg_Foot_L")],
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
    const particles = Array.from({ length: flameCount }, (_, index) => {
      const angle = index * 2.399963;
      const spread = .22 + (index % 9) / 12;
      return { x: Math.cos(angle) * spread, y: Math.sin(angle) * spread, phase: index / flameCount };
    });

    let state, cooldown, repath, path, waypoint, action;
    const enemy = {
      type: "giganotosaurus", pos: model.position, alive: false, hp: 0, maxHp: 0,
      damage(amount, impact) {
        if (!this.alive || !(amount > 0)) return false;
        this.hp = Math.max(0, this.hp - amount);
        game.events.emit("enemy:hit", { enemy: this, pos: impact, damage: amount });
        if (this.hp) return false;
        this.alive = false;
        flame.visible = false;
        state = "dying";
        play("Death");
        emitAudio("giga:breath", { active: false });
        emitAudio("giga:motion", { moving: false });
        emitAudio("giga:death", { pos: mouth.getWorldPosition(origin) });
        game.events.emit("enemy:killed", { enemy: this, pos: this.pos, type: this.type });
        return true;
      },
    };

    function play(name) {
      mixer.stopAllAction();
      action = actions.get(name).reset();
      const loop = name === "Walk";
      action.setLoop(loop ? lt.LoopRepeat : lt.LoopOnce, loop ? Infinity : 1);
      action.clampWhenFinished = !loop;
      action.play();
      mixer.update(0);
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
      mouth.getWorldPosition(origin);
      emitAudio("giga:breath", { active: true, pos: origin });
      forward.copy(facing).normalize();
      // Follow the animated mouth while keeping the shot aimed at the spot
      // telegraphed when Roar began.
      forward.y = lt.MathUtils.clamp((aim.y - origin.y) / Math.max(5, origin.distanceTo(aim)), -.75, .18);
      forward.normalize();
      side.crossVectors(forward, lt.Object3D.DEFAULT_UP).normalize();
      up.crossVectors(side, forward).normalize();
      const shot = cast(origin, forward, range);
      const length = shot?.dist ?? range;
      const elapsed = action.time - flameStart;
      const reach = Math.min(length, .8 + elapsed * 36);
      flame.visible = true;
      const jet = game.fx?.flameJet;
      if (jet) {
        // AAA flame: rendered by the FX particle engine (lobes + glow + embers + smoke + light).
        flame.count = 0;
        const blocked = shot && length < range - .2 && reach >= length - .01;
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

      const player = game.player;
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
      const player = game.player;
      mouth.getWorldPosition(origin);
      const scale = purple && !reinforcement ? 2 : 1;
      target.copy(player.pos);
      target.y += .9;
      point.subVectors(target, origin);
      const distance = point.length();
      if (!player.alive || Math.hypot(point.x, point.z) > 2 * scale ||
          Math.abs(point.y) > 3.1 * scale || distance < .001) return;
      if (!cast(origin, point.multiplyScalar(1 / distance), distance)) {
        player.damage(32, origin);
      }
    }

    function reset() {
      model.visible = flame.visible = enemy.alive = false;
      mixer.stopAllAction();
      state = "ready";
      purple = false;
      emitAudio("giga:reset");
    }
    reset();

    return {
      reset,
      get started() { return state !== "ready"; },
      get purple() { return purple; },
      get done() { return state === "done"; },
      get biting() { return state === "bite"; },
      get burning() { return flame.visible; },
      get windingUp() { return state === "roar" && action.time < flameStart; },
      get health() { return enemy.hp; },
      get maxHealth() { return enemy.maxHp; },
      start(position, health, { purpleBoss = false } = {}) {
        purple = purpleBoss;
        model.scale.setScalar(normalSize * (purple && !reinforcement ? 2 : 1));
        mesh.material.map = purple ? purpleMap : originalMap;
        flame.visible = false;
        model.position.copy(position);
        model.rotation.y = Math.atan2(game.player.pos.x - position.x, game.player.pos.z - position.z);
        model.visible = enemy.alive = true;
        enemy.hp = enemy.maxHp = health;
        state = "walk";
        cooldown = 1;
        path = [];
        repath = waypoint = 0;
        play("Walk");
        game.events.emit("enemy:spawn", { enemy });
      },
      raycast(start, direction, maxDistance) {
        if (!enemy.alive) return null;
        ray.set(start, direction);
        let closest = null;
        for (const { bone, radius, sphere } of spheres) {
          sphere.radius = radius * (purple && !reinforcement ? 2 : 1);
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
        const previousTime = action.time;
        if (state !== "walk") mixer.update(dt);
        if (state === "dying") {
          if (action.time >= action.getClip().duration - .001) state = "done";
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
          else emitAudio("giga:breath", { active: false });
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
        const player = game.player;
        target.copy(player.pos);
        target.y += .9;
        delta.subVectors(target, model.position);
        delta.y = 0;
        const biteRange = purple && !reinforcement ? 11 : 5.5;
        const close = delta.lengthSq() <= biteRange ** 2;
        if (cooldown <= 0 && delta.lengthSq() <= detectRange ** 2) {
          face(delta, dt);
          mouth.getWorldPosition(origin);
          point.subVectors(target, origin);
          const distance = point.length();
          forward.set(Math.sin(model.rotation.y), 0, Math.cos(model.rotation.y));
          if (delta.normalize().dot(forward) > .97 && !cast(origin, point.normalize(), distance)) {
            if (close) {
              state = "bite";
              play("Bite");
              emitAudio("giga:motion", { moving: false });
              return;
            }
            aim.copy(target);
            facing.copy(forward);
            state = "roar";
            play("Roar");
            emitAudio("giga:motion", { moving: false });
            emitAudio("giga:roar", { pos: mouth.getWorldPosition(origin) });
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
        mixer.update(dt);
        const now = action.time;
        for (const [at, bone] of footfalls) {
          if (now >= previousTime ? at > previousTime && at <= now : at > previousTime || at <= now) {
            emitAudio("giga:step", { pos: bone.getWorldPosition(footPosition) });
          }
        }
      },
    };
  }
