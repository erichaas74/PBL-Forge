# 12 — Dragon Arena Combat: Realism Deep Dive

A working analysis of the dragon duel (champion trial / `/dragon-duel`), what limits
its realism today, and designs for kid-friendly input and a turn-based duel mode.

## How the arena works today

- **Bodies**: each dragon is ~21 rigid Cannon bodies joined by hinges/locks with
  motors (wing flap, jaw open/close) and spring hinges (legs, tail). Genetics
  reshapes the blueprint before spawn; joints realign to the scaled pivots.
- **Drive**: `dragon-attack` control mode applies forces to the core body every
  step. Attacks (bite/wing/tail) apply short force bursts to the head, wings, and
  tail bodies for ~0.36 s.
- **Damage**: contact-impact based — `(impactVelocity − 3) × 1.6`, capped at 12,
  rate-limited to one tick per 0.45 s per body; 1.5 s spawn grace; joints in the
  duel need 2× their break force to sever. Win = destroy the opponent's core.
- **AI**: strategy-block programs produce control frames from sensors (opponent
  direction/distance, stuck time, tipped time, wall proximity).

Fixed in this pass: combatant spawn rotation now rotates part _offsets_ rigidly
around the spawn point (previously only orientations rotated, so a 180°-turned
assembly spawned inside-out — which is why the duel's blue combatant had been
left facing away from its opponent). The duel scenario now faces blue toward red.

## Realism gaps, in priority order

### 1. Controls are world-space, not dragon-space

`applyPlayerControl` pushes the core along **world X** for "forward". The moment a
dragon turns, controls stop matching its body. The AI is immune (its throttle is
computed from world positions) but for players this is the single biggest feel
problem.

**Fix**: derive the drive vector from the core's quaternion (the code already does
this for attack direction in `getAttackDirection`). Forward = core facing;
steer = yaw torque. One function, transforms the entire feel.

### 2. Nothing keeps a dragon standing or facing its enemy

Real animals fight in a stance. Our dragons are passive ragdolls between inputs —
they slump, spin, and end up sideways, and "bite" fires in whatever direction the
core happens to point.

**Fix**: an upright/heading assist (small corrective torque toward vertical, and
optional soft auto-face toward the opponent when no steer input is held). This is
what every physics-creature game (Rain World, Gang Beasts, Stray Gods) does: the
ragdoll is _actuated_, not passive. ~30 lines in the physics service, huge payoff.

### 3. Attacks are shoves, not strikes

Bite/wing/tail apply forces; damage only happens if the resulting _collision_ is
fast enough. A bite that connects slowly does nothing, and there is no sense of a
"hit landing."

**Fix**: contact-window abilities. While `biteAttack` is active, any jaw-part
contact with an opponent deals ability damage (scaled by jaw genes) with its own
cooldown; wing buffet applies radial knockback; tail sweep deals arc damage. The
ability IDs (`bite`, `wing-buffet`, `tail-sweep`) already exist in the combat
profile — nothing reads them yet.

### 4. Genetics still doesn't reach the combat numbers

`generateDragonAssembly` computes a per-genome combat profile (armor from H/S
genes, damage from temperament) and `createEducationalAssembly` discards it. The
duel therefore plays identically for every genome. Passing `combatProfile`
through `materializeDragon` → `saveAssemblyAsset` closes the loop and makes trait
choices _matter_ in the fight — the core hook of the whole lab.

### 5. Feedback: telegraphs and hit reactions

Impacts happen silently between frames. Add, in rough order of value:

- **hit flash** (emissive pulse on the damaged part — the appearance system
  already supports per-part emissive overrides),
- **camera shake** scaled by damage tick,
- **attack telegraphs** (jaw opens wide before a bite lands: drive the existing
  jaw motor harder during the bite window),
- damage numbers or an event ticker (the store already logs damage events),
- sound (bite snap, wing whoosh, impact thud) — biggest bang-for-buck of all.

### 6. Flight and fire

- **Wings**: winged genotypes could get a _lift_ component while boosting (small
  sustained +y force per wing, so `WW`/`Ww` dragons hop and glide — visibly
  different movement from `ww`). Cheap, and it showcases the genotype.
- **Fire (F allele)**: a cone ability with a fuel/cooldown meter, particle cone
  from the snout, damage-over-time ticks. Bigger build; pairs with gap 3.

## Making it work for every kid

### Already available: on-screen touch pad

The arrow pad + attack buttons work on any touchscreen/Chromebook with a mouse.
Keep buttons ≥ 2.7 rem and pointer-hold based (they are).

### Now added: keyboard

`W A S D` / arrow keys move, `Shift` boosts, `J`/`K`/`L` = bite / wing / tail.
Keys are ignored while typing in a form field, and the on-screen buttons show
their key hints. The controls guide panel under the arena explains every control
in kid-readable language.

### Gamepad (optional, cheap to add)

The browser Gamepad API needs no dependencies: poll `navigator.getGamepads()` in
the existing RAF tick and merge into the same `ControlKey` set.

| Gamepad         | Action                |
| --------------- | --------------------- |
| Left stick      | move (throttle/steer) |
| A / bottom face | bite                  |
| X / left face   | wing buffet           |
| B / right face  | tail sweep            |
| Right trigger   | boost                 |

Works with any USB/Bluetooth controller on Chromebooks. Deadzone ~0.2.

### No hands on controls at all: strategy duel

