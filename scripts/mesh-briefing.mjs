#!/usr/bin/env node
/**
 * Bundles the dragon mesh code into one pasteable briefing for another model.
 *
 * The geometry is generated code spread over a factory and focused rendering
 * modules, and an assistant handed a bare excerpt breaks the same four rules
 * every time: it hardcodes world measurements, hardcodes colours, drops the
 * child `.name`s the tests look up, or renames a `parameters` key and silently
 * severs a part from the genome. So the rules travel with the code.
 *
 * Generated rather than committed, because a hand-copied multi-file source
 * bundle is stale the moment someone edits the real code.
 *
 *   node scripts/mesh-briefing.mjs                     # factory and shared helpers
 *   node scripts/mesh-briefing.mjs --include=head      # + skull silhouette
 *   node scripts/mesh-briefing.mjs --include=head,wing
 *   node scripts/mesh-briefing.mjs --include=mini      # + focused mini-dragon renderer
 *   node scripts/mesh-briefing.mjs --include=all
 *
 * Output goes to `.briefing/` which is gitignored — working files, not assets.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const [key, value = 'true'] = arg.replace(/^--/, '').split('=');
    return [key, value];
  }),
);

const RENDERING = 'src/app/shared/assembly/rendering';

/** Core rendering modules are always included; profile details are opt-in. */
const MODULES = {
  body: {
    path: `${RENDERING}/dragon-body-profile.ts`,
    what: 'Body silhouette — the lathe profile every torso is sampled from.',
  },
  head: {
    entries: [
      {
        path: `${RENDERING}/dragon-head-shape.ts`,
        what: 'Skull presets, trait adjustment, and part-dimension normalization.',
      },
      {
        path: `${RENDERING}/dragon-head-sections.ts`,
        what: 'Skull stations, interpolation, cross-sections, and surface sampling.',
      },
      {
        path: `${RENDERING}/dragon-head-landmarks.ts`,
        what: 'Jaw, eye, horn, and nostril mounts derived from the skull surface.',
      },
    ],
  },
  wing: {
    path: `${RENDERING}/dragon-wing-profile.ts`,
    what: 'Wing planform — leading edge, chord, finger struts.',
  },
  textures: {
    entries: [
      {
        path: `${RENDERING}/dragon-textures.ts`,
        what: 'Texture compatibility exports and stable per-part UV seed.',
      },
      {
        path: `${RENDERING}/dragon-texture-cache.ts`,
        what: 'Texture cache, quality tier, shared ownership, and disposal.',
      },
      {
        path: `${RENDERING}/dragon-texture-generation.ts`,
        what: 'Noise, canvas, height-field, RGB, and normal-map generation.',
      },
      {
        path: `${RENDERING}/dragon-scale-textures.ts`,
        what: 'Scale relief, chromatic grain, and second-pigment masks.',
      },
      {
        path: `${RENDERING}/dragon-keratin-textures.ts`,
        what: 'Horn growth rings and claw/tooth keratin grain.',
      },
      {
        path: `${RENDERING}/dragon-membrane-textures.ts`,
        what: 'Wing-membrane veins, tissue relief, roughness, and transparency.',
      },
    ],
  },
  models: {
    path: 'src/app/shared/assembly/domain/assembly.models.ts',
    what: 'The AssemblyPart contract the builders read.',
  },
  mini: {
    entries: [
      {
        path: `${RENDERING}/mini-dragon-procedural-mesh.factory.ts`,
        what: 'Mini-dragon profileId routing.',
      },
      {
        path: `${RENDERING}/mini-dragon-rendering.ts`,
        what: 'Mini-dragon palette, materials, and low-level rendering helpers.',
      },
      {
        path: `${RENDERING}/mini-dragon-anatomy.ts`,
        what: 'Mini-dragon torso profile and surface sampling.',
      },
      {
        path: `${RENDERING}/mini-dragon-feathers.ts`,
        what: 'Mini-dragon procedural feather cards and deterministic instancing.',
      },
      {
        path: `${RENDERING}/mini-dragon-body-mesh.ts`,
        what: 'Mini-dragon torso, dorsal scales, neck, and sockets.',
      },
      {
        path: `${RENDERING}/mini-dragon-head-mesh.ts`,
        what: 'Mini-dragon cranium, snout, and head-feature orchestration.',
      },
      {
        path: `${RENDERING}/mini-dragon-face-mesh.ts`,
        what: 'Mini-dragon eyes, ears, and cheek tufts.',
      },
      {
        path: `${RENDERING}/mini-dragon-head-ornaments.ts`,
        what: 'Mini-dragon horns, crown bumps, and side frills.',
      },
      {
        path: `${RENDERING}/mini-dragon-jaw-mesh.ts`,
        what: 'Mini-dragon lower muzzle, mouth, ember lantern, and milk teeth.',
      },
      {
        path: `${RENDERING}/mini-dragon-limb-mesh.ts`,
        what: 'Mini-dragon thigh, shank, paw, toes, and joint covers.',
      },
      {
        path: `${RENDERING}/mini-dragon-wing-mesh.ts`,
        what: 'Mini-dragon wing membrane, bones, vestigial nub, and feathers.',
      },
      {
        path: `${RENDERING}/mini-dragon-tail-mesh.ts`,
        what: 'Mini-dragon tail segments and inherited plume forms.',
      },
    ],
  },
};

