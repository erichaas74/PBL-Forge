import {
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import {
  ALLELE_VAULT_ALLELES,
  ALLELE_VAULT_GENES,
  AlleleVaultAllele,
  AlleleVaultGene,
} from '../allele-workbench/allele-vault.models';
import { chromosomeVisual } from '../shared/dragon-chromosome.catalog';
import { ChromosomeSvgComponent, ChromosomeSvgModel } from '../shared/chromosome-svg.component';
import {
  DRAGON_DNA_BASE_COLORS,
  geneAlleleMarking,
  geneDnaRecord,
} from '../shared/dragon-gene-dna.catalog';
import { DnaComparisonRepository } from './dna-comparison.repository';
import {
  DnaAnalysisCase,
  DnaComparisonScope,
  DnaEvidenceResult,
  DnaSequenceChanged,
  MolecularEvidenceRecord,
} from './dna-process.models';
import { DnaSequenceAnalysisComponent } from './dna-sequence-analysis.component';

interface DnaSpecimen {
  id: string;
  label: string;
  detail: string;
  sequence: string;
  chromosome: string;
  geneId?: string;
  locusLabel?: string;
  sampleCode?: string;
  alleleIndex?: 0 | 1;
  transferred?: boolean;
}

@Component({
  selector: 'app-dragon-dna-repair-lab',
  imports: [DnaSequenceAnalysisComponent, ChromosomeSvgComponent],
  templateUrl: './dragon-dna-repair-lab.component.html',
  styleUrl: './dragon-dna-repair-lab.component.scss',
})
export class DragonDnaRepairLabComponent {
  private readonly repository = inject(DnaComparisonRepository);
  readonly baseColors = DRAGON_DNA_BASE_COLORS;

  readonly studentId = input.required<string>();
  readonly goal = input(
    'Determine how two DNA records differ and whether a selected repair restores their sequence agreement.',
  );
  readonly analysisCase = input<DnaAnalysisCase | null>(null);
  readonly chromosomeModel = input<ChromosomeSvgModel | null>(null);
  readonly genes = input<readonly AlleleVaultGene[]>(ALLELE_VAULT_GENES);
  readonly alleles = input<readonly AlleleVaultAllele[]>(ALLELE_VAULT_ALLELES);
  readonly modelSelected = output<'replication' | 'transcription' | 'mutation' | 'repair'>();

  readonly comparisonScope = signal<DnaComparisonScope>('gene');
  readonly specimenAId = signal<string | null>(null);
  readonly specimenBId = signal<string | null>(null);
  readonly evidence = signal<MolecularEvidenceRecord[]>([]);
  readonly workingSequences = signal<Record<string, string>>({});

  private loadedStudentId: string | null = null;
  private loadedTransferId: string | null = null;

  readonly geneSpecimens = computed<readonly DnaSpecimen[]>(() => {
    const genes = new Map(this.genes().map((gene) => [gene.id, gene]));
    return this.alleles().flatMap((allele): DnaSpecimen[] => {
      const gene = genes.get(allele.geneId);
      if (!gene) return [];
      const alleleIndex = gene.alleleIds.indexOf(allele.id);
      return [
        {
          id: `gene:${allele.id}`,
          label: allele.sampleCode,
          detail: `${gene.chromosome} · ${gene.locus} · ${allele.modelSequence.length} bases`,
          sequence: allele.modelSequence.join(''),
          chromosome: gene.chromosome,
          geneId: gene.id,
          locusLabel: gene.sampleCode,
          sampleCode: allele.sampleCode,
          alleleIndex: alleleIndex === 1 ? 1 : 0,
        },
      ];
    });
  });

  readonly chromosomeSpecimens = computed<readonly DnaSpecimen[]>(() => {
    const alleleById = new Map(this.alleles().map((allele) => [allele.id, allele]));
    const chromosomes = [...new Set(this.genes().map((gene) => gene.chromosome))];
    return chromosomes.flatMap((chromosome) => {
      const chromosomeGenes = this.genes().filter((gene) => gene.chromosome === chromosome);
      return ([0, 1] as const).map((homologIndex) => {
        const homologLabel = homologIndex === 0 ? 'A' : 'B';
        const sequences = chromosomeGenes.map(
          (gene) => alleleById.get(gene.alleleIds[homologIndex])?.modelSequence.join('') ?? '',
        );
        const sequence = sequences.join('');
        return {
          id: `chromosome:${chromosome}:${homologLabel}`,
          label: `${chromosome} · homolog ${homologLabel}`,
          detail: `${chromosomeGenes.length} released genes · ${sequence.length} modeled bases`,
          sequence,
          chromosome,
          alleleIndex: homologIndex,
        } satisfies DnaSpecimen;
      });
    });
  });

  readonly transferredSpecimens = computed<readonly DnaSpecimen[]>(() => {
    const analysis = this.analysisCase();
    if (!analysis) return [];
    const chromosome = analysis.chromosomeLabel ?? 'Chr 1';
    return [
      {
        id: `transfer:${analysis.id}:a`,
        label: analysis.referenceSampleLabel ?? 'Sample A',
        detail: `${chromosome} · transferred DNA record · ${analysis.reference.length} bases`,
        sequence: analysis.reference,
        chromosome,
        locusLabel: analysis.geneLabel,
        sampleCode: analysis.referenceSampleLabel,
        transferred: true,
      },
      {
        id: `transfer:${analysis.id}:b`,
        label: analysis.comparisonSampleLabel ?? 'Sample B',
        detail: `${chromosome} · transferred DNA record · ${analysis.sample.length} bases`,
        sequence: analysis.sample,
        chromosome,
        locusLabel: analysis.geneLabel,
        sampleCode: analysis.comparisonSampleLabel,
        transferred: true,
      },
    ];
  });

  readonly availableSpecimens = computed<readonly DnaSpecimen[]>(() =>
    this.comparisonScope() === 'gene'
      ? [...this.transferredSpecimens(), ...this.geneSpecimens()]
      : this.chromosomeSpecimens(),
  );
  readonly specimenA = computed(() => this.findSpecimen(this.specimenAId()));
  readonly specimenB = computed(() => this.findSpecimen(this.specimenBId()));
  readonly comparisonCase = computed<DnaAnalysisCase | null>(() => {
    const specimenA = this.specimenA();
    const specimenB = this.specimenB();
    if (!specimenA || !specimenB) return null;
    const id = `${this.comparisonScope()}:${specimenA.id}:${specimenB.id}`;
    const sample = this.workingSequences()[id] ?? specimenB.sequence;
    return {
      id,
      sampleLabel: `${specimenA.label} compared with ${specimenB.label}`,
      chromosomeLabel:
        specimenA.chromosome === specimenB.chromosome
          ? specimenA.chromosome
          : `${specimenA.chromosome} / ${specimenB.chromosome}`,
      geneLabel:
        this.comparisonScope() === 'gene'
          ? `${specimenA.locusLabel ?? specimenA.label} ↔ ${specimenB.locusLabel ?? specimenB.label}`
          : undefined,
      referenceSampleLabel: specimenA.label,
      comparisonSampleLabel: specimenB.label,
      reference: specimenA.sequence,
      sample,
      mutationType:
        specimenA.sequence.length < sample.length
          ? 'insertion'
          : specimenA.sequence.length > sample.length
            ? 'deletion'
            : 'substitution',
    };
  });
  readonly caseEvidence = computed(() => {
    const caseId = this.comparisonCase()?.id;
    return caseId ? this.evidence().filter((record) => record.caseId === caseId) : [];
  });

  constructor() {
    effect(() => {
      const studentId = this.studentId();
      if (this.loadedStudentId === studentId) return;
      this.loadedStudentId = studentId;
      const stored = this.repository.load(studentId);
      untracked(() => {
        this.comparisonScope.set(stored.scope ?? 'gene');
        this.specimenAId.set(stored.specimenAId ?? null);
        this.specimenBId.set(stored.specimenBId ?? null);
        this.workingSequences.set(stored.workingSequences ?? {});
        this.evidence.set(stored.evidence ?? []);
      });
    });

    effect(() => {
      const analysis = this.analysisCase();
      if (!analysis || this.loadedTransferId === analysis.id) return;
      this.loadedTransferId = analysis.id;
      untracked(() => {
        this.comparisonScope.set('gene');
        this.specimenAId.set(`transfer:${analysis.id}:a`);
        this.specimenBId.set(`transfer:${analysis.id}:b`);
      });
    });

    effect(() => {
      const specimens = this.availableSpecimens();
      const availableIds = new Set(specimens.map((specimen) => specimen.id));
      untracked(() => {
        if (!availableIds.has(this.specimenAId() ?? '')) {
          this.specimenAId.set(specimens[0]?.id ?? null);
        }
        if (!availableIds.has(this.specimenBId() ?? '')) {
          this.specimenBId.set(specimens[1]?.id ?? specimens[0]?.id ?? null);
        }
      });
    });
  }

  selectScope(scope: DnaComparisonScope): void {
    if (scope === this.comparisonScope()) return;
    this.comparisonScope.set(scope);
    const specimens = scope === 'gene' ? this.geneSpecimens() : this.chromosomeSpecimens();
    this.specimenAId.set(specimens[0]?.id ?? null);
    this.specimenBId.set(specimens[1]?.id ?? specimens[0]?.id ?? null);
    this.persistState();
  }

  selectSpecimen(side: 'a' | 'b', event: Event): void {
    const id = (event.target as HTMLSelectElement).value || null;
    if (side === 'a') this.specimenAId.set(id);
    else this.specimenBId.set(id);
    this.persistState();
  }

  swapSpecimens(): void {
    const specimenAId = this.specimenAId();
    this.specimenAId.set(this.specimenBId());
    this.specimenBId.set(specimenAId);
    this.persistState();
  }

  recordEvidence(result: DnaEvidenceResult): void {
    const record: MolecularEvidenceRecord = {
      ...result,
      id: `${result.caseId}:${result.tool}:${Date.now()}`,
      recordedAtIso: new Date().toISOString(),
    };
    this.evidence.update((records) => [...records, record].slice(-80));
    this.persistState();
    this.modelSelected.emit(result.tool === 'repair' ? 'repair' : 'mutation');
  }

  recordWorkingSequence(change: DnaSequenceChanged): void {
    this.workingSequences.update((sequences) => ({
      ...sequences,
      [change.caseId]: change.sequence,
    }));
    this.persistState();
  }

  chromosomeFor(specimen: DnaSpecimen | null): ChromosomeSvgModel | null {
    if (!specimen) return null;
    if (specimen.transferred && this.chromosomeModel()) return this.chromosomeModel();
    const visual = chromosomeVisual(specimen.chromosome);
    const chromosomeGenes = this.genes().filter((gene) => gene.chromosome === specimen.chromosome);
    const chromosomeNumber = specimen.chromosome.replace(/^Chr\s*/i, '');
    return {
      length: visual.length,
      leftLabel: `${chromosomeNumber}p`,
      rightLabel: `${chromosomeNumber}q`,
      centromere: visual.centromere,
      bands: visual.bands,
      loci: chromosomeGenes.map((gene, index) => {
        const alleleIndex =
          specimen.geneId === gene.id || specimen.geneId === undefined
            ? specimen.alleleIndex
            : undefined;
        const allele =
          alleleIndex === undefined
            ? undefined
            : this.alleles().find((candidate) => candidate.id === gene.alleleIds[alleleIndex]);
        return {
          position: visual.locusPositions[index] ?? 0.5,
          label: gene.sampleCode,
          symbol: allele?.sampleCode,
          color: geneDnaRecord(gene.id).locusColor,
          marking:
            alleleIndex === undefined ? undefined : geneAlleleMarking(gene.id, alleleIndex),
        };
      }),
    };
  }

  private findSpecimen(id: string | null): DnaSpecimen | null {
    return this.availableSpecimens().find((specimen) => specimen.id === id) ?? null;
  }

  private persistState(): void {
    this.repository.save(this.studentId(), {
      scope: this.comparisonScope(),
      specimenAId: this.specimenAId(),
      specimenBId: this.specimenBId(),
      workingSequences: this.workingSequences(),
      evidence: this.evidence(),
    });
  }
}
