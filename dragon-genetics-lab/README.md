# Dragon Genetics Lab

A standalone Angular application for the Grade 7 **Dragon Genetics Lab**. It is aligned to MS-LS3 and supports MS-LS1 practices through a three-week heredity investigation.

This project is deliberately separate from `haasdemoapp`. It has no dependency on the physics lab, Assembly Garage/Arena, Three.js, Cannon, Matter, Angular Material, or the existing Firebase project.

## What students can do

1. Complete seven mini-lessons and a genetics vocabulary review.
2. Classify inherited traits versus learned or environmental effects.
3. Select parent dragons and use four simplified single-gene models.
4. Build and interpret Punnett-square sample spaces.
5. Predict phenotype probabilities and compare them with an eight-egg sample.
6. Write a claim-evidence-reasoning explanation about heredity and variation.
7. Compare breeding pairs with transparent allele-richness and expected-heterozygosity indicators.
8. Submit, print, or download a diversity-focused hatchery recommendation.

The genetics model is intentionally simplified and clearly labeled as a classroom model. The diversity score does not rank individual organisms or make a medical claim.

## Run locally

Requirements: Node.js 20.19+ or 22.12+ and npm.

```powershell
cd dragon-genetics-lab
npm install
npm start
```

Open `http://localhost:4200`.

## Build

```powershell
npm run build
```

The deployable files are written to `dist/dragon-genetics-lab/browser`.

## Current persistence

Student work is saved in the browser through `LocalDragonLabRepository`. The UI and store depend only on the `DragonLabRepository` interface, so the local adapter can be replaced when the new database and authentication app are ready.

Read [DATABASE_SETUP.md](./DATABASE_SETUP.md) before connecting the new backend.

## Source map

```text
src/app/
├── core/persistence/              Database-independent repository contract
│   ├── dragon-lab.repository.ts
│   └── local-dragon-lab.repository.ts
└── features/dragon-lab/
    ├── components/                CSS phenotype portrait
    ├── data/                      Lessons, vocabulary, and sorting cards
    ├── domain/                    Genetics types and pure inheritance functions
    ├── state/                     Student workflow and persistence orchestration
    └── dragon-genetics-lab.*      Six-stage student interface
```

## Separation from the physics app

The physics app no longer registers the `dragon-genetics` game manifest and no longer marks creation-library dragons as compatible with that route. The former physics-coupled source is preserved outside both apps under `../migration-archive/physics-coupled-dragon-genetics`; it is not compiled or reachable at runtime.
