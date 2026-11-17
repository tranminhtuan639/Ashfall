  let tripleTAvatarBuffer;
  async function createTripleTCoopAvatar() {
    tripleTAvatarBuffer ||= fetch("./assets/triple-t-coop.glb").then(response => {
      if (!response.ok) throw new Error("Triple-T avatar asset unavailable");
      return response.arrayBuffer();
    }).catch(error => {
      tripleTAvatarBuffer = null;
      throw error;
    });
    const buffer = await tripleTAvatarBuffer;
    const header = new DataView(buffer);
    if (header.getUint32(0, true) !== 0x46546c67 || header.getUint32(4, true) !== 2) {
      throw new Error("Invalid Triple-T GLB");
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
        throw new Error("Unsupported Triple-T accessor");
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
    root.name = "Triple-TCoop";
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
    const idle = actions.get("Idle");
    const walk = actions.get("Walk");
    const run = actions.get("Run");
    const back = mixer.clipAction(walk.getClip().clone());
    const scale = 1.74 / data.accessors[0].max[1];
    rig.scale.setScalar(scale);
    const chest = rig.getObjectByName("chest");
    const rifle = new lt.Group();
    rifle.name = "weapon";
    chest.add(rifle);
    const gun = new lt.Group();
    gun.rotation.y = Math.PI; // AK source faces -Z; the weapon socket faces +Z.
    gun.scale.setScalar(.46);
    rifle.add(gun);
    const [body, optic, mag, foregrip] = await Promise.all([
      makeAKGoldPart(akGoldData.body), makeAKGoldPart(akGoldData.dot, .52),
      makeAKGoldPart(akGoldData.mag), makeAKGoldPart(akGoldForegrip),
    ].map(part => part.then(({ geometry, material }) => new lt.Mesh(geometry, material))));
    foregrip.rotation.z = Math.PI;
    foregrip.position.y = -.1413;
    mag.position.fromArray(mi.magPos);
    gun.add(body, optic, mag, foregrip);

    const sides = ["L", "R"].map(side => ({
      upper: rig.getObjectByName("upperarm_" + side),
      lower: rig.getObjectByName("forearm_" + side),
      hand: rig.getObjectByName("hand_" + side),
      sign: side === "L" ? 1 : -1,
    }));
    const shoulder = new lt.Vector3(), elbow = new lt.Vector3(), wrist = new lt.Vector3();
    const target = new lt.Vector3(), line = new lt.Vector3(), bend = new lt.Vector3();
    const elbowGoal = new lt.Vector3(), from = new lt.Vector3(), to = new lt.Vector3();
    const worldRotation = new lt.Quaternion(), localRotation = new lt.Quaternion();
    const swing = new lt.Quaternion(), pole = new lt.Vector3();
    function turnBone(bone, childPoint, goal) {
      bone.getWorldPosition(from);
      to.copy(goal).sub(from).normalize();
      from.negate().add(childPoint).normalize();
      swing.setFromUnitVectors(from, to);
      bone.getWorldQuaternion(worldRotation).premultiply(swing);
      bone.parent.getWorldQuaternion(localRotation).invert();
      bone.quaternion.copy(localRotation.multiply(worldRotation));
    }

    function grip(arm, contact) {
      arm.upper.getWorldPosition(shoulder);
      arm.lower.getWorldPosition(elbow);
      arm.hand.getWorldPosition(wrist);
      const a = shoulder.distanceTo(elbow), b = elbow.distanceTo(wrist);
      target.copy(contact);
      gun.localToWorld(target);
      line.copy(target).sub(shoulder);
      const distance = lt.MathUtils.clamp(line.length(), Math.abs(a - b) + .001, a + b - .001);
      line.normalize();
      target.copy(shoulder).addScaledVector(line, distance);
      pole.set(arm.sign * .23, -.24, .02).transformDirection(chest.matrixWorld);
      bend.copy(pole).addScaledVector(line, -pole.dot(line)).normalize();
      const along = (a * a + distance * distance - b * b) / (2 * distance);
      elbowGoal.copy(shoulder).addScaledVector(line, along)
        .addScaledVector(bend, Math.sqrt(Math.max(0, a * a - along * along)));
      turnBone(arm.upper, elbow, elbowGoal);
      arm.hand.getWorldPosition(wrist);
      turnBone(arm.lower, wrist, target);
    }

    let active = idle, shot = 0, lastShot = 0, death = -1;
    idle.play();
    const leftContact = new lt.Vector3(), rightContact = new lt.Vector3().fromArray(mi.grip);
    const rifleSeat = new lt.Vector3(.052, .045, .108);
    const magSeat = mag.position.clone();
    const ejectedMag = mag.clone();
    ejectedMag.visible = false;
    gun.add(ejectedMag);
    const leftMagContact = new lt.Vector3();
    const droppedFrom = new lt.Vector3();
    const droppedRotation = new lt.Quaternion();
    const looseGun = new lt.Group();
    root.add(looseGun);
    function update(dt, state) {
      root.rotation.y = state.yaw + Math.PI;
      if (state.dead) {
        if (death < 0) {
          death = 0;
          root.updateWorldMatrix(true, true);
          looseGun.attach(rifle);
          droppedFrom.copy(rifle.position);
          droppedRotation.copy(rifle.quaternion);
        }
        death = Math.min(4, death + dt);
        const tumble = Math.min(1, death / 1.32);
        rig.position.y = 1.5 * Math.sin(Math.PI * tumble) +
          (death >= 1.32 && death < 1.92 ? .16 * Math.abs(Math.sin((death - 1.32) * Math.PI / .3)) * (1 - (death - 1.32) / .6) : 0);
        rig.rotation.x = tumble * Math.PI * 2.5;
        const slide = Math.min(1, death / 1.6);
        rifle.position.set(lt.MathUtils.lerp(droppedFrom.x, 1.3, slide),
          lt.MathUtils.lerp(droppedFrom.y, .09, slide) + .85 * Math.sin(Math.PI * slide),
          lt.MathUtils.lerp(droppedFrom.z, .18, slide));
        rifle.quaternion.copy(droppedRotation);
        rifle.rotateY(Math.PI * 4 * slide);
        rifle.rotateZ(Math.PI * 2.4 * slide);
        const flail = (1 - tumble) * Math.sin(death * 21);
        const wave = lt.MathUtils.smoothstep(death, 2.2, 2.65) *
          (1 - lt.MathUtils.smoothstep(death, 3.1, 3.85));
        sides[0].upper.rotation.set(flail * .6, -wave * .4, wave * 1.05);
        sides[0].lower.rotation.set(0, wave * .48, flail * .65);
        sides[1].upper.rotation.set(-flail * .7, 0, -flail * .5);
        sides[1].lower.rotation.set(0, flail * .4, 0);
        ejectedMag.visible = false;
        mag.visible = true;
        mag.position.copy(magSeat);
        return;
      }
      if (death >= 0) {
        chest.add(rifle);
        rifle.scale.setScalar(1);
        rig.position.y = rig.rotation.x = 0;
        death = -1;
      }
      const next = state.move === "Rifle Sprint" ? run : state.move === "Rifle Walk Backward" ? back
        : state.speed > .22 ? walk : idle;
      if (next !== active) {
        active.fadeOut(.12);
        next.reset().fadeIn(.12).play();
        if (next === back) next.time = next.getClip().duration;
        active = next;
      }
      next.setEffectiveTimeScale(next === back ? -1 : 1);
      mixer.update(dt);
      if (state.shot !== lastShot) {
        lastShot = state.shot;
        if (state.shot) shot = .2;
      }
      shot = Math.max(0, shot - dt);
      const kick = shot / .2;
      const aim = state.aim ? 1 : 0;
      const reload = state.reload < 0 ? -1 : state.reload * 2.75 / 2.5;
      const reach = reload < 0 ? 0 : lt.MathUtils.smoothstep(reload, .17, .52) *
        (1 - lt.MathUtils.smoothstep(reload, 2.25, 2.7));
      rifle.position.copy(rifleSeat);
      rifle.position.y += .033 * aim - .075 * reach;
      rifle.position.z -= .03 * kick;
      rifle.rotation.set((aim ? lt.MathUtils.clamp(state.pitch, -.6, .6) : -.27) -
        .13 * kick + .24 * reach, .30 * (1 - aim) + .25 * reach, -.13 * (1 - aim));
      const extraction = reload < 0 ? 0 : lt.MathUtils.smoothstep(reload, .52, .9) *
        (1 - lt.MathUtils.smoothstep(reload, 1.47, 1.98));
      const toss = reload - .92;
      ejectedMag.visible = toss >= 0 && toss < .49;
      if (ejectedMag.visible) {
        ejectedMag.position.copy(magSeat).add(leftMagContact.set(.64 * toss, -.20 - 1.6 * toss * toss, .4 * toss));
        ejectedMag.rotation.set(3 * toss, 0, -.45 + 7 * toss);
      }
      mag.visible = reload < .92 || reload >= 1.47;
      mag.position.copy(magSeat);
      mag.position.y -= .20 * extraction;
      mag.rotation.z = -.45 * extraction;
      leftContact.fromArray(mi.handguard);
      leftContact.y -= .045;
      if (reach) {
        const bolt = lt.MathUtils.smoothstep(reload, 1.99, 2.15) *
          (1 - lt.MathUtils.smoothstep(reload, 2.22, 2.42));
        leftMagContact.set(.025, -.082 - .20 * extraction, mi.magPos[2]);
        leftMagContact.y += .135 * bolt;
        leftMagContact.z += .10 * bolt;
        leftContact.lerp(leftMagContact, reach);
      }
      // Only pose the upper/lower arms, so locomotion keeps playing underneath.
      root.updateWorldMatrix(true, true);
      grip(sides[0], leftContact);
      grip(sides[1], rightContact);
    }
    return { root, update };
  }
