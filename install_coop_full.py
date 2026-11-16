"""Install and optionally build the full LAN campaign from the Stage 1 co-op project."""
from pathlib import Path
import argparse
import re
import subprocess
import sys

bundle = Path(__file__).resolve().parent
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--check", action="store_true")
parser.add_argument("--build", action="store_true")
args = parser.parse_args()
root = Path.cwd()
changes = {}


def source(name):
    path = root / "js" / name
    return path, path.read_text(encoding="utf-8")


def edit(name, replacements):
    path, value = source(name)
    if "// LAN_CAMPAIGN_FULL" in value:
        return
    for before, after in replacements:
        value, count = re.subn(before, after if callable(after) else lambda _: after, value)
        expected = 3 if before == r"const player = game.player;" else 1
        if count != expected:
            raise ValueError(f"{name}: expected {expected} matches, got {count} for {before!r}")
    changes[path] = "// LAN_CAMPAIGN_FULL\n" + value


boss_snapshot = '''
      lanSnapshot() {
        if (!model.visible) return null;
        return [model.position.toArray(), model.rotation.y, state, enemy.hp,
          lanClip, action?.time ?? 0, lanSerial, EXTRA];
      },
      lanApply(snapshot) {
        if (!snapshot) { if (model.visible) reset(); return; }
        const [pos, yaw, nextState, hp, clip, time, serial, extra] = snapshot;
        PREPARE
        model.visible = true;
        model.position.fromArray(pos);
        model.rotation.y = yaw;
        state = nextState;
        enemy.hp = hp;
        enemy.alive = hp > 0;
        if (clip) {
          if (lanClip !== clip || lanSerial !== serial) play(clip);
          action.time = time;
          activeRig.mixer.update(0);
        }
        lanSerial = serial;
      },
'''
try:
    if "LAN_CAMPAIGN_STAGE_ONE" not in source("B5-campaign.js")[1]:
        raise ValueError("Install the Stage 1 LAN campaign first.")
    edit("C0-boot.js", [
        (r'i.lan !== "1" && await r\("giga"', 'await r("giga"'),
        (r'u\("player", p\), u\("weapon", p\), u\("enemies", p\)', 'u("player", p), u("weapon", p), i.lan !== "1" && u("enemies", p)'),
    ])
    edit("B5-campaign.js", [
        (r"const units = coOp \? \[\.\.\.raptors\] : \[\.\.\.raptors, \.\.\.gigas, spino\];",
         "const units = [...raptors, ...gigas, spino];"),
        (r"function queueWave\(\) \{", "function queueWave() {\n      if (wave === 0) coOp?.stageStarted(stage + 1);"),
        (r'if \(game.input.pressed\("secureTransport"\)\) \{ finish\(\); return false; \}',
         'if (player.alive && game.input.pressed("secureTransport")) { finish(); return false; }'),
        (r"      if \(extract\) \{", "      if (extract) {\n        if (coOp?.extract()) { finish(); return false; }"),
        (r"        extract = true;", "        extract = true;\n        coOp?.readyToExtract();"),
        (r"        if \(coOp\) coOp.stageCleared\(countdown\);\n", ""),
        (r"      game.fx\?\.explosion\?\.\(turretPos \|\| origin, spec.size === 1 \? .9 : 2.3, \{ customAudio: spec.size !== 1 \}\);",
         """      const scale = spec.size === 1 ? .9 : 2.3;
      game.fx?.explosion?.(turretPos || origin, scale, { customAudio: spec.size !== 1 });
      coOp?.ankyloExplosion(turretPos || origin, scale, spec.size !== 1);"""),
    ])
    edit("B0-ai-director-audio.js", [
        (r"const player = s.player;", "const player = s.lan?.target(m.pos) || s.player;"),
        (r"(s.combat.enemyShot\(m.muzzle, Po, \{)", "s.combat.enemyShot(m.muzzle, Po, { targetPlayer: T,"),
        (r"        _update\(T\) \{\n          m.alive \? S\(T\) : U\(T\);",
         '''        _lanSnapshot() {
          return [m.id, m.pos.toArray(), m.size, m.yaw, m.speed, m.tyaw, m.tpitch, m.hp];
        },
        _lanApply([, pos, size, yaw, speed, tyaw, pitch, hp], dt) {
          m.pos.fromArray(pos);
          m.yaw = yaw;
          a.group.rotation.y = yaw;
          m.hp = hp;
          visual.update(dt, speed, tyaw, pitch, false, 0, () => {});
        },
        _update(T) {
          m.alive ? S(T) : U(T);'''),
        (r"        aliveCount\(\) \{",
         '''        lanSnapshot() { return t.filter(unit => unit.alive).map(unit => unit._lanSnapshot()); },
        lanApply(snapshot, dt) {
          for (const unit of t.slice()) {
            if (!snapshot.some(([id]) => id === unit.id)) h.retire(unit);
          }
          for (const data of snapshot) {
            const [id, pos, size, yaw, , , , hp] = data;
            let unit = t.find(enemy => enemy.id === id);
            if (!unit) {
              unit = U.spawn("ankylosaurus", new W().fromArray(pos), { size, yaw, hp, passive: true });
              if (unit) unit.id = id;
            }
            unit?._lanApply(data, dt);
          }
        },
        aliveCount() {'''),
    ])
    edit("90-fx-gameplay.js", [
        (r"enemyShot\(n, s, \{ damage: o = 6, range: r = 200 \} = \{\}\)",
         "enemyShot(n, s, { damage: o = 6, range: r = 200, targetPlayer } = {})"),
        (r"c = i.player;\n          if \(c && c.alive\)", "c = targetPlayer || i.player;\n          if (c && c.alive)"),
    ])
    edit("AH-giganotosaurus.js", [
        (r"function play\(name\) \{", "let lanClip, lanSerial = 0;\n    function play(name) {\n      lanClip = name;\n      lanSerial++;"),
        (r"const player = game.player;", "const player = game.lan?.target(model.position) || game.player;"),
        (r"corpse = Infinity \} = \{\}\)", "corpse = Infinity, replica = false } = {})"),
        (r'        game.events.emit\("giga:roar", \{ pos: mouthAt\(\) \}\);',
         '        if (replica) return;\n        game.events.emit("giga:roar", { pos: mouthAt() });'),
        (r"      get available\(\)", boss_snapshot.replace("EXTRA", "[purple ? 'purple' : yellow ? 'yellow' : 'normal', giant, enemy.maxHp]").replace("PREPARE", '''if (!model.visible || purple !== (extra[0] === "purple") ||
            yellow !== (extra[0] === "yellow") || giant !== extra[1]) {
          this.start(model.position.fromArray(pos), extra[2], { variant: extra[0], giant: extra[1], replica: true });
          lanSerial = -1;
        }''') + "      get available()"),
    ])
    edit("AI-spinosaurus.js", [
        (r"function play\(name\) \{", "let lanClip, lanSerial = 0;\n    function play(name) {"),
        (r"      activeRig.mixer.stopAllAction\(\);\n      activeRig.rig.visible = false;",
         "      lanClip = name;\n      lanSerial++;\n      activeRig.mixer.stopAllAction();\n      activeRig.rig.visible = false;"),
        (r"      get beamFx\(\)", boss_snapshot.replace("EXTRA", "null").replace("        PREPARE\n", "") + "      get beamFx()"),
        (r"        target.copy\(game.player.pos\).setY\(game.player.pos.y \+ .95\);",
         "        const player = game.lan?.target(model.position) || game.player;\n        target.copy(player.pos).setY(player.pos.y + .95);"),
        (r"model.position.distanceTo\(game.player.pos\)", "model.position.distanceTo(player.pos)"),
        (r"findPath\(model.position, game.player.pos\)", "findPath(model.position, player.pos)"),
        (r"game.player.damage\(damage( \* damageMultiplier)? \* dt, mouth\);",
         lambda m: m[0].replace("game.player.damage(", "(game.lan?.target(model.position) || game.player).damage(")),
    ])
    edit("AJ-spino-beam.js", [
        (r"function createSpinoBeamFx\(game, yellow = false, boltsOnly = false\) \{",
         "function createSpinoBeamFx(game, yellow = false, boltsOnly = false, replica = false) {\n    let lanId;\n    const sync = frame => {\n      if (replica || !game.lan) return;\n      lanId ??= game.lan.allocateBeam();\n      game.lan.beam(lanId, frame);\n    };"),
        (r"    function hide\(\) \{", "    function hide() {\n      if (lanId != null) game.lan.beam(lanId, null);"),
        (r"    function charge\(mouth, aim, p, dt\) \{",
         '    function charge(mouth, aim, p, dt) {\n      sync([yellow, boltsOnly, "charge", mouth.toArray(), aim.toArray(), p]);'),
        (r"    function fire\(mouth, dir, length, hit, dt\) \{",
         '    function fire(mouth, dir, length, hit, dt) {\n      sync([yellow, boltsOnly, "fire", mouth.toArray(), dir.toArray(), length, hit?.normal?.toArray()]);'),
    ] + ([
        (r"    function fan\(mouth, arcs, dt\) \{",
         '    function fan(mouth, arcs, dt) {\n      sync([yellow, boltsOnly, "fan", mouth.toArray(), arcs.map(arc => arc.end.toArray())]);')
    ] if "function fan(mouth, arcs, dt)" in source("AJ-spino-beam.js")[1] else []))
    path, old = source("B7-lan-coop.js")
    changes[path] = (bundle / path.name).read_text(encoding="utf-8")
    relay = root / "ashfall_coop_server.py"
    changes[relay] = (bundle / relay.name).read_text(encoding="utf-8")
    if args.build:
        files = [root / "build.py", root / "index.template.html", root / "css/ui.css"]
        for path in (root / "js").glob("*.js"):
            value = changes.get(path)
            if value is None:
                value = path.read_text(encoding="utf-8")
            files.extend(root / item for item in re.findall(r"/\*@inline:([^*]+)\*/", value))
        missing = sorted({str(path.relative_to(root)) for path in files if not path.is_file()})
        if missing:
            raise ValueError("Project is missing build inputs: " + ", ".join(missing))
except (ValueError, OSError) as error:
    parser.exit(1, f"Cannot install: {error}\nNo files were changed.\n")

if not args.check:
    backup = root / "coop-full-backup"
    backup.mkdir(exist_ok=True)
    for path in changes:
        target = backup / path.name
        if path.exists() and not target.exists():
            target.write_bytes(path.read_bytes())
    for path, value in changes.items():
        path.write_text(value, encoding="utf-8", newline="")
print(("Compatible" if args.check else "Installed") + " — " + ", ".join(path.name for path in changes))
if args.build and not args.check:
    sys.exit(subprocess.call([sys.executable, "build.py", "dist/index.html"]))
