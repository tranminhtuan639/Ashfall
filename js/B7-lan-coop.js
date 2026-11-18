// The browser host simulates all four campaign stages. The HTTP process only relays packets.
  function setupArenaLan(game) {
    const { player, input, weapon, hud, level, defense } = game;
    const { raptors, transport } = defense;
    const bosses = () => [...game.gigas, game.spino];
    const beamFrames = new Map(), replicaBeams = new Map();
    let nextBeamId = 0, flameFrames = [], remoteFlames = [], frameAnkylos = [], frameWoodAllies = [], remoteExtract = false;
    let stageStarted = 0, guestStage = 0, transportReady = false, phase = "waiting";
    let loadingReserve = false, requiredGigas = 0;
    const v3 = array => array ? new W().fromArray(array) : null;
    function clearReplicas() {
      beamFrames.clear();
      for (const beam of replicaBeams.values()) beam.hide();
      flameFrames = [];
      remoteFlames = [];
      frameAnkylos = [];
      frameWoodAllies = [];
    }
    const sentries = createArenaSentries(game);
    const difficulty = { easy: { sentryLimit: 8, enemyHealth: .55 },
      medium: { sentryLimit: 6, enemyHealth: .8 }, hard: { sentryLimit: 4, enemyHealth: 1 } };
    const maxHealth = game.character?.woodenHands ? 115 : 100;
    player.maxHealth = player.health = maxHealth;
    const hostRevive = createCoopStageRevive(), guestRevive = createCoopStageRevive();
    let guestReviveId = 0, guestAppliedRevive = 0, guestReviveSeconds = null;
    const peerMaxHealth = () => remote.triplet ? 115 : 100;
    const spawnZ = level.playerStart?.pos.z ?? level.arena.B + 7;
    const follow = new W(), aim = new W(), spectatorPivot = new W();
    let spectatorYaw = null;
    const worldHud = {};
    const campaignHud = Object.create(hud);
    for (const [method, key] of Object.entries({
      setObjective: "objective", setStageCountdown: "countdown", setTransportHealth: "truck", setBossHealth: "boss",
    })) {
      campaignHud[method] = (...args) => {
        worldHud[key] = args;
        hud[method](...args);
      };
    }
    const campaignGame = Object.create(game);
    campaignGame.hud = campaignHud;
    const campaign = game.campaign = createArenaCampaign(campaignGame, () => { phase = "victory"; }, () => {
      phase = "defeat";
      reason = "Transport destroyed";
    }, {
      alive: () => player.alive || remote.alive,
      radio: (line, seconds, clip) => send({ type: "radio", line, seconds, clip }),
      stageStarted(stage) {
        if (stage === stageStarted) return;
        hostRevive.reset();
        guestRevive.reset();
        stageStarted = stage;
        if (stage === 1 || (!player.alive && !remote.alive)) return;
        if (!player.alive) respawn();
        if (!remote.alive) respawnGuest();
      },
      readyToExtract() { transportReady = true; },
      ankyloExplosion(pos, scale, customAudio) {
        send({ type: "ankyloBlast", position: pos.toArray(), scale, customAudio });
      },
      extract() {
        const requested = remoteExtract;
        remoteExtract = false;
        return requested && remote.alive && transport.nearby(remote.pos);
      },
    });
    game.events.on("arena:music", settings => {
      if (role === "host") send({ type: "music", settings });
    });
    const replicatedEvents = new Set([
      "giga:roar", "giga:bite", "giga:death", "giga:step", "giga:breath", "giga:motion",
      "spino:audio", "enemy:fire", "enemy:step", "raptor:charge",
    ]);
    const persistentAudio = new Map();
    for (const event of replicatedEvents) game.events.on(event, data => {
      if (role !== "host" || !connected) return;
      const { pos, dir, cue, variant, type, active, moving, enemy, ankylosaurus } = data;
      const audio = { type: "cue", event, cue, variant, kind: type, active, moving,
        pos: pos?.toArray(), dir: dir?.toArray(), size: enemy?.size, ankylosaurus };
      const stream = (event === "giga:breath" || event === "giga:motion") ? event
        : event === "spino:audio" && cue === "beam" ? "spino:beam" : null;
      if (stream && performance.now() < (persistentAudio.get(stream) || 0) && active !== false && moving !== false) return;
      if (stream) persistentAudio.set(stream, performance.now() + 100);
      send(audio);
    });
    const flameJet = game.fx?.flameJet?.bind(game.fx);
    if (flameJet) game.fx.flameJet = (from, dir, settings) => {
      if (role === "host") {
        const { dt, hit, normal, ...visual } = settings;
        flameFrames.push([from.toArray(), dir.toArray(), visual, hit?.toArray(), normal?.toArray()]);
      }
      flameJet(from, dir, settings);
    };
    const origin = new W(), shotDirection = new W(), endpoint = new W();
    const remote = {
      pos: new W(), eye: new W(), forward: new W(0, 0, -1), onGround: false, yaw: 0, pitch: 0, alive: false, health: 100, hurtAt: -Infinity, hit: 0,
      damage(amount) {
        if (!this.alive) return;
        this.health = Math.max(0, this.health - amount);
        this.alive = this.health > 0;
        this.hurtAt = performance.now();
        this.hit++;
      },
    };
    const avatar = new lt.Group(), indicator = new lt.Group();
    const suit = new lt.MeshStandardMaterial({ color: 0x42d0ff, emissive: 0x164562, roughness: .65 });
    const capsule = new lt.Mesh(new lt.CapsuleGeometry(.34, .94, 5, 10), suit);
    capsule.position.y = .81;
    capsule.castShadow = true;
    const aimMarker = new lt.Mesh(new lt.ConeGeometry(.12, .58, 8), suit);
    aimMarker.rotation.x = -Math.PI / 2;
    aimMarker.position.z = -.75;
    indicator.position.y = 1.45;
    indicator.rotation.order = "YXZ";
    indicator.add(aimMarker);
    avatar.visible = false;
    avatar.add(capsule, indicator);
    game.scene.add(avatar);
    // RAVEN_COOP_AVATAR
    const avatars = new Map(), pendingAvatars = new Set();
    const localTriplet = game.character?.woodenHands === true;
    const localWeapon = game.character?.weapon ?? ashfallAK47Gold;
    const peerWeapon = () => remote.triplet ? ashfallAK47Gold
      : remote.characterKnown ? ashfallM416 : ashfallAK47Gold;
    let reloadTime = -1, localShotId = 0;
    function loadAlly(triplet) {
      if (avatars.has(triplet) || pendingAvatars.has(triplet)) return;
      pendingAvatars.add(triplet);
      const create = triplet ? createTripleTCoopAvatar : createRavenCoopAvatar;
      create().then(model => {
        if (!triplet) model.root.scale.setScalar(1.312);
        model.root.visible = false;
        avatar.add(model.root);
        avatars.set(triplet, model);
      }).catch(error => console.warn("[Ashfall co-op] Ally avatar unavailable", error));
    }
    game.events.on("weapon:fire", () => {
      if (connected) localShotId++;
    });
    game.events.on("weapon:reload", event => {
      if (!connected) return;
      if (event.phase === "start") reloadTime = 0;
      if (event.phase === "done") reloadTime = -1;
    });

    const session = { state: "title", update, start() {} };
    let role, credentials, generation = 0, outbound = [], poseOut = null, worldQueue = [], connected = false, lanPing = 0;
    let lastPoll = 0, retrySince = null, peerActive = true;
    let synced = false, nextSend = 0, nextShotBudgetAt = 0, shotBudget = 3;
    let nextIceDeploy = 0, nextWoodDeploy = 0;
    let reason = "", nextDeploy = 0, lastGuestHit = 0, displayedEnd = false;
    let snapshots = [], eventQueue = [], renderTs = null, latestTs = 0, appliedSeq = -1, snapshotSeq = 0;

    const ui = document.createElement("section");
    ui.className = "arena-lan";
    ui.innerHTML = `
      <style>
        .arena-lan{position:absolute;inset:0;z-index:15;font:15px/1.45 system-ui,sans-serif;color:#f4e8dc;pointer-events:none}
        .arena-lan [hidden]{display:none!important}
        .arena-lan-panel{position:absolute;left:clamp(14px,7vw,110px);top:50%;transform:translateY(-50%);width:min(430px,calc(100% - 28px));background:#1e1512ef;border:1px solid #b5916d;padding:24px;pointer-events:auto}
        .arena-lan h1{margin:0 0 12px;font-size:clamp(23px,6vw,38px)}
        .arena-lan button,.arena-lan input{background:#352923;color:#fff4df;border:1px solid #a6845f;padding:8px 12px;font:inherit;border-radius:3px}
        .arena-lan button{cursor:pointer;margin:0 6px 0 0}.arena-lan button:disabled{opacity:.55}
        .arena-lan button:focus-visible,.arena-lan input:focus-visible{outline:2px solid #ffbc64}
        .arena-lan input{width:96px}.arena-lan label{display:block;margin-bottom:4px}
        .arena-lan p{margin:10px 0}.arena-lan-status{color:#ffd19c;min-height:1.5em}
        .arena-lan-match{position:absolute;right:16px;top:90px;background:#1b1411d9;padding:9px 11px;max-width:44vw;pointer-events:none}
        .arena-lan-match button{margin-top:6px;pointer-events:auto}.arena-lan-match p{margin:0}
      </style>
      <div class="arena-lan-panel">
        <h1>Ashfall · LAN Co-op</h1>
        <p>Four-stage campaign · Defend the transport and extract together</p>
        <label for="lan-difficulty">Host difficulty</label>
        <select id="lan-difficulty"><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard" selected>Hard</option></select>
        <p>Click to aim. [1] Deploy a team sentry. [E] Resupply at an ammo crate.</p>
        <button data-host>Host</button><button data-join>Join</button>
        <div data-entry hidden><label for="arena-lan-code">Room code</label>
          <input id="arena-lan-code" inputmode="numeric" maxlength="6" autocomplete="off">
          <button data-enter>Join room</button></div>
        <p class="arena-lan-status" data-status role="status"></p>
        <button data-cancel hidden>Back</button>
      </div>
      <div class="arena-lan-match" hidden><p data-match></p><button data-leave>Leave room</button></div>`;
    document.getElementById("app").append(ui);
    const node = selector => ui.querySelector(selector);
    const panel = node(".arena-lan-panel"), match = node(".arena-lan-match"), entry = node("[data-entry]");
    const codeInput = node("input"), status = node("[data-status]"), matchText = node("[data-match]");
    const hostButton = node("[data-host]"), joinButton = node("[data-join]"), enter = node("[data-enter]");
    const cancel = node("[data-cancel]"), difficultyInput = node("#lan-difficulty");
    game.lan = {
      players: () => [player, remote],
      woodOwners: () => [["host", player], ["guest", remote]],
      woodShot: (from, to) => send({ type: "woodShot", from: from.toArray(), to: to.toArray() }),
      target(from) {
        if (!remote.alive) return player;
        if (!player.alive) return remote;
        return remote.pos.distanceToSquared(from) < player.pos.distanceToSquared(from) ? remote : player;
      },
      allocateBeam: () => nextBeamId++,
      beam(id, frame) {
        if (role !== "host") return;
        if (frame) beamFrames.set(id, frame);
        else beamFrames.delete(id);
      },
      sentryShot: (from, to, ice = false) => send({ type: "sentry", from: from.toArray(), to: to.toArray(), ice }),
    };
    player.reset(level.playerStart);
    player.enabled = false;
    weapon.setVisible?.(false);

    const api = async (route, data, keepalive = false) => {
      const response = await fetch("/lan/" + route, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data), signal: AbortSignal.timeout(4500), keepalive,
      });
      let result;
      try { result = await response.json(); }
      catch { throw new Error("Start the game using ashfall_coop_server.py."); }
      if (!response.ok) {
        const error = new Error(result.error || "The host is not responding.");
        error.status = response.status;
        throw error;
      }
      return result;
    };
    function newestSnapshots(packets) {
      const latest = new Map();
      for (let index = 0; index < packets.length; index++) {
        try {
          const type = JSON.parse(packets[index]).type;
          if (type === "pose") latest.set(type, index);
        } catch {}
      }
      return packets.filter((raw, index) => {
        try {
          const type = JSON.parse(raw).type;
          return !latest.has(type) || latest.get(type) === index;
        } catch { return true; }
      });
    }
    function send(packet) {
      if (!connected) return;
      if (role === "host") packet.ts = performance.now();
      const raw = JSON.stringify(packet, (_, value) =>
        typeof value === "number" && !Number.isInteger(value) ? Number(value.toFixed(4)) : value);
      // pose: chỉ cần bản mới nhất. world: giữ NHIỀU bản (guest phát lại theo timeline của host).
      if (packet.type === "pose") { poseOut = raw; return; }
      if (packet.type === "world") {
        worldQueue.push(raw);
        if (worldQueue.length > 10) worldQueue.shift();
        return;
      }
      // tiếng bước chân/thở... mất vài gói không sao, đừng để nó làm nghẽn hàng đợi.
      if (packet.type === "cue" && /step|breath|motion/.test(packet.event) && outbound.length > 20) return;
      if (outbound.length < 64) outbound.push(raw);
    }
    function leave(message = "", intent = null) {
      generation++;
      retrySince = null;
      peerActive = true;
      if (credentials && intent) api("leave", { ...credentials, intent }, true).catch(() => {});
      credentials = null;
      connected = synced = remote.alive = avatar.visible = false;
      spectatorYaw = null;
      outbound = [];
      poseOut = null;
      worldQueue = [];
      resetTimeline();
      session.state = "title";
      player.enabled = false;
      input.setGameplay?.(false);
      input.exitLock?.();
      weapon.setVisible?.(false);
      hud.show(false);
      for (const unit of [...raptors, ...bosses()]) unit.reset();
      game.enemies.clear();
      transport.setReady(false);
      clearReplicas();
      sentries.reset();
      game.events.emit("game:state", { state: "title" });
      game.events.emit("arena:music", { track: null });
      difficultyInput.disabled = false;
      for (const key of Object.keys(worldHud)) delete worldHud[key];
      hud.setStageCountdown(null);
      hud.setTransportHealth(null);
      hud.setPrompt(null);
      hud.clearRadio?.();
      level.resetArenaEntry?.();
      panel.hidden = false;
      match.hidden = entry.hidden = cancel.hidden = true;
      hostButton.disabled = joinButton.disabled = enter.disabled = false;
      status.textContent = message;
    }
    const moves = new Set(["Rifle Idle", "Rifle Walk Forward", "Rifle Walk Backward",
      "Rifle Strafe Left", "Rifle Strafe Right", "Rifle Sprint"]);
    function avatarPose() {
      const vx = player.vel?.x || 0, vz = player.vel?.z || 0;
      const speed = Math.hypot(vx, vz);
      const ahead = -vx * Math.sin(player.yaw) - vz * Math.cos(player.yaw);
      const right = vx * Math.cos(player.yaw) - vz * Math.sin(player.yaw);
      const move = speed < .22 ? "Rifle Idle" : player.sprinting ? "Rifle Sprint"
        : Math.abs(ahead) >= Math.abs(right) ? (ahead >= 0 ? "Rifle Walk Forward" : "Rifle Walk Backward")
        : right >= 0 ? "Rifle Strafe Right" : "Rifle Strafe Left";
      return { move, speed, reload: reloadTime < 0 ? -1 : Math.min(2.5, reloadTime * 2.5 / localWeapon.reloadSeconds) };
    }
    const pose = () => ({
      ...avatarPose(),
      character: localTriplet ? "triple-t" : game.character ? "raven" : null,
      aim: weapon.ads > .45, shot: localShotId,
      reviveAck: guestAppliedRevive,
      position: player.pos.toArray(), eye: player.eye.toArray(), yaw: player.yaw, pitch: player.pitch, grounded: player.onGround,
    });
    function startSession() {
      loadAlly(false);
      remote.triplet = remote.characterKnown = remote.aim = false;
      remote.shot = 0;
      localShotId = 0;
      reloadTime = -1;
      remote.move = "Rifle Idle";
      remote.speed = 0;
      remote.reload = -1;
      phase = "entry";
      reason = "";
      stageStarted = guestStage = requiredGigas = 0;
      hostRevive.reset();
      guestRevive.reset();
      guestReviveId = guestAppliedRevive = 0;
      guestReviveSeconds = null;
      displayedEnd = transportReady = remoteExtract = false;
      nextShotBudgetAt = performance.now();
      shotBudget = 3;
      persistentAudio.clear();
      resetTimeline();
      game.enemies.clear();
      game.woodAnkylos.reset();
      clearReplicas();
      lastGuestHit = remote.hit = 0;
      nextSend = nextDeploy = nextIceDeploy = nextWoodDeploy = 0;
      if (role === "host") {
        game.runDifficulty = difficulty[difficultyInput.value] || difficulty.hard;
        campaignGame.runDifficulty = game.runDifficulty;
        campaign.reset();
      }
      hud.setObjective("Enter the arena");
      synced = role === "host";
      const z = spawnZ, hostX = -.8, guestX = .8;
      remote.pos.set(role === "host" ? guestX : hostX, 0, z);
      remote.eye.copy(remote.pos).add(new W(0, 1.6, 0));
      remote.yaw = remote.pitch = 0;
      remote.alive = true;
      remote.health = 100;
      remote.hurtAt = -Infinity;
      avatar.position.copy(remote.pos);
      avatar.visible = true;
      suit.color.setHex(role === "host" ? 0xffb94d : 0x42d0ff);
      suit.emissive.setHex(role === "host" ? 0x5d3012 : 0x164562);
      player.reset({ pos: new W(role === "host" ? hostX : guestX, 0, z), yaw: 0 });
      weapon.reset?.();
      weapon.setVisible?.(true);
      player.enabled = true;
      input.setGameplay?.(true);
      game.audio?.resume?.();
      hud.show(true);
      hud.setObjective("Enter the arena");
      session.state = "playing";
      game.events.emit("game:state", { state: "playing" });
      panel.hidden = true;
      match.hidden = false;
      document.activeElement?.blur();
    }
    function viewPacket(data) {
      if (!data || !Array.isArray(data.position) || !Array.isArray(data.eye) ||
          data.position.length !== 3 || data.eye.length !== 3 ||
          ![...data.position, ...data.eye, data.yaw, data.pitch].every(Number.isFinite)) return false;
      if (Math.abs(data.position[0]) > level.arena.A + 4 || Math.abs(data.position[2]) > Math.max(level.arena.B + 2, spawnZ + 4) ||
          data.position[1] < -1 || data.position[1] > 4) return false;
      if (role === "host" && guestReviveId > 0 && data.reviveAck !== guestReviveId) return false;
      remote.pos.fromArray(data.position);
      remote.eye.fromArray(data.eye);
      if (remote.eye.distanceToSquared(remote.pos) > 9) remote.eye.copy(remote.pos).add(new W(0, 1.6, 0));
      const previousMaxHealth = peerMaxHealth();
      remote.triplet = data.character === "triple-t";
      if (role === "host" && remote.alive && peerMaxHealth() !== previousMaxHealth) {
        remote.health = Math.min(peerMaxHealth(), remote.health + peerMaxHealth() - previousMaxHealth);
      }
      remote.characterKnown = remote.triplet || data.character === "raven";
      remote.aim = data.aim === true;
      if (Number.isSafeInteger(data.shot) && data.shot >= 0) remote.shot = data.shot;
      remote.move = moves.has(data.move) ? data.move : "Rifle Idle";
      remote.speed = Number.isFinite(data.speed) ? Math.min(12, Math.max(0, data.speed)) : 0;
      remote.reload = Number.isFinite(data.reload) && data.reload >= 0 ? Math.min(data.reload, 2.5) : -1;
      remote.yaw = data.yaw;
      remote.pitch = data.pitch;
      remote.forward.set(-Math.sin(remote.yaw), 0, -Math.cos(remote.yaw));
      remote.onGround = data.grounded === true;
      return true;
    }
    const localShot = game.combat.playerShot.bind(game.combat);
    function takeShot(index, from, direction, options) {
      const impact = localShot(from, direction, options);
      endpoint.copy(impact?.point || origin.copy(from).addScaledVector(direction, 65));
      if (index === 1) game.fx?.tracer?.(from, endpoint);
      send({ type: "trace", index, from: from.toArray(), to: endpoint.toArray() });
      return impact;
    }
    game.combat.playerShot = (from, direction, options) => {
      if (phase !== "active" || connectionPaused()) {
        return { point: endpoint.copy(from).addScaledVector(direction, 65) };
      }
      if (role === "host") return takeShot(0, from, direction, options);
      send({ type: "shot", pose: pose(), direction: direction.toArray() });
      return { point: endpoint.copy(from).addScaledVector(direction, 65) };
    };

    function receive(raw) {
      let packet;
      try { packet = JSON.parse(raw); } catch { return; }
      if (!packet || typeof packet !== "object") return;
      if (role === "host") {
        if (packet.type === "pose") viewPacket(packet.pose);
        if (packet.type === "deploy" && phase === "active" &&
            remote.alive && viewPacket(packet.pose) && performance.now() >= nextDeploy) {
          nextDeploy = performance.now() + 250;
          if (!sentries.place(remote)) send({ type: "deployDenied" });
        }
        if (packet.type === "deployIce" && phase === "active" &&
            remote.alive && viewPacket(packet.pose) && remote.characterKnown && !remote.triplet &&
            performance.now() >= nextIceDeploy) {
          nextIceDeploy = performance.now() + 250;
          if (!sentries.placeIce(remote, "guest")) send({ type: "deployDenied" });
        }
        if (packet.type === "deployWood" && phase === "active" &&
            remote.alive && viewPacket(packet.pose) && remote.characterKnown && remote.triplet &&
            performance.now() >= nextWoodDeploy) {
          nextWoodDeploy = performance.now() + 250;
          const error = game.woodAnkylos.deploy(remote, "guest");
          if (error) send({ type: "woodDenied", message: error });
        }
        if (packet.type === "extract" && transportReady && viewPacket(packet.pose)) remoteExtract = true;
        if (packet.type !== "shot" || phase !== "active" || !remote.alive || !viewPacket(packet.pose) ||
            !Array.isArray(packet.direction) || packet.direction.length !== 3 ||
            !packet.direction.every(Number.isFinite)) return;
        const now = performance.now();
        const interval = 1000 * 60 / peerWeapon().rpm;
        shotBudget = Math.min(3, shotBudget + (now - nextShotBudgetAt) / interval);
        nextShotBudgetAt = now;
        if (shotBudget < 1) return;
        shotDirection.fromArray(packet.direction);
        if (shotDirection.lengthSq() < .81 || shotDirection.lengthSq() > 1.21) return;
        shotBudget--;
        takeShot(1, remote.eye, shotDirection.normalize(), { damage: peerWeapon().damage, range: peerWeapon().range });
        return;
      }
      if (packet.type === "world") { pushSnapshot(packet); return; }
      if (renderTs !== null && Number.isFinite(packet.ts)) {
        if (eventQueue.length < 400) eventQueue.push(packet);
        return;
      }
      applyGuestPacket(packet);
    }
    function applyGuestPacket(packet) {
      if (packet.type === "trace" && packet.index === 0 && Array.isArray(packet.from) && Array.isArray(packet.to)) {
        game.fx?.tracer?.(origin.fromArray(packet.from), endpoint.fromArray(packet.to));
        return;
      }
      if (packet.type === "cue" && replicatedEvents.has(packet.event)) {
        const pos = v3(packet.pos), dir = v3(packet.dir);
        if (packet.event === "enemy:fire" && pos && dir) {
          const wall = game.physics.raycast(pos, dir, 28);
          const hit = game.level.raycastArena?.(pos, dir, wall?.dist ?? 28) || wall;
          game.fx?.tracer?.(pos, endpoint.copy(pos).addScaledVector(dir, hit?.dist ?? 28),
            { color: 16760944, speed: 260, width: .035 });
          game.fx?.muzzleFlash?.(pos, dir, { scale: .9 });
        }
        game.events.emit(packet.event, { ...packet, type: packet.kind, pos, dir, enemy: { size: packet.size, pos } });
        return;
      }
      if (packet.type === "ankyloBlast") {
        const pos = v3(packet.position);
        game.fx?.explosion?.(pos, packet.scale, { customAudio: packet.customAudio });
        if (packet.customAudio) game.audio?.play?.("ankylo_death", { pos, gain: 1.25 });
        return;
      }
      if (packet.type === "radio") { hud.radio(packet.line, packet.seconds, packet.clip); return; }
      if (packet.type === "music") { game.events.emit("arena:music", packet.settings); return; }
      if (packet.type === "deployDenied") { hud.message("Cannot deploy a sentry here", 1.4); return; }
      if (packet.type === "woodDenied") { hud.message(packet.message, 1.4); return; }
      if (packet.type === "woodShot" && Array.isArray(packet.from) && Array.isArray(packet.to)) {
        drawWoodAnkyloShot(game, v3(packet.from), v3(packet.to));
        return;
      }
      if (packet.type === "sentry") {
        const from = origin.fromArray(packet.from), to = endpoint.fromArray(packet.to);
        game.fx?.muzzleFlash?.(from, shotDirection.subVectors(to, from).normalize(), {
          scale: packet.ice ? .85 : .65, color: packet.ice ? 0x00f0ff : undefined,
        });
        game.fx?.tracer?.(from, to, { trail: false, intensity: 10,
          color: packet.ice ? 0x00f0ff : undefined, coreColor: packet.ice ? 0xc9faff : undefined });
        game.audio?.play?.("sentry_shot", { pos: from, gain: .65 });
        return;
      }
    }

    // ---- Guest playback: buffer host snapshots and replay them on the host's own timeline ----
    const lerp = (x, y, t) => x + (y - x) * t;
    const lerpAngle = (x, y, t) => x + Math.atan2(Math.sin(y - x), Math.cos(y - x)) * t;
    const lerpVec = (x, y, t, limit = 6) => {
      if (!x || !y) return x || y;
      const d2 = (x[0] - y[0]) ** 2 + (x[1] - y[1]) ** 2 + (x[2] - y[2]) ** 2;
      return d2 > limit * limit ? x : x.map((value, index) => lerp(value, y[index], t));
    };
    const interpDelay = () => Math.min(450, Math.max(110, lanPing + 60));
    function resetTimeline() {
      snapshots = [];
      eventQueue = [];
      renderTs = null;
      latestTs = 0;
      appliedSeq = -1;
    }
    function blendBoss(sa, sb, t) {
      if (!sa || !sb || sa[6] !== sb[6] || sa[4] !== sb[4] ||
          sa[7]?.[0] !== sb[7]?.[0] || sa[7]?.[1] !== sb[7]?.[1]) return sa;
      const next = sa.slice();
      next[0] = lerpVec(sa[0], sb[0], t, 12);
      next[1] = lerpAngle(sa[1], sb[1], t);
      if (sb[5] >= sa[5]) next[5] = lerp(sa[5], sb[5], t);
      return next;
    }
    function blendWorld(a, b, t) {
      const out = { ...a };
      const pa = a.hostPose, pb = b.hostPose;
      if (pa?.position && pb?.position) {
        out.hostPose = { ...pa, position: lerpVec(pa.position, pb.position, t),
          eye: lerpVec(pa.eye, pb.eye, t), yaw: lerpAngle(pa.yaw, pb.yaw, t), pitch: lerp(pa.pitch, pb.pitch, t) };
      }
      if (Array.isArray(a.raptors) && Array.isArray(b.raptors)) {
        out.raptors = a.raptors.map((sa, index) => {
          const sb = b.raptors[index];
          if (!sa || !sb || sa.run !== sb.run) return sa;
          return { ...sa, position: lerpVec(sa.position, sb.position, t), yaw: lerpAngle(sa.yaw, sb.yaw, t) };
        });
      }
      if (Array.isArray(a.gigas) && Array.isArray(b.gigas)) {
        out.gigas = a.gigas.map((sa, index) => blendBoss(sa, b.gigas[index], t));
      }
      out.spino = blendBoss(a.spino, b.spino, t);
      out.woodAllies = (a.woodAllies || []).map(sa => {
        const sb = (b.woodAllies || []).find(item => item.owner === sa.owner && (item.slot ?? 0) === (sa.slot ?? 0) && item.serial === sa.serial);
        if (!sb || (sa.hp > 0) !== (sb.hp > 0)) return sa;
        return { ...sa, position: lerpVec(sa.position, sb.position, t),
          yaw: lerpAngle(sa.yaw, sb.yaw, t), speed: lerp(sa.speed, sb.speed, t),
          turretYaw: lerpAngle(sa.turretYaw, sb.turretYaw, t), pitch: lerp(sa.pitch, sb.pitch, t) };
      });
      if (Array.isArray(a.ankylos) && Array.isArray(b.ankylos)) {
        out.ankylos = a.ankylos.map(da => {
          const db = b.ankylos.find(item => item[0] === da[0]);
          if (!db) return da;
          const next = da.slice();
          next[1] = lerpVec(da[1], db[1], t, 12);
          next[3] = lerpAngle(da[3], db[3], t);
          next[4] = lerp(da[4], db[4], t);
          next[5] = lerpAngle(da[5], db[5], t);
          next[6] = lerp(da[6], db[6], t);
          return next;
        });
      }
      return out;
    }
    function pushSnapshot(packet) {
      if (!Number.isFinite(packet.ts)) { packet.playSeq = ++snapshotSeq; applyWorld(packet, true); return; }
      const last = snapshots[snapshots.length - 1];
      if (last && packet.ts <= last.ts) return;
      packet.playSeq = ++snapshotSeq;
      snapshots.push(packet);
      latestTs = packet.ts;
      if (snapshots.length > 120) snapshots.splice(0, snapshots.length - 120);
    }
    function playback(dt) {
      if (!snapshots.length) return;
      const delay = interpDelay();
      if (renderTs === null || latestTs - renderTs > 1500) renderTs = latestTs - delay;
      const buffered = latestTs - renderTs;
      const rate = Math.min(1.5, Math.max(.5, 1 + (buffered - delay) / 600));
      renderTs = Math.min(latestTs, renderTs + dt * 1000 * rate);
      let index = 0;
      while (index + 1 < snapshots.length && snapshots[index + 1].ts <= renderTs) index++;
      if (index) snapshots.splice(0, index);
      const a = snapshots[0], b = snapshots[1];
      const t = b && renderTs > a.ts ? Math.min(1, (renderTs - a.ts) / (b.ts - a.ts)) : 0;
      const fresh = appliedSeq !== a.playSeq;
      appliedSeq = a.playSeq;
      applyWorld(t > 0 ? blendWorld(a, b, t) : a, fresh);
      while (eventQueue.length && eventQueue[0].ts <= renderTs) applyGuestPacket(eventQueue.shift());
    }
    function applyWorld(packet, fresh) {
      if (!viewPacket(packet.hostPose)) return;
      synced = true;
      if (fresh) {
        phase = packet.phase;
        reason = packet.reason;
        worldHud.wave = packet.wave;
        worldHud.stage = packet.stage;
        remote.alive = packet.hostAlive;
        const reviveId = packet.guestReviveId;
        guestReviveSeconds = Number.isFinite(packet.guestReviveSeconds) ? packet.guestReviveSeconds : null;
        if (Number.isSafeInteger(reviveId) && reviveId > guestAppliedRevive) {
          guestAppliedRevive = reviveId;
          respawn();
        } else if (reviveId == null && packet.stageStarted > guestStage && !player.alive && phase !== "defeat") {
          respawn();
        }
        guestStage = Math.max(guestStage, packet.stageStarted || 0);
        if (transportReady !== packet.transportReady) {
          transportReady = packet.transportReady;
          transport.setReady(transportReady);
        }
        if (Number.isFinite(packet.guestHealth)) {
          if (packet.guestHit !== lastGuestHit || (packet.guestHealth <= 0 && player.alive)) {
            lastGuestHit = packet.guestHit;
            player.damage(Math.max(0, player.health - packet.guestHealth), remote.pos);
          }
          if (player.alive) player.health = packet.guestHealth;
        }
        sentries.lanApply(packet.sentries);
        requiredGigas = packet.gigas.length;
        ensureReserve();
        remoteFlames = packet.flames;
        for (const beam of replicaBeams.values()) beam.frame = null;
        for (const [id, frame] of packet.beams) {
          const [yellow, bolts] = frame;
          let beam = replicaBeams.get(id);
          if (!beam) {
            beam = createSpinoBeamFx(game, yellow, bolts, true);
            replicaBeams.set(id, beam);
          }
          beam.frame = frame;
        }
        for (const [key, method] of [["objective", "setObjective"], ["countdown", "setStageCountdown"], ["truck", "setTransportHealth"], ["boss", "setBossHealth"]]) {
          if (packet.hud[key]) hud[method](...packet.hud[key]);
        }
      }
      // Moving parts are re-applied every frame from the interpolated snapshot.
      if (Array.isArray(packet.raptors)) packet.raptors.forEach((snapshot, index) => {
        if (snapshot) raptors[index]?.lanApply(snapshot);
      });
      packet.gigas.forEach((snapshot, index) => game.gigas[index]?.lanApply(snapshot));
      game.spino.lanApply(packet.spino);
      frameAnkylos = packet.ankylos;
      frameWoodAllies = packet.woodAllies || [];
    }

    function ensureReserve() {
      if (loadingReserve || game.gigas.length >= requiredGigas || !game.createReinforcementGiga) return;
      loadingReserve = true;
      game.createReinforcementGiga().then(unit => {
        game.gigas.push(unit);
        loadingReserve = false;
        if (connected && role === "join") ensureReserve();
      }).catch(error => {
        loadingReserve = false;
        console.error("[LAN] Giga replica could not load", error);
      });
    }

    function connectionPaused() {
      return connected && (retrySince !== null || !peerActive || performance.now() - lastPoll > 1800);
    }
    async function poll(epoch) {
      if (epoch !== generation || !credentials) return;
      let data;
      try {
        const packets = [];
        if (poseOut) { packets.push(poseOut); poseOut = null; }
        packets.push(...worldQueue.splice(0, 8));
        packets.push(...outbound.splice(0, 32 - packets.length));
        const sentAt = performance.now();
        data = await api("poll", { ...credentials, packets });
        lanPing = Math.round(performance.now() - sentAt);
        if (!Array.isArray(data.packets)) throw new Error("Invalid LAN response");
      } catch (error) {
        if (epoch !== generation) return;
        if ([403, 404, 410].includes(error.status)) {
          leave(error.status === 404 ? "This co-op session has ended. Create a new room." : error.message);
          return;
        }
        retrySince ??= performance.now();
        outbound = [];
        poseOut = null;
        worldQueue = [];
        if (performance.now() - retrySince >= 120000) {
          leave("Relay connection timed out. Check the host and create a new room.");
          return;
        }
        if (!connected) status.textContent = "Reconnecting to the relay...";
        setTimeout(() => poll(epoch), 500);
        return;
      }
      if (epoch !== generation) return;
      lastPoll = performance.now();
      retrySince = null;
      peerActive = data.peerActive !== false;
      try {
        if (data.connected && !connected) {
          connected = true;
          startSession();
        }
        for (const packet of newestSnapshots(data.packets)) receive(packet);
      } catch (error) {
        console.error("[LAN] Could not apply relay packets", error);
        leave("Co-op synchronization failed. Check this browser console for details.");
        return;
      }
      setTimeout(() => poll(epoch), connected ? 0 : 230);
    }
    async function joinRoom(mode) {
      const code = codeInput.value.trim();
      if (mode === "join" && !/^\d{6}$/.test(code)) {
        status.textContent = "Enter a six-digit room code.";
        return;
      }
      if (raptors.length < 9) {
        status.textContent = "This build needs the nine campaign Raptor slots.";
        return;
      }
      game.audio?.resume?.();
      const epoch = ++generation;
      hostButton.disabled = joinButton.disabled = enter.disabled = true;
      cancel.hidden = false;
      difficultyInput.disabled = true;
      status.textContent = mode === "host" ? "Creating room..." : "Joining room...";
      try {
        const result = await api(mode, mode === "join" ? { code, protocol: 2 } : { protocol: 2 });
        if (epoch !== generation) { api("leave", { ...result, intent: "cancel-setup" }).catch(() => {}); return; }
        role = mode;
        credentials = result;
        status.textContent = mode === "host" ? `Room code: ${result.code} · Waiting for a teammate` : "Connecting...";
        poll(epoch);
      } catch (error) {
        if (epoch === generation) leave(error.message);
      }
    }
    hostButton.onclick = () => joinRoom("host");
    joinButton.onclick = () => {
      entry.hidden = cancel.hidden = false;
      hostButton.disabled = joinButton.disabled = true;
      codeInput.focus();
    };
    enter.onclick = () => joinRoom("join");
    cancel.onclick = () => leave("", "cancel-setup");
    node("[data-leave]").onclick = () => leave("", "leave-button");

    function respawn() {
      reloadTime = -1;
      player.reset({ pos: new W(role === "host" ? -2 : 2, 0, level.arena.B - 8), yaw: 0 });
      weapon.reset?.();
    }
    function respawnGuest() {
      guestReviveId++;
      remote.health = peerMaxHealth();
      remote.alive = true;
      remote.pos.set(2, 0, level.arena.B - 8);
      remote.eye.copy(remote.pos).y += 1.6;
      remote.hurtAt = -Infinity;
      remote.reload = -1;
    }

    function simulate(dt, now) {
      if (!player.alive && !remote.alive) {
        phase = "defeat";
        reason = "Both players are down";
        return;
      }
      if (hostRevive.update(player.alive, remote.alive, dt)) respawn();
      if (guestRevive.update(remote.alive, player.alive, dt)) respawnGuest();
      if (remote.alive && now - remote.hurtAt >= 1000 * (player.tuning?.regenDelay ?? 4)) {
        remote.health = Math.min(peerMaxHealth(), remote.health + (player.tuning?.regenRate ?? 25) * dt);
      }
      if (phase === "entry" &&
          [player, remote].some(unit => unit.alive && unit.pos.z < level.arena.B - 1.15)) phase = "active";
      if (phase === "active") {
        if (!campaign.update(dt) && phase === "active") phase = "defeat";
        if (phase === "active") {
          game.enemies.update(dt);
          if (player.alive && game.character?.weapon?.viewmodel === "raven" && input.pressed("alt")) {
            if (!sentries.placeIce(player, "host")) hud.message("Cannot deploy an ice sentry here", 1.4);
          }
          if (player.alive && localTriplet && input.pressed("alt")) {
            const error = game.woodAnkylos.deploy(player, "host");
            if (error) hud.message(error, 1.4);
          }
          sentries.update(dt);
        }
      }
    }
    function drawRemoteEffects(dt) {
      for (const [pos, dir, settings, hit, normal] of remoteFlames) {
        flameJet?.(v3(pos), v3(dir), { ...settings, dt, hit: v3(hit), normal: v3(normal) });
      }
      for (const beam of replicaBeams.values()) {
        if (!beam.frame) {
          beam.hide();
          continue;
        }
        const [, , mode, pos, dir, strength, normal] = beam.frame;
        const mouth = v3(pos);
        if (mode === "fan") {
          beam.fan?.(mouth, dir.map(end => ({ end: v3(end) })), dt);
          continue;
        }
        const direction = v3(dir);
        if (mode === "charge") beam.charge(mouth, direction, strength, dt);
        else beam.fire(mouth, direction, strength,
          normal ? { point: mouth.clone().addScaledVector(direction, strength), normal: v3(normal) } : null, dt);
      }
    }
    function update(dt) {
      if (!connected) return false;
      if (connectionPaused()) {
        matchText.textContent = peerActive ? "Reconnecting to the LAN relay…" : "Waiting for teammate to reconnect…";
        return false;
      }
      if (reloadTime >= 0) {
        reloadTime = player.alive && weapon.state === "reloading" ? reloadTime + dt : -1;
      }
      const now = performance.now();
      const running = phase === "active" || phase === "entry";
      if (role === "host") {
        flameFrames = [];
        if (running) simulate(dt, now);
      } else {
        playback(dt);
        game.enemies.lanApply(frameAnkylos, dt);
        game.woodAnkylos.apply(frameWoodAllies, dt);
        drawRemoteEffects(dt);
        for (const unit of raptors) unit.lanAnimate(dt);
        if (phase === "active") {
          defense.updateAmmoPickup();
          if (player.alive && game.character?.weapon?.viewmodel === "raven" && input.pressed("alt"))
            send({ type: "deployIce", pose: pose() });
          if (player.alive && localTriplet && input.pressed("alt"))
            send({ type: "deployWood", pose: pose() });
          if (player.alive && input.pressed("deploySentry")) send({ type: "deploy", pose: pose() });
          if (transportReady && player.alive && transport.nearby(player.pos)) {
            hud.setPrompt("[2] Extract", 0, "status");
            if (input.pressed("secureTransport")) send({ type: "extract", pose: pose() });
          }
        }
      }
      if (now >= nextSend) {
        nextSend = now + 55;
        send(role === "host" ? { type: "world", hostPose: pose(), hostAlive: player.alive,
          guestHealth: remote.health, guestHit: remote.hit, guestReviveId,
          guestReviveSeconds: guestRevive.seconds(), phase, reason, hud: worldHud,
          stage: campaign.stage, wave: campaign.wave, stageStarted, transportReady,
          raptors: raptors.map(unit => unit.lanSnapshot()), sentries: sentries.lanSnapshot(),
          woodAllies: game.woodAnkylos.snapshot(),
          ankylos: game.enemies.lanSnapshot(), gigas: game.gigas.map(unit => unit.lanSnapshot()),
          spino: game.spino.lanSnapshot(),
          beams: [...beamFrames], flames: flameFrames }
          : { type: "pose", pose: pose() });
      }
      const triplet = remote.triplet === true;
      loadAlly(triplet);
      const ally = avatars.get(triplet);
      for (const model of avatars.values()) model.root.visible = model === ally;
      capsule.visible = indicator.visible = !ally;
      avatar.visible = remote.alive || Boolean(ally);
      ally?.update(dt, { ...remote, dead: !remote.alive });
      if (remote.reload >= 0)
        remote.reload = Math.min(2.5, remote.reload + dt * 2.5 / peerWeapon().reloadSeconds);
      avatar.position.lerp(remote.pos, Math.min(1, dt * 19));
      indicator.rotation.set(remote.pitch, remote.yaw, 0, "YXZ");
      const ended = phase === "victory" || phase === "defeat";
      if (ended && !displayedEnd) {
        displayedEnd = true;
        clearReplicas();
        hud.setPrompt(null);
        game.events.emit("game:state", { state: phase === "victory" ? "complete" : "dead" });
        if (phase === "victory") game.events.emit("arena:music", { track: "ambient" });
      }
      const observing = !player.alive && remote.alive && !ended;
      const label = !synced ? "Synchronizing…" : phase === "entry" ? "Enter the arena"
        : phase === "victory" ? "Challenge Complete! · Team extracted"
        : phase === "defeat" ? (reason || "Mission failed")
        : transportReady ? "Board the transport · [2] Extract"
        : `Stage ${role === "host" ? campaign.stage : worldHud.stage} · Wave ${role === "host" ? campaign.wave : worldHud.wave}`;
      const seconds = role === "host" ? hostRevive.seconds() : guestReviveSeconds;
      const spectating = !observing ? "" : seconds === null ? " · Respawn at the next stage"
        : ` · Respawning in ${seconds}s`;
      const text = `${role === "host" ? "HOST" : "GUEST"} · ${label}${spectating} · ${lanPing}ms`;
      if (matchText.textContent !== text) matchText.textContent = text;
      weapon.setVisible?.(!observing && !ended);
      if (observing) {
        if (spectatorYaw === null) spectatorYaw = remote.yaw;
        const turn = remote.yaw - spectatorYaw;
        spectatorYaw += Math.atan2(Math.sin(turn), Math.cos(turn)) * (1 - Math.exp(-12 * dt));
        // Follow the rendered teammate, whose position is interpolated every frame.
        // Use a fixed height above their feet so their first-person bob stays local.
        spectatorPivot.copy(avatar.position).y += 1.6;
        aim.set(-Math.sin(spectatorYaw), 0, -Math.cos(spectatorYaw));
        follow.copy(spectatorPivot).addScaledVector(aim, -2.3).y += .85;
        game.camera.position.copy(follow);
        game.camera.lookAt(spectatorPivot.addScaledVector(aim, 3));
      } else {
        spectatorYaw = null;
      }
      if (ended || observing) {
        player.enabled = false;
        input.setGameplay?.(false);
        input.exitLock?.();
        return false;
      }
      if (player.alive && !player.enabled) {
        player.enabled = true;
        input.setGameplay?.(true);
      }
      return true;
    }
    return session;
  }