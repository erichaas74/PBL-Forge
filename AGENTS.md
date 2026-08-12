# Working in this repo

Notes for anyone — person or assistant — making changes here. Read
[`docs/CODE_ORGANIZATION.md`](docs/CODE_ORGANIZATION.md) for where code belongs.

## Two applications

| | Path | Serve | Test |
| --- | --- | --- | --- |
| **PBL Forge** — the student app | `src/` | `npm start` (4200) | `npm run test:ci` |
| **Dragon Designer** — private authoring tools | `designer/` | `npm run start:designer` (4300) | `npm run test:designer:ci` |

Student source must never import from `designer/` or `assembly-garage`; `npm run check:designer-boundary`
enforces it. Shared code lives in `src/app/shared/assembly` and both sides import it.

## Seeing your change in the browser

**Use `scripts/browser.mjs` rather than asking someone to look for you.** It drives a real Chromium
from the command line — navigate, click, drag, set sliders, read the DOM, screenshot — and writes
PNGs to `.browse/` that you can then open and inspect.

```powershell
node scripts/browser.mjs --serve=designer snap-workshop "wait .shop__stage" "sleep 2000" "shot it"
```

Full reference: [`docs/BROWSER_DRIVER.md`](docs/BROWSER_DRIVER.md). Two things that bite:

- Write paths **without** a leading slash — Git Bash rewrites `/foo` into a Windows path.
- Use the `set` step for range/number inputs. `type` cannot drive them and a raw `.value` assignment
  fires no event, so Angular never sees it.

`npm run bake:parts` is the narrower loop for judging mesh quality from six angles.

## Changing what a dragon part looks like

The anatomy is generated code, not model files. [`docs/MESH_EDITING.md`](docs/MESH_EDITING.md)
maps what lives where and what each kind of change drags along — in particular that
`visualProfile.parameters` keys are a silent contract across four files, and renaming one fails
without an error.

`node scripts/mesh-briefing.mjs` bundles that source plus its rules into one pasteable file when
the work is going to another assistant.

## Before calling something done

```powershell
npm run lint
npm run test:ci
npm run test:designer:ci
npm run build
npm run build:designer
```

`npm run verify` runs all of it plus the Firestore rules tests, which need the emulator.

Two ratchets guard things that had already drifted once, and both run in `verify`:
`check:type-scale` (no font below 0.75rem — this is read on Chromebooks and projectors) and
`check:palette` (the SCSS and TypeScript copies of the Berk palette must agree).

## Known-failing tests

`allele-vault-workbench.component.spec.ts` has two failures asserting whitespace between rendered
spans. They predate the current work — do not treat them as something you broke.