const FACTORY = {
  path: `${RENDERING}/dragon-procedural-mesh.factory.ts`,
  what: 'The profileId router for the focused anatomy builders.',
};

const BODY = {
  path: `${RENDERING}/dragon-body-mesh.ts`,
  what: 'The complete torso builder: archetypes, spikes, sockets, belly, and glow row.',
};

const HEAD = {
  path: `${RENDERING}/dragon-head-mesh.ts`,
  what: 'The head orchestrator joining skull construction to decorative anatomy.',
};

const HEAD_SKULL = {
  path: `${RENDERING}/dragon-head-skull.ts`,
  what: 'Skull loft construction and the dimension-scaled neck socket.',
};

const HEAD_DECORATIONS = {
  path: `${RENDERING}/dragon-head-decorations.ts`,
  what: 'Head-decoration orchestration.',
};

const HEAD_SENSORY = {
  path: `${RENDERING}/dragon-head-sensory-features.ts`,
  what: 'Head horns, brow spikes, eyes, pupils, and highlights.',
};

const HEAD_EXPRESSIVE = {
  path: `${RENDERING}/dragon-head-expressive-features.ts`,
  what: 'Genetic crest, glow markings, and female frills.',
};

const HEAD_MALE_FRILL = {
  path: `${RENDERING}/dragon-head-male-frill.ts`,
  what: 'Male display-frill spines, tessellated web, and jaw spines.',
};

const JAW = {
  path: `${RENDERING}/dragon-jaw-mesh.ts`,
  what: 'The complete upper/lower jaw builder: tapered snout, nostrils, nose horn, teeth, and fangs.',
};

const LIMB = {
  path: `${RENDERING}/dragon-limb-mesh.ts`,
  what: 'Compatibility exports for focused limb builders.',
};

const LEG = {
  path: `${RENDERING}/dragon-leg-mesh.ts`,
  what: 'Walking-leg geometry and shared limb joint covers.',
};

const GRASP = {
  path: `${RENDERING}/dragon-grasp-mesh.ts`,
  what: 'Grasping arms, hands, articulated fingers, and opposing thumb.',
};

const FOOT = {
  path: `${RENDERING}/dragon-foot-mesh.ts`,
  what: 'Feet, toes, and reusable curved talons.',
};

const WING = {
  path: `${RENDERING}/dragon-wing-mesh.ts`,
  what: 'The complete wing builder: membrane grid, leading-edge bone, finger struts, and mirroring.',
};

const TAIL = {
  path: `${RENDERING}/dragon-tail-mesh.ts`,
  what: 'The complete tail builder: segments, vertebrae, glow nodes, clubs, spikes, and stingers.',
};

const GEOMETRY = {
  path: `${RENDERING}/dragon-geometry.ts`,
  what: 'Shared mesh, detail-tier, and tapered-geometry helpers.',
};

const TEXTURE_CONSTANTS = {
  path: `${RENDERING}/dragon-texture-constants.ts`,
  what: 'Shared texture-map contract and world-space tile sizes.',
};

const UV = {
  path: `${RENDERING}/dragon-uv.ts`,
  what: 'World-scale tiled and box-projected UV assignment.',
};

const ANATOMY = {
  path: `${RENDERING}/dragon-anatomy.ts`,
  what: 'Shared glow-node, joint-ball, and evenly-spaced-position helpers.',
};

