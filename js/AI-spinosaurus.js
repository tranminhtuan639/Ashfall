  const spinosaurusData = /*@inline:data/spinosaurus.json*/ null;

  async function setupSpinosaurus(game) {
    const mesh = await loadDefenseMesh(spinosaurusData, true);
    const { rig, mixer, actions } = bindDefenseRig(spinosaurusData, mesh);
    const model = new lt.Group();
    model.name = "spinosaurus";
    model.add(rig);
    // Match 1.5 times the normal Giga's nose-to-tail length.
    model.scale.setScalar(19);
    game.scene.add(model);

    const nose = rig.getObjectByName("Nose");
    const chin = rig.getObjectByName("Chin_Tip");
    const mouth = new W(), lowerJaw = new W(), target = new W(), direction = new W();
    const locked = new W(), offset = new W(), up = new W(0, 1, 0);
    const beam = new lt.Group();
    const tube = new lt.CylinderGeometry(1, 1, 1, 12, 1, true);
    function energyMaterial(color, opacity) {
      return new lt.MeshBasicMaterial({ color, opacity, transparent: true,
        blending: lt.AdditiveBlending, depthWrite: false, toneMapped: false });
    }
    const core = new lt.Mesh(tube, energyMaterial(0xdfffff, .95));
    const halo = new lt.Mesh(tube, energyMaterial(0x5279ff, .45));
    beam.add(core, halo);
    const arcVertices = new lt.BufferAttribute(new Float32Array(3 * 17 * 3), 3);
    for (let i = 0; i < 3; i++) {
      const arc = new lt.Line(new lt.BufferGeometry(), new lt.LineBasicMaterial({ color: i === 0 ? 0xd0faff : 0x8580ff,
        transparent: true, opacity: .9, blending: lt.AdditiveBlending, depthWrite: false, toneMapped: false }));
      // Each line reads its own section of the shared vertex buffer.
      const geometry = arc.geometry;
      geometry.setAttribute("position", arcVertices);
      geometry.setDrawRange(i * 17, 17);
      arc.frustumCulled = false;
      beam.add(arc);
    }
    const charge = new lt.Mesh(new lt.IcosahedronGeometry(1, 2), energyMaterial(0x8ee6ff, .85));
    game.scene.add(beam, charge);

    const ray = new lt.Ray(), hitPoint = new W();
    const hitboxes = [["Hips", 2.9], ["Spine_2001", 3.5], ["Head", 2.1], ["Nose", 1.35]]
      .map(([name, radius]) => ({ bone: rig.getObjectByName(name), sphere: new lt.Sphere(new W(), radius) }));
    const footfalls = [
      [.5, rig.getObjectByName("Back_Leg_Foot_R")],
      [2.3, rig.getObjectByName("Back_Leg_Foot_L")],
    ];
    const foot = new W();
    const audio = (cue, pos = mouth, variant = 0) => game.events.emit("spino:audio", { cue, pos, variant });
    let roarVariant = 0;
    const beamOn = 3.71, beamOff = 5.85;
    let state, action, cooldown, nextBeam, path, waypoint, repath, summon;
    const enemy = {
      type: "spinosaurus", pos: model.position, alive: false, hp: 0,
      damage(amount, point) {
        if (!this.alive || !(amount > 0) || state === "intro") return false;
        this.hp = Math.max(0, this.hp - amount);
        game.events.emit("enemy:hit", { enemy: this, pos: point, damage: amount });
        if (this.hp) return false;
        this.alive = false;
        hideEnergy();
        state = "dying";
        play("Death");
        audio("stop");
        updateMouth();
        audio("death");
        game.events.emit("enemy:killed", { enemy: this, pos: this.pos, type: this.type });
        return true;
      },
    };

    function play(name) {
      const next = actions.get(name);
      if (next === action && next.isRunning()) return;
      mixer.stopAllAction();
      action = next.reset();
      const loop = name === "Idle" || name === "Walk";
      action.setLoop(loop ? lt.LoopRepeat : lt.LoopOnce, loop ? Infinity : 1);
      action.clampWhenFinished = !loop;
      action.play();
      mixer.update(0);
    }
    function hideEnergy() { beam.visible = charge.visible = false; }
    game.events.on("player:dead", () => { hideEnergy(); audio("stop"); });
    function updateMouth() {
      nose.getWorldPosition(mouth);
      chin.getWorldPosition(lowerJaw);
      mouth.lerp(lowerJaw, .26);
    }
    function cast(origin, dir, range) {
      const hit = game.physics.raycast(origin, dir, range);
      return game.level.raycastArena?.(origin, dir, hit?.dist ?? range) || hit;
    }
    function lookAtPlayer(dt) {
      const desired = Math.atan2(target.x - model.position.x, target.z - model.position.z);
      const angle = desired - model.rotation.y;
      const turn = Math.atan2(Math.sin(angle), Math.cos(angle));
      model.rotation.y += lt.MathUtils.clamp(turn, -2.4 * dt, 2.4 * dt);
      return Math.abs(turn) < .2;
    }
    function damageInJet(dir, reach, radius, slope, damage, dt) {
      offset.subVectors(target, mouth);
      const depth = offset.dot(dir);
      const distance = offset.length();
      if (depth > 0 && depth <= reach &&
          distance * distance - depth * depth <= (radius + depth * slope) ** 2 &&
          !cast(mouth, offset.normalize(), distance)) game.player.damage(damage * dt, mouth);
    }
    function fireBeam(dt) {
      const length = cast(mouth, locked, 48)?.dist ?? 48;
      beam.visible = length > .02;
      charge.visible = true;
      charge.position.copy(mouth);
      charge.scale.setScalar(.58 + .09 * Math.sin(action.time * 91));
      beam.position.copy(mouth);
      beam.quaternion.setFromUnitVectors(up, locked);
      const pulse = 1 + .11 * Math.sin(action.time * 115);
      core.position.y = halo.position.y = length / 2;
      core.scale.set(.22 * pulse, length, .22 * pulse);
      halo.scale.set(.65 * pulse, length, .65 * pulse);
      for (let line = 0; line < 3; line++) {
        for (let step = 0; step <= 16; step++) {
          const t = step / 16, amp = .58 * Math.sin(t * Math.PI);
          const phase = action.time * 61 + line * 2.1 + step * 2.6;
          arcVertices.setXYZ(line * 17 + step, amp * Math.sin(phase), length * t, amp * Math.cos(phase * 1.3));
        }
      }
      arcVertices.needsUpdate = true;
      damageInJet(locked, length, .82, 0, 48, dt);
    }
    function reset() {
      mixer.stopAllAction();
      action = null;
      state = "ready";
      enemy.alive = model.visible = false;
      hideEnergy();
      audio("stop");
    }
    reset();
    return {
      reset,
      get started() { return state !== "ready"; },
      get done() { return state === "done"; },
      get health() { return enemy.hp; },
      get status() {
        if (state === "intro") return " · Đang gọi viện";
        if (state === "beam") return beam.visible ? " · Đang bắn sét!" : action.time < beamOn ? " · Đang nạp sét!" : "";
        return state === "fire" ? " · Phun lửa tím!" : "";
      },
      start(position, onSummon) {
        summon = onSummon;
        model.position.copy(position);
        model.rotation.y = Math.atan2(game.player.pos.x - position.x, game.player.pos.z - position.z);
        enemy.hp = 6000;
        model.visible = enemy.alive = true;
        cooldown = 1;
        repath = waypoint = 0;
        path = [];
        nextBeam = true;
        state = "intro";
        play("Roar");
        updateMouth();
        audio("roar");
        roarVariant = 1;
        game.events.emit("enemy:spawn", { enemy });
      },
      raycast(origin, dir, range) {
        if (!enemy.alive || state === "intro") return null;
        ray.set(origin, dir);
        let nearest = null;
        for (const { bone, sphere } of hitboxes) {
          bone.getWorldPosition(sphere.center);
          if (!ray.intersectSphere(sphere, hitPoint)) continue;
          const dist = origin.distanceTo(hitPoint);
          if (dist > (nearest?.dist ?? range)) continue;
          nearest = { dist, point: hitPoint.clone(), normal: hitPoint.clone().sub(sphere.center).normalize(),
            enemy, part: "body" };
        }
        return nearest;
      },
      update(dt) {
        if (state === "ready" || state === "done") return;
        const previous = action.time;
        mixer.update(dt);
        const finished = action.time >= action.getClip().duration - .001;
        target.copy(game.player.pos).setY(game.player.pos.y + .95);
        updateMouth();
        if (state === "intro") {
          if (finished) {
            summon(model.position);
            state = "move";
            play("Idle");
          }
          return;
        }
        if (state === "dying") {
          if (finished) state = "done";
          return;
        }
        if (state === "beam") {
          if (action.time < beamOn) {
            lookAtPlayer(dt);
            updateMouth();
            charge.visible = action.time >= 1.2;
            charge.position.copy(mouth);
            charge.scale.setScalar(.18 + .38 * lt.MathUtils.smoothstep(action.time, 1.2, beamOn));
          } else if (action.time < beamOff) {
            if (previous < beamOn) {
              locked.subVectors(target, mouth).normalize();
              audio("ignite");
            }
            audio("beam");
            fireBeam(dt);
          } else {
            if (previous < beamOff) audio("tail");
            hideEnergy();
          }
        } else if (state === "fire" && action.time >= 3.1 && action.time < 6.15) {
          direction.subVectors(target, mouth);
          direction.set(Math.sin(model.rotation.y), lt.MathUtils.clamp(direction.y / Math.max(6, direction.length()), -.7, .2),
            Math.cos(model.rotation.y)).normalize();
          const hit = cast(mouth, direction, 35);
          const reach = Math.min(hit?.dist ?? 35, .8 + (action.time - 3.1) * 36);
          game.fx?.flameJet?.(mouth, direction, { dt, reach, purple: true, scale: 1.75, slope: .38,
            hit: hit && reach >= hit.dist - .01 ? hit.point : null, normal: hit?.normal });
          damageInJet(direction, reach, 1.3, .38, 34, dt);
        }
        if (state !== "move") {
          if (finished) {
            hideEnergy();
            state = "move";
            cooldown = 2.4;
            repath = 0;
            play("Idle");
          }
          return;
        }

        cooldown -= dt;
        const distance = model.position.distanceTo(game.player.pos);
        const aimed = lookAtPlayer(dt);
        direction.subVectors(target, mouth);
        const clear = !cast(mouth, direction.clone().normalize(), direction.length());
        if (cooldown <= 0 && aimed && distance < (nextBeam ? 44 : 33) && clear) {
          state = nextBeam ? "beam" : "fire";
          play(nextBeam ? "Beam Charge" : "Roar");
          updateMouth();
          if (nextBeam) audio("charge");
          else {
            audio("roar", mouth, roarVariant);
            roarVariant = 1 - roarVariant;
          }
          nextBeam = !nextBeam;
          return;
        }
        if (distance < 12 && clear) {
          play("Idle");
          return;
        }
        repath -= dt;
        if (repath <= 0) {
          path = game.physics.nav.findPath(model.position, game.player.pos) || [];
          waypoint = 0;
          repath = .35;
        }
        const next = path[waypoint];
        if (!next) { play("Idle"); return; }
        direction.subVectors(next, model.position);
        direction.y = 0;
        const step = direction.length();
        if (step <= .15) { waypoint++; return; }
        model.rotation.y = Math.atan2(direction.x, direction.z);
        model.position.addScaledVector(direction, Math.min(step, 3.2 * dt) / step);
        const wasWalking = action === actions.get("Walk");
        play("Walk");
        if (wasWalking) {
          const now = action.time;
          for (const [at, bone] of footfalls) {
            if (now >= previous ? at > previous && at <= now : at > previous || at <= now) {
              audio("step", bone.getWorldPosition(foot));
            }
          }
        }
      },
    };
  }