The shared arena already has **strategy block programs** (move/sensor/logic
blocks producing control frames). A "coach mode" duel would let a student
assemble their dragon's _program_ before the fight, then watch both AIs battle.
That turns the duel into a planning exercise — often better classroom fit than a
reflex game, and it reuses `strategy-runner` and the block panel as-is.

## Turn-based duel design

The infrastructure already exists in the shared arena and is unused by the dragon
duel: `playMode: 'turn-based'`, `activeTeam`, `endTurn()`, and the **attack move
system** (`ATTACK_MOVE_CATALOG` + `attack-move-runner`) that plays scripted
sequences of steps (`aim`, `advance`, `bite`, …) through the physics engine.

### Proposed flow ("plan → watch → pass")

1. **Plan phase** (untimed): the active player picks up to 3 move cards —
   _Advance_, _Circle left/right_, _Retreat_, _Bite lunge_, _Wing buffet_,
   _Tail sweep_, _Brace_ (defensive: lowers stance, halves incoming knockback).
2. **Play phase** (~6 s): physics runs, the attack-move runner executes the
   scripted cards while the opponent's AI runs a mild defensive program.
3. **Pass**: `endTurn()` swaps `activeTeam`; on a shared device the laptop turns
   around. Both dragons keep their real positions and damage between turns —
   physics is the referee, so knockdowns and limb loss still emerge naturally.

### Genetics hooks (the point of the whole thing)

| Genotype             | Turn-based effect                                         |
| -------------------- | --------------------------------------------------------- |
| `W_`                 | unlocks _Wing buffet_ card (+ glide distance on Advance)  |
| `F_`                 | unlocks _Fire breath_ card (cone damage, 2-turn cooldown) |
| `H_`                 | _Brace_ card gains extra knockback resistance             |
| jaw/temperament loci | _Bite lunge_ damage multiplier                            |

Cards a dragon can't use appear greyed with the genotype reason — the same
pattern the wing-buffet button already uses (`Unavailable: wingless`).

### Why turn-based fits classrooms

- Removes reflex advantage — the genetics decisions dominate, not dexterity.
- One device per pair works (pass-and-plan), no controllers needed.
- Natural pause points for teacher talk ("why did the armored dragon survive
  that hit?").
- Real-time stays available as the "exhibition" mode; both run on the same
  physics, store, and damage rules.

## Suggested build order

1. ~~Body-relative drive + upright assist (gaps 1–2)~~ **Done.** Dragon drive is
   body-relative (forward = facing, steer = yaw); guidance sensors are expressed
   in the dragon's frame for `dragon-attack` combatants so strategy programs keep
   working; an upright-assist torque with spin damping keeps dragons standing;
   soft auto-face yaws toward the opponent whenever the player isn't steering.
2. ~~Combat-profile pass-through (gap 4)~~ **Done.** `DragonOffspring` carries its
   genome-derived `combatProfile`; the arena fights with those numbers, so horn
   genes now mean tougher, armored cores and temperament raises jaw damage.
3. ~~Contact-window abilities + hit flash (gaps 3, 5)~~ **Done.** While an attack
   is held, the attacking part (jaw / wing / tail) touching an opponent lands a
   discrete hit on its own cooldown (bite 0.9 s, wing 1.2 s, tail 1.1 s),
   regardless of impact speed; bite damage scales with the attacker's jaw
   multiplier (temperament genes) and wing buffet knocks the opponent's core
   back. Damaged parts flash for 240 ms in the renderer.
4. ~~Turn-based duel with move cards~~ **Done.** The dragon arena has a
   Real-time / Turn duel toggle. In turn duel: pick up to 3 move cards
   (Advance, Charge, Retreat, Bite lunge, Wing buffet, Tail sweep, Brace — Wing
   buffet greys out for wingless genotypes), press Play turn, and the attack-move
   step runner scripts the physics for ~2 s per card; the Warden then plays a
   genotype-legal pattern rotated by turn number, and the turn passes back.
   Positions and damage persist between turns; physics stays the referee.
5. ~~Gamepad polling~~ **Done.** Any standard-mapping controller works in
   real-time mode: left stick or d-pad moves, right trigger boosts, A/X/B/Y =
   bite / wing / tail / fire. Buttons route through the same attack gating and
   sounds as the keyboard; merged additively with keyboard input.
6. ~~Wing lift, fire breath, sound~~ **Done.**
   - **Wing lift**: winged dragons gain per-wing lift while boosting (capped by
     vertical speed) — `WW`/`Ww` dragons leap and glide, `ww` stay planted.
   - **Fire breath** (`F_` genotypes only, gated at the control layer): hold
     `F` / the Fire button / gamepad Y, or play the Fire breath move
     card in the turn duel. Deals cone AoE ticks (3 damage, 0.45 s, up to 3
     nearest parts, 3.4 range) from the head, and the renderer draws an additive
     flame cone that the bloom pass lights up. The Warden never uses fire — its
     lineage (Moss × Quartz) is `ff`, which is itself a teachable fact.
   - **Sound**: synthesized Web Audio effects (no audio files) — bite snap, wing
     whoosh, tail sweep, fire roar, impact thuds on any health loss, and a
     victory chime, with a persistent 🔊/🔇 toggle. The audio context is created
     lazily on the first user action to satisfy autoplay policy.

The full roadmap from this document is now implemented. Remaining ideas live in
the gap analysis above (attack telegraphs via jaw motors, camera shake, damage
ticker, authored GLB art for parts) — all are incremental polish on the systems
that now exist.
