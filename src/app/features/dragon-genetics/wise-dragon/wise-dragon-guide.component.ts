import {
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormField, form, maxLength, required } from '@angular/forms/signals';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { SpecimenViewportComponent } from '../../../shared/assembly/preview/specimen-viewport.component';
import { provideDragonSpecimenProfile } from '../simulation/domain/dragon-specimen.profile';
import { WISE_DRAGON_SOURCE, WISE_DRAGON_STAGE_THEME } from './wise-dragon.character';
import {
  WISE_DRAGON_QUICK_QUESTIONS,
  answerWiseDragonGuideQuestion,
  resolveWiseDragonGuideContext,
} from './wise-dragon-guide.content';
import { WiseDragonGuideService } from './wise-dragon-guide.service';
import { WISE_DRAGON_IDLE, WISE_DRAGON_MOTIONS } from './wise-dragon.motion';
import { WorkstationGuideStateService } from './workstation-guide-state.service';
import { WiseDragonVoiceService } from './wise-dragon-voice.service';

interface GuideTurn {
  id: number;
  role: 'student' | 'wise-dragon';
  message: string;
}

@Component({
  selector: 'app-wise-dragon-guide',
  host: {
    '(document:keydown.escape)': 'closeOnEscape()',
  },
  imports: [FormField, SpecimenViewportComponent],
  templateUrl: './wise-dragon-guide.component.html',
  styleUrl: './wise-dragon-guide.component.scss',
  providers: [...provideDragonSpecimenProfile()],
})
export class WiseDragonGuideComponent implements OnDestroy {
  @ViewChild('launcher') private launcher?: ElementRef<HTMLButtonElement>;
  @ViewChild('closeButton') private closeButton?: ElementRef<HTMLButtonElement>;
  @ViewChild('conversation') private conversation?: ElementRef<HTMLElement>;
  @ViewChild('wiseViewport') private wiseViewport?: SpecimenViewportComponent;

  private readonly router = inject(Router);
  readonly guide = inject(WiseDragonGuideService);
  readonly liveGuide = inject(WorkstationGuideStateService);
  readonly voice = inject(WiseDragonVoiceService);
  private turnId = 0;
  private activeContextId = '';

  readonly showLauncher = input(true);
  readonly source = WISE_DRAGON_SOURCE;
  readonly theme = WISE_DRAGON_STAGE_THEME;
  readonly wiseDragonIdle = WISE_DRAGON_IDLE;
  readonly quickQuestions = WISE_DRAGON_QUICK_QUESTIONS;
  private readonly questionModel = signal({ question: '' });
  readonly questionForm = form(this.questionModel, (question) => {
    required(question.question, { message: 'Enter a question for the Wise Dragon.' });
    maxLength(question.question, 500, { message: 'Keep the question under 500 characters.' });
  });
  readonly turns = signal<readonly GuideTurn[]>([]);
  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );
  readonly context = computed(() => resolveWiseDragonGuideContext(this.currentUrl()));
  readonly liveState = computed(() => {
    const state = this.liveGuide.state();
    return state?.contextId === this.context().id ? state : null;
  });

  constructor() {
    effect(() => {
      const context = this.context();
      if (context.id === this.activeContextId) return;
      this.activeContextId = context.id;
      this.turns.set([this.turn('wise-dragon', context.welcome)]);
      this.questionModel.set({ question: '' });
      this.liveGuide.enter(context.id);
    });
    effect(() => {
      if (!this.guide.open()) return;
      queueMicrotask(() => this.closeButton?.nativeElement.focus());
    });
    effect(() => {
      this.voice.speechPulse();
      if (this.voice.speaking() && this.guide.open()) {
        queueMicrotask(() => void this.wiseViewport?.playMotion(WISE_DRAGON_MOTIONS.speaking!));
      }
    });
  }

  openGuide(): void {
    this.guide.show();
    queueMicrotask(() => void this.wiseViewport?.playMotion(WISE_DRAGON_MOTIONS.inquisitive!));
    this.voice.speak(this.context().welcome);
  }

  closeGuide(): void {
    this.voice.stop();
    this.guide.close();
    queueMicrotask(() => this.launcher?.nativeElement.focus());
  }

  submitQuestion(event: SubmitEvent): void {
    event.preventDefault();
    if (this.questionForm().valid()) this.ask(this.questionModel().question);
  }

  ask(question: string): void {
    const cleanQuestion = question.trim();
    if (!cleanQuestion) return;
    const answer = answerWiseDragonGuideQuestion(this.context(), cleanQuestion);
    this.turns.update((turns) => [
      ...turns,
      this.turn('student', cleanQuestion),
      this.turn('wise-dragon', answer),
    ]);
    this.questionModel.set({ question: '' });
    this.voice.speak(answer);
    queueMicrotask(() => {
      const conversation = this.conversation?.nativeElement;
      if (conversation) conversation.scrollTop = conversation.scrollHeight;
    });
  }

  closeOnEscape(): void {
    if (this.guide.open()) this.closeGuide();
  }

  ngOnDestroy(): void {
    this.voice.stop();
    this.guide.close();
  }

  toggleVoice(): void {
    this.voice.toggle();
  }

  private turn(role: GuideTurn['role'], message: string): GuideTurn {
    this.turnId += 1;
    return { id: this.turnId, role, message };
  }
}
