#!/usr/bin/env node
/**
 * Bundles the dragon mesh code into one pasteable briefing for another model.
 *
 * The geometry is generated code spread over a factory and four profile
 * modules, and an assistant handed a bare excerpt breaks the same four rules
 * every time: it hardcodes world measurements, hardcodes colours, drops the
 * child `.name`s the tests look up, or renames a `parameters` key and silently
 * severs a part from the genome. So the rules travel with the code.
 *
 * Generated rather than committed, because a hand-copied 1,400-line file is
 * stale the moment someone edits the real one.
 *
 *   node scripts/mesh-briefing.mjs                     # factory only
 *   node scripts/mesh-briefing.mjs --include=head      # + skull silhouette
 *   node scripts/mesh-briefing.mjs --include=head,wing
 *   node scripts/mesh-briefing.mjs --include=all
 *
 * Output goes to `.briefing/` which is gitignored — working files, not assets.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const args = Object.fromEntries(
  process.argv.slice(2).map(arg => {
    const [key, value = 'true'] = arg.replace(/^--/, '').split('=');
    return [key, value];
  }),
);

const RENDERING = 'src/app/shared/assembly/rendering';

/** The factory is always included; everything else is opt-in by topic. */
const MODULES = {
  body: {
    path: `${RENDERING}/dragon-body-profile.ts`,
    what: 'Body silhouette — the lathe profile every torso is sampled from.',
  },
  head: {
    path: `${RENDERING}/dragon-head-profile.ts`,
    what: 'Skull silhouette, and the jaw mount derived from it.',
  },
  wing: {
    path: `${RENDERING}/dragon-wing-profile.ts`,
    what: 'Wing planform — leading edge, chord, finger struts.',
  },
  textures: {
    path: `${RENDERING}/dragon-textures.ts`,
    what: 'Canvas-generated scale/horn/keratin tiles and their UV helpers.',
  },
  models: {
    path: 'src/app/shared/assembly/domain/assembly.models.ts',
    what: 'The AssemblyPart contract the builders read.',
  },
};

const FACTORY = {
  path: `${RENDERING}/dragon-procedural-mesh.factory.ts`,
  what: 'Every build* function, DEFAULT_DRAGON_STYLE, and the profileId switch.',
};

const requested = (args.include ?? '')
  .split(',')
  .map(name => name.trim())
  .filter(Boolean);

const include = requested.includes('all') ? Object.keys(MODULES) : requested;
const unknown = include.filter(name => !MODULES[name]);

if (unknown.length) {
  console.error(`Unknown --include value(s): ${unknown.join(', ')}`);
  console.error(`Available: ${Object.keys(MODULES).join(', ')}, all`);
  process.exit(2);
}

const RULES = `# Dragon mesh briefing

You are editing the procedural geometry for a dragon in an Angular + three.js
codebase. Every part is generated code sized from data — there are no model
files. The source follows, after the rules and the map of what else has to
change.

## Rules — these are not style preferences, each one breaks something real

1. **Every size and position is a fraction of \`part.dimensions\`.** Never a fixed
   world measurement. A genetics pipeline rescales these parts per genome, so a
   spike measured in metres drifts out of proportion on the next dragon.
2. **Colours come from \`createDragonPalette(part.color, seed)\`.** Never hardcode
   a colour. The pigment gene writes \`part.color\`, and palette-derived materials
   are what keep that connection.
3. **Keep the \`.name\` on child meshes** (\`dragon-nostril-left\`, and so on). The
   test suite finds them by name rather than by child order.
4. **Never rename a \`visualProfile.parameters\` key.** Those keys are read here,
   written by the genetics code, materialised by the model-pack exporter, and
   asserted by a compatibility script. A rename throws no error — the read falls
   back to its default and the part silently stops responding to its genes.
5. **Geometry must fill its physics volume** (\`dimensions\` x/y/z). Joint sockets
   are positioned against the mesh, so a part that renders smaller than its
   collider leaves every socket on the limb pointing at empty space.
6. **Prefer three.js primitives** through the local \`mesh()\` helper, which sets
   shadows consistently. Reach for custom vertices only when a primitive cannot
   make the silhouette.

## Reading the builders

\`createDragonProceduralObject(part)\` switches on \`part.visualProfile.profileId\`
and returns a \`THREE.Group\`. Inside a builder:

- \`dims\` is \`part.dimensions\`; \`±0.5\` of an axis is that face of the part.
- \`visualNumber(part, 'key', fallback)\` reads a per-part override and falls back
  to the shared \`DragonStyle\`, so it is the seam for anything tunable.
- \`spreadPositions(count, spread, centre)\` lays out repeated features evenly.
`;

