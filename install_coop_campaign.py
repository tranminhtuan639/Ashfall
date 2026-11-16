"""Install the Stage 1 LAN campaign on a project with the Arena LAN prototype."""
from pathlib import Path
import argparse
import re

bundle = Path(__file__).resolve().parent
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--project", type=Path, default=Path.cwd())
parser.add_argument("--check", action="store_true")
args = parser.parse_args()
root = args.project / "js"
changes = {}


def edit(name, replacements):
    path = root / name
    original = path.read_bytes()
    value = original.decode("utf-8").replace("\r\n", "\n")
    if "// LAN_CAMPAIGN_STAGE_ONE" in value:
        return
    for before, after in replacements:
        value, count = re.subn(before, lambda _: after, value)
        if count != 1:
            raise ValueError(f"{name}: expected one match, got {count} for {before!r}")
    changes[path] = (original, "// LAN_CAMPAIGN_STAGE_ONE\n" + value)


try:
    boot = (root / "C0-boot.js").read_text(encoding="utf-8")
    if "setupArenaLan(t)" not in boot:
        raise ValueError("C0-boot.js: Arena LAN prototype must already be installed")
    lan = root / "B7-lan-coop.js"
    original = lan.read_bytes()
    if b"function setupArenaLan(" not in original:
        raise ValueError("B7-lan-coop.js: expected the Arena LAN prototype")
    changes[lan] = (original, (bundle / "B7-lan-coop.js").read_text(encoding="utf-8"))

    edit("B5-campaign.js", [
        (r"function createArenaCampaign\(game, finish, failTransport\) \{",
         "function createArenaCampaign(game, finish, failTransport, coOp) {"),
        (r"const \{ defense, spino, gigas, level, player, hud \} = game;",
         "const { defense, spino, gigas = [], level, player, hud } = game;"),
        (r"const units = \[\.\.\.raptors, \.\.\.gigas, spino\];",
         "const units = coOp ? [...raptors] : [...raptors, ...gigas, spino];"),
        (r"unit.start\(pos, (spec|\{ \.\.\.spec, hp \})\);",
         "unit.start(pos, { ...spec, hp: Math.max(1, Math.round(spec.hp * (game.runDifficulty?.enemyHealth ?? 1))) });"),
        (r"if \(key === \"firstCall\"\) hud.radio",
         'coOp?.radio(lines[key], (clip?.seconds ?? 4.5) + .25, clip ? key : null);\n      if (key === "firstCall") hud.radio'),
        (r"if \(!player.alive\) return false;\n        if \(unit.started\) unit.update\(dt\);",
         "if (!(coOp ? coOp.alive() : player.alive)) break;\n        if (unit.started) unit.update(dt);"),
        (r"if \(!player.alive\) return false;\n      if \(stage === 0",
         "if (!(coOp ? coOp.alive() : player.alive)) return false;\n      if (stage === 0"),
        (r"if \(summoned && spino.alive", "if (summoned && spino?.alive"),
        (r"\(spino.started &&", "(spino?.started &&"),
        (r"if \(\+\+wave === stages\[stage\].length\) \{\n        stage\+\+;\n        wave = 0;\n        countdown = 15;",
         """if (++wave === stages[stage].length) {
        stage++;
        wave = 0;
        countdown = 15;
        if (coOp) coOp.stageCleared(countdown);"""),
    ])
    edit("AG-raptor-defense.js", [
        (r"yaw: model.rotation.y, phase: state, hp: raptor.hp", "yaw: model.rotation.y, phase: state, hp: raptor.hp, scale: size ?? 1, run: spawnSerial"),
        (r"(?=    return \{\n      get position\(\) \{ return raptor.pos; \})", "    let spawnSerial = 0;\n"),
        (r"huntsPlayer = targetPlayer;", "huntsPlayer = targetPlayer;\n        spawnSerial++;"),
        (r'raptor.alive = snapshot.phase !== "dying" && snapshot.phase !== "done";',
         'raptor.alive = snapshot.phase !== "ready" && snapshot.phase !== "dying" && snapshot.phase !== "done";\n        model.scale.setScalar(9 * snapshot.scale);'),
        (r"if \(state === snapshot.phase\) return;", "if (state === snapshot.phase && spawnSerial === snapshot.run) return;\n        spawnSerial = snapshot.run;"),
    ])
    edit("B6-sentry.js", [
        (r"function place\(\) \{\n      const \{ player, physics, level \} = game;",
         "function place(player = game.player) {\n      const { physics, level } = game;"),
        (r"      const base = new lt.Group\(\);",
         "      addSentry(position, forward, true);\n      return true;\n    }\n\n    let nextId = 0;\n    function addSentry(position, forward, authoritative, id = ++nextId) {\n      const base = new lt.Group();"),
        (r"(?m)^      (?:const limit = game.runDifficulty\?\.sentryLimit \?\? 4;\n      )?if \(sentries.length (?:=== 4|>= limit)\) remove\(sentries.shift\(\), true\);",
         "      const limit = game.runDifficulty?.sentryLimit ?? 4;\n      if (authoritative && sentries.length >= limit) remove(sentries.shift(), true);"),
        (r"sentries.push\(\{ base, pivot, cooldown: .2, followUp: null \}\);\n      return true;",
         "const sentry = { id, base, pivot, forward: forward.clone(), cooldown: .2, followUp: null };\n      sentries.push(sentry);\n      return sentry;"),
        (r'        game.audio\?\.play\?\.\("sentry_shot", \{ pos: muzzle, gain: .65 \}\);',
         '        game.audio?.play?.("sentry_shot", { pos: muzzle, gain: .65 });\n        game.lan?.sentryShot?.(muzzle, hit.point);'),
        (r"    return \{\n      reset\(\) \{",
         """    return {
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
      reset() {"""),
        (r"for \(const unit of \[\.\.\.game.defense.raptors, \.\.\.game.gigas, game.spino\]\) \{",
         "for (const unit of [...game.defense.raptors, ...(game.gigas || []), game.spino]) {"),
        (r"const target = unit.sentryTarget;", "const target = unit?.sentryTarget;"),
    ])
except (ValueError, OSError) as error:
    parser.exit(1, f"Cannot install: {error}\nNo files were changed.\n")

if not args.check:
    backup = args.project / "coop-campaign-backup"
    backup.mkdir(exist_ok=True)
    for path, (original, value) in changes.items():
        target = backup / path.name
        if not target.exists():
            target.write_bytes(original)
    for path, (_, value) in changes.items():
        path.write_text(value, encoding="utf-8", newline="")
print(("Compatible" if args.check else "Installed") + " — " + ", ".join(path.name for path in changes))
