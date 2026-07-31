import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { SessionService } from '../../../core/firebase/session.service';
import { DragonAdaptiveStore } from './dragon-adaptive.store';
import {
  GeneratedSimulationQuestion,
  InstructionLevel,
  INSTRUCTION_LEVELS,
  INSTRUCTION_LEVEL_LABELS,
} from './dragon-simulation.models';
import {
  DRAGON_SIMULATION_BY_ID,
  DRAGON_SIMULATIONS,
  isDragonSimulationId,
  LEVEL_PROFILES,
} from './dragon-simulation.registry';
import { DragonSimulationVisualComponent } from './dragon-simulation-visual.component';

@Component({
  selector: 'app-dragon-simulation-experience-page',
  imports: [RouterLink, DragonSimulationVisualComponent],
  templateUrl: './dragon-simulation-experience.page.html',
  styleUrl: './dragon-simulation-experience.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DragonSimulationExperiencePage {
  readonly store = inject(DragonAdaptiveStore);
  readonly session = inject(SessionService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly simulationId = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('simulationId'))),
    { initialValue: this.route.snapshot.paramMap.get('simulationId') },
  );

  readonly definition = computed(() => {
    const id = this.simulationId();
    return isDragonSimulationId(id) ? DRAGON_SIMULATION_BY_ID[id] : null;
  });
  readonly run = computed(() => {
    const definition = this.definition();
    return definition ? this.store.runs()[definition.id] ?? null : null;
  });
  readonly questions = computed(() => {
    const definition = this.definition();
    const run = this.run();
    return definition && run ? this.store.questionsFor(definition, run) : [];
  });
  readonly question = computed(() => {
    const run = this.run();
    return run ? this.questions()[run.currentQuestionIndex] ?? null : null;
  });
  readonly response = computed(() => {
    const run = this.run();
    const question = this.question();
    return run && question
      ? run.responses.find((item) => item.questionId === question.id) ?? null
      : null;
  });
  readonly activeSection = computed(() => {
    const definition = this.definition();
    const question = this.question();
    return definition?.sections.find((section) => section.id === question?.sectionId)
      ?? definition?.sections[0]
      ?? null;
  });
  readonly nextDefinition = computed(() => {
    const definition = this.definition();
    if (!definition) return null;
    return DRAGON_SIMULATIONS[DRAGON_SIMULATIONS.indexOf(definition) + 1] ?? null;
  });
  readonly selectedNodeId = signal<string | null>(null);
  readonly hintOpen = signal(false);
  readonly levels = INSTRUCTION_LEVELS;
  readonly levelLabels = INSTRUCTION_LEVEL_LABELS;
  readonly levelProfiles = LEVEL_PROFILES;

  constructor() {
    effect(() => {
      const definition = this.definition();
      if (!definition) {
        void this.router.navigate(['/dragon-genetics']);
        return;
      }
      this.selectedNodeId.set(null);
      this.hintOpen.set(false);
      void this.store.prepareRun(definition);
    });
  }

  selectNode(nodeId: string): void {
    this.selectedNodeId.set(nodeId);
    const question = this.question();
    if (!question || this.response()) return;
    const matchingOption = question.options.find((option) =>
      option.nodeId === nodeId || option.id === nodeId);
    if (matchingOption) this.answer(question, matchingOption.id);
  }

  answer(question: GeneratedSimulationQuestion, optionId: string): void {
    const definition = this.definition();
    if (!definition) return;
    const option = question.options.find((candidate) => candidate.id === optionId);
    if (option?.nodeId) this.selectedNodeId.set(option.nodeId);
    this.store.answer(definition, question, optionId);
  }

  continue(): void {
    const definition = this.definition();
    if (!definition) return;
    this.selectedNodeId.set(null);
    this.hintOpen.set(false);
    this.store.advance(definition.id);
  }

  async restart(): Promise<void> {
    const definition = this.definition();
    if (!definition) return;
    await this.store.restart(definition);
    this.selectedNodeId.set(null);
    this.hintOpen.set(false);
  }

  previewLevel(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    if (!INSTRUCTION_LEVELS.includes(value as InstructionLevel)) return;
    this.store.setTeacherPreviewLevel(value as InstructionLevel);
    void this.restart();
  }
}
