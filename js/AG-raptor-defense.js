  const tekRaptorData = /*@inline:data/tek-raptor.json*/ null;
  const supplyTruckData = /*@inline:data/supply-truck.json*/ null;

  const ammoCrateData = /*@inline:data/ammo-crate.json*/ null;

  async function loadDefenseMesh(data, skinned = false) {
    const decode = (key, Type) => new Type(assetBytes(data[key]));
    const geometry = new lt.BufferGeometry();
    geometry.setAttribute("position", new lt.BufferAttribute(decode("position", Float32Array), 3));
    geometry.setAttribute("normal", new lt.BufferAttribute(decode("normal", Int16Array), 3, true));
    geometry.setAttribute("uv", new lt.BufferAttribute(decode("uv", Uint16Array), 2, true));
    geometry.setIndex(new lt.BufferAttribute(decode("index", Uint32Array), 1));
    if (skinned) {
      geometry.setAttribute("skinIndex", new lt.BufferAttribute(decode("joints", Uint16Array), 4));
      geometry.setAttribute("skinWeight", new lt.BufferAttribute(decode("weights", Uint16Array), 4, true));
    }
    const [map, normalMap, surface] = await Promise.all([
      akGoldTexture(data.base, lt.SRGBColorSpace),
      akGoldTexture(data.normalMap, lt.NoColorSpace),
      akGoldTexture(data.surface, lt.NoColorSpace),
    ]);
    const material = new lt.MeshStandardMaterial({
      map, normalMap, roughnessMap: surface, metalnessMap: surface,
      metalness: .8, roughness: 1, side: lt.DoubleSide,
    });
    const mesh = skinned ? new lt.SkinnedMesh(geometry, material) : new lt.Mesh(geometry, material);
    mesh.castShadow = mesh.receiveShadow = true;
    mesh.frustumCulled = !skinned;
    return mesh;
  }

  function bindDefenseRig(data, mesh) {
    const jointIds = new Set(data.skin);
    const nodes = data.nodes.map((node, index) => {
      const object = node.mesh === 0 ? mesh : jointIds.has(index) ? new lt.Bone() : new lt.Group();
      object.name = node.name;
      if (node.translation) object.position.fromArray(node.translation);
      if (node.rotation) object.quaternion.fromArray(node.rotation);
      if (node.scale) object.scale.fromArray(node.scale);
      return object;
    });
    data.nodes.forEach((node, index) => {
      for (const child of node.children || []) nodes[index].add(nodes[child]);
    });
    const rig = nodes[data.root];
    rig.updateMatrixWorld(true);
    const inverse = new Float32Array(assetBytes(data.inverseBinds));
    mesh.bind(new lt.Skeleton(data.skin.map(index => nodes[index]),
      data.skin.map((_, index) => new lt.Matrix4().fromArray(inverse, index * 16))), mesh.matrixWorld);
    const mixer = new lt.AnimationMixer(rig);
    const actions = new Map(data.clips.map(clip => {
      const tracks = clip.tracks.map(track => {
        const rotation = track.path === "rotation";
        const Track = rotation ? lt.QuaternionKeyframeTrack : lt.VectorKeyframeTrack;
        return new Track(nodes[track.node].uuid + (rotation ? ".quaternion" : ".position"),
          new Float32Array(assetBytes(track.times)), new Float32Array(assetBytes(track.values)),
          track.step ? lt.InterpolateDiscrete : lt.InterpolateLinear);
      });
      return [clip.name, mixer.clipAction(new lt.AnimationClip(clip.name, -1, tracks))];
    }));
    return { rig, mixer, actions };
  }

  async function setupRaptorDefense(game) {
    const [truckMesh, raptorMesh, ammoMesh] = await Promise.all([
      loadDefenseMesh(supplyTruckData),
      loadDefenseMesh(tekRaptorData, true),
      loadDefenseMesh(ammoCrateData),
    ]);
    const truck = new lt.Group();
    truckMesh.quaternion.fromArray(supplyTruckData.rotation);
    truckMesh.scale.setScalar(5.5);
    const bounds = new lt.Box3().setFromObject(truckMesh, true);
    truckMesh.position.sub(bounds.getCenter(new W()));
    truckMesh.position.y += (bounds.max.y - bounds.min.y) / 2;
    truck.add(truckMesh);
    truck.name = "supply-truck";
    game.scene.add(truck);
    const truckBounds = new lt.Box3().setFromObject(truck);
    game.physics.addBox(truckBounds.min, truckBounds.max, { surface: "metal", tag: "supply truck" });

    ammoMesh.quaternion.fromArray(ammoCrateData.rotation);
    ammoMesh.scale.setScalar(.9);
    const ammoBounds = new lt.Box3().setFromObject(ammoMesh, true);
    const ammoCenter = ammoBounds.getCenter(new W());
    const ammoCrates = [-1, 1].map(side => {
      const crate = ammoMesh.clone();
      crate.name = "ammo-crate";
      const pos = new W(side * (truckBounds.max.x + 2), 0, truck.position.z);
      crate.position.copy(pos).sub(ammoCenter);
      crate.position.y = -ammoBounds.min.y;
      game.scene.add(crate);
      const bounds = new lt.Box3().setFromObject(crate);
      game.physics.addBox(bounds.min, bounds.max, { surface: "metal", tag: "ammo crate" });
      return pos;
    });

    function updateAmmoPickup() {
      const { player, input, weapon, hud } = game;
      const nearby = player.alive && ammoCrates.some(pos => pos.distanceToSquared(player.pos) <= 2.1 ** 2);
      if (!nearby) {
        hud.setPrompt(null);
        return;
      }
      const missing = weapon.reserveCapacity - weapon.reserve;
      if (missing > 0 && input.pressed("interact")) {
        weapon.addAmmo(missing);
        hud.message("Đã tiếp đạn dự trữ", 1.5);
      }
      if (weapon.reserve >= weapon.reserveCapacity) hud.setPrompt("Đạn đã đầy", 0, "status");
      else hud.setPrompt("Lấy đạn", 0, "press");
    }

    const { rig, mixer, actions } = bindDefenseRig(tekRaptorData, raptorMesh);
    const model = new lt.Group();
    model.add(rig);
    model.scale.setScalar(9);
    model.visible = false;
    game.scene.add(model);
    let activeAction;
    function play(name, duration, hold = false) {
      mixer.stopAllAction();
      activeAction = actions.get(name);
      activeAction.reset().setEffectiveTimeScale(1);
      activeAction.setLoop(duration ? lt.LoopOnce : lt.LoopRepeat, duration ? 1 : Infinity);
      activeAction.clampWhenFinished = hold;
      if (duration) activeAction.setDuration(duration);
      activeAction.play();
      mixer.update(0);
    }

    const maxTruckHealth = 100;
    const chargeTime = 1.2;
    const deathTime = 1.6;
    const goal = new W(truck.position.x, 0, truckBounds.max.z + 1.8);
    const delta = new W();
    const ray = new lt.Ray();
    const body = new lt.Sphere(new W(), .76);
    const hitPoint = new W();
    const localBody = new W(0, .98, -.3);
    let state = "ready", remaining = 0, truckHealth = maxTruckHealth, path = [], waypoint = 0;
    const raptor = {
      type: "raptor", pos: model.position, hp: 180, alive: false,
      damage(amount, point) {
        if (!this.alive) return false;
        this.hp = Math.max(0, this.hp - amount);
        game.events.emit("enemy:hit", { enemy: this, pos: point, damage: amount });
        if (this.hp > 0) return false;
        this.alive = false;
        state = "dying";
        remaining = deathTime * .94;
        play("Death", deathTime, true);
        game.events.emit("enemy:killed", { enemy: this, pos: this.pos, type: this.type });
        return true;
      },
    };
    function blast() {
      game.fx?.explosion?.(raptor.pos.clone().add(new W(0, .7, 0)), 1.3);
    }
    return {
      updateAmmoPickup,
      get health() { return truckHealth; },
      get done() { return state === "done"; },
      get warning() { return state === "charge"; },
      get started() { return state !== "ready"; },
      reset() {
        mixer.stopAllAction();
        model.visible = raptor.alive = false;
        state = "ready";
        truckHealth = maxTruckHealth;
      },
      start() {
        const spawn = game.level.enemySpawns[0]?.pos || new W(-30, 0, 0);
        path = game.physics.nav.findPath(spawn, goal);
        if (!path) throw new Error("No walkable path from the Raptor spawn to the truck");
        waypoint = 0;
        model.position.copy(spawn);
        model.visible = raptor.alive = true;
        raptor.hp = 180;
        state = "run";
        play("Run");
        game.events.emit("enemy:spawn", { enemy: raptor });
      },
      raycast(origin, direction, maxDistance) {
        if (!raptor.alive) return null;
        body.center.copy(localBody).applyAxisAngle(lt.Object3D.DEFAULT_UP, model.rotation.y).add(raptor.pos);
        ray.set(origin, direction);
        if (!ray.intersectSphere(body, hitPoint)) return null;
        const dist = origin.distanceTo(hitPoint);
        if (dist > maxDistance) return null;
        return { dist, point: hitPoint.clone(), normal: hitPoint.clone().sub(body.center).normalize(),
          enemy: raptor, part: "body" };
      },
      update(dt) {
        if (!model.visible) return;
        mixer.update(dt);
        if (state === "run") {
          const next = path[waypoint];
          delta.subVectors(next, raptor.pos);
          model.rotation.y = Math.atan2(delta.x, delta.z);
          const distance = delta.length();
          const travel = dt * 6;
          if (distance > travel) {
            raptor.pos.addScaledVector(delta, travel / distance);
          } else {
            raptor.pos.copy(next);
            if (++waypoint === path.length) {
              model.rotation.y = Math.atan2(truck.position.x - raptor.pos.x, truck.position.z - raptor.pos.z);
              state = "charge";
              remaining = chargeTime;
              play("Beam Charge", chargeTime, true);
            }
          }
          return;
        }
        remaining -= dt;
        if (remaining > 0) return;
        if (state === "charge") {
          blast();
          truckHealth = Math.max(0, truckHealth - 25);
          state = "cooldown";
          remaining = 3;
        } else if (state === "cooldown") {
          state = "charge";
          remaining = chargeTime;
          play("Beam Charge", chargeTime, true);
        } else if (state === "dying") {
          blast();
          model.visible = false;
          state = "done";
        }
      },
    };
  }
