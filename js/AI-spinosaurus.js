// LAN_CAMPAIGN_FULL
  const spinosaurusData = /*@inline:data/spinosaurus.json*/ null;

  const spinoEyesArmsColor = /*@inline:data/spino-eyes-arms-color.json*/ null;
  const spinoRigV2 = /*@inline:data/spino-rig-v2.json*/ null;
  const spinoWalkRig = /*@inline:data/spino-walk-rig.json*/ null;
  const spinoWalkData = { ...spinoRigV2, ...spinoWalkRig };
  const spinoDeathRigData = /*@inline:data/spino-death-rig.json*/ null;
  const SPINO_ATTACKS = {
    newBeam: { clip: "Beam Charge New", state: "beam" },
    oldBeam: { clip: "Beam Charge", state: "beam" },
    newFire: { clip: "Roar New", state: "lightning", range: 33 },
    oldFire: { clip: "Roar", state: "fire", range: 33 },
  };

  async function setupSpinosaurus(game) {
    const [mesh, emissive] = await Promise.all([
      loadDefenseMesh({ ...spinosaurusData, base: spinoEyesArmsColor.base }, true),
      akGoldTexture(spinoEyesArmsColor.emissive, lt.SRGBColorSpace),
    ]);
    mesh.material.emissiveMap = emissive;
    mesh.material.emissive.setHex(0xffffff);
    mesh.material.emissiveIntensity = 1;
    const legacy = bindDefenseRig(spinosaurusData, mesh);
    const updated = createBossAnimationRig(spinoRigV2, mesh.material);
    const walkRig = createBossAnimationRig(spinoWalkData, mesh.material);
    const death = createBossAnimationRig(spinoDeathRigData, mesh.material);
    let activeRig = legacy;
    const model = new lt.Group();
    model.name = "spinosaurus";
    model.add(legacy.rig, updated.rig, death.rig, walkRig.rig);
    walkRig.rig.visible = false;
    death.rig.visible = false;
    updated.rig.visible = false;
    // Match 1.5 times the normal Giga's nose-to-tail length.
    model.scale.setScalar(19);
    game.scene.add(model);

    const nose = legacy.rig.getObjectByName("Nose");
    const deathAim = new lt.Quaternion();
    const deathMuzzle = death.rig.getObjectByName("fire_socket");
    const walkMuzzle = new lt.Object3D();
    walkMuzzle.position.set(0, -.025, .10);
    walkRig.rig.getObjectByName("head").add(walkMuzzle);
    const muzzleV2 = updated.rig.getObjectByName("BeamMuzzle");
    const chin = legacy.rig.getObjectByName("Chin_Tip");
    const mouth = new W(), lowerJaw = new W(), target = new W(), direction = new W();
    const locked = new W(), offset = new W(), up = new W(0, 1, 0);
    const purpleBeamFx = createSpinoBeamFx(game);
    const yellowBeamFx = createSpinoBeamFx(game, true);
    const roarLightningFx = createSpinoBeamFx(game, true, true);
    const lightningArcs = [-.36, -.24, -.12, 0, .12, .24, .36].map(angle => ({
      angle, canDamage: angle === 0 || Math.abs(angle) === .36, direction: new W(), end: new W(),
    }));
    const currentBeam = () => attack === "oldBeam" ? yellowBeamFx : purpleBeamFx;

    const ray = new lt.Ray(), hitPoint = new W();
    const makeHitboxes = (rig, names) => names.map((name, i) => ({
      bone: rig.getObjectByName(name), sphere: new lt.Sphere(new W(), [2.9, 3.5, 2.1, 1.35][i]),
    }));
    const legacyHitboxes = makeHitboxes(legacy.rig, ["Hips", "Spine_2001", "Head", "Nose"]);
    const updatedHitboxes = makeHitboxes(updated.rig, ["Hips", "Spine2", "Head", "HeadEnd"]);
    const walkHitboxes = makeHitboxes(walkRig.rig, ["pelvis", "spine2", "head", "jaw"]);
    const hitboxes = () => activeRig === walkRig ? walkHitboxes : activeRig === updated ? updatedHitboxes : legacyHitboxes;
    const footfalls = [
      [.19, walkRig.rig.getObjectByName("foot_R")],
      [.89, walkRig.rig.getObjectByName("foot_L")],
    ];
    const foot = new W();
    const audio = (cue, pos = mouth, variant = 0) => game.events.emit("spino:audio", { cue, pos, variant });
    let roarVariant = 0;
    const arena = game.level.arena;
    const beamRange = arena ? 2 * Math.hypot(arena.A, arena.B) + 12 : 160;
    const summons = new Map();
    let summonKind = null, damageMultiplier = 1;
    const beamOn = 3.71, beamOff = 5.85;
    let state, action, cooldown, path, waypoint, repath, summon, afterRoar, halfHealth, halfHealthTriggered;
    let attack, queuedAttack, attackCount, openingAttacks, lastBeam;
    function restartAttackSequence() {
      attackCount = 0;
      openingAttacks = ["newBeam", "newFire"];
      queuedAttack = null;
      lastBeam = null;
    }
    function selectAttack(distance) {
      if (openingAttacks.length) return openingAttacks[0];
      if ((attackCount + 1) % 4 === 0) return "newBeam";
      const nextBeam = lastBeam === "newBeam" ? "oldBeam" : "newBeam";
      const choices = distance < 33 ? [nextBeam, "oldFire", "newFire"] : [nextBeam];
      return choices[Math.floor(game.rng() * choices.length)];
    }

    const enemy = {
      type: "spinosaurus", pos: model.position, alive: false, hp: 0,
      damage(amount, point) {
        if (!this.alive || !(amount > 0) || invulnerable()) return false;
        const nextHealth = Math.max(0, this.hp - amount);
        const reachedHalf = !halfHealthTriggered && halfHealth && nextHealth <= halfHealth.hp;
        this.hp = reachedHalf ? halfHealth.hp : nextHealth;
        if (reachedHalf) {
          halfHealthTriggered = true;
          requestSummon("half", halfHealth.onComplete);
        }
        game.events.emit("enemy:hit", { enemy: this, pos: point, damage: amount });
        if (this.hp) return false;
        this.alive = false;
        hideEnergy();
        state = "dying";
        play("Death");
        audio("stop");
        updateMouth();
        audio("deathV2");
        game.events.emit("enemy:killed", { enemy: this, pos: this.pos, type: this.type });
        return true;
      },
    };

    function isSummoning() { return state === "intro" || state === "summoning"; }
    function invulnerable() { return isSummoning() || summons.size > 0; }
    function requestSummon(kind, onComplete) {
      if (!enemy.alive || summonKind === kind || summons.has(kind)) return false;
      summons.set(kind, onComplete);
      if (state === "move") beginNextSummon();
      return true;
    }
    function beginNextSummon() {
      const pending = summons.entries().next();
      if (pending.done) return false;
      const [kind, onComplete] = pending.value;
      summons.delete(kind);
      summonKind = kind;
      beginSummon(onComplete);
      return true;
    }
    function beginSummon(onComplete) {
      state = "summoning";
      afterRoar = onComplete;
      hideEnergy();
      audio("stop");
      action = null; // Always restart Roar, including when it interrupts a fire attack.
      play("Roar");
      updateMouth();
      audio("roar", mouth, roarVariant);
      roarVariant = 1 - roarVariant;
    }

    let lanClip, lanSerial = 0;
    function play(name) {
      const nextRig = name === "Death" ? death : name === "Walk" ? walkRig : updated.actions.has(name) ? updated : legacy;
      const next = nextRig.actions.get(name);
      if (next === action && next.isRunning()) return;
      lanClip = name;
      lanSerial++;
      activeRig.mixer.stopAllAction();
      activeRig.rig.visible = false;
      activeRig = nextRig;
      activeRig.rig.visible = true;
      action = next.reset();
      const loop = name === "Idle" || name === "Walk";
      action.setLoop(loop ? lt.LoopRepeat : lt.LoopOnce, loop ? Infinity : 1);
      action.clampWhenFinished = !loop;
      action.play();
      activeRig.mixer.update(0);
    }
    function hideEnergy() { purpleBeamFx.hide(); yellowBeamFx.hide(); roarLightningFx.hide(); }
    game.events.on("player:dead", () => { hideEnergy(); audio("stop"); });
    function updateMouth() {
      if (activeRig === death) { deathMuzzle.getWorldPosition(mouth); return; }
      if (activeRig === walkRig) { walkMuzzle.getWorldPosition(mouth); return; }
      if (activeRig === updated) { muzzleV2.getWorldPosition(mouth); return; }
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
          !cast(mouth, offset.normalize(), distance)) {
        (game.lan?.target(model.position) || game.player).damage(damage * damageMultiplier * dt, mouth);
        return true;
      }
      return false;
    }
    function fireBeam(dt) {
      const hit = cast(mouth, locked, beamRange), length = hit?.dist ?? beamRange;
      const beamFx = currentBeam();
      if (length > .02) beamFx.fire(mouth, locked, length, hit, dt);
      else beamFx.hide();
      damageInJet(locked, length, .82, 0, 48, dt);
    }
    function fireRoarLightning(dt) {
      let damaged = false;
      const duration = action.time - 3.1;
      for (const arc of lightningArcs) {
        arc.direction.copy(direction).applyAxisAngle(up, arc.angle);
        const limit = Math.min(35, .8 + duration * 42) * (arc.angle ? .84 : 1);
        const hit = cast(mouth, arc.direction, limit);
        const reach = hit?.dist ?? limit;
        arc.end.copy(mouth).addScaledVector(arc.direction, reach);
        if (arc.canDamage && !damaged && damageInJet(arc.direction, reach, 1.3, .14, 34, dt)) damaged = true;
      }
      roarLightningFx.fan(mouth, lightningArcs, dt);
    }
    function beginAttack(kind) {
      const next = SPINO_ATTACKS[kind];
      attack = kind;
      queuedAttack = null;
      if (openingAttacks[0] === kind) openingAttacks.shift();
      attackCount++;
      state = next.state;
      play(next.clip);
      updateMouth();
      if (state === "beam") {
        lastBeam = attack;
        audio("charge");
      } else {
        audio("roar", mouth, roarVariant);
        roarVariant = 1 - roarVariant;
      }
    }
    function reset() {
      summons.clear();
      summonKind = null;
      damageMultiplier = 1;
      activeRig.mixer.stopAllAction();
      action = null;
      state = "ready";
      enemy.alive = model.visible = false;
      hideEnergy();
      audio("stop");
    }
    reset();
    return {
      reset,

      lanSnapshot() {
        if (!model.visible) return null;
        return [model.position.toArray(), model.rotation.y, state, enemy.hp,
          lanClip, action?.time ?? 0, lanSerial, null];
      },
      lanApply(snapshot) {
        if (!snapshot) { if (model.visible) reset(); return; }
        const [pos, yaw, nextState, hp, clip, time, serial, extra] = snapshot;
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
      get beamFx() { return currentBeam(); },
      get started() { return state !== "ready"; },
      get done() { return state === "done"; },
      get alive() { return enemy.alive; },
      summonReinforcements(onComplete) {
        return requestSummon("purple", onComplete);
      },
      get health() { return enemy.hp; },
      get sentryTarget() {
        return enemy.alive && !invulnerable() ? { enemy: enemy, aimAt: out => hitboxes()[1].bone.getWorldPosition(out) } : null;
      },
      get status() {
        if (isSummoning()) return " · Đang gọi viện";
        if (state === "beam") return currentBeam().firing ? " · Đang bắn sét!" : action.time < beamOn ? " · Đang nạp sét!" : "";
        return state === "lightning" ? " · Lightning burst!" : state === "fire" ? " · Fire breath!" : "";
      },
      start(position, onSummon, health = 6000, onHalfHealth) {
        summons.clear();
        summonKind = null;
        damageMultiplier = 1;
        summon = onSummon;
        halfHealth = onHalfHealth ? { hp: health / 2, onComplete: onHalfHealth } : null;
        halfHealthTriggered = false;
        model.position.copy(position);
        model.rotation.y = Math.atan2(game.player.pos.x - position.x, game.player.pos.z - position.z);
        enemy.hp = health;
        model.visible = enemy.alive = true;
        cooldown = 1;
        repath = waypoint = 0;
        path = [];
        attack = null;
        restartAttackSequence();
        state = "intro";
        play("Roar");
        updateMouth();
        audio("roar");
        roarVariant = 1;
        game.events.emit("enemy:spawn", { enemy });
      },
      raycast(origin, dir, range) {
        if (!enemy.alive || invulnerable()) return null;
        ray.set(origin, dir);
        let nearest = null;
        for (const { bone, sphere } of hitboxes()) {
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
        activeRig.mixer.update(dt);
        const finished = action.time >= action.getClip().duration - .001;
        const player = game.lan?.target(model.position) || game.player;
        target.copy(player.pos).setY(player.pos.y + .95);
        updateMouth();
        if (isSummoning()) {
          if (state === "intro") {
            const musicStart = Math.max(0, action.getClip().duration - 3);
            if (previous <= musicStart && action.time > musicStart) {
              game.events.emit("arena:music", { track: "boss", gain: 1.6 });
            }
          }
          if (finished) {
            const intro = state === "intro";
            const forceBeam = intro || summonKind === "purple";
            const onComplete = intro ? summon : afterRoar;
            if (summonKind === "half") damageMultiplier = 1.25;
            summonKind = null;
            state = "move";
            cooldown = 1;
            repath = 0;
            onComplete?.(model.position);
            if (forceBeam) restartAttackSequence();
            if (!beginNextSummon()) {
              if (openingAttacks[0] === "newBeam") beginAttack("newBeam");
              else play("Idle");
            }
          }
          return;
        }
        if (state === "dying") {
          if (action.time >= 5.2 && action.time < 10) {
            deathMuzzle.getWorldQuaternion(deathAim);
            direction.set(0, 0, 1).applyQuaternion(deathAim).normalize();
            const hit = cast(mouth, direction, 32);
            const reach = hit?.dist ?? 32;
            if (reach > 1) game.fx?.flameJet?.(mouth, direction, {
              dt, reach, purple: action.time < 7.7, yellow: action.time >= 7.7, scale: 1.75, slope: .38,
              hit: hit?.point, normal: hit?.normal,
            });
          }
          if (finished) state = "done";
          return;
        }
        if (state === "beam") {
          const beamFx = currentBeam();
          if (action.time < beamOn) {
            lookAtPlayer(dt);
            updateMouth();
            if (action.time >= 1.2) {
              direction.subVectors(target, mouth).normalize();
              beamFx.charge(mouth, direction, lt.MathUtils.smoothstep(action.time, 1.2, beamOn), dt);
            } else beamFx.hide();
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
        } else if (state === "fire" || state === "lightning") {
          if (action.time >= 3.1 && action.time < 6.15) {
            direction.subVectors(target, mouth);
            direction.set(Math.sin(model.rotation.y), lt.MathUtils.clamp(direction.y / Math.max(6, direction.length()), -.7, .2),
              Math.cos(model.rotation.y)).normalize();
            if (state === "lightning") {
              fireRoarLightning(dt);
            } else {
              const hit = cast(mouth, direction, 35);
              const reach = Math.min(hit?.dist ?? 35, .8 + (action.time - 3.1) * 36);
              game.fx?.flameJet?.(mouth, direction, { dt, reach, red: true, scale: 1.75, slope: .38,
                hit: hit && reach >= hit.dist - .01 ? hit.point : null, normal: hit?.normal });
              damageInJet(direction, reach, 1.3, .38, 34, dt);
            }
          } else if (state === "lightning" && previous < 6.15 && action.time >= 6.15) roarLightningFx.hide();
        }
        if (state !== "move") {
          if (finished) {
            hideEnergy();
            state = "move";
            cooldown = 2.4;
            repath = 0;
            if (!beginNextSummon()) play("Idle");
          }
          return;
        }

        cooldown -= dt;
        const distance = model.position.distanceTo(player.pos);
        const aimed = lookAtPlayer(dt);
        direction.subVectors(target, mouth);
        const clear = !cast(mouth, direction.clone().normalize(), direction.length());
        if (cooldown <= 0 && aimed) {
          queuedAttack ||= selectAttack(distance);
          const next = SPINO_ATTACKS[queuedAttack];
          if (next.state === "beam" || (distance < next.range && clear)) {
            beginAttack(queuedAttack);
            return;
          }
        }
        if (distance < 12 && clear) {
          play("Idle");
          return;
        }
        repath -= dt;
        if (repath <= 0) {
          path = game.physics.nav.findPath(model.position, player.pos) || [];
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
        const wasWalking = action === walkRig.actions.get("Walk");
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
