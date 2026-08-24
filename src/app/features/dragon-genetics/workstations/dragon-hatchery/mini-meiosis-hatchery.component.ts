import { Component, computed, signal } from '@angular/core';
import { DragonSex } from '../../simulation/domain/dragon-expressive-genome';
import { DragonParentProfile } from '../../simulation/domain/dragon-lab.models';
import { MINI_FOUNDERS, MiniFounderDefinition } from '../companion-show/mini-dragon.genetics';
import { MeiosisGameteSelectorComponent } from './meiosis-gamete-selector.component';
import { SelectedMeiosisGamete } from './meiosis-gamete.models';

type ParentRole = 'female' | 'male';

interface MiniStarter {
  founder: MiniFounderDefinition;
  sex: DragonSex;
  meiosisProfile: DragonParentProfile;
}

interface MiniEggRecord {
  id: string;
  eggParent: string;
  spermParent: string;
  pairs: readonly { trait: string; egg: string; sperm: string; genotype: string }[];
}

const STARTERS: readonly MiniStarter[] = MINI_FOUNDERS.slice(0, 4).map((founder, index) => ({
  founder,
  sex: index % 2 === 0 ? 'female' : 'male',
  meiosisProfile: {
    id: founder.id,
    name: founder.name,
    title: founder.title,
    color: index % 2 === 0 ? '#d6a653' : '#7f8998',
    accentColor: '#f5d894',
    genome: {
      wings: [...founder.genome.wings],
      fire: [...founder.genome.coat],
      scales: founder.genome.pattern.map((allele) => allele === 'A' ? 'S' : 's') as [string, string],
      horns: founder.genome.horns.map((allele) => allele === 'C' ? 'H' : 'h') as [string, string],
      legs: ['L', 'l'],
      claws: ['C', 'c'],
      crest: ['R', 'r'],
      spikes: ['P', 'p'],
    },
  },
}));

@Component({
  selector: 'app-mini-meiosis-hatchery',
  imports: [MeiosisGameteSelectorComponent],
  templateUrl: './mini-meiosis-hatchery.component.html',
  styleUrl: './mini-meiosis-hatchery.component.scss',
})
export class MiniMeiosisHatcheryComponent {
  readonly starters = STARTERS;
  readonly eggParentId = signal<string | null>(null);
  readonly spermParentId = signal<string | null>(null);
  readonly activeRole = signal<ParentRole>('female');
  readonly eggSelection = signal<SelectedMeiosisGamete | null>(null);
  readonly spermSelection = signal<SelectedMeiosisGamete | null>(null);
  readonly eggs = signal<readonly MiniEggRecord[]>(loadEggs());
  readonly eggParent = computed(() => this.starter(this.eggParentId()));
  readonly spermParent = computed(() => this.starter(this.spermParentId()));
  readonly activeParent = computed(() =>
    this.activeRole() === 'female' ? this.eggParent() : this.spermParent(),
  );
  readonly latestEgg = computed(() => this.eggs().at(-1) ?? null);

  startersFor(sex: DragonSex): readonly MiniStarter[] {
    return this.starters.filter((starter) => starter.sex === sex);
  }

  selectParent(role: ParentRole, id: string): void {
    if (role === 'female') {
      this.eggParentId.set(id);
      this.eggSelection.set(null);
    } else {
      this.spermParentId.set(id);
      this.spermSelection.set(null);
    }
    this.activeRole.set(role);
  }

  selectGamete(role: ParentRole, selection: SelectedMeiosisGamete): void {
    if (role === 'female') {
      this.eggSelection.set(selection);
      this.activeRole.set('male');
    } else {
      this.spermSelection.set(selection);
    }
    if (this.eggSelection() && this.spermSelection()) this.formEgg();
  }

  private formEgg(): void {
    const egg = this.eggSelection()!;
    const sperm = this.spermSelection()!;
    const eggParent = this.eggParent()!;
    const spermParent = this.spermParent()!;
    const pairs = [
      pair('Wings', egg.gamete.alleleByTrait.wings, sperm.gamete.alleleByTrait.wings),
      pair('Back scales', egg.gamete.alleleByTrait.fire, sperm.gamete.alleleByTrait.fire),
      pair('Coat pattern', mapPattern(egg.gamete.alleleByTrait.scales), mapPattern(sperm.gamete.alleleByTrait.scales)),
      pair('Horns', mapHorns(egg.gamete.alleleByTrait.horns), mapHorns(sperm.gamete.alleleByTrait.horns)),
    ];
    const record: MiniEggRecord = {
      id: `mini-egg-${this.eggs().length + 1}`,
      eggParent: eggParent.founder.name,
      spermParent: spermParent.founder.name,
      pairs,
    };
    const eggs = [...this.eggs(), record];
    this.eggs.set(eggs);
    if (typeof localStorage !== 'undefined') localStorage.setItem(storageKey(), JSON.stringify(eggs));
    this.eggSelection.set(null);
    this.spermSelection.set(null);
    this.activeRole.set('female');
  }

  private starter(id: string | null): MiniStarter | null {
    return this.starters.find((starter) => starter.founder.id === id) ?? null;
  }
}

function pair(trait: string, egg = '?', sperm = '?'): MiniEggRecord['pairs'][number] {
  return { trait, egg, sperm, genotype: `${egg}${sperm}` };
}

function mapPattern(allele: string | undefined): string {
  return allele === 'S' ? 'A' : allele === 's' ? 'G' : '?';
}

function mapHorns(allele: string | undefined): string {
  return allele === 'H' ? 'C' : allele === 'h' ? 'c' : '?';
}

function storageKey(): string {
  return 'pbl-forge.dragon-genetics.mini-meiosis-eggs.v1.local-student';
}

function loadEggs(): readonly MiniEggRecord[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const value = JSON.parse(localStorage.getItem(storageKey()) ?? '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}
