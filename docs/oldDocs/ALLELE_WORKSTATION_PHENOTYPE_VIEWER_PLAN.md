# Allele Workstation phenotype viewer

Status: implemented 2026-08-12

## Decision

The Allele Workstation uses one renderer-only phenotype chamber after the two genotype sockets. It
does not render one dragon per allele because one allele alone does not determine a diploid
phenotype. It does not embed the full Test Bench because attacks, defenses, fitness scores, and
trait readouts would disclose answers and overload the investigation surface.

The chamber consumes the same `SpecimenSource`, expressive genome, committed dragon model pack,
and procedural renderer as the Dragon Test Bench. It does not generate or store images.

## Genetics contract

- `EXPRESSIVE_DRAGON_TRAITS` owns trait names, chromosome assignment, allele symbols, inheritance,
  and phenotype labels.
- The Allele Vault owns only workstation metadata such as locus labels, icons, sample sequences,
  and the teacher's release list.
- Every Vault gene has an explicit `renderTraitId`; the initial twelve map one-to-one to expressive
  traits.
- Chromosomes 1-4 each contain three non-repeating genes.
- Chromosome 1 contains wings, tail-club form, and leg arrangement.
- Tail-club form uses `K/k`: `KK` is the large crown-spiked club, `Kk` the intermediate five-spike
  club, and `kk` the small smooth club.
- Eye glow remains on chromosome X. It is not falsely placed on chromosome 1 and is reserved for a
  separately released sex-linked investigation.

## Interaction contract

- Changing genes clears both genotype sockets.
- The chamber remains empty until both installed samples belong to the active gene.
- Installing the second allele immediately expresses the dragon and records the experiment; there
  is no mandatory ordered procedure or additional Express step.
- Only the active locus changes on a controlled reference genome. This preserves a causal
  comparison while students test different genotype combinations.
- Camera direction and zoom survive genotype changes because the viewport retains its one renderer
  instance while replacing only the specimen.
- Female XX and Male XY controls change modeled sex without changing the installed autosomal pair.
- The visible workstation does not print the phenotype or dominance answer beside the dragon. The
  persistent genetics chart remains the place where evidence and verified claims are recorded.

## Shared renderer boundary

`SpecimenViewportComponent` owns the canvas, specimen resolution, WebGL lifecycle, zoom, rotation,
empty/error states, and cleanup. It owns no genetics, grading, persistence, combat scoring, or
instructional text.

`SpecimenTestBenchComponent` composes that viewport with its assay and ability panels. The Allele
Workstation composes the same viewport with the genotype sockets and sex control. Both therefore use
one anatomy and rendering path.

## Persistence

Only teacher gene availability, experiment records, and verified notebook discoveries persist. The
current canvas, camera, meshes, screenshots, and derived expressive profile do not. The profile is
reconstructed from the installed pair whenever it is needed.

Assignment catalog version 3 migrates the former mock `eyes` chromosome-1 entry to `legs`. Stale
tail experiments using `T/t` and stale eye records are rejected during notebook normalization rather
than being mistaken for current evidence.

## Verification completed

- TypeScript application and spec compilation.
- Angular and template lint.
- Type-scale and palette checks.
- Dragon model-pack validation and expressive-model compatibility checks.
- Student application production build.
- Dragon Designer production build, confirming the shared renderer remains compatible.
- Focused tests cover the 4-by-3 chromosome catalog, controlled reference genome, male/XX-XY
  normalization, empty-pair behavior, automatic expression, gene-change clearing, and all three
  tail-club phenotypes.

Browser automation is intentionally excluded from this verification workflow. Visual acceptance is
performed manually by the project owner.

## Follow-up documentation

Do not revise `DRAGON_GENETICS_VISUAL_LAB_PLAN.md` until the rebuilt Allele Workstation is accepted
as complete. That later revision must replace its former rule that scientific instruments never
render the dragon body with this narrowly scoped genotype-to-phenotype exception.
