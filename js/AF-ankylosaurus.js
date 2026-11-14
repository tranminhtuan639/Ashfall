  const ankylosaurusData = /*@inline:data/ankylosaurus.json*/ null;

  const ANKYLOSAURUS_SIZE = 5;

  async function loadAnkylosaurus() {
    async function loadPart(data, skinned) {
      const decode = (key, Type) => new Type(assetBytes(data[key]));
      const geometry = new lt.BufferGeometry();
      geometry.setAttribute("position", new lt.BufferAttribute(decode("position", Float32Array), 3));
      geometry.setAttribute("normal", new lt.BufferAttribute(decode("normal", Int16Array), 3, true));
      geometry.setAttribute("uv", new lt.BufferAttribute(decode("uv", Uint16Array), 2, true));
      geometry.setIndex(new lt.BufferAttribute(decode("index", skinned ? Uint32Array : Uint16Array), 1));
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
        metalness: .85, roughness: 1, side: lt.DoubleSide,
      });
      return { geometry, material };
    }
    const data = ankylosaurusData.body;
    const [body, gun] = await Promise.all([
      loadPart(data, true),
      loadPart(ankylosaurusData.turret, false),
    ]);
    const inverse = new Float32Array(assetBytes(data.inverseBinds));
    const clips = data.clips.map(clip => ({
      name: clip.name.toLowerCase(),
      tracks: clip.tracks.map(track => ({
        ...track,
        times: new Float32Array(assetBytes(track.times)),
        values: new Float32Array(assetBytes(track.values)),
      })),
    }));
    return function createVisual() {
      const mount = new lt.Group();
      const bones = new Set(data.skin.joints);
      const nodes = data.nodes.map((spec, index) => {
        const object = spec.mesh === 0
          ? new lt.SkinnedMesh(body.geometry, body.material)
          : bones.has(index) ? new lt.Bone() : new lt.Group();
        object.name = spec.name;
        if (spec.translation) object.position.fromArray(spec.translation);
        if (spec.rotation) object.quaternion.fromArray(spec.rotation);
        if (spec.scale) object.scale.fromArray(spec.scale);
        if (object.isSkinnedMesh) {
          object.castShadow = object.receiveShadow = true;
          object.frustumCulled = false;
        }
        return object;
      });
      data.nodes.forEach((spec, index) => {
        for (const child of spec.children || []) nodes[index].add(nodes[child]);
      });
      const rig = nodes[data.root];
      mount.add(rig);
      mount.updateMatrixWorld(true);
      const skeleton = new lt.Skeleton(data.skin.joints.map(index => nodes[index]),
        data.skin.joints.map((_, index) => new lt.Matrix4().fromArray(inverse, index * 16)));
      const mesh = nodes[data.nodes.findIndex(node => node.mesh === 0)];
      mesh.bind(skeleton, mesh.matrixWorld);

      const spine = nodes.find(node => node.name === "Spine_2001");
      const saddle = new lt.Object3D();
      saddle.position.copy(spine.worldToLocal(new W(0, .391, .027)));
      spine.add(saddle);
      let size = ANKYLOSAURUS_SIZE;
      mount.scale.setScalar(1.75 * size);
      const head = nodes.find(node => node.name === "Head");
      const turret = new lt.Group();
      turret.name = "ankylosaurus-turret";
      const turretMesh = new lt.Mesh(gun.geometry, gun.material);
      turretMesh.castShadow = turretMesh.receiveShadow = true;
      turret.add(turretMesh);
      const muzzle = new lt.Object3D();
      muzzle.position.set(0, .109, .219);
      turret.add(muzzle);
      mount.add(turret);
      mount.name = "ankylosaurus";

      const mixer = new lt.AnimationMixer(rig);
      const actions = new Map(clips.map(clip => [
        clip.name, mixer.clipAction(new lt.AnimationClip(clip.name, -1, clip.tracks.map(track => {
          const rotation = track.path === "rotation";
          const Track = rotation ? lt.QuaternionKeyframeTrack : lt.VectorKeyframeTrack;
          return new Track(nodes[track.node].uuid + (rotation ? ".quaternion" : ".position"),
            track.times, track.values, track.step ? lt.InterpolateDiscrete : lt.InterpolateLinear);
        }))),
      ]));
      const point = new W();
      const footfalls = [
        [.17, nodes.find(node => node.name === "Back_Leg_Foot_R")],
        [.37, nodes.find(node => node.name === "Front_Leg_Foot_L")],
        [.76, nodes.find(node => node.name === "Back_Leg_Foot_L")],
        [.93, nodes.find(node => node.name === "Front_Leg_Foot_R")],
      ];
      let activeAction;
      return {
        mount, head, muzzle, turret,
        reset(nextSize) {
          size = nextSize;
          mount.scale.setScalar(1.75 * size);
          mixer.stopAllAction();
          activeAction = null;
          mount.rotation.set(0, 0, 0);
          mount.position.y = 0;
        },
        update(dt, speed, yaw, pitch, fallen, roll, onStep) {
          const next = actions.get(speed > .35 && !fallen ? "walk" : "idle");
          if (next !== activeAction) {
            activeAction?.fadeOut(.15);
            next.reset().setEffectiveWeight(1).fadeIn(.15).play();
            activeAction = next;
          }
          next.setEffectiveTimeScale(next === actions.get("walk") ? lt.MathUtils.clamp(speed / (2 * size), .45 / size, 2.2) : 1);
          const previousTime = next.time;
          if (!fallen) mixer.update(dt);
          mount.rotation.z = roll;
          mount.position.y = fallen ? .06 : 0;
          mount.updateWorldMatrix(true, true);
          turret.position.copy(mount.worldToLocal(saddle.getWorldPosition(point)));
          turret.rotation.set(pitch * .65, yaw, 0, "YXZ");
          turret.updateMatrixWorld(true);
          if (!fallen && next === actions.get("walk")) {
            const now = next.time;
            for (const [at, foot] of footfalls) {
              if (now >= previousTime ? at > previousTime && at <= now : at > previousTime || at <= now) {
                onStep(foot.getWorldPosition(point));
              }
            }
          }
        },
      };
    };
  }
