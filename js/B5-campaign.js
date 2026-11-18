// LAN_CAMPAIGN_FULL
// LAN_CAMPAIGN_STAGE_ONE
  function createArenaCampaign(game, finish, failTransport, coOp) {
    const { defense, spino, gigas = [], level, player, hud } = game;
    const { raptors, transport } = defense;
    const units = [...raptors, ...gigas, spino];
    const { A, B } = level.arena;
    const gates = {
      north: new W(0, 0, -B + 4),
      west: new W(-A + 5, 0, 0),
      east: new W(A - 5, 0, 0),
      south: new W(0, 0, B - 4),
    };
    const raptor = (side, hp = 180, scale = 1, targetPlayer = false) => ({ kind: "raptor", side, hp, scale, targetPlayer });
    const ankylo = (side, size, hp, count, childHp, boss = false) => ({ kind: "ankylosaurus", side, size, hp, count, childHp, boss });
    const giga = (side, hp = 5500, variant = "normal", giant = false) => ({ kind: "giga", side, hp, variant, giant });
    const ring = ["north", "west", "east"];
    const flanks = ["west", "east", "south"];
    const pack = (sides, count, targetPlayer = false) =>
      sides.flatMap(side => Array.from({ length: count }, () => raptor(side, 180, 1, targetPlayer)));
    const stages = [
      [
        pack(ring, 2),
        [...pack(["west", "east"], 3), ...pack(["south"], 2), raptor("south", 3600, 2, true)],
        pack(ring, 1),
        [...ring.map(side => raptor(side, 320, 3)), ...pack(ring, 2)],
      ],
      [
        [...ring.map(side => ankylo(side, 4, 1230, 2, 345)), ...pack(flanks, 2, true)],
        [ankylo("west", 6, 1500, 2, 500), ankylo("east", 6, 1500, 2, 500),
          ankylo("south", 8, 5500, 3, 550, true), ...pack(flanks, 2, true)],
      ],
      [
        [giga("west"), giga("east"), ankylo("south", 4, 1230, 2, 345), ankylo("south", 4, 1230, 2, 345)],
        [giga("north", 33000, "purple", true), giga("south", 33000, "yellow", true)],
      ],
      [
        [
          giga("south"), giga("south", 22000, "purple"), giga("south", 22000, "yellow"),
          ankylo("north", 4, 1230, 2, 345), ankylo("north", 8, 2000, 3, 550),
          raptor("north", 180, 1, true), raptor("north", 180, 1, true), raptor("north", 3600, 3, true),
          giga("west", 30000, "purple", true), giga("east", 30000, "yellow", true),
        ],
        [{ kind: "spino", side: "east", hp: 70000 }],
      ],
    ];
    const lines = {
      deploy: "Don't just stand there, Private! Slam [1] to deploy a sentry gun!",
      ankylo: "Contact! Mecha ankylos inbound! Watch out for those dorsal turrets!",
      giga: "Are you seeing this?! Two massive fire-breathing Gigas! Break out of that pincer before they roast you!",
      purple: "What is that roar?! Oh hell—two giant Mecha-Gigas, one purple and one yellow lightning! They're twice the size of the others!",
      mixed: "All of them at once?! How did we get here, huh?",
      spino: "This is it, Private—the alpha of them all! Bring down that Spinosaurus and we go home!",
      firstCall: "Did that roar just summon a purple AND a yellow Giga?! Focus the Spino before they overwhelm you!",
      halfCall: "It's below half health and calling for backup! Two Gigas just spawned on the West and East flanks—watch your sides, Private!",
      repeatCall: "What?! That wasn't in our intel! Ignore the Gigas—focus on the Apex Spinosaurus!",
      repeatAgain: "What the—?! It can do that again?!",
      extract: "Target neutralized! Outstanding work, Private. Head back to the rig and press [2] to extract!",
    };
    function radio(key) {
      const clip = key === "purple" ? gigaDuoVoice : handlerAudio[key];
      coOp?.radio(lines[key], (clip?.seconds ?? 4.5) + .25, clip ? key : null);
      if (key === "firstCall") hud.radio(lines[key], 5);
      else hud.radio(lines[key], (clip?.seconds ?? 4.5) + .25, clip ? key : null);
    }
    function queueReinforcements(specs, line) {
      // SPINO_BOUND_GIGAS_V1: only the pair summoned at half health.
      if (line === "halfCall") for (const spec of specs) {
        spec.hp = 5000000;
        spec.giant = true;
        spec.spinoBound = true;
      }
      const batch = { remaining: specs.length, line };
      for (const spec of specs) pending.push({ ...spec, batch, delay: 0 });
    }
    const ankyloAlive = new Map();
    const pending = [];
    const spinoBoundGigas = new Set();
    const mixedSlots = [...gigas.slice(3, 6), ...gigas.slice(16, 18)];
    const minionSlots = gigas.slice(6, 10);
    const giantSlots = gigas.slice(10, 12);
    const normalSlots = gigas.slice(12, 14);
    const duoSlots = gigas.slice(14, 16);
    const duo = [];
    let normalSlotPending = false;
    function requestNormalSlot() {
      if (normalSlotPending || !game.createReinforcementGiga) return;
      normalSlotPending = true;
      game.createReinforcementGiga().then(unit => {
        normalSlots.push(unit);
        gigas.push(unit);
        units.push(unit);
      }).catch(error => console.error("[campaign] Could not add Giga reserve", error))
        .finally(() => { normalSlotPending = false; });
    }
    const coloredPair = () => [
      { ...giga("north", 5500, "purple"), reinforcement: "minion" },
      { ...giga("south", 5500, "yellow"), reinforcement: "minion" },
    ];
    let stage, wave, countdown, extract, active, boss, summoned, entryElapsed, deployAnnounced, ankyloAnnounced;
    let purpleSummons;
    function reset() {
      purpleSummons = 0;
      duo.length = 0;
      game.events.emit("arena:music", { track: null });
      stage = wave = 0;
      countdown = 12;
      entryElapsed = 0;
      deployAnnounced = ankyloAnnounced = false;
      extract = active = summoned = false;
      boss = null;
      ankyloAlive.clear();
      pending.length = 0;
      spinoBoundGigas.clear();
      transport.health = 100;
      transport.setReady(false);
      hud.setStageCountdown(null);
      hud.setBossHealth(null);
      hud.setTransportHealth(null);
      for (const unit of units) unit.reset();
    }
    function openPoint(origin, occupied = []) {
      const nav = game.physics.nav;
      for (const distance of [0, 2, 4, 6, 9, 12, 16, 22, 28]) {
        for (let index = 0; index < (distance ? 16 : 1); index++) {
          const angle = index * Math.PI / 8;
          const point = origin.clone().add(new W(Math.sin(angle) * distance, 0, Math.cos(angle) * distance));
          if (point.distanceToSquared(player.pos) > 9 &&
              occupied.every(other => point.distanceToSquared(other) > 6.25) &&
              nav.isWalkable(point.x, point.z) && nav.findPath(point, transport.goal)) return point;
        }
      }
      return null;
    }
    function spawn(spec) {
      const occupied = [...ankyloAlive.keys()].map(enemy => enemy.pos);
      for (const unit of raptors) if (unit.alive) occupied.push(unit.position);
      for (const unit of gigas) if (unit.alive) occupied.push(unit.position);
      const pos = openPoint(spec.pos || gates[spec.side], occupied);
      if (!pos) return false;
      const hp = spec.spinoBound ? 5000000 : Math.max(1, Math.round(spec.hp * (game.runDifficulty?.enemyHealth ?? 1)));
      if (spec.kind === "raptor") {
        const unit = raptors.find(raptor => !raptor.started || raptor.done);
        if (!unit) return false;
        unit.start(pos, { ...spec, hp: Math.max(1, Math.round(spec.hp * (game.runDifficulty?.enemyHealth ?? 1))) });
      } else if (spec.kind === "ankylosaurus") {
        const enemy = game.enemies.spawn("ankylosaurus", pos, { size: spec.size, hp,
          state: "alert", target: player.pos, damageScale: spec.size === 1 ? .2 : 1,
          yaw: Math.atan2(player.pos.x - pos.x, player.pos.z - pos.z) });
        if (!enemy) return false;
        ankyloAlive.set(enemy, spec);
        if (stage === 1 && !ankyloAnnounced) {
          ankyloAnnounced = true;
          radio("ankylo");
        }
        if (spec.boss) boss = { unit: enemy, hp, kind: spec.kind };
      } else if (spec.kind === "giga") {
        const slots = spec.reinforcement === "minion" ? minionSlots
          : spec.reinforcement === "giant" ? giantSlots
          : spec.reinforcement === "normal" ? normalSlots
          : stage === 3 ? mixedSlots : wave === 1 ? duoSlots : gigas.slice(0, 3);
        const unit = slots.find(giga => giga.available)
          || (spec.reinforcement && slots.find(giga => giga.done));
        if (!unit) {
          if (spec.reinforcement === "normal") requestNormalSlot();
          return false;
        }
        unit.start(pos, hp, { ...spec, corpse: 15 });
        if (spec.spinoBound) spinoBoundGigas.add(unit);
        if (stage === 2 && wave === 1) duo[spec.variant === "yellow" ? 1 : 0] = unit;
      } else {
        spino.start(pos, position => {
          summoned = true;
          purpleSummons = 1;
          boss = { unit: spino, hp, kind: spec.kind };
          queueReinforcements(coloredPair().map((minion, index) => ({
            ...minion, pos: position.clone().add(new W(-6, 0, index ? 10 : -10)),
          })), "firstCall");
        }, hp, () => {
          queueReinforcements([
            { ...giga("west", 7000, "purple", true), reinforcement: "giant" },
            { ...giga("east", 7000, "yellow", true), reinforcement: "giant" },
          ], "halfCall");
        });
      }
      return true;
    }
    game.events.on("enemy:killed", ({ enemy, turretPos }) => {
      const spec = ankyloAlive.get(enemy);
      if (!spec) return;
      ankyloAlive.delete(enemy);
      const origin = enemy.pos.clone();
      const scale = spec.size === 1 ? .9 : 2.3;
      game.fx?.explosion?.(turretPos || origin, scale, { customAudio: spec.size !== 1 });
      coOp?.ankyloExplosion(turretPos || origin, scale, spec.size !== 1);
      for (let index = 0; index < (spec.count || 0); index++) {
        const angle = enemy.yaw + index * Math.PI * 2 / spec.count;
        pending.push({ kind: "ankylosaurus", size: 1, hp: spec.childHp, delay: .5,
          pos: origin.clone().add(new W(Math.sin(angle) * 4, 0, Math.cos(angle) * 4)) });
      }
    });
    function objective() {
      if (stage === 0) return "Eliminate all threats. Secure the downed transport";
      if (stage === 1) return "You are the objective. Scrap those mecha ankylos or die trying.";
      if (stage === 2) return wave === 0
        ? "Survive the inferno. Extinguish the blazing Giganotosauruses or become ash"
        : "The inferno isn't over. Shut down both giant Mecha-Gigas!";
      return "How Did We Get Here?";
    }
    function queueWave() {
      if (wave === 0) coOp?.stageStarted(stage + 1);
      const specs = [...stages[stage][wave]];
      if (stage < 2) {
        for (let index = specs.length - 1; index > 0; index--) {
          const other = Math.floor(game.rng() * (index + 1));
          [specs[index], specs[other]] = [specs[other], specs[index]];
        }
      }
      specs.forEach((spec, index) => pending.push({ ...spec, delay: stage < 2 ? index * .35 : 0 }));
      boss = null;
      active = true;
      hud.setStageCountdown(null);
      game.events.emit("arena:music", {
        track: stage === 3 && wave === 1 ? null : "combat",
        gain: stage === 3 ? .65 : 1,
      });
      hud.setObjective(objective());
      if (stage === 2) radio(wave === 0 ? "giga" : "purple");
      if (stage === 3) radio(wave === 0 ? "mixed" : "spino");
      hud.message("Stage " + (stage + 1) + " / 4 · Wave " + (wave + 1) + " / " + stages[stage].length, 2.5);
    }
    function update(dt) {
      hud.setTransportHealth(stage === 0 ? transport.health : null);
      if (stage === 0 && wave === 0) {
        if (entryElapsed === 0) {
          hud.setObjective(objective());
          game.events.emit("arena:music", { track: "ambient" });
        }
        entryElapsed += dt;
        if (!deployAnnounced && entryElapsed >= 4 - 1e-8) {
          deployAnnounced = true;
          radio("deploy");
        }
      }
      if (extract) {
        if (coOp?.extract()) { finish(); return false; }
        for (const unit of gigas) if (unit.started) unit.update(dt);
        defense.updateAmmoPickup();
        if (transport.nearby(player.pos)) {
          hud.setPrompt("[2] Extract", 0, "status");
          if (player.alive && game.input.pressed("secureTransport")) { finish(); return false; }
        }
        return true;
      }
      defense.updateAmmoPickup();
      if (!active) {
        countdown -= dt;
        if (countdown > 1e-8) {
          if (wave === 0) hud.setStageCountdown(stage + 1, Math.ceil(countdown - 1e-8));
          for (const unit of units) if (unit.started) unit.update(dt);
          return true;
        }
        queueWave();
      }
      for (let index = 0; index < pending.length;) {
        const spec = pending[index];
        spec.delay -= dt;
        if (spec.delay <= 0 && spawn(spec)) {
          pending.splice(index, 1);
          if (spec.batch && --spec.batch.remaining === 0) radio(spec.batch.line);
        }
        else index++;
      }
      for (const unit of units) {
        if (!(coOp ? coOp.alive() : player.alive)) break;
        if (unit.started) unit.update(dt);
      }
      if (!(coOp ? coOp.alive() : player.alive)) return false;
      if (stage === 0 && transport.health <= 0) { failTransport(); return false; }
      if (summoned && spino?.alive && !minionSlots.some(unit => unit.alive) &&
          !pending.some(spec => spec.reinforcement === "minion")) {
        spino.summonReinforcements(() => {
          const specs = coloredPair();
          if (++purpleSummons >= 3) {
            for (const side of ["west", "east"]) {
              specs.push({ ...giga(side, 3500, "normal"), reinforcement: "normal" });
            }
          }
          queueReinforcements(specs, purpleSummons === 2 ? "repeatCall" : "repeatAgain");
        });
      }
      if (spino?.started && spino.done) {
        for (let index = pending.length-1; index >= 0; index--) {
          if (pending[index].spinoBound) pending.splice(index,1);
        }
        for (const unit of spinoBoundGigas) if (unit.alive) unit.endWithSpino();
        spinoBoundGigas.clear();
      }
      if (stage === 2 && wave === 1) {
        const showDuo = duo[0] && duo[1] && duo.every(unit => !unit.invulnerable);
        const visible = showDuo && duo.some(unit => unit.alive);
        hud.setBossHealth(visible ? {
          variant: "duo", left: duo[0].health / duo[0].maxHealth, right: duo[1].health / duo[1].maxHealth,
        } : null);
      } else {
        const hp = boss && !boss.unit.invulnerable && (boss.kind === "ankylosaurus"
          ? (ankyloAlive.has(boss.unit) ? boss.unit.hp : 0) : boss.unit.health);
        const fill = hp > 0 ? hp / boss.hp : null;
        hud.setBossHealth(fill != null && boss.kind === "spino"
          ? { variant: "spino", left: fill, right: fill } : fill);
      }
      if (pending.length || ankyloAlive.size || raptors.some(unit => unit.alive) ||
          gigas.some(unit => unit.alive) || (spino?.started && (!summoned || !spino.done))) return true;

      if (stage === 2 && wave === 1 && !duo.every(unit => unit.done)) return true;
      if (stage === 3 && wave === 1) {
        extract = true;
        coOp?.readyToExtract();
        game.events.emit("arena:music", { track: "ambient" });
        transport.setReady(true);
        hud.setObjective("Board the transport. Press to extract.");
        radio("extract");
        return true;
      }
      active = false;
      game.events.emit("arena:music", { track: "ambient" });
      countdown = stage === 3 && wave === 0 ? 6 : 2;
      if (++wave === stages[stage].length) {
        stage++;
        wave = 0;
        countdown = 15;
      }
      return true;
    }
    return { reset, update, get stage() { return stage + 1; }, get wave() { return wave + 1; } };
  }
