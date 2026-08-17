import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { SpecimenSource } from '../../../shared/assembly/preview/specimen.models';
import { SpecimenViewportComponent } from '../../../shared/assembly/preview/specimen-viewport.component';
import {
  companionAssembly,
  companionRibbons,
  founderToCompanion,
  meetsStandard,
  rebuildKennel,
} from '../workstations/companion-show/companion-show.domain';
import { CompanionDragon } from '../workstations/companion-show/companion-show.models';
import { CompanionShowRepository } from '../workstations/companion-show/companion-show.repository';
import { MINI_FOUNDERS } from '../workstations/companion-show/mini-dragon.genetics';

interface ChampionPreview {
  dragon: CompanionDragon;
  badge: string;
  breed: string;
  ribbons: number;
}

@Component({
  selector: 'app-mini-dragon-saga-preview',
  imports: [SpecimenViewportComponent],
  templateUrl: './mini-dragon-saga-preview.component.html',
  styleUrl: './mini-dragon-saga-preview.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MiniDragonSagaPreviewComponent {
  readonly studentId = input.required<string>();
  private readonly repository = inject(CompanionShowRepository);

  readonly preview = computed<ChampionPreview | null>(() => {
    const snapshot = this.repository.load(this.studentId());
    const kennel = rebuildKennel(snapshot).kennel;
    const selected = kennel.get(snapshot.championId ?? '') ?? null;
    const candidates = [...kennel.values()]
      .filter((dragon) => meetsStandard(dragon.genome, snapshot.targets))
      .sort((left, right) => companionRibbons(right.genome) - companionRibbons(left.genome));
    const candidate = candidates[0] ?? null;
    const fallbackFounder = MINI_FOUNDERS
      .map((founder) => founderToCompanion(founder.id))
      .filter((founder): founder is CompanionDragon => Boolean(founder))
      .sort((left, right) => companionRibbons(right.genome) - companionRibbons(left.genome))[0]
      ?? null;
    const dragon = selected ?? candidate ?? fallbackFounder;

    if (!dragon) return null;
    return {
      dragon,
      badge: selected
        ? 'Your champion'
        : candidate
          ? 'Champion candidate'
          : 'Society show champion',
      breed: selected || candidate
        ? snapshot.breedName.trim() || 'Your developing breed'
        : 'Royal Mini Dragon Society',
      ribbons: companionRibbons(dragon.genome),
    };
  });

  readonly source = computed<SpecimenSource | null>(() => {
    const preview = this.preview();
    if (!preview) return null;
    return {
      kind: 'blueprint',
      id: preview.dragon.id,
      blueprint: companionAssembly(preview.dragon),
      label: preview.dragon.name,
    };
  });
}
