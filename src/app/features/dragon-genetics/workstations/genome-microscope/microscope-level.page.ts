import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { DragonLessonPlanRepository } from '../../lesson-plan/dragon-lesson-plan.repository';
import { DragonWorkstationHostShellComponent } from '../../orchestration/dragon-workstation-host-shell.component';
import { resolveDragonWorkstationLaunchContext } from '../../orchestration/dragon-workstation-launch-context';
import { DragonWorkstationContextService } from '../shared/dragon-workstation-context.service';
import { GenomeMicroscopeComponent } from './genome-microscope.component';
import { GenomeMicroscopeEvidence, GenomeMicroscopeLevel } from './genome-microscope.models';
import { MicroscopeLevelEvidenceRepository } from './microscope-level-evidence.repository';
import { microscopeLevelWorkstation } from './microscope-level-workstations';

@Component({
  selector: 'app-microscope-level-page',
  imports: [DragonWorkstationHostShellComponent, GenomeMicroscopeComponent],
  templateUrl: './microscope-level.page.html',
  styleUrl: './microscope-level.page.scss',
})
export class MicroscopeLevelPage {
  private readonly route = inject(ActivatedRoute);
  private readonly lessonPlan = inject(DragonLessonPlanRepository);
  private readonly evidenceRepository = inject(MicroscopeLevelEvidenceRepository);
  private readonly queryParams = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });

  readonly context = inject(DragonWorkstationContextService);
  readonly definition = microscopeLevelWorkstation(
    this.route.snapshot.data['microscopeLevel'] as GenomeMicroscopeLevel,
  );
  readonly levelScope = [this.definition.level] as const;
  readonly savedRecordCount = signal(
    this.evidenceRepository.load(this.context.studentId(), this.definition.level).length,
  );
  readonly launchContext = computed(() =>
    resolveDragonWorkstationLaunchContext(this.lessonPlan.document(), {
      pathId: this.queryParams().get('path'),
      lessonId: this.queryParams().get('lesson'),
      workstationId: this.definition.id,
      workstationRoute: this.definition.route,
    }),
  );

  recordEvidence(evidence: GenomeMicroscopeEvidence): void {
    const records = this.evidenceRepository.record(this.context.studentId(), evidence);
    this.savedRecordCount.set(records.length);
  }
}
