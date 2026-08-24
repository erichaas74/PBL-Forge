# Dragon Genetics focused microscope workstations

The existing Genome Microscope remains the connected, multi-scale instrument. Each biological
level is also available as a focused, independently routable workstation that a teacher may attach
to any shared lesson. Focused workstations are open investigations, not a required zoom sequence.

## Shared product contract

1. **Scientific goal:** Investigate one relationship at a selected biological scale while keeping
   the loaded dragon, chromosome catalog, gene catalog, and molecular records scientifically linked.
2. **Manipulable evidence:** Students may load any released dragon and use the selectors, models,
   comparisons, animations, or reaction tools supported at that level in any valid order.
3. **Observable consequence:** The code-driven model updates from the selected specimen,
   chromosome, gene, allele copy, sequence, protein, or enzyme reaction.
4. **Student-built record:** Meaningful selections and reactions emitted by the microscope are
   retained per student and focused level. They remain revisable by further exploration and are
   available to a later lesson-evidence adapter.
5. **Shared sources:** Dragon records come from `DragonWorkstationContextService`; chromosomes,
   genes, alleles, DNA, proteins, cell models, and the assembly renderer remain the existing shared
   sources used by `GenomeMicroscopeComponent`.

## Focused instruments

| Workstation | Scientific relationship | Manipulable evidence and consequence |
| --- | --- | --- |
| Whole Dragon Microscope | A whole organism is made of cells that carry inherited information. | Load and inspect released dragon specimens in the real assembly viewport. |
| Dragon Cell Microscope | A body cell contains the structures that maintain the organism. | Inspect the code-driven cell and compare it across loaded specimens. |
| Nucleus Microscope | The nucleus contains the dragon's chromosome set. | Inspect and select chromosome pairs within the shared cell model. |
| Chromosome Set Microscope | Homologous chromosome pairs carry matching gene locations. | Compare all shared chromosome pairs and select any pair. |
| Chromosome Pair Microscope | One chromosome pair carries many genes at stable loci. | Select chromosome pairs and gene loci on the shared chromosome model. |
| Chromatin Microscope | A chromosome is DNA packaged through chromatin and nucleosomes. | Unpack the selected chromosome with the existing interactive model. |
| Gene Locus Microscope | A gene occupies a defined region of one chromosome. | Select released genes and compare their positions on chromosome pairs. |
| DNA Sequence Microscope | DNA information is stored in an ordered base sequence. | Inspect the selected allele's shared DNA sequence and replication model. |
| Allele Copy Microscope | Two inherited copies of a gene may carry different sequences. | Switch between homologous allele copies and compare their shared sequences. |
| Messenger RNA Microscope | A DNA sequence can be transcribed into messenger RNA. | Select an allele copy and inspect its data-derived transcription model. |
| Base Molecule Microscope | DNA and RNA bases have distinct molecular structures and pairing roles. | Compare DNA/RNA bases and their code-driven molecular representations. |
| Protein Product Microscope | A ribosome translates messenger RNA into a protein product. | Change the source gene or allele and inspect the resulting shared protein record. |
| Enzyme Reaction Microscope | Protein shape controls which substrates an enzyme can transform. | Run repeatable enzyme reactions and compare products. |
| Trait Expression Microscope | Molecular interactions can change cells and contribute to phenotype. | Test shared protein forms against cell targets and observe the real dragon renderer. |

## Lesson boundary

Attaching a focused microscope to a lesson adds only the lesson-owned mission ribbon and return
link outside the instrument. Direct launches remain available. The lesson does not inject questions,
answers, ordered steps, completion gates, or correctness state into a microscope workstation.
