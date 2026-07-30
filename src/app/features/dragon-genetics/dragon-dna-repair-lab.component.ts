import { ChangeDetectionStrategy, Component, OnDestroy, computed, signal } from '@angular/core';

type LabMode = 'uncoil' | 'replicate' | 'repair';
type DnaBase = 'A' | 'T' | 'C' | 'G';

const TEMPLATE: readonly DnaBase[] = ['A', 'C', 'G', 'T', 'T', 'A', 'C', 'G'];
const COMPLEMENT: Readonly<Record<DnaBase, DnaBase>> = { A: 'T', T: 'A', C: 'G', G: 'C' };
const UNCOIL_STAGES = [
  { label: 'Condensed chromosome', note: 'A chromosome is a package containing a long DNA molecule.' },
  { label: 'Coiled DNA', note: 'DNA is wrapped and folded so it fits inside the nucleus.' },
  { label: 'DNA double helix', note: 'The two strands pair A with T and C with G.' },
  { label: 'Highlighted gene section', note: 'A gene is one longer section of the DNA—not one base pair.' },
] as const;

@Component({
  selector: 'app-dragon-dna-repair-lab',
  templateUrl: './dragon-dna-repair-lab.component.html',
  styleUrl: './dragon-dna-repair-lab.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DragonDnaRepairLabComponent implements OnDestroy {
  readonly modes: readonly { id: LabMode; label: string }[] = [
    { id: 'uncoil', label: 'DNA uncoiling' },
    { id: 'replicate', label: 'Replication' },
    { id: 'repair', label: 'Repair a copying error' },
  ];
  readonly mode = signal<LabMode>('uncoil');
  readonly uncoilStep = signal(0);
  readonly replicationProgress = signal(0);
  readonly repairChoice = signal<DnaBase | null>(null);
  readonly template = TEMPLATE;
  readonly correctCopy = TEMPLATE.map(base => COMPLEMENT[base]);
  readonly damagedCopy = this.correctCopy.map((base, index) => index === 4 ? 'C' as DnaBase : base);
  readonly bases: readonly DnaBase[] = ['A', 'T', 'C', 'G'];
  readonly stages = UNCOIL_STAGES;
  readonly activeStage = computed(() => UNCOIL_STAGES[this.uncoilStep()]);
  readonly repaired = computed(() => this.repairChoice() === this.correctCopy[4]);
  private timer: ReturnType<typeof setInterval> | null = null;

  selectMode(mode: LabMode): void {
    this.stopAnimation();
    this.mode.set(mode);
  }

  setUncoilStep(value: string | number): void {
    this.uncoilStep.set(Math.max(0, Math.min(3, Number(value))));
  }

  playReplication(): void {
    this.stopAnimation();
    this.replicationProgress.set(0);
    this.timer = setInterval(() => {
      const next = this.replicationProgress() + 1;
      this.replicationProgress.set(next);
      if (next >= TEMPLATE.length) this.stopAnimation();
    }, 260);
  }

  setReplicationProgress(value: string | number): void {
    this.stopAnimation();
    this.replicationProgress.set(Math.max(0, Math.min(TEMPLATE.length, Number(value))));
  }

  chooseRepair(base: DnaBase): void {
    this.repairChoice.set(base);
  }

  displayedRepairBase(index: number): DnaBase {
    return index === 4 && this.repaired() ? this.correctCopy[index] : this.damagedCopy[index];
  }

  ngOnDestroy(): void {
    this.stopAnimation();
  }

  private stopAnimation(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
}
