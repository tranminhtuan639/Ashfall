  let ravenAvatarBuffer;
  async function createRavenCoopAvatar(firstPerson = false, proceduralLeft = false) {
    ravenAvatarBuffer ||= fetch("./assets/raven-coop.glb").then(response => {
      if (!response.ok) throw new Error("Raven avatar asset unavailable");
      return response.arrayBuffer();
    }).catch(error => {
      ravenAvatarBuffer = null;
      throw error;
    });
    const buffer = await ravenAvatarBuffer;
    const header = new DataView(buffer);
    if (header.getUint32(0, true) !== 0x46546c67 || header.getUint32(4, true) !== 2) {
      throw new Error("Invalid Raven GLB");
    }
    const jsonSize = header.getUint32(12, true);
    const data = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, 20, jsonSize)));
    const binary = jsonSize + 28;
    const types = { 5121: Uint8Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array };
    const sizes = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };
    const attributes = {
      POSITION: "position", NORMAL: "normal", TEXCOORD_0: "uv", TEXCOORD_1: "uv1",
      TEXCOORD_2: "uv2", TEXCOORD_3: "uv3", JOINTS_0: "skinIndex", WEIGHTS_0: "skinWeight",
    };
    function accessor(index) {
      const entry = data.accessors[index], view = data.bufferViews[entry.bufferView];
      const itemSize = sizes[entry.type], Type = types[entry.componentType];
      if (entry.sparse || (view.byteStride && view.byteStride !== itemSize * Type.BYTES_PER_ELEMENT)) {
        throw new Error("Unsupported Raven accessor");
      }
      return new lt.BufferAttribute(new Type(buffer, binary + (view.byteOffset || 0) +
        (entry.byteOffset || 0), entry.count * itemSize), itemSize, !!entry.normalized);
    }
    const images = await Promise.all(data.images.map(async image => {
      const view = data.bufferViews[image.bufferView];
      const bytes = new Uint8Array(buffer, binary + (view.byteOffset || 0), view.byteLength);
      const url = URL.createObjectURL(new Blob([bytes], { type: image.mimeType }));
      try {
        const element = new Image();
        element.src = url;
        await element.decode();
        return element;
      } finally {
        URL.revokeObjectURL(url);
      }
    }));
    const textureCache = new Map();
    function texture(ref, color = lt.NoColorSpace) {
      if (!ref) return null;
      const key = [ref.index, ref.texCoord || 0, color].join("/");
      if (textureCache.has(key)) return textureCache.get(key);
      const result = new lt.Texture(images[data.textures[ref.index].source]);
      result.colorSpace = color;
      result.channel = ref.texCoord || 0;
      result.flipY = false;
      result.needsUpdate = true;
      textureCache.set(key, result);
      return result;
    }
    const materials = data.materials.map(material => {
      const pbr = material.pbrMetallicRoughness || {};
      const rgba = pbr.baseColorFactor || [1, 1, 1, 1];
      const surface = texture(pbr.metallicRoughnessTexture);
      const transparent = material.alphaMode === "BLEND";
      return new lt.MeshStandardMaterial({
        color: new lt.Color().fromArray(rgba), opacity: rgba[3], transparent, depthWrite: !transparent,
        alphaTest: material.alphaMode === "MASK" ? (material.alphaCutoff ?? .5) : 0,
        side: material.doubleSided ? lt.DoubleSide : lt.FrontSide,
        map: texture(pbr.baseColorTexture, lt.SRGBColorSpace),
        normalMap: texture(material.normalTexture),
        normalScale: new lt.Vector2().setScalar(material.normalTexture?.scale ?? 1),
        aoMap: texture(material.occlusionTexture), aoMapIntensity: material.occlusionTexture?.strength ?? 1,
        emissiveMap: texture(material.emissiveTexture, lt.SRGBColorSpace),
        emissive: new lt.Color().fromArray(material.emissiveFactor || [0, 0, 0]),
        metalness: pbr.metallicFactor ?? 1, roughness: pbr.roughnessFactor ?? 1,
        metalnessMap: surface, roughnessMap: surface,
      });
    });
    const joints = new Set(data.skins.flatMap(skin => skin.joints));
    const nodes = data.nodes.map((node, index) => {
      const object = joints.has(index) ? new lt.Bone() : new lt.Group();
      object.name = node.name || "";
      if (node.matrix) new lt.Matrix4().fromArray(node.matrix)
        .decompose(object.position, object.quaternion, object.scale);
      if (node.translation) object.position.fromArray(node.translation);
      if (node.rotation) object.quaternion.fromArray(node.rotation);
      if (node.scale) object.scale.fromArray(node.scale);
      return object;
    });
    const root = new lt.Group();
    root.name = "RavenCoop";
    const rig = new lt.Group();
    root.add(rig);
    const skins = data.skins.map(skin => {
      const inverses = accessor(skin.inverseBindMatrices).array;
      return new lt.Skeleton(skin.joints.map(id => nodes[id]),
        skin.joints.map((_, id) => new lt.Matrix4().fromArray(inverses, id * 16)));
    });
    data.nodes.forEach((node, id) => {
      for (const child of node.children || []) nodes[id].add(nodes[child]);
      if (node.mesh == null) return;
      for (const part of data.meshes[node.mesh].primitives) {
        const geometry = new lt.BufferGeometry();
        for (const [key, index] of Object.entries(part.attributes)) {
          if (attributes[key]) geometry.setAttribute(attributes[key], accessor(index));
        }
        if (part.indices != null) geometry.setIndex(accessor(part.indices));
        const skinned = node.skin != null;
        const mesh = skinned ? new lt.SkinnedMesh(geometry, materials[part.material]) :
          new lt.Mesh(geometry, materials[part.material]);
        nodes[id].add(mesh);
        if (skinned) {
          mesh.bind(skins[node.skin], new lt.Matrix4());
          mesh.frustumCulled = false;
        }
        mesh.receiveShadow = true;
      }
    });
    for (const id of data.scenes[data.scene || 0].nodes) rig.add(nodes[id]);
    const mixer = new lt.AnimationMixer(rig);
    const paths = { rotation: "quaternion", translation: "position", scale: "scale" };
    const actions = new Map(data.animations.map(clip => {
      const tracks = clip.channels.map(({ sampler, target }) => {
        const source = clip.samplers[sampler];
        const Track = target.path === "rotation" ? lt.QuaternionKeyframeTrack : lt.VectorKeyframeTrack;
        return new Track(nodes[target.node].uuid + "." + paths[target.path],
          accessor(source.input).array, accessor(source.output).array,
          source.interpolation === "STEP" ? lt.InterpolateDiscrete : lt.InterpolateLinear);
      });
      return [clip.name, mixer.clipAction(new lt.AnimationClip(clip.name, -1, tracks))];
    }));
    const rifle = rig.getObjectByName("M416");
    const magazine = rig.getObjectByName("M416_Rifle_Magazine");
    const hand = rig.getObjectByName("Bip001-L-Hand_05");
    const seat = magazine.matrix.clone();
    const reload = actions.get("Rifle Reload");
    const idle = actions.get("Rifle Idle");
    reload.play();
    reload.time = 1.8;
    mixer.update(0);
    rig.updateMatrixWorld(true);
    const gripOffset = hand.matrixWorld.clone().invert().multiply(magazine.matrixWorld);
    reload.stop();
    idle.play();
    mixer.update(0);
    rig.updateMatrixWorld(true);
    const facing = new lt.Vector3(1, 0, 0).transformDirection(rifle.matrixWorld);
    const heading = Math.atan2(facing.x, facing.z);
    rig.rotation.y = Math.PI - heading;
    rig.updateMatrixWorld(true);
    const bounds = new lt.Box3().setFromObject(rig, true);
    const referenceHeight = bounds.max.y - bounds.min.y;
    if (!Number.isFinite(referenceHeight) || referenceHeight <= 0) throw new Error("Invalid Raven height");
    const scale = 1.72 / referenceHeight;
    rig.scale.setScalar(scale);
    rig.position.y = -bounds.min.y * scale;

    const carried = new lt.Matrix4();
    const carryPosition = new lt.Vector3(), seatPosition = new lt.Vector3();
    const carryRotation = new lt.Quaternion(), seatRotation = new lt.Quaternion();
    const carryScale = new lt.Vector3(), seatScale = new lt.Vector3(), pull = new lt.Vector3();
    seat.decompose(seatPosition, seatRotation, seatScale);
    let active = idle;

    function setMagazine(time) {
      magazine.visible = time < .69 || time >= .87;
      seat.decompose(magazine.position, magazine.quaternion, magazine.scale);
      if (time >= .5 && time < .69) {
        rig.updateMatrixWorld(true);
        // Magazine extraction is down along the weapon's local vertical.
        magazine.position.add(pull.set(0, -.22 * Math.min(1, (time - .5) / .19), 0));
      } else if (time >= .87 && time < 1.8) {
        rig.updateMatrixWorld(true);
        carried.copy(rifle.matrixWorld).invert().multiply(hand.matrixWorld).multiply(gripOffset)
          .decompose(carryPosition, carryRotation, carryScale);
        const seatBlend = lt.MathUtils.smoothstep(time, 1.66, 1.8);
        magazine.position.copy(carryPosition).lerp(seatPosition, seatBlend);
        magazine.quaternion.copy(carryRotation).slerp(seatRotation, seatBlend);
        magazine.scale.copy(carryScale).lerp(seatScale, seatBlend);
      }
    }

    function update(dt, state) {
      const name = state.dead ? "Death" : state.reload >= 0 ? "Rifle Reload" : state.move;
      const next = actions.get(name) || idle;
      if (active !== next) {
        active.fadeOut(.12);
        const once = next === reload || name === "Death";
        next.reset().setLoop(once ? lt.LoopOnce : lt.LoopRepeat, once ? 1 : Infinity);
        next.clampWhenFinished = once;
        next.fadeIn(.12).play();
        active = next;
      }
      const nominal = { "Rifle Walk Forward": 1.15, "Rifle Walk Backward": .95,
        "Rifle Strafe Left": 1, "Rifle Strafe Right": 1, "Rifle Sprint": 5.2 }[name];
      next.setEffectiveTimeScale(nominal ? lt.MathUtils.clamp(state.speed / nominal, .65, 2.5) : 1);
      const steady = state.steady && next === idle;
      next.paused = next === reload || Boolean(steady);
      if (steady) next.time = 0;
      if (next === reload) next.time = state.reload;
      mixer.update(dt);
      setMagazine(next === reload ? state.reload : -1);
      root.rotation.y = state.yaw;
    }
    if (firstPerson && proceduralLeft === "both") {
      rig.traverse(mesh => { if (mesh.isSkinnedMesh) mesh.visible = false; });
    } else if (firstPerson) {
      // Retain triangles primarily driven by arm and finger bones.
      const armJoints = new Set(data.skins[0].joints.flatMap((id, index) =>
        /(?:UpperArm|Forearm|-[LR]-Hand|-[LR]-Finger)/i.test(data.nodes[id].name || "") &&
        !(proceduralLeft && /-L-/i.test(data.nodes[id].name || "")) ? [index] : []));
      let retained = 0;
      rig.traverse(mesh => {
        if (!mesh.isSkinnedMesh) return;
        const geometry = mesh.geometry, indices = geometry.index.array;
        const joints = geometry.getAttribute("skinIndex"), weights = geometry.getAttribute("skinWeight");
        const armVertex = new Uint8Array(joints.count);
        for (let i = 0; i < joints.count; i++) {
          let armWeight = 0;
          for (let j = 0; j < 4; j++) {
            if (armJoints.has(joints.getComponent(i, j))) armWeight += weights.getComponent(i, j);
          }
          armVertex[i] = armWeight >= .5;
        }
        const kept = [];
        for (let i = 0; i < indices.length; i += 3) {
          if (armVertex[indices[i]] + armVertex[indices[i + 1]] + armVertex[indices[i + 2]] >= 2) {
            kept.push(indices[i], indices[i + 1], indices[i + 2]);
          }
        }
        if (kept.length) geometry.setIndex(new lt.BufferAttribute(new indices.constructor(kept), 1));
        else mesh.visible = false;
        retained += kept.length;
      });
      if (!retained) throw new Error("Raven viewmodel has no arm triangles");
    }
    return { root, update, rifle };
  }
