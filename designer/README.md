# Dragon Designer

Dragon Designer is the private, database-free authoring application for PBL Forge dragon parts and
assemblies. It is a separate Angular project and is not deployed by the Firebase Hosting command.

```powershell
npm run start:designer
```

Three surfaces, and they change different things:

| Route | Changes | Reaches the Garage as |
| --- | --- | --- |
| `/parts-lab` | Part **meshes** — feature counts and proportions — plus each part's overall X/Y/Z dimensions | A dragon style override, and saved dimensions per definition |
| `/snap-workshop` | Where parts **connect** — the authored socket positions | Saved socket positions per definition |
| `/dragon-garage` | One **assembly** — parts, joints, pivots, physics | The model pack you export |

Parts Lab and Snap Workshop both save to the same local draft, keyed by catalog definition id, and
both offer a paste-ready snippet for getting the values back into source. The Garage edits one
assembly rather than the catalog, apart from its **Save size to catalog part** button.

The Garage's **Download Dragon Pack** action validates and downloads
`dragon-model-pack.v1.json`. Review that file, replace the committed artifact in `model-packs/`,
then run:

```powershell
npm run check:model-packs
npm run build
```

LocalStorage is used only for unfinished Parts Lab tuning records. PBL Forge does not read those
records and no Firebase service is provided to this application.
