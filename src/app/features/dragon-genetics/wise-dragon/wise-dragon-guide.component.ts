import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  ViewChild,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
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
import { WISE_DRAGON_MOTIONS } from './wise-dragon.motion';

interface GuideTurn {
  id: number;
  role: 'student' | 'wise-dragon';
  message: string;
}

@Component({
  selector: 'app-wise-dragon-guide',
  imports: [SpecimenViewportComponent],
  templateUrl: './wise-dragon-guide.component.html',
  styleUrl: './wise-dragon-guide.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [...provideDragonSpecimenProfile()],
})
export class WiseDragonGuideComponent implements OnDestroy {
  @ViewChild('launcher') private launcher?: ElementRef<HTMLButtonElement>;
  @ViewChild('closeButton') private closeButton?: ElementRef<HTMLButtonElement>;
  @ViewChild('conversation') private conversation?: ElementRef<HTMLElement>;
  @ViewChild('wiseViewport') private wiseViewport?: SpecimenViewportComponent;

  private readonly router = inject(Router);
  readonly guide = inject(WiseDragonGuideService);
  private turnId = 0;
  private activeContextId = '';

  readonly showLauncher = input(true);
  readonly source = WISE_DRAGON_SOURCE;
  readonly theme = WISE_DRAGON_STAGE_THEME;
  readonly quickQuestions = WISE_DRAGON_QUICK_QUESTIONS;
  readonly question = signal('');
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

  constructor() {
    effect(() => {
      const context = this.context();
      if (context.id === this.activeContextId) return;
      this.activeContextId = context.id;
      this.turns.set([this.turn('wise-dragon', context.welcome)]);
      this.question.set('');
    });
    effect(() => {
      if (!this.guide.open()) return;
      queueMicrotask(() => this.closeButton?.nativeElement.focus());
    });
  }

  openGuide(): void {
    this.guide.show();
    queueMicrotask(() => void this.wiseViewport?.playMotion(WISE_DRAGON_MOTIONS.inquisitive!));
  }

  closeGuide(): void {
    this.guide.close();
    queueMicrotask(() => this.launcher?.nativeElement.focus());
  }

  updateQuestion(event: Event): void {
    if (event.target instanceof HTMLTextAreaElement) this.question.set(event.target.value);
  }

  submitQuestion(event: SubmitEvent): void {
    event.preventDefault();
    this.ask(this.question());
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
    this.question.set('');
    void this.wiseViewport?.playMotion(WISE_DRAGON_MOTIONS.speaking!);
    queueMicrotask(() => {
      const conversation = this.conversation?.nativeElement;
      if (conversation) conversation.scrollTop = conversation.scrollHeight;
    });
  }

  @HostListener('document:keydown.escape')
  closeOnEscape(): void {
    if (this.guide.open()) this.closeGuide();
  }

  ngOnDestroy(): void {
    this.guide.close();
  }

  private turn(role: GuideTurn['role'], message: string): GuideTurn {
    this.turnId += 1;
    return { id: this.turnId, role, message };
  }
}
