# Creation Library

The creation library is the bridge between authoring tools and games.

- The Assembly Garage authors reusable object assets.
- The Assembly Arena authors reusable attack move assets.
- Test beds author reusable scenario assets, such as ramps, lanes, obstacles, spawns, and win conditions.
- Games consume those assets through `CreationLibraryService` instead of importing arena or garage components. The Arena follows the same rule, so locally saved Garage assemblies and scenarios are immediately selectable there.

## Current Storage

Built-in assets come from TypeScript catalog files. Custom assets are saved to browser storage under `assembly.creationLibrary.v1` so they can be tested immediately. Assemblies persist a blueprint and a separate combat profile; editor flags are not stored.

## Firestore Shape

The path helpers already exist for the future database-backed version:

- `schools/{schoolId}/creation-library/assemblies/items/{assetId}`
- `schools/{schoolId}/creation-library/attack-moves/items/{assetId}`
- `schools/{schoolId}/creation-library/test-scenarios/items/{assetId}`

`FirestoreCreationLibraryRepository` implements the repository interface but is not wired into the live store yet. That keeps the current local workflow fast while preserving the tenant-scoped database boundary.

## Game Usage

Games should inject the shared service:

```ts
import { CreationLibraryService } from '../../creation-library';

readonly creationLibrary = inject(CreationLibraryService);
readonly assemblies = computed(() => this.creationLibrary.assemblyAssetsForGame('my-game'));
readonly moves = computed(() => this.creationLibrary.attackMoveAssetsForGame('my-game'));
readonly scenarios = computed(() => this.creationLibrary.testScenarioAssetsForGame('my-game'));
```

Games can also declare their capability in the manifest:

```ts
creationLibrary: {
  acceptsAssemblies: true,
  acceptsAttackMoves: true,
  acceptsTestScenarios: true,
  preferredTags: ['dragon', 'robot', 'race'],
}
```

That manifest metadata gives future room setup screens enough information to offer the right garage objects, arena moves, and test scenarios for each game.

## Scenario Shape

Reusable scenarios are intentionally game-neutral. They describe the environment, participants, physics preferences, and win condition. The Assembly Arena adapts those fields into `ArenaSetupConfig`; other games can adapt the same scenario into their own runtime.
