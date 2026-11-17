// LAN_CAMPAIGN_STAGE_ONE
  const sentryGunData = /*@inline:data/sentry-gun.json*/ null;

  const sentryMountData = /*@inline:data/sentry-mount.json*/ null;

  function createArenaSentries(game) {
    const sentries = [];
    const range = 27;
    const damage = 7;
    const interval = .2;
    const secondShotDelay = .055;
    const scale = 1.15 * 1.2 * 1.0;
    const clearance = 1.08 * 1.2;
    const gunModel = game.sentryGun;
    const position = new W(), forward = new W();
    const turretForward = new W(0, 0, 1);
    const barrelTip = new W(0, .324, .732);
    const mountJointHeight = .55;
    const jointGeometry = new lt.SphereGeometry(.095, 12, 8);
    const aimRotation = new lt.Quaternion();
    const aimAngles = new lt.Euler(0, 0, 0, "YXZ");
    const muzzle = new W();
    const eye = new W(), origin = new W(), aim = new W(), direction = new W();

    function wallDistance(from, dir, limit) {
      const physicsHit = game.physics.raycast(from, dir, limit);
      const meshHit = game.level.raycastArena?.(from, dir, physicsHit?.dist ?? limit);
      return meshHit?.dist ?? physicsHit?.dist ?? limit;
    }

    function remove(sentry, explode) {
      game.scene.remove(sentry.base);
      if (explode) game.fx?.explosion?.(sentry.base.position.clone().setY(sentry.base.position.y + .6), .75);
    }

    function place(player = game.player) {
      const { physics, level } = game;
      if (!player.onGround) return false;
      forward.copy(player.forward).setY(0).normalize();
      if (forward.lengthSq() < .01) return false;
      position.copy(player.pos).addScaledVector(forward, 2.2);
      const { A, B } = level.arena;
      if ((position.x / (A - .8)) ** 2 + (position.z / (B - .8)) ** 2 >= 1) return false;
      if (!physics.nav.isWalkable(position.x, position.z)) return false;
      position.y = physics.groundHeight(position.x, position.z, player.pos.y + .35);
      if (Math.abs(position.y - player.pos.y) > .35) return false;
      if (physics.boxes.some(box =>
        position.x + clearance > box.min.x && position.x - clearance < box.max.x &&
        position.z + clearance > box.min.z && position.z - clearance < box.max.z &&
        position.y + 1.63 * 1.2 > box.min.y && position.y + .03 < box.max.y)) return false;
      if (sentries.some(sentry => sentry.base.position.distanceToSquared(position) < (1.62 * 1.2) ** 2)) return false;
      eye.copy(player.pos).y += .85;
      direction.copy(position).add(new W(0, .65, 0)).sub(eye);
      const distance = direction.length();
      if (wallDistance(eye, direction.normalize(), distance) < distance - .02) return false;

      addSentry(position, forward, true);
      return true;
    }

    let nextId = 0;
    function addSentry(position, forward, authoritative, id = ++nextId) {
      const base = new lt.Group();
      const pivot = new lt.Group();
      const mount = game.sentryMount.clone();
      const heading = Math.atan2(forward.x, forward.z);
      mount.quaternion.fromArray(sentryMountData.rotation).premultiply(
        new lt.Quaternion().setFromAxisAngle(lt.Object3D.DEFAULT_UP, heading - Math.PI / 2));
      // Center the top of the mount beneath the gun's pivot.
      mount.position.copy(forward).multiplyScalar(.022);
      base.add(mount);
      const joint = new lt.Mesh(jointGeometry, mount.material);
      joint.position.y = mountJointHeight;
      base.add(joint);
      const gun = gunModel.clone();
      gun.quaternion.fromArray(sentryGunData.rotation).premultiply(
        new lt.Quaternion().setFromAxisAngle(lt.Object3D.DEFAULT_UP, -Math.PI / 2));
      gun.position.set(0, -.023, -.004);
      pivot.add(gun);
      pivot.position.y = mountJointHeight;
      pivot.quaternion.setFromUnitVectors(turretForward, forward);
      base.add(pivot);
      base.position.copy(position);
      base.scale.setScalar(scale);
      const limit = game.runDifficulty?.sentryLimit ?? 4;
      if (authoritative && sentries.length >= limit) remove(sentries.shift(), true);
      game.scene.add(base);
      const sentry = { id, base, pivot, forward: forward.clone(), cooldown: .2, followUp: null };
      sentries.push(sentry);
      return sentry;
    }

    function fire(sentry, candidates) {
      sentry.pivot.getWorldPosition(origin);
      // Cast against the existing combat hitboxes so other enemies and cover can block the shot.
      for (const target of candidates) {
        if (!target.enemy.alive) continue;
        target.aimAt(aim);
        direction.subVectors(aim, origin);
        const distance = direction.length();
        if (distance < 1 || distance > range) continue;
        const horizontal = Math.hypot(direction.x, direction.z);
        const pitch = Math.atan2(direction.y, horizontal) - Math.asin(barrelTip.y * scale / distance);
        aimRotation.setFromEuler(aimAngles.set(-pitch, Math.atan2(direction.x, direction.z), 0));
        muzzle.copy(barrelTip).multiplyScalar(scale).applyQuaternion(aimRotation).add(origin);
        direction.subVectors(muzzle, origin);
        const muzzleDistance = direction.length();
        if (wallDistance(origin, direction.normalize(), muzzleDistance) < muzzleDistance - .01) continue;
        direction.copy(turretForward).applyQuaternion(aimRotation);
        const hit = game.enemies.raycast(muzzle, direction, wallDistance(muzzle, direction, range - muzzleDistance));
        if (hit?.enemy !== target.enemy) continue;
        sentry.pivot.quaternion.copy(aimRotation);
        game.fx?.muzzleFlash?.(muzzle, direction, { scale: .65 });
        game.fx?.tracer?.(muzzle, hit.point, { trail: false, intensity: 10 });
        game.audio?.play?.("sentry_shot", { pos: muzzle, gain: .65 });
        game.lan?.sentryShot?.(muzzle, hit.point);
        const killed = hit.enemy.damage(damage, hit.point, direction, "body") === true;
        game.events.emit("impact", { ...hit, from: "turret", dir: direction, killed, surface: "enemy" });
        return true;
      }
      return false;
    }

    return {
      place,
      lanSnapshot() {
        return sentries.map(({ id, base, pivot, forward }) =>
          [id, base.position.toArray(), forward.toArray(), pivot.quaternion.toArray()]);
      },
      lanApply(snapshot) {
        for (let index = sentries.length - 1; index >= 0; index--) {
          if (!snapshot.some(([id]) => id === sentries[index].id)) remove(sentries.splice(index, 1)[0], true);
        }
        for (const [id, pos, heading, pose] of snapshot) {
          const sentry = sentries.find(sentry => sentry.id === id) ||
            addSentry(position.fromArray(pos), forward.fromArray(heading), false, id);
          sentry.pivot.quaternion.fromArray(pose);
        }
      },
      reset() {
        for (const sentry of sentries) remove(sentry, false);
        sentries.length = 0;
      },
      update(dt) {
        if (game.player.alive && game.input.pressed("deploySentry") && !place()) {
          game.hud.message("Cannot deploy a sentry here", 1.4);
        }
        if (!sentries.length) return;
        const candidates = game.enemies.list.filter(enemy => enemy.alive).map(enemy => ({
          enemy,
          aimAt(out) {
            out.copy(enemy.pos).y += enemy.type === "ankylosaurus" ? .49 * enemy.size : 0;
          },
        }));
        for (const unit of [...game.defense.raptors, ...(game.gigas || []), game.spino]) {
          const target = unit?.sentryTarget;
          if (target) candidates.push(target);
        }
        for (const sentry of sentries) {
          sentry.cooldown -= dt;
          if (sentry.followUp != null && (sentry.followUp -= dt) <= 0) {
            candidates.sort((a, b) => a.enemy.hp - b.enemy.hp);
            fire(sentry, candidates);
            sentry.followUp = null;
          }
          if (sentry.cooldown > 0 || sentry.followUp != null) continue;
          candidates.sort((a, b) => a.enemy.hp - b.enemy.hp);
          if (fire(sentry, candidates)) {
            sentry.cooldown = Math.max(secondShotDelay, sentry.cooldown + interval);
            sentry.followUp = secondShotDelay;
          } else sentry.cooldown = .05;
        }
      },
    };
  }
