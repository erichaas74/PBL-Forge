import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
} from '@angular/core';
import { ChromosomeSvgComponent, ChromosomeSvgModel } from '../shared/chromosome-svg.component';
import {
  DnaAnalysisCase,
  DnaEvidenceResult,
  DnaEvidenceTool,
  DnaSequenceAnalysisComponent,
  TEST_DNA_ANALYSIS_CASE,
} from './dna-sequence-analysis.component';

interface MolecularEvidenceRecord extends DnaEvidenceResult {
  id: string;
  recordedAtIso: string;
}

const EVIDENCE_KEY = 'pbl-forge.dragon-genetics.dna-evidence.v1';
const TOOLS: readonly { id: DnaEvidenceTool; label: string }[] = [
  { id: 'align', label: 'ALIGN' },
  { id: 'pair', label: 'PAIR' },
  { id: 'copy', label: 'COPY' },
  { id: 'rna', label: 'RNA' },
  { id: 'mutation', label: 'CHANGE' },
  { id: 'repair', label: 'REPAIR' },
];

@Component({
  selector: 'app-dragon-dna-repair-lab',
  imports: [DnaSequenceAnalysisComponent, ChromosomeSvgComponent],
  templateUrl: './dragon-dna-repair-lab.component.html',
  styleUrl: './dragon-dna-repair-lab.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DragonDnaRepairLabComponent {
  readonly focusQuestionId = input<string | null>(null);
  readonly analysisCase = input<DnaAnalysisCase | null>(null);
  readonly chromosomeModel = input<ChromosomeSvgModel | null>(null);
  readonly modelSelected = output<'replication' | 'transcription' | 'mutation' | 'repair'>();
  readonly activeAnalysisCase = computed(() => this.analysisCase() ?? TEST_DNA_ANALYSIS_CASE);
  readonly tools = TOOLS;
  readonly activeTool = signal<DnaEvidenceTool>('align');
  readonly evidence = signal<MolecularEvidenceRecord[]>(loadEvidence());
  readonly claimTool = signal<DnaEvidenceTool>('align');
  readonly claimStatus = signal<'idle' | 'saved' | 'unsupported'>('idle');
  readonly caseEvidence = computed(() =>
    this.evidence().filter((record) => record.caseId === this.activeAnalysisCase().id),
  );

  constructor() {
    effect(() => {
      const focus = this.focusQuestionId();
      const tool = focus?.includes('transcription')
        ? 'rna'
        : focus?.includes('repair')
          ? 'repair'
          : focus?.includes('mutation')
            ? 'mutation'
            : null;
      if (tool) this.activeTool.set(tool);
    });
  }

  selectTool(tool: DnaEvidenceTool): void {
    this.activeTool.set(tool);
    this.claimTool.set(tool);
    this.claimStatus.set('idle');
  }

  recordEvidence(result: DnaEvidenceResult): void {
    const record: MolecularEvidenceRecord = {
      ...result,
      id: `${result.caseId}:${result.tool}:${Date.now()}`,
      recordedAtIso: new Date().toISOString(),
    };
    this.evidence.update((records) => [...records, record].slice(-60));
    saveEvidence(this.evidence());
    if (result.supported) this.modelSelected.emit(nodeForTool(result.tool));
  }

  selectClaim(event: Event): void {
    this.claimTool.set((event.target as HTMLSelectElement).value as DnaEvidenceTool);
    this.claimStatus.set('idle');
  }

  saveClaim(): void {
    const supported = this.caseEvidence().some(
      (record) => record.tool === this.claimTool() && record.supported,
    );
    this.claimStatus.set(supported ? 'saved' : 'unsupported');
  }
}

function nodeForTool(
  tool: DnaEvidenceTool,
): 'replication' | 'transcription' | 'mutation' | 'repair' {
  if (tool === 'copy') return 'replication';
  if (tool === 'rna') return 'transcription';
  if (tool === 'repair') return 'repair';
  return 'mutation';
}

function loadEvidence(): MolecularEvidenceRecord[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(EVIDENCE_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveEvidence(records: readonly MolecularEvidenceRecord[]): void {
  try {
    localStorage.setItem(EVIDENCE_KEY, JSON.stringify(records));
  } catch {
    // The workstation remains usable when device storage is unavailable.
  }
}