const RIPPLE = `## If you change something, what else has to change

| Change | Also update |
| --- | --- |
| A number inside a builder (position, size, angle) | Nothing. |
| Rename/remove a named child mesh | \`${RENDERING}/dragon-procedural-mesh.factory.spec.ts\` |
| Add a new tunable number | \`DragonStyle\` + \`DEFAULT_DRAGON_STYLE\` (in the factory), then \`STYLE_CONTROLS\` in \`designer/src/app/parts-lab/parts-lab.page.ts\` for the slider |
| Add a new \`profileId\` | the switch in the factory, \`SUPPORTED_DRAGON_PROCEDURAL_PROFILE_IDS\` in \`src/app/shared/assembly/model-pack/dragon-model-pack.models.ts\`, and the part's \`visualProfile\` in \`designer/src/app/assembly-garage/data/assembly-part-definitions.ts\` |
| Rename a \`parameters\` key | don't — but if you must: the factory, \`src/app/features/dragon-genetics/simulation/domain/dragon-inheritance.ts\`, \`designer/src/app/dragon-model-pack-export.ts\`, and \`scripts/check-dragon-model-compatibility.mjs\` |
| Part dimensions, colour, mass, or sockets | \`designer/src/app/assembly-garage/data/assembly-part-definitions.ts\` — not this file |

## Where everything lives

| Concern | Path |
| --- | --- |
| All part geometry | \`${RENDERING}/dragon-procedural-mesh.factory.ts\` |
| Body silhouette | \`${RENDERING}/dragon-body-profile.ts\` |
| Skull silhouette | \`${RENDERING}/dragon-head-profile.ts\` |
| Wing planform | \`${RENDERING}/dragon-wing-profile.ts\` |
| Surface textures | \`${RENDERING}/dragon-textures.ts\` |
| Mesh tests | \`${RENDERING}/dragon-procedural-mesh.factory.spec.ts\` |
| Which sliders the Parts Lab shows | \`designer/src/app/parts-lab/parts-lab.page.ts\` |
| Part catalog: dimensions, colour, sockets | \`designer/src/app/assembly-garage/data/assembly-part-definitions.ts\` |
| Allowed profile ids | \`src/app/shared/assembly/model-pack/dragon-model-pack.models.ts\` |
| Genome writes visual parameters | \`src/app/features/dragon-genetics/simulation/domain/dragon-inheritance.ts\` |

## Checking the result

\`\`\`
npm run lint
npm run test:ci        # includes the mesh specs
npm run build          # runs the model-pack and compatibility checks
\`\`\`

See the change in the browser without hunting for a dragon:

\`\`\`
node scripts/browser.mjs --serve=designer "parts-lab?family=dragon&part=<id>" \\
  "sleep 6000" "shot part [data-bake=contact-sheet]"
\`\`\`
`;

async function section(entry) {
  const source = await readFile(entry.path, 'utf8');
  return {
    lines: source.split('\n').length,
    text: `\n---\n\n## \`${entry.path}\`\n\n${entry.what}\n\n\`\`\`ts\n${source}\n\`\`\`\n`,
  };
}

const entries = [FACTORY, ...include.map(name => MODULES[name])];
const sections = await Promise.all(entries.map(section));
const body = sections.map(part => part.text).join('');
const document = `${RULES}\n${RIPPLE}\n${body}`;

const outDir = args.out ?? '.briefing';
const outPath = join(outDir, 'dragon-mesh-briefing.md');
await mkdir(outDir, { recursive: true });
await writeFile(outPath, document);

const totalLines = sections.reduce((sum, part) => sum + part.lines, 0);
// Four characters a token is the usual rough guide; this is a sanity check on
// whether the bundle fits a context window, not a real count.
const approximateTokens = Math.round(document.length / 4);

console.log(`\n${outPath}`);
for (const [index, entry] of entries.entries()) {
  console.log(`  ${entry.path}  (${sections[index].lines} lines)`);
}
console.log(`\n${totalLines} lines of source, ~${approximateTokens.toLocaleString()} tokens total.`);

if (!include.length) {
  console.log(`\nAdd silhouette modules with --include=${Object.keys(MODULES).join('|')}|all`);
}
