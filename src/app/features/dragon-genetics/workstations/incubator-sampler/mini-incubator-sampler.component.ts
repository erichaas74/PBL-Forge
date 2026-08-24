import { Component, computed, signal } from '@angular/core';
import { SpecimenThumbComponent } from '../../../../shared/assembly/preview/specimen-thumb.component';
import {
  MINI_FOUNDERS,
  MiniGeneId,
  breedMiniGenomes,
  miniPhenotypeForms,
  miniPhenotypeLabel,
} from '../companion-show/mini-dragon.genetics';
import { miniDragonSpecimenSource } from '../companion-show/mini-dragon.specimen';

interface MiniIncubatorBatch {
  id: string;
  parentIds: readonly [string, string];
  geneId: MiniGeneId;
  size: number;
  buckets: readonly { id: string; label: string; count: number; percentage: number }[];
}

const STORAGE_KEY = 'pbl-forge.dragon-genetics.mini-incubator.v1.local-student';
const GENES: readonly MiniGeneId[] = ['horns', 'wings', 'pattern', 'coat'];

@Component({
  selector: 'app-mini-incubator-sampler',
  imports: [SpecimenThumbComponent],
  templateUrl: './mini-incubator-sampler.component.html',
  styleUrl: './mini-incubator-sampler.component.scss',
})
export class MiniIncubatorSamplerComponent {
  readonly founders = MINI_FOUNDERS.slice(0, 4).map((founder) => ({
    ...founder,
    source: miniDragonSpecimenSource(founder.genome, founder.id, { label: founder.name }),
  }));
  readonly genes = GENES;
  readonly sampleSizes = [8, 25, 50] as const;
  readonly parentIds = signal<readonly [string, string]>([
    this.founders[0].id,
    this.founders[1].id,
  ]);
  readonly selectedGeneId = signal<MiniGeneId>('horns');
  readonly sampleSize = signal(8);
  readonly batches = signal<readonly MiniIncubatorBatch[]>(loadBatches());
  readonly latest = computed(() => this.batches().at(-1) ?? null);

  selectParent(slot: 0 | 1, founderId: string): void {
    const current = [...this.parentIds()] as [string, string];
    if (current[slot === 0 ? 1 : 0] === founderId) return;
    current[slot] = founderId;
    this.parentIds.set(current);
  }

  setGene(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as MiniGeneId;
    if (GENES.includes(value)) this.selectedGeneId.set(value);
  }

  setSampleSize(event: Event): void {
    const value = Number((event.target as HTMLSelectElement).value);
    if (this.sampleSizes.includes(value as (typeof this.sampleSizes)[number])) this.sampleSize.set(value);
  }

  runBatch(): void {
    const [firstId, secondId] = this.parentIds();
    const first = this.founders.find((founder) => founder.id === firstId)!;
    const second = this.founders.find((founder) => founder.id === secondId)!;
    const geneId = this.selectedGeneId();
    const size = this.sampleSize();
    const run = this.batches().length + 1;
    const labels = Array.from({ length: size }, (_, index) =>
      miniPhenotypeLabel(
        geneId,
        breedMiniGenomes(first.genome, second.genome, `lesson-2:${run}:${index}`),
      ),
    );
    const buckets = miniPhenotypeForms(geneId).map((form) => {
      const count = labels.filter((label) => label === form.label).length;
      return { id: form.id, label: form.label, count, percentage: Math.round((count / size) * 100) };
    });
    const batch: MiniIncubatorBatch = {
      id: `mini-batch-${run}`,
      parentIds: [first.id, second.id],
      geneId,
      size,
      buckets,
    };
    const batches = [...this.batches(), batch];
    this.batches.set(batches);
    if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, JSON.stringify(batches));
  }

  founderName(id: string): string {
    return this.founders.find((founder) => founder.id === id)?.name ?? id;
  }

  bucketIcons(count: number): readonly number[] {
    return Array.from({ length: Math.min(count, 12) }, (_, index) => index);
  }
}

function loadBatches(): readonly MiniIncubatorBatch[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}
