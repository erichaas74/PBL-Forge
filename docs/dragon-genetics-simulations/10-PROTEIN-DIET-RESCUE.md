# Protein Synthesis and Dragon Diet Rescue

The Protein Synthesis and Dragon Diet Rescue station is an open clinical-genetics investigation.
Students load a dragon from their account Genetics File, examine two neutrally labeled gene samples,
follow each sample through transcription and translation, test the patient's digestion, and preserve
an evidence-backed diet-rescue record. The station does not contain a question dock, a phase rail, or
a required sequence of lesson steps.

## Required design decisions

| Decision               | Protein Rescue answer                                                                                                                                                                                                                                                 |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Scientific goal        | Investigate how a DNA change can alter mRNA, stop translation early, change enzyme structure and function, and produce a diet-dependent digestive phenotype.                                                                                                          |
| Manipulable evidence   | Account dragons, two neutral chromosome-4 gene samples per patient, coding/template DNA, transcription progress, mRNA codons, ribosome translation, Dracase enzyme tests, and foods with different Dracose loads.                                                     |
| Observable consequence | Transcription builds the mRNA base by base; translation adds amino acids until a stop codon; a full enzyme splits Dracose while a truncated enzyme does not; the patient digestion model reports energy and symptoms for the selected food.                           |
| Student-built record   | A persistent clinical rescue record containing the patient, observed symptoms, tested sample sequences and protein outcomes, food-test evidence, a revisable genotype claim, diet recommendation, and explanation.                                                    |
| Shared sources         | The account Genetics File supplies patient dragons, shared DNA-process utilities supply strand/transcription rules, this workstation's protein-rescue catalog owns the Dracase locus/codon/food truth, and the repository boundary owns per-student case persistence. |

## Scientific model

The fictional food sugar is **Dracose** and the digestive enzyme is **Dracase**. The working allele
uses template DNA `TAC-AAA-CCG-TTT-GGA`, which produces mRNA `AUG-UUU-GGC-AAA-CCU` and a full
five-amino-acid teaching-model enzyme. The nonworking allele changes the third codon so its mRNA is
`AUG-UUU-UAG-AAA-CCU`; translation stops after the second amino acid and the truncated product does
not split Dracose.

`DD` patients make working enzyme from both copies. `Dd` patients are healthy carriers because one
working copy makes enough enzyme. `dd` patients make no working Dracase and show symptoms only when
the tested food supplies an unsplit Dracose load. Low-Dracose food, fermented or pre-split food, and
an enzyme-treated option manage exposure; they do not repair the allele.

The five-codon sequence is intentionally compact enough to inspect in one instrument while keeping
the full causal chain visible:

```text
gene copy -> coding/template DNA -> mRNA codons -> amino-acid chain -> folded enzyme
                                                        |
                                                        v
                           Dracose split or undigested -> patient response
```

## Interaction and concealment

- The account Genetics File sits at the upper-left of the laboratory. A dragon can be selected and
  then loaded into the clinic, or dragged directly into the patient bay.
- The two patient samples are labeled `CHR4-A` and `CHR4-B`. The template never includes `D`, `d`,
  `working`, `mutated`, or a genotype answer before the relevant experiment reveals evidence.
- Either sample may be loaded into the gene reader in any order. Loading, replaying transcription,
  translating, testing protein function, and replacing a sample are all repeatable.
- Spatial drag operations have matching select-then-destination buttons and share the same state
  transition.
- Scientific prerequisites control only scientific results: translation needs an mRNA record, and
  an enzyme test needs a translated product. Unrelated tools remain available.
- A genotype claim is always editable. The record distinguishes the student's claim from observed
  evidence and does not score or lock the workstation.

## Persistence boundary

`ProteinRescueRepository` stores schema-versioned clinical records in local storage under the
current student identity. The station restores those records after refresh and exposes them in its
case-file drawer. Domain/catalog data do not live in the component template, so a later Firestore
repository can replace device persistence without changing the instrument's interaction model.

## Cross-lab continuity

The station links to Pedigree Lab for tracing an unseen carrier pattern and to Dragon Hatchery for
testing breeding implications. Those links do not claim that a protein-rescue result has already
been copied into either instrument; the saved clinical record remains the explicit handoff artifact.

## Completion evidence

Focused tests cover the codon and premature-stop mapping, DD/Dd/dd enzyme consequences, safe versus
symptom-producing food tests, answer concealment in the initial state, drag/click-equivalent patient
loading, repeated sample experiments, and per-student persistence. Browser verification covers the
full-width lab, a narrow stacked layout, keyboard-reachable controls, and reduced-motion results.
