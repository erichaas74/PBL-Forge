# Assembly Battle Arena

This feature consumes `AssemblyBlueprint` assets through the Creation Library and runs them as battle combatants. It is also registered as the initial `robot-battle` game.

## Current Loop

- Red team is player-controlled with `W/S`, `A/D`, `Q/E`, and `Shift`.
- Blue team uses a simple AI force that drives its core toward the red core.
- Cannon-es owns the battle physics world, walls, constraints, and collision impact checks.
- Garage joint behavior metadata drives passive hinges, motor hinges, oscillating wing hinges, spring-like hinge damping, and breakable constraints.
- Three.js renders the arena, combatant parts, team tinting, and part damage.
- The arena stores battle-only health and winner state without writing back to the garage presets.

## Setup Styles

- `Duel Arena`: open survival arena for robot-versus-car testing.
- `Car Crash Test`: narrow lane, crash wall, lane bumpers, and vehicle-style controls.
- `Robot Righting`: tipped robot start, recovery rails, and righting-assist controls.

## Presentation boundary

- `ArenaViewportComponent` owns canvas mounting and render-loop lifecycle. Its optional
  `appearance="dragon-pit"` input changes only the viewport badge; the default remains neutral for
  robots, cars, and future assembly scenarios.
- `AssemblyArenaRendererService` detects a dragon setup from its control modes. Dragon matches add
  the circular fighting ring, palisade, gatehouses, clan banners, shields, braziers, gallery, and
  island horizon. Non-dragon scenarios keep the shared floor, lighting, walls, and obstacles.
- Dragon Genetics owns its arena masthead, health presentation, modes, controls, field guide, and
  evidence language in `features/dragon-genetics/dragon-arena.component.*`. It does not duplicate
  physics or combat state.

## Easy Control Modes

- `Shove Drive`: direct prototype-friendly force controls.
- `Vehicle Drive`: forward force plus yaw torque for car-like motion.
- `Righting Assist`: roll torque and boost pop for tipped robots.
- `AI Hunter`: simple seek behavior toward the opponent core.
- `Static Target`: no active control for crash-test targets.

## Strategy Blocks

- Each combatant can run a `ControllerProgram` made of movement, sensor, logic, and utility blocks.
- Presets include manual keyboard, car ram, car circle-and-ram, robot right-self, robot shove-and-recover, and static target.
- The strategy panel can add movement/sensor/recover/stuck/repeat blocks, reorder or remove them, edit simple params, and import/export program JSON.
- Sensor blocks can now own nested child actions through `children`, so patterns like `if stuck -> back up` and `if upside down for 0.4s -> recover` are representable in saved JSON.
- Runtime sensors include opponent distance, speed, stuck duration, tipped/upside-down duration, and wall proximity.
- Programs produce per-combatant `ArenaControlFrame` values. The physics service still owns the drive style, so block logic stays independent from Cannon-es force tuning.

## Next Good Upgrades

- Replace the flat strategy list with a visual Blockly-style canvas once the command vocabulary feels right.
- Replace force-based car motion with wheel hinge motors.
- Add visual/audio feedback when a joint breaks and a limb detaches.
- Add weapons/modules as optional garage parts.
- Add game-specific robot weapon modules and scoring rules on top of the shared combat profile.
