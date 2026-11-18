  function createWoodAnkyloCompanions(game) {
    if (game.woodAnkylos) return game.woodAnkylos;
    const units = new Map();
    const size = .72, hitRadius = .62, maxHealth = 600, cooldown = 7;
    const point = new W(), direction = new W(), muzzle = new W(), target = new W();
    const ray = new lt.Ray(), sphere = new lt.Sphere(new W(), hitRadius);
    let visualFactory = null, loadError = null, woodMaterial = null;
    loadAnkylosaurus().then(factory => { visualFactory = factory; })
      .catch(error => { loadError = error; console.error("[Triple-T] Companion asset failed", error); });

    function wall(from, dir, distance) {
      const hit = game.physics.raycast(from, dir, distance);
      return game.level.raycastArena?.(from, dir, hit?.dist ?? distance) || hit;
    }
    function free(pos, height) {
      const { A, B } = game.level.arena;
      if ((pos.x / (A-hitRadius))**2 + (pos.z / (B-hitRadius))**2 >= 1) return false;
      return game.physics.nav.isWalkable(pos.x, pos.z) && !game.physics.boxes.some(box =>
        pos.x + hitRadius > box.min.x && pos.x - hitRadius < box.max.x &&
        pos.z + hitRadius > box.min.z && pos.z - hitRadius < box.max.z &&
        height + 1.1 > box.min.y && height + .05 < box.max.y);
    }
    function getUnit(owner, slot = 0) {
      const id = owner + ":" + slot;
      if (units.has(id)) return units.get(id);
      if (!visualFactory) return null;
      const visual = visualFactory();
      visual.reset(size);
      visual.mount.traverse(mesh => {
        if (!mesh.isMesh) return;
        woodMaterial ||= createWoodAnkyloMaterial();
        mesh.material = woodMaterial;
      });
      const root = new lt.Group();
      root.name = "triple-t-wood-ankylo-" + id;
      root.visible = false;
      root.add(visual.mount);
      game.scene.add(root);
      const unit = { owner, slot, visual, root, hp: 0, alive: false, remaining: 0, serial: 0,
        shot: 0, shootAt: 0, repath: 0, path: [], pathGoal: null, waypoint: 0, turretYaw: 0, pitch: 0, speed: 0 };
      unit.damage = amount => {
        if (!unit.alive || !(amount > 0)) return;
        unit.hp = Math.max(0, unit.hp - amount);
        if (!unit.hp) {
          unit.alive = false;
          // Start the shared cooldown only when the last member falls.
          if (![...units.values()].some(other => other.owner === owner && other.alive)) {
            for (const other of units.values()) if (other.owner === owner) other.remaining = cooldown;
          }
          unit.speed = 0;
          game.fx?.explosion?.(unit.root.position.clone().add(new W(0,.4,0)), .35, { customAudio: true });
        }
      };
      units.set(id, unit);
      return unit;
    }
    function moveTo(unit, destination, dt) {
      const pos = unit.root.position;
      unit.repath -= dt;
      if (!unit.pathGoal || unit.pathGoal.distanceToSquared(destination) > 4) unit.repath = 0;
      if (unit.repath <= 0) {
        unit.pathGoal = destination.clone();
        unit.path = game.physics.nav.findPath(pos, destination) || [];
        unit.waypoint = 0;
        unit.repath = .35;
      }
      while (unit.path[unit.waypoint] && Math.hypot(pos.x-unit.path[unit.waypoint].x, pos.z-unit.path[unit.waypoint].z) < .2)
        unit.waypoint++;
      const next = unit.path[unit.waypoint];
      if (!next) return;
      direction.subVectors(next, pos).setY(0);
      const distance = direction.length();
      if (distance < .001) return;
      direction.multiplyScalar(1 / distance);
      point.copy(pos).addScaledVector(direction, Math.min(distance, dt * 4.6));
      const height = game.physics.groundHeight(point.x, point.z, pos.y + .35);
      if (!Number.isFinite(height) || Math.abs(height - pos.y) > .4 || !free(point, height)) return;
      unit.speed = pos.distanceTo(point) / Math.max(dt, .001);
      pos.copy(point).setY(height);
      const desired = Math.atan2(direction.x, direction.z);
      const delta = desired - unit.root.rotation.y;
      unit.root.rotation.y += lt.MathUtils.clamp(Math.atan2(Math.sin(delta),Math.cos(delta)), -dt*5,dt*5);
    }
    function targets() {
      const list = game.enemies.list.filter(enemy => enemy.alive).map(enemy => ({
        enemy, aimAt(out) { out.copy(enemy.pos).y += enemy.type === "ankylosaurus" ? .49 * enemy.size : .5; },
      }));
      for (const unit of [...game.defense.raptors, ...(game.gigas || []), game.spino]) {
        if (unit?.sentryTarget) list.push(unit.sentryTarget);
      }
      return list;
    }
    function pose(unit, dt) {
      unit.visual.update(dt, unit.speed, unit.turretYaw, unit.pitch / .65, !unit.alive,
        unit.alive ? 0 : Math.PI * .48, () => {});
    }
    function fire(unit, enemyTarget) {
      unit.visual.muzzle.getWorldPosition(muzzle);
      enemyTarget.aimAt(target);
      direction.subVectors(target,muzzle);
      const distance = direction.length();
      if (distance < .01 || distance > 45) return false;
      direction.multiplyScalar(1/distance);
      const obstruction = wall(muzzle, direction, distance);
      const hit = game.enemies.raycast(muzzle,direction,obstruction?.dist ?? distance + .1);
      if (hit?.enemy !== enemyTarget.enemy) return false;
      drawWoodAnkyloShot(game,muzzle,hit.point);
      game.lan?.woodShot?.(muzzle,hit.point);
      const killed = hit.enemy.damage(10,hit.point,direction,"body") === true;
      game.events.emit("impact",{...hit,from:"turret",dir:direction.clone(),killed,surface:"enemy"});
      unit.shot++;
      return true;
    }
    const controller = {
      ready: () => Boolean(visualFactory),
      deploy(player = game.player, owner = "local") {
        if (!player.alive || !player.onGround) return "Stand on solid ground to deploy";
        if (!visualFactory) return loadError ? "Could not load the wooden Ankylos" : "Loading wooden Ankylos...";
        const squad = [...units.values()].filter(unit => unit.owner === owner);
        if (squad.some(unit => unit.alive)) return "Your wooden Ankylos are still fighting";
        const remaining = Math.max(0, ...squad.map(unit => unit.remaining));
        if (remaining > 0) return "Wooden Ankylos ready in " + Math.ceil(remaining) + "s";
        const forward = player.forward.clone().setY(0).normalize();
        if (forward.lengthSq() < .01) return "Cannot deploy here";
        const side = new W(forward.z, 0, -forward.x);
        const eye = player.pos.clone().add(new W(0,.8,0));
        let positions = null;
        // Validate both positions before changing either member of the pair.
        for (const [ahead, spread] of [[2.3,1], [3.2,1], [2.3,1.6], [3.4,1.6]]) {
          const layout = [-1,1].map(sign => player.pos.clone().addScaledVector(forward,ahead)
            .addScaledVector(side,sign*spread));
          const valid = layout.every(pos => {
            const height = game.physics.groundHeight(pos.x,pos.z,player.pos.y+.35);
            if (!Number.isFinite(height) || Math.abs(height-player.pos.y)>.4 || !free(pos,height)) return false;
            pos.y=height;
            if ([...units.values()].some(other => other.alive && other.root.position.distanceToSquared(pos)<1.6**2)) return false;
            const offset=pos.clone().add(new W(0,.55,0)).sub(eye);
            return !wall(eye,offset.clone().normalize(),offset.length());
          });
          if (valid) { positions=layout; break; }
        }
        if (!positions) return "Not enough clear space to deploy both wooden Ankylos";
        for (let slot=0;slot<2;slot++) {
          const unit=getUnit(owner,slot);
          unit.root.position.copy(positions[slot]);
          unit.root.rotation.set(0,player.yaw || 0,0);
          unit.root.visible=unit.alive=true;
          unit.hp=maxHealth;
          unit.serial++;
          unit.remaining=unit.repath=unit.shootAt=unit.speed=unit.turretYaw=unit.pitch=0;
          unit.path=[];
          unit.pathGoal=null;
          unit.visual.reset(size);
          pose(unit,0);
        }
        return null;
      },
      update(dt) {
        const candidates = targets();
        for (const unit of units.values()) {
          unit.remaining = Math.max(0,unit.remaining-dt);
          if (!unit.root.visible) continue;
          if (!unit.alive) { pose(unit,0); continue; }
          unit.speed = 0;
          unit.shootAt = Math.max(0,unit.shootAt-dt);
          let enemyTarget = null, nearest = Infinity;
          for (const candidate of candidates) {
            candidate.aimAt(target);
            const distance = target.distanceToSquared(unit.root.position);
            if (distance < nearest) { nearest=distance; enemyTarget=candidate; }
          }
          if (enemyTarget) {
            enemyTarget.aimAt(target);
            const distance=Math.sqrt(nearest);
            if (distance < 12) {
              direction.subVectors(unit.root.position,target).setY(0).normalize();
              point.copy(unit.root.position).addScaledVector(direction,4);
              moveTo(unit,point.clone(),dt);
            } else if (distance > 32) moveTo(unit,target.clone(),dt);
            unit.visual.turret.getWorldPosition(muzzle);
            enemyTarget.aimAt(target);
            direction.subVectors(target,muzzle);
            unit.turretYaw=Math.atan2(direction.x,direction.z)-unit.root.rotation.y;
            unit.pitch=-Math.atan2(direction.y,Math.hypot(direction.x,direction.z));
            pose(unit,dt);
            if (!unit.shootAt) {
              if (fire(unit,enemyTarget)) unit.shootAt=.16;
              else if (distance > 14 && !unit.speed) {
                enemyTarget.aimAt(target);
                moveTo(unit,target.clone(),dt);
              }
            }
            continue;
          }
          pose(unit,dt);
        }
        if (!game.lan && game.character?.woodenHands && game.player.alive && game.input.pressed("alt")) {
          const error=controller.deploy();
          if (error) game.hud.message(error,1.4);
        }
      },
      raycast(from,dir,limit) {
        ray.set(from,dir);
        let nearest=null;
        for (const unit of units.values()) {
          if (!unit.alive) continue;
          sphere.center.copy(unit.root.position).y+=.55;
          const hit=ray.intersectSphere(sphere,point);
          if (!hit) continue;
          const dist=from.distanceTo(hit);
          if (dist < limit && (!nearest || dist < nearest.dist)) nearest={unit,dist,point:hit.clone()};
        }
        return nearest;
      },
      cone(from,dir,reach,radius,slope,damage) {
        let hits=0;
        for (const unit of units.values()) {
          if (!unit.alive) continue;
          point.copy(unit.root.position).y+=.55;
          direction.subVectors(point,from);
          const depth=direction.dot(dir),distance=direction.length();
          if (depth <= 0 || depth > reach+hitRadius || !distance) continue;
          if (direction.lengthSq()-depth*depth > (radius+Math.max(0,depth)*slope+hitRadius)**2) continue;
          if (!wall(from,direction.multiplyScalar(1/distance),Math.max(0,distance-hitRadius))) {
            unit.damage(damage);
            hits++;
          }
        }
        return hits;
      },
      bite(from,body,forward,scale,damage) {
        for (const unit of units.values()) {
          if (!unit.alive) continue;
          point.copy(unit.root.position).y+=.55;
          const underHead=point.distanceToSquared(body)<(2.9*scale+hitRadius)**2;
          direction.subVectors(point,from);
          const distance=direction.length(), depth=direction.dot(forward);
          const lateral=Math.abs(direction.x*forward.z-direction.z*forward.x);
          if (!distance || Math.abs(direction.y)>4.1*scale+hitRadius ||
              (!underHead && (depth < -2.2*scale-hitRadius || depth > 3.3*scale+hitRadius || lateral > 3.65*scale+hitRadius))) continue;
          if (!wall(from,direction.multiplyScalar(1/distance),Math.max(0,distance-hitRadius))) unit.damage(damage);
        }
      },
      blast(from,range,damage) {
        for (const unit of units.values()) {
          if (!unit.alive) continue;
          point.copy(unit.root.position).y+=.55;
          direction.subVectors(point,from);
          const distance=direction.length();
          if (distance >= range+hitRadius) continue;
          if (!distance || !wall(from,direction.multiplyScalar(1/distance),Math.max(0,distance-hitRadius)))
            unit.damage(damage*Math.max(0,1-Math.max(0,distance-hitRadius)/range));
        }
      },
      snapshot() {
        return [...units.values()].filter(unit=>unit.root.visible).map(unit=>({owner:unit.owner,slot:unit.slot,serial:unit.serial,
          position:unit.root.position.toArray(),yaw:unit.root.rotation.y,hp:unit.hp,
          remaining:unit.remaining,speed:unit.speed,turretYaw:unit.turretYaw,pitch:unit.pitch}));
      },
      apply(frames,dt) {
        const incoming=frames || [];
        for (const unit of units.values()) if (!incoming.some(frame=>frame.owner===unit.owner && (frame.slot ?? 0)===unit.slot)) unit.root.visible=false;
        for (const frame of incoming) {
          const unit=getUnit(frame.owner,frame.slot ?? 0);
          if (!unit) continue;
          if (unit.serial!==frame.serial) unit.visual.reset(size);
          Object.assign(unit,{serial:frame.serial,hp:frame.hp,remaining:frame.remaining,
            speed:frame.speed,turretYaw:frame.turretYaw,pitch:frame.pitch,alive:frame.hp>0});
          unit.root.visible=true;
          unit.root.position.fromArray(frame.position);
          unit.root.rotation.y=frame.yaw;
          pose(unit,dt);
        }
      },
      reset() {
        for (const unit of units.values()) {
          unit.root.visible=unit.alive=false;
          unit.hp=unit.remaining=0;
        }
      },
    };
    game.woodAnkylos=controller;
    return controller;
  }

  function drawWoodAnkyloShot(game,from,to) {
    const delta=new W().subVectors(to,from), length=delta.length();
    if (length < .001) return;
    const direction=delta.multiplyScalar(1/length);
    game.fx?.muzzleFlash?.(from,direction,{scale:.45,color:0xffd700});
    game.fx?.tracer?.(from,to,{color:0xffd700,coreColor:0xfff2b0,trail:false,intensity:9});
    const side=new W().crossVectors(direction,lt.Object3D.DEFAULT_UP);
    if (side.lengthSq()<.001) side.set(1,0,0); else side.normalize();
    const a=from.clone().addScaledVector(direction,Math.min(length*.25,1));
    const b=from.clone().addScaledVector(direction,Math.min(length*.5,2)).addScaledVector(side,.13);
    const c=from.clone().addScaledVector(direction,Math.min(length*.75,3));
    game.fx?.tracer?.(a,b,{color:0xffd700,trail:false,width:.009,intensity:5,speed:320});
    game.fx?.tracer?.(b,c,{color:0xfff2b0,trail:false,width:.008,intensity:5,speed:320});
    game.audio?.play?.("sentry_shot",{pos:from,gain:.4});
  }

  function createWoodAnkyloMaterial() {
    const width=128, height=256, pixels=new Uint8Array(width*height*4);
    for (let y=0;y<height;y++) for (let x=0;x<width;x++) {
      const u=x/width, v=y/height;
      const grain=Math.sin(u*142+Math.sin(v*12)*1.8+Math.sin(v*29+u*9)*.5);
      const fine=Math.sin(u*490+v*7)*.06;
      const noise=(((x*73856093 ^ y*19349663)>>>0)%997)/997*.08;
      const shade=.76+grain*.13+fine+noise;
      const index=(y*width+x)*4;
      pixels[index]=Math.min(255,183*shade);
      pixels[index+1]=Math.min(255,116*shade);
      pixels[index+2]=Math.min(255,53*shade);
      pixels[index+3]=255;
    }
    const map=new lt.DataTexture(pixels,width,height,lt.RGBAFormat);
    map.colorSpace=lt.SRGBColorSpace;
    map.wrapS=map.wrapT=lt.RepeatWrapping;
    map.magFilter=map.minFilter=lt.LinearFilter;
    map.needsUpdate=true;
    return new lt.MeshStandardMaterial({map,roughness:.62,metalness:.04,side:lt.DoubleSide});
  }
