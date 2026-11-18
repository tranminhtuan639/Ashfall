  function installRavenViewmodel(game, weapon, reloadState, hip, ads, hipRotation) {
    const legacy = weapon.root;
    const leftSource = legacy.getObjectByName("left-hand");
    const leftHand = leftSource?.clone();
    const rightSource = legacy.getObjectByName("right-hand");
    const rightHand = rightSource?.clone();
    const mechanicalRotation = rightSource?.quaternion.clone();
    const pistolContact = new lt.Vector3(-.175, .096, 0);
    const rightPalm = new lt.Vector3(.006, -.031, -.085);
    const rightContact = new lt.Vector3();
    const stockJoint = -.25;
    const stockCut = { value: stockJoint };
    let iceStock;
    let adsKick = 0;
    const steadyRotation = new lt.Quaternion();
    const stockEnd = -.18;
    const adsTrim = { value: 0 };
    const receiverPitch = new lt.Quaternion();
    const pitchAxis = new lt.Vector3(1, 0, 0);
    const holdRotation = leftSource?.quaternion.clone();
    const grip = new lt.Vector3(), magCenter = new lt.Vector3();
    const palm = new lt.Vector3(0, -.015, -.055), gripPoint = new lt.Vector3();
    const magPoint = new lt.Vector3(), forearmOffset = new lt.Vector3();
    let magazine;
    const rifleRest = new lt.Quaternion(), rifleNow = new lt.Quaternion();
    const mountWorld = new lt.Quaternion();
    const updateWeapon = weapon.update;
    const layer = game.viewCamera.layers.mask;
    const mount = new lt.Group();
    mount.visible = false;
    game.camera.add(mount);
    let model, requested = false, visible = false, flashTime = 0;
    let flashScale = 1, vaporT = 0; // M416 ICE FX
    const vaporPos = new lt.Vector3(), vaporDir = new lt.Vector3();
    function rifleWorld(x, y, z, out) {
      out.set(x, y, z).applyMatrix4(model.rifle.matrixWorld);
      game.camera.worldToLocal(out);
      const ratio = Math.tan(game.camera.fov * Math.PI / 360) /
        Math.tan(game.viewCamera.fov * Math.PI / 360);
      out.x *= ratio;
      out.y *= ratio;
      return game.camera.localToWorld(out);
    }
    const muzzleLocal = new lt.Vector3(), muzzleView = new lt.Vector3();
    const aimPoint = new lt.Vector3(), motion = new lt.Vector3();
    const sightInCamera = new lt.Vector3();
    const baseRotation = new lt.Quaternion(), deltaRotation = new lt.Quaternion();
    const reference = new lt.Quaternion();
    const hipEuler = new lt.Euler(...hipRotation, "YXZ");
    const neutral = new lt.Vector3();
    const flashLength = .062;
    const flash = new lt.Mesh(new lt.ConeGeometry(.012, flashLength, 7),
      new lt.MeshBasicMaterial({ color: 0xffdc9a, depthWrite: false, toneMapped: false }));
    flash.material.color.setHex(0x00f0ff);
    flash.material.transparent = true;
    flash.material.opacity = .7;
    flash.material.blending = lt.AdditiveBlending;
    const core = new lt.Mesh(new lt.ConeGeometry(.005, .058, 7),
      new lt.MeshBasicMaterial({ color: 0xc9faff, depthWrite: false, toneMapped: false }));
    core.layers.mask = layer;
    core.renderOrder = flash.renderOrder + 1;
    flash.add(core);
    // quầng sáng xanh băng bao quanh tia lóe (M416 ICE FX)
    const halo = new lt.Mesh(new lt.ConeGeometry(.024, .05, 9),
      new lt.MeshBasicMaterial({
        color: 0x38d8ff, transparent: true, opacity: .32, depthWrite: false, toneMapped: false,
        blending: lt.AdditiveBlending,
      }));
    halo.layers.mask = layer;
    halo.renderOrder = flash.renderOrder - 1;
    flash.add(halo);

    const flashAxis = new lt.Vector3(), flashTip = new lt.Vector3();
    const flashUp = new lt.Vector3(0, 1, 0);
    flash.layers.mask = layer;
    flash.visible = false;
    mount.add(flash);
    function dress(hand, armored) {
      if (!hand) return;
      const suit = new lt.MeshStandardMaterial({
        color: armored ? 0x293547 : 0xd5e9ef, roughness: .58, metalness: .12,
      });
      const glove = new lt.MeshStandardMaterial({
        color: armored ? 0x6f859c : 0x35465b,
        metalness: armored ? .58 : .16, roughness: .42,
      });
      const trim = new lt.MeshStandardMaterial({ color: 0xc8e0ef, metalness: .68, roughness: .28 });
      const blue = new lt.MeshStandardMaterial({
        color: 0x1494c2, emissive: 0x076787, emissiveIntensity: .55, roughness: .31, metalness: .38,
      });
      hand.traverse(node => {
        node.layers.mask = layer;
        if (!node.isMesh) return;
        node.material = node.name === "bare-forearm" ? suit
          : node.name === "exposed-thumb-tip" && !armored ? node.material : glove;
      });
      const cover = hand.getObjectByName("bare-forearm");
      if (cover) {
        cover.geometry.computeBoundingBox();
        const box = cover.geometry.boundingBox;
        const wrist = new lt.Vector3(0, 0, .033);
        const axis = box.getCenter(new lt.Vector3()).sub(wrist);
        const frame = new lt.Group();
        frame.position.copy(wrist);
        frame.quaternion.setFromUnitVectors(new lt.Vector3(0, 1, 0), axis.normalize());
        frame.layers.mask = layer;
        hand.add(frame);
        const band = new lt.Mesh(new lt.CylinderGeometry(.034, .031, .013, 10, 1, true), trim);
        band.layers.mask = layer;
        band.position.y = .018;
        frame.add(band);
        if (armored) {
          for (let index = 0; index < 3; index++) {
            const plate = new lt.Mesh(new lt.BoxGeometry(.039 + index * .004, .027, .006), trim);
            plate.layers.mask = layer;
            plate.position.set(0, .042 + index * .044, .030 + index * .003);
            const strip = new lt.Mesh(new lt.BoxGeometry(.014, .003, .0015), blue);
            strip.layers.mask = layer;
            strip.position.z = .0037;
            plate.add(strip);
            frame.add(plate);
          }
        }
      }
      mount.add(hand);
    }
    dress(leftHand, false);
    dress(rightHand, true);

    function show(value) {
      if (visible === value) return;
      visible = mount.visible = value;
      if (!value) {
        flashTime = 0;
        adsKick = 0;
        flash.visible = false;
      }
    }
    const setVisible = weapon.setVisible;
    weapon.setVisible = function (value) {
      setVisible.call(this, value);
      if (!value || !game.player?.alive) show(false);
    };
    function cutMaterial(mesh, id, uniforms, fragment) {
      mesh.material = mesh.material.clone();
      mesh.material.customProgramCacheKey = () => id;
      mesh.material.onBeforeCompile = shader => {
        Object.assign(shader.uniforms, uniforms);
        const varying = "varying vec3 ravenPosition;\n";
        shader.vertexShader = varying + shader.vertexShader.replace("#include <begin_vertex>",
          "#include <begin_vertex>\nravenPosition = position;");
        shader.fragmentShader = varying + fragment.declarations + shader.fragmentShader.replace(
          "#include <clipping_planes_fragment>", "#include <clipping_planes_fragment>\n" + fragment.cut);
      };
    }
    function buildIceStock(body) {
      const stock = new lt.Group();
      stock.name = "M416_Ice_Stock";
      body.add(stock);

      const ice = new lt.MeshStandardMaterial({
        color: 0x8fc7de, metalness: .28, roughness: .36, flatShading: true,
      });
      const dark = new lt.MeshStandardMaterial({ color: 0x26333b, roughness: .72 });
      function panel(points, depth, bevel, material) {
        const outline = new lt.Shape();
        outline.moveTo(...points[0]);
        for (const point of points.slice(1)) outline.lineTo(...point);
        outline.closePath();
        const geometry = new lt.ExtrudeGeometry(outline, {
          depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 1,
        });
        geometry.translate(0, 0, -depth / 2);
        stock.add(new lt.Mesh(geometry, material));
      }
      panel([[-.485,.111],[-.483,.216],[-.458,.228],[-.322,.220],
        [-.263,.210],[-.254,.186],[-.327,.177],[-.375,.131],[-.452,.108]], .044, .005, ice);
      panel([[-.491,.108],[-.491,.214],[-.481,.218],[-.471,.208],
        [-.471,.115],[-.479,.104]], .05, .003, dark);
      panel([[-.283,.181],[-.283,.215],[-.237,.211],[-.237,.181]], .04, .003, dark);

      const shardGeometry = new lt.OctahedronGeometry(1);
      for (const side of [-1, 1]) {
        const ridge = new lt.Mesh(shardGeometry, ice);
        ridge.position.set(-.399, .198, side * .023);
        ridge.scale.set(.069, .019, .012);
        ridge.rotation.z = -.09;
        stock.add(ridge);
      }
      return stock;
    }
    async function loadRedDotAsset(center) {
      const response = await fetch("./assets/m416-red-dot.glb");
      if (!response.ok) throw new Error("M416 red dot asset unavailable");
      const bytes = await response.arrayBuffer();
      const header = new DataView(bytes);
      if (header.getUint32(0, true) !== 0x46546c67 || header.getUint32(4, true) !== 2)
        throw new Error("Invalid M416 optic GLB");
      const jsonSize = header.getUint32(12, true);
      const asset = JSON.parse(new TextDecoder().decode(new Uint8Array(bytes, 20, jsonSize)));
      const binary = jsonSize + 28;
      const part = asset.meshes[0].primitives[0];
      function attribute(id, size) {
        const entry = asset.accessors[id], view = asset.bufferViews[entry.bufferView];
        const ArrayType = { 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array }[entry.componentType];
        return new lt.BufferAttribute(new ArrayType(bytes,
          binary + (view.byteOffset || 0) + (entry.byteOffset || 0), entry.count * size), size);
      }
      async function texture(index, colorSpace = lt.NoColorSpace) {
        const image = asset.images[asset.textures[index].source];
        const view = asset.bufferViews[image.bufferView];
        const pixels = new Uint8Array(bytes, binary + (view.byteOffset || 0), view.byteLength);
        const url = URL.createObjectURL(new Blob([pixels], { type: image.mimeType }));
        try {
          const element = new Image();
          element.src = url;
          await element.decode();
          const result = new lt.Texture(element);
          result.colorSpace = colorSpace;
          result.flipY = false;
          result.needsUpdate = true;
          return result;
        } finally {
          URL.revokeObjectURL(url);
        }
      }
      const geometry = new lt.BufferGeometry();
      geometry.setAttribute("position", attribute(part.attributes.POSITION, 3));
      geometry.setAttribute("normal", attribute(part.attributes.NORMAL, 3));
      geometry.setAttribute("uv", attribute(part.attributes.TEXCOORD_0, 2));
      geometry.setIndex(attribute(part.indices, 1));
      // Convert the source optic's long axis to the rifle's +X axis.
      const scale = .105;
      geometry.applyMatrix4(new lt.Matrix4().set(
        0, scale, 0, -.030,
        0, 0, -scale, .268,
        -scale, 0, 0, .0047,
        0, 0, 0, 1,
      ));
      const definition = asset.materials[part.material];
      const pbr = definition.pbrMetallicRoughness;
      const [map, normalMap, surface] = await Promise.all([
        texture(pbr.baseColorTexture.index, lt.SRGBColorSpace),
        texture(definition.normalTexture.index),
        texture(pbr.metallicRoughnessTexture.index),
      ]);
      const mesh = new lt.Mesh(geometry, new lt.MeshStandardMaterial({
        map, normalMap, metalnessMap: surface, roughnessMap: surface, side: lt.DoubleSide,
      }));
      mesh.name = "M416_Optic_Imported";
      // The source is one opaque mesh, including the lens. Open the sight window
      // and render clear glass separately so the reticle has a visible target.
      cutMaterial(mesh, "m416-imported-optic-window", {
        opticWindowCenter: { value: new lt.Vector2(center.z, center.y) },
      }, {
        declarations: "uniform vec2 opticWindowCenter;\n",
        cut: "vec2 w = abs((ravenPosition.zy - opticWindowCenter) / vec2(0.020, 0.015)); " +
          "if (pow(w.x, 4.0) + pow(w.y, 4.0) < 1.0) discard;",
      });
      return mesh;
    }
    function fitSoloOptic(scope, body, center, imported) {
      // The GLB node is the rifle attachment point. Replace its visible geometry.
      scope.clear();
      const bodyMesh = body.children.find(node => node.isMesh);
      cutMaterial(bodyMesh, "raven-ads-receiver-v2", { ravenStockCut: stockCut, ravenAdsTrim: adsTrim }, {
        declarations: "uniform float ravenStockCut; uniform float ravenAdsTrim;\n",
        cut: "if (ravenPosition.x < ravenStockCut) discard;\n" +
          "if (ravenAdsTrim > 0.01 && ravenPosition.x > -0.28 && ravenPosition.x < -0.075 && " +
          "ravenPosition.y > 0.15 && ravenPosition.y < 0.234 && " +
          "ravenPosition.z > mix(0.055, 0.028, ravenAdsTrim)) discard;",
      });
      const metal = new lt.MeshStandardMaterial({ color: 0x38424a, metalness: .55, roughness: .43 });
      const inset = new lt.MeshStandardMaterial({ color: 0x182026, metalness: .2, roughness: .69 });
      const ice = new lt.MeshStandardMaterial({
        color: 0x9dcee3, metalness: .24, roughness: .32, flatShading: true,
        emissive: 0x122530, emissiveIntensity: .25,
      });

      function roundedRect(path, halfWidth, halfHeight, radius, clockwise) {
        const corners = [
          [halfWidth - radius, halfHeight - radius],
          [-halfWidth + radius, halfHeight - radius],
          [-halfWidth + radius, -halfHeight + radius],
          [halfWidth - radius, -halfHeight + radius],
        ];
        for (let i = 0; i < 4; i++) {
          const [x, y] = corners[i];
          path.absarc(x, y, radius, i * Math.PI / 2, (i + 1) * Math.PI / 2, false);
        }
        path.closePath();
        if (!clockwise) return path;
        const reversed = path.getPoints().reverse();
        return new lt.Path(reversed);
      }

      function plate(name, shape, material, x, y, depth, bevel) {
        const mesh = new lt.Mesh(new lt.ExtrudeGeometry(shape, {
          depth, bevelEnabled: true, bevelSize: bevel, bevelThickness: bevel,
          bevelSegments: 1, curveSegments: 6,
        }), material);
        mesh.name = name;
        mesh.rotation.y = Math.PI / 2;
        mesh.position.set(x, y, center.z);
        scope.add(mesh);
      }

      if (imported) {
        scope.add(imported);
      } else {
        const frame = roundedRect(new lt.Shape(), .027, .020, .008, false);
        frame.holes.push(roundedRect(new lt.Path(), .023, .016, .005, true));
        plate("M416_Optic_Frame", frame, metal, -.087, center.y, .018, .0009);
        const base = roundedRect(new lt.Shape(), .025, .011, .004, false);
        plate("M416_Optic_Rail_Mount", base, inset, -.091, .279, .075, .001);
        const bridge = roundedRect(new lt.Shape(), .023, .007, .003, false);
        plate("M416_Optic_Lower_Housing", bridge, metal, -.087, .290, .04, .001);

        const shardGeometry = new lt.OctahedronGeometry(1);
        for (const [side, x, y, length] of [[-1, -.063, .296, .013], [-1, -.052, .291, .009],
          [1, -.056, .310, .017], [1, -.045, .299, .012]]) {
          const shard = new lt.Mesh(shardGeometry, ice);
          shard.position.set(x, y, center.z + side * .028);
          shard.scale.set(.008, length, .006);
          shard.rotation.x = side * .23;
          scope.add(shard);
        }

      }

      const glassShape = roundedRect(new lt.Shape(), imported ? .019 : .022, imported ? .014 : .015, .004, false);
      const glass = new lt.Mesh(new lt.ShapeGeometry(glassShape), new lt.MeshBasicMaterial({
        color: 0xccecf5, opacity: .045, transparent: true, depthWrite: false, side: lt.DoubleSide,
      }));
      glass.name = "M416_Optic_Glass";
      glass.rotation.y = -Math.PI / 2;
      glass.position.set(-.078, center.y, center.z);
      scope.add(glass);
      const dot = new lt.Mesh(new lt.CircleGeometry(.00072, 12), new lt.MeshBasicMaterial({
        color: 0xff3825, side: lt.DoubleSide, toneMapped: false,
      }));
      dot.name = "M416_Optic_Dot";
      dot.position.z = .0007;
      glass.add(dot);
      return dot;
    }
    let redDot;

    async function load() {
      requested = true;
      const loaded = await createRavenCoopAvatar(true, leftHand && rightHand ? "both" : Boolean(leftHand));
      if (leftHand) {
        const foregrip = loaded.rifle.getObjectByName("M416_Foregrip");
        const gripGeometry = foregrip.children.find(item => item.isMesh).geometry;
        gripGeometry.computeBoundingBox();
        const bounds = gripGeometry.boundingBox;
        bounds.getCenter(grip);
        grip.y = lt.MathUtils.lerp(bounds.min.y, bounds.max.y, .52);
        magazine = loaded.rifle.getObjectByName("M416_Rifle_Magazine");
        const magGeometry = magazine.children.find(item => item.isMesh).geometry;
        magGeometry.computeBoundingBox();
        magGeometry.boundingBox.getCenter(magCenter);
        magCenter.y = lt.MathUtils.lerp(magGeometry.boundingBox.min.y, magGeometry.boundingBox.max.y, .32);
      }
      const scope = loaded.rifle.getObjectByName("M416_Scope");
      const body = loaded.rifle.getObjectByName("M416_Rifle_Body");
      const bodyGeometry = body.children.find(item => item.isMesh).geometry;
      bodyGeometry.computeBoundingBox();
      const bore = bodyGeometry.boundingBox;
      const opticCenter = new lt.Vector3(-.11, .313, .001);
      const importedCenter = new lt.Vector3(-.11, .320, .001);
      const imported = await loadRedDotAsset(importedCenter).catch(error => {
        console.warn("[Ashfall] M416 optic unavailable; using procedural optic", error);
        return null;
      });
      if (imported) opticCenter.copy(importedCenter);
      redDot = fitSoloOptic(scope, body, opticCenter, imported);
      weapon.ravenIceEffects = () => visible;
      iceStock = buildIceStock(body);

      const tip = new lt.Box3();
      const positions = bodyGeometry.getAttribute("position");
      const point = new lt.Vector3();
      for (let i = 0; i < positions.count; i++) {
        if (positions.getX(i) < bore.max.x - .014) continue;
        tip.expandByPoint(point.fromBufferAttribute(positions, i));
      }
      tip.getCenter(muzzleLocal);
      muzzleLocal.x = bore.max.x;
      loaded.root.updateMatrixWorld(true);
      loaded.rifle.getWorldQuaternion(reference);
      baseRotation.setFromAxisAngle(new lt.Vector3(0, 1, 0), Math.PI / 2).multiply(reference.invert());
      loaded.root.quaternion.copy(baseRotation);
      loaded.root.updateMatrixWorld(true);
      loaded.rifle.getWorldQuaternion(rifleRest);
      rifleRest.invert();
      // Keep the previous hip framing while the raised sight is aligned in ADS.
      aimPoint.set(-.11, .279, .001).applyMatrix4(loaded.rifle.matrixWorld);

      loaded.root.position.copy(aimPoint).negate();
      mount.scale.setScalar(1.22);
      loaded.root.traverse(node => { node.layers.mask = layer; });
      mount.add(loaded.root);
      legacy.traverse(node => {
        if (node.isMesh || node.isSprite) node.layers.disableAll();
      });
      model = loaded;
    }
    game.events.on("weapon:fire", () => {
      if (!visible) return;
      flashTime = .04;
      flashScale = .85 + Math.random() * .75;
      if (weapon.ads > .7) adsKick = Math.min(1.5, adsKick + 1);
    });
    weapon.ravenMuzzleWorld = out => {
      if (!visible) return null;
      game.camera.updateWorldMatrix(true, false);
      mount.updateWorldMatrix(false, true);
      out.copy(muzzleLocal).applyMatrix4(model.rifle.matrixWorld);
      game.camera.worldToLocal(out);
      const ratio = Math.tan(game.camera.fov * Math.PI / 360) /
        Math.tan(game.viewCamera.fov * Math.PI / 360);
      out.x *= ratio;
      out.y *= ratio;
      return game.camera.localToWorld(out);
    };
    function updateLeftHand(time) {
      mount.updateWorldMatrix(true, true);
      gripPoint.copy(grip).applyMatrix4(model.rifle.matrixWorld);
      mount.worldToLocal(gripPoint);
      magPoint.copy(magCenter).applyMatrix4(magazine.matrixWorld);
      mount.worldToLocal(magPoint);
      const contact = lt.MathUtils.smoothstep(time, .15, .5) *
        (1 - lt.MathUtils.smoothstep(time, 1.95, 2.44));
      if (time >= .69 && time < .87) {
        magPoint.y -= .15 * Math.sin(Math.PI * (time - .69) / .18);
        magPoint.z += .08 * Math.sin(Math.PI * (time - .69) / .18);
      }
      gripPoint.lerp(magPoint, contact);
      model.rifle.getWorldQuaternion(rifleNow);
      mount.getWorldQuaternion(mountWorld).invert();
      leftHand.quaternion.copy(mountWorld).multiply(rifleNow).multiply(rifleRest).multiply(holdRotation);
      forearmOffset.copy(palm).multiply(leftHand.scale).applyQuaternion(leftHand.quaternion);
      leftHand.position.copy(gripPoint).sub(forearmOffset);
    }

    function updateRightHand() {
      mount.updateWorldMatrix(true, true);
      rightContact.copy(pistolContact).applyMatrix4(model.rifle.matrixWorld);
      mount.worldToLocal(rightContact);
      model.rifle.getWorldQuaternion(rifleNow);
      mount.getWorldQuaternion(mountWorld).invert();
      rightHand.quaternion.copy(mountWorld).multiply(rifleNow).multiply(rifleRest).multiply(mechanicalRotation);
      forearmOffset.copy(rightPalm).multiply(rightHand.scale).applyQuaternion(rightHand.quaternion);
      rightHand.position.copy(rightContact).sub(forearmOffset);
    }

    weapon.update = function (dt) {
      updateWeapon.call(this, dt);
      const enabled = legacy.visible && game.player?.alive;
      if (enabled && !requested) load().catch(error => console.warn("[Ashfall] Raven viewmodel unavailable", error));
      show(Boolean(enabled && model));
      if (!visible) return;

      const aimAmount = lt.MathUtils.clamp(weapon.ads || 0, 0, 1);
      const aim = aimAmount >= .99 ? 1 : aimAmount;
      const reload = reloadState();
      const reloadTime = reload ? Math.min(2.49, 2.5 * reload.t / reload.T) : -1;
      const adsFraming = reload ? 0 : lt.MathUtils.smoothstep(aim, .58, .99);
      const steady = adsFraming;
      model.update(dt, {
        yaw: 0, move: "Rifle Idle", speed: 0, dead: false, reload: reloadTime, steady: steady === 1,
      });
      model.root.quaternion.copy(baseRotation);
      neutral.fromArray(hip).lerp(motion.fromArray(ads), aim);
      motion.copy(legacy.position).sub(neutral);
      const hipDistance = -.34;
      const adsDistance = -.145;
      mount.position.set(.19 * (1 - aim), -.113 * (1 - aim),
        lt.MathUtils.lerp(hipDistance, adsDistance, aim)).addScaledVector(motion, (reload ? .3 : .75) * (1 - steady));
      reference.identity().slerp(deltaRotation.setFromEuler(hipEuler), 1 - aim);
      mount.quaternion.copy(legacy.quaternion).multiply(reference.invert());
      // At this pitch the front of the muzzle enters the lower sight window
      // while the central ray remains above the rail on the M416 mesh.
      mount.quaternion.slerp(steadyRotation, steady);
      receiverPitch.setFromAxisAngle(pitchAxis, .052 * adsFraming);
      mount.quaternion.multiply(receiverPitch);

      adsTrim.value = adsFraming;
      stockCut.value = lt.MathUtils.lerp(stockJoint, stockEnd, adsFraming);
      if (iceStock) iceStock.visible = adsFraming < .9;
      if (redDot) {
        redDot.visible = aim > .75;
        if (adsFraming > 0) {
          // The mount is a direct child of the gameplay camera.
          redDot.getWorldPosition(sightInCamera);
          game.camera.worldToLocal(sightInCamera);
          mount.position.x -= sightInCamera.x * adsFraming;
          mount.position.y -= sightInCamera.y * adsFraming;
        }
      }
      if (adsKick > 0) {
        const kick = adsKick * steady;
        // Apply recoil after centering the sight so the rifle, optic and dot move together.
        mount.position.y += .0008 * kick;
        mount.position.z += .0032 * kick;
        mount.rotateX(.0046 * kick);
        adsKick *= Math.exp(-19 * dt);
        if (adsKick < .001 || reload || aim < .58) adsKick = 0;
      }
      const showHands = adsFraming < .97;
      if (leftHand) leftHand.visible = showHands;
      if (rightHand) rightHand.visible = showHands;
      if (leftHand) updateLeftHand(reloadTime);
      if (rightHand) updateRightHand();
      flashTime = Math.max(0, flashTime - dt);
      flash.visible = flashTime > 0;
      if (flash.visible) {
        mount.updateWorldMatrix(true, true);
        muzzleView.copy(muzzleLocal).applyMatrix4(model.rifle.matrixWorld);
        flash.position.copy(mount.worldToLocal(muzzleView));
        flashTip.copy(muzzleLocal);
        flashTip.x += .07;
        flashTip.applyMatrix4(model.rifle.matrixWorld);
        mount.worldToLocal(flashTip);
        flashAxis.subVectors(flashTip, flash.position).normalize();
        flash.quaternion.setFromUnitVectors(flashUp, flashAxis);
        // Cone geometry is centered; keep its rear edge beyond the muzzle.
        flash.scale.set(flashScale, flashScale * 1.25, flashScale);
        flash.position.addScaledVector(flashAxis, flashLength / 2 * flashScale * 1.25 + .014);
      }
      // Hơi lạnh toả từ thân súng băng: sương nặng, trôi chậm, chìm xuống (thưa + nhạt khi ngắm để không che tầm nhìn)
      const iceFx = game.fx;
      if (iceFx && iceFx.iceMist) {
        vaporT -= dt;
        if (vaporT <= 0) {
          vaporT = lt.MathUtils.lerp(.1, .32, aim) * (.85 + Math.random() * .3);
          mount.updateWorldMatrix(true, true);
          rifleWorld(muzzleLocal.x - .05 - Math.random() * .4, muzzleLocal.y - .012 - Math.random() * .03,
            muzzleLocal.z + (Math.random() - .5) * .03, vaporPos);
          game.camera.getWorldDirection(vaporDir);
          vaporDir.multiplyScalar(.35);
          vaporDir.y -= .75;
          vaporDir.normalize();
          iceFx.iceMist(vaporPos, vaporDir, {
            count: 1, size: .06, speed: .45, spread: .9, life: 1.9, alpha: .14 * (1 - .6 * aim), sink: .3,
          });
        }
      }
    };
  }