const STYLE = {
  path: `${RENDERING}/dragon-style.ts`,
  what: 'Shared DragonStyle contracts, published defaults, and the Designer override hook.',
};

const MATERIALS = {
  path: `${RENDERING}/dragon-materials.ts`,
  what: 'Compatibility exports for focused palette and material modules.',
};

const PALETTE = {
  path: `${RENDERING}/dragon-palette.ts`,
  what: 'Inherited pigment, secondary tones, pattern selection, and stable variation.',
};

const SURFACE_MATERIALS = {
  path: `${RENDERING}/dragon-surface-materials.ts`,
  what: 'Texture-backed scale, belly, keratin, membrane, and nostril materials.',
};

const FEATURE_MATERIALS = {
  path: `${RENDERING}/dragon-feature-materials.ts`,
  what: 'Appearance-preserving eye, pupil, highlight, and glow materials.',
};

const VISUAL_PARAMETERS = {
  path: `${RENDERING}/dragon-visual-parameter-readers.ts`,
  what: 'The sole typed access path for persisted visual parameter values.',
};

const requested = (args.include ?? '')
  .split(',')
  .map((name) => name.trim())
  .filter(Boolean);

const include = requested.includes('all') ? Object.keys(MODULES) : requested;
const unknown = include.filter((name) => !MODULES[name]);

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
2. **Colours come from the helpers in \`dragon-materials.ts\`.** Never hardcode
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
6. **Prefer three.js primitives** through the shared \`mesh()\` helper, which sets
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
| Rename/remove a named child mesh | the owning builder's focused \`*.spec.ts\` file |
| Add a new tunable number | \`DragonStyle\` + \`DEFAULT_DRAGON_STYLE\` in \`${RENDERING}/dragon-style.ts\`, then \`STYLE_CONTROLS\` in \`designer/src/app/parts-lab/parts-lab.page.ts\` for the slider |
| Add a new \`profileId\` | the switch in the factory, \`SUPPORTED_DRAGON_PROCEDURAL_PROFILE_IDS\` in \`src/app/shared/assembly/model-pack/dragon-model-pack.models.ts\`, and the part's \`visualProfile\` in \`designer/src/app/assembly-garage/data/assembly-part-definitions.ts\` |
| Rename a \`parameters\` key | don't — but if you must: the rendering implementation, \`src/app/features/dragon-genetics/simulation/domain/dragon-inheritance.ts\`, \`designer/src/app/dragon-model-pack-export.ts\`, and \`scripts/check-dragon-model-compatibility.mjs\` |
| Part dimensions, colour, mass, or sockets | \`designer/src/app/assembly-garage/data/assembly-part-definitions.ts\` — not this file |

## Where everything lives

| Concern | Path |
| --- | --- |
| Profile routing | \`${RENDERING}/dragon-procedural-mesh.factory.ts\` |
| Body geometry | \`${RENDERING}/dragon-body-mesh.ts\` |
| Head orchestration | \`${RENDERING}/dragon-head-mesh.ts\` |
| Skull geometry and neck socket | \`${RENDERING}/dragon-head-skull.ts\` |
| Head decorative anatomy | \`${RENDERING}/dragon-head-decorations.ts\` |
| Head sensory anatomy | \`${RENDERING}/dragon-head-sensory-features.ts\` |
| Inherited head features | \`${RENDERING}/dragon-head-expressive-features.ts\` |
| Male display frill | \`${RENDERING}/dragon-head-male-frill.ts\` |
| Jaw geometry | \`${RENDERING}/dragon-jaw-mesh.ts\` |
| Limb compatibility exports | \`${RENDERING}/dragon-limb-mesh.ts\` |
| Walking legs and joint covers | \`${RENDERING}/dragon-leg-mesh.ts\` |
| Grasping forelimbs | \`${RENDERING}/dragon-grasp-mesh.ts\` |
| Feet and talons | \`${RENDERING}/dragon-foot-mesh.ts\` |
| Wing geometry | \`${RENDERING}/dragon-wing-mesh.ts\` |
| Tail geometry | \`${RENDERING}/dragon-tail-mesh.ts\` |
| Shared mesh and geometry helpers | \`${RENDERING}/dragon-geometry.ts\` |
| Texture contracts and tile sizes | \`${RENDERING}/dragon-texture-constants.ts\` |
| UV projection helpers | \`${RENDERING}/dragon-uv.ts\` |
| Shared anatomy helpers | \`${RENDERING}/dragon-anatomy.ts\` |
| Shared style contracts and defaults | \`${RENDERING}/dragon-style.ts\` |
| Material compatibility exports | \`${RENDERING}/dragon-materials.ts\` |
| Palette and inherited pigment derivation | \`${RENDERING}/dragon-palette.ts\` |
| Biological surface materials | \`${RENDERING}/dragon-surface-materials.ts\` |
| Eye and glow feature materials | \`${RENDERING}/dragon-feature-materials.ts\` |
| Visual parameter readers | \`${RENDERING}/dragon-visual-parameter-readers.ts\` |
| Body silhouette | \`${RENDERING}/dragon-body-profile.ts\` |
| Skull-profile compatibility exports | \`${RENDERING}/dragon-head-profile.ts\` |
| Skull shape and trait adjustment | \`${RENDERING}/dragon-head-shape.ts\` |
| Skull stations and surface sampling | \`${RENDERING}/dragon-head-sections.ts\` |
| Skull feature landmarks | \`${RENDERING}/dragon-head-landmarks.ts\` |
| Wing planform | \`${RENDERING}/dragon-wing-profile.ts\` |
| Texture compatibility exports and part seed | \`${RENDERING}/dragon-textures.ts\` |
| Texture cache and disposal | \`${RENDERING}/dragon-texture-cache.ts\` |
| Texture-generation foundations | \`${RENDERING}/dragon-texture-generation.ts\` |
| Scale relief, grain, and pigment masks | \`${RENDERING}/dragon-scale-textures.ts\` |
| Horn and keratin textures | \`${RENDERING}/dragon-keratin-textures.ts\` |
| Membrane textures | \`${RENDERING}/dragon-membrane-textures.ts\` |
| Texture tests | \`${RENDERING}/dragon-*texture*.spec.ts\` |
| UV tests | \`${RENDERING}/dragon-uv.spec.ts\` |
| Palette and material tests | \`${RENDERING}/dragon-{palette,*-materials}.spec.ts\` |
| Geometry-helper tests | \`${RENDERING}/dragon-geometry.spec.ts\` |
| Body-builder tests | \`${RENDERING}/dragon-body-mesh.spec.ts\` |
| Head sensory-feature tests | \`${RENDERING}/dragon-head-sensory-features.spec.ts\` |
| Male-frill tests | \`${RENDERING}/dragon-head-male-frill.spec.ts\` |
| Skull profile tests | \`${RENDERING}/dragon-head-{shape,sections,landmarks}.spec.ts\` |
| Skull-builder tests | \`${RENDERING}/dragon-head-skull.spec.ts\` |
| Jaw-builder tests | \`${RENDERING}/dragon-jaw-mesh.spec.ts\` |
| Walking-leg and foot tests | \`${RENDERING}/dragon-leg-foot-mesh.spec.ts\` |
| Grasping-forelimb tests | \`${RENDERING}/dragon-grasp-mesh.spec.ts\` |
| Limb-joint tests | \`${RENDERING}/dragon-leg-joints.spec.ts\` |
| Wing-builder tests | \`${RENDERING}/dragon-wing-mesh.spec.ts\` |
| Tail-builder tests | \`${RENDERING}/dragon-tail-mesh.spec.ts\` |
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

const entries = [
  FACTORY,
  BODY,
  HEAD,
  HEAD_SKULL,
  HEAD_DECORATIONS,
  HEAD_SENSORY,
  HEAD_EXPRESSIVE,
  HEAD_MALE_FRILL,
  JAW,
  LIMB,
  LEG,
  GRASP,
  FOOT,
  WING,
  TAIL,
  GEOMETRY,
  TEXTURE_CONSTANTS,
  UV,
  ANATOMY,
  STYLE,
  MATERIALS,
  PALETTE,
  SURFACE_MATERIALS,
  FEATURE_MATERIALS,
  VISUAL_PARAMETERS,
  ...include.flatMap((name) => MODULES[name].entries ?? [MODULES[name]]),
];
const sections = await Promise.all(entries.map(section));
const body = sections.map((part) => part.text).join('');
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
console.log(
  `\n${totalLines} lines of source, ~${approximateTokens.toLocaleString()} tokens total.`,
);

if (!include.length) {
  console.log(`\nAdd silhouette modules with --include=${Object.keys(MODULES).join('|')}|all`);
}
