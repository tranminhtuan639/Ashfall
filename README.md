# Ashfall

Ashfall is a single-player 3D first-person shooter set in an ash-covered Roman arena. Fight mechanized dinosaurs with an AK-47, resupply between firefights, and deploy automated sentries to cover multiple approaches.

*Based on Saltline by Felix Rieseberg.*

## Story

A fire in the research facility beneath the Colosseum sends ash drifting into the arena. The facility goes silent, but its mechanized dinosaurs begin surfacing through the old service tunnels. You're sent in to recover the mission recorder from the last evacuation transport. You find the vehicle stranded in the center of the arena, its engine dead and its crew gone.

Over the radio, your Handler talks you through restarting the transport while you hold off the machines. As the engine comes back online, the Handler picks up a command signal from the eastern tunnel. It's coming from the Spinosaurus, and every time it roars, more units answer. Bring it down, clear the arena, and get back to the transport before your way out is cut off.

## Play locally

Build the game with Python 3 from the project root:

```sh
python3 build.py
```

On Windows, use `python build.py` if Python is installed as `python`. Open `dist/saltline-stadium.html` in a WebGL-capable browser and select **Play**. If you already have the built HTML file, open it directly.

## Controls

| Input | Action |
| --- | --- |
| `W`, `A`, `S`, `D` | Move |
| Mouse | Look around |
| Left mouse button | Fire |
| Right mouse button | Aim down sights |
| `R` | Reload |
| `E` | Refill reserve ammunition near an ammo crate |
| `1` | Deploy a sentry at a valid location |
| `2` | Interact with the transport to extract after the final fight |
| `Esc` | Pause |

The main menu includes **Controls** for key bindings and **Intel** for enemy profiles.

## Campaign

The campaign spans four stages in one arena. You can deploy up to four sentries at once. Placing a fifth at a valid location replaces the oldest.

| Stage | Waves | Encounter |
| --- | ---: | --- |
| 1 | 4 | Defend the transport against Raptors that rush their targets and detonate at close range. |
| 2 | 2 | Fight Raptors and turret-equipped Ankylosauruses. Larger Ankylosauruses can split into smaller units when defeated. |
| 3 | 2 | Survive fire-breathing Giganotosauruses and their Ankylosaurus support, then face the purple Giganotosaurus. |
| 4 | 2 | Clear a mixed wave, defeat the Spinosaurus and its reinforcements, then return to the transport to extract. |

## Technical overview

JavaScript handles input, combat, enemy AI, and campaign progression in the browser. Three.js renders the arena through WebGL, and the Web Audio API handles music and sound effects. Player settings are stored in `localStorage`. No backend, server-side API, or database is required.

The build script bundles the HTML template, styles, scripts, and referenced assets into a single HTML file. The scripts in `js/` share a scope and are concatenated in filename order.

| Path | Purpose |
| --- | --- |
| `build.py` | Builds the standalone HTML file |
| `index.template.html`, `css/ui.css` | Page structure, menus, and HUD styles |
| `js/61-colosseum.js` | Arena geometry and layout |
| `js/A0-weapon-hud.js` | AK-47 and HUD logic |
| `js/B5-campaign.js`, `js/B6-sentry.js` | Campaign progression and sentry behavior |
| `data/` | Bundled models, animations, audio, and other asset data |

## Credits

Ashfall is based on [Saltline](https://claude.ai/artifact/BGY1SztrAYcJQHSsnHHGmp) by [Felix Rieseberg](https://github.com/felixrieseberg). Saltline provided the inspiration and starting codebase. Ashfall builds on that foundation with the Colosseum arena, a four-stage campaign, mechanized dinosaurs, and deployable sentries.
