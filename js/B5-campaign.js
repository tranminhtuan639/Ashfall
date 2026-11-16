  function createArenaCampaign(game, finish, failTransport) {
    const { defense, spino, gigas, level, player, hud } = game;
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
    const giga = (side, hp = 3500, purpleBoss = false, introRoar = false, boss = false) => ({ kind: "giga", side, hp, purpleBoss, introRoar, boss });
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
          ankylo("south", 8, 2000, 3, 550, true), ...pack(flanks, 2, true)],
      ],
      [
        [giga("west"), giga("east"), ankylo("south", 4, 1230, 2, 345), ankylo("south", 4, 1230, 2, 345)],
        [giga("north", 7000, true, true, true)],
      ],
      [
        [...pack(["north", "east"], 1, true), raptor("south", 3600, 3, true),
          ankylo("west", 4, 1230, 2, 345), ankylo("south", 8, 2000, 3, 550),
          giga("east"), giga("south", 4000, true, true)],
        [{ kind: "spino", side: "east", hp: 30000 }],
      ],
    ];
    const lines = {
      deploy: "Don't just stand there, Private! Slam [1] to deploy a sentry gun!",
      ankylo: "Contact! Mecha ankylos inbound! Watch out for those dorsal turrets!",
      giga: "Are you seeing this?! Two massive fire-breathing Gigas! Break out of that pincer before they roast you!",
      purple: "Wait... what is that roar?! Oh hell—a massive purple Mecha-Giga! That thing's twice the size of the others!",
      mixed: "All of them at once?! How did we get here, huh?",
      spino: "This is it, Private—the alpha of them all! Bring down that Spinosaurus and we go home!",
      firstCall: "Did that roar just summon TWO purple Gigas?! Focus the Spino before they overwhelm you!",
      halfCall: "It's below half health and calling for backup! Two Gigas just spawned on the West and East flanks—watch your sides, Private!",
      repeatCall: "What?! That wasn't in our intel! Ignore the Gigas—focus on the Apex Spinosaurus!",
      repeatAgain: "What the—?! It can do that again?!",
      extract: "Target neutralized! Outstanding work, Private. Head back to the rig and press [2] to extract!",
    };
    function radio(key) {
      hud.radio(lines[key], handlerAudio[key].seconds + .25, key);
    }
    function queueReinforcements(specs, line) {
      const batch = { remaining: specs.length, line };
      for (const spec of specs) pending.push({ ...spec, batch, delay: 0 });
    }
    const ankyloAlive = new Map();
    const pending = [];
    const purpleSlots = gigas.slice(5, 9);
    let stage, wave, countdown, extract, active, boss, summoned, entryElapsed, deployAnnounced, ankyloAnnounced;
    let purpleSummons;
    function reset() {
      purpleSummons = 0;
      game.events.emit("arena:music", { track: null });
      stage = wave = 0;
      countdown = 12;
      entryElapsed = 0;
      deployAnnounced = ankyloAnnounced = false;
      extract = active = summoned = false;
      boss = null;
      ankyloAlive.clear();
      pending.length = 0;
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
      const pos = openPoint(spec.pos || gates[spec.side], occupied);
      if (!pos) return false;
      if (spec.kind === "raptor") {
        const unit = raptors.find(raptor => !raptor.started || raptor.done);
        if (!unit) return false;
        unit.start(pos, spec);
      } else if (spec.kind === "ankylosaurus") {
        const enemy = game.enemies.spawn("ankylosaurus", pos, { size: spec.size, hp: spec.hp,
          state: "alert", target: player.pos, damageScale: spec.size === 1 ? .2 : 1,
          yaw: Math.atan2(player.pos.x - pos.x, player.pos.z - pos.z) });
        if (!enemy) return false;
        ankyloAlive.set(enemy, spec);
        if (stage === 1 && !ankyloAnnounced) {
          ankyloAnnounced = true;
          radio("ankylo");
        }
        if (spec.boss) boss = { unit: enemy, hp: spec.hp, kind: spec.kind };
      } else if (spec.kind === "giga") {
        const slots = spec.reinforcement === "purple" ? purpleSlots
          : spec.reinforcement === "normal" ? gigas.slice(9) : stage === 3 ? gigas.slice(3, 5) : gigas.slice(0, 3);
        const unit = slots.find(giga => giga.available);
        if (!unit) return false;
        unit.start(pos, spec.hp, { ...spec, corpse: 15, invulnerableIntro: spec.boss || !!spec.reinforcement });
        if (spec.boss) boss = { unit, hp: spec.hp, kind: spec.kind };
      } else {
        spino.start(pos, position => {
          summoned = true;
          purpleSummons = 1;
          boss = { unit: spino, hp: spec.hp, kind: spec.kind };
          queueReinforcements([-10, 10].map(z => ({
            ...giga("east", 5500, true, true), pos: position.clone().add(new W(-6, 0, z)),
            reinforcement: "purple",
          })), "firstCall");
        }, spec.hp, () => {
          queueReinforcements(["east", "west"].map(side => ({
            ...giga(side, 3500, false, true), reinforcement: "normal",
          })), "halfCall");
        });
      }
      return true;
    }
    game.events.on("enemy:killed", ({ enemy, turretPos }) => {
      const spec = ankyloAlive.get(enemy);
      if (!spec) return;
      ankyloAlive.delete(enemy);
      const origin = enemy.pos.clone();
      game.fx?.explosion?.(turretPos || origin, spec.size === 1 ? .9 : 2.3, { customAudio: spec.size !== 1 });
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
        : "The inferno isn't over. Shut down the purple beast!";
      return "How Did We Get Here?";
    }
    function queueWave() {
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
        for (const unit of gigas) if (unit.started) unit.update(dt);
        defense.updateAmmoPickup();
        if (transport.nearby(player.pos)) {
          hud.setPrompt("[2] Extract", 0, "status");
          if (game.input.pressed("secureTransport")) { finish(); return false; }
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
        if (!player.alive) return false;
        if (unit.started) unit.update(dt);
      }
      if (!player.alive) return false;
      if (stage === 0 && transport.health <= 0) { failTransport(); return false; }
      if (summoned && spino.alive && !purpleSlots.some(unit => unit.alive) &&
          !pending.some(spec => spec.reinforcement === "purple")) {
        spino.summonReinforcements(() => {
          queueReinforcements(["north", "south"].map(side => ({
            ...giga(side, 5500, true, true), reinforcement: "purple",
          })), ++purpleSummons === 2 ? "repeatCall" : "repeatAgain");
        });
      }
      const hp = boss && !boss.unit.invulnerable && (boss.kind === "ankylosaurus" ? (ankyloAlive.has(boss.unit) ? boss.unit.hp : 0) : boss.unit.health);
      hud.setBossHealth(hp > 0 ? hp / boss.hp : null);
      if (pending.length || ankyloAlive.size || raptors.some(unit => unit.alive) ||
          gigas.some(unit => unit.alive) || (spino.started && (!summoned || !spino.done))) return true;

      if (stage === 2 && wave === 1 && !boss?.unit.done) return true;
      if (stage === 3 && wave === 1) {
        extract = true;
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
