# Published model packs

Files in this directory are reviewed build-time inputs for PBL Forge. They are data artifacts, not
designer drafts and not runtime downloads.

`dragon-model-pack.v1.json` is produced by Dragon Designer. To publish an edited dragon:

1. Download the validated pack from the designer Garage.
2. Review its diff against this directory's current pack.
3. Replace the file and run `npm run check:model-packs`.
4. Run `npm run build` and `npm run build:designer`.

Do not add `isSimulating`, lesson state, student data, executable JavaScript, or raw geometry. A
model pack contains stable assembly blueprints and scalar visual parameters only.

