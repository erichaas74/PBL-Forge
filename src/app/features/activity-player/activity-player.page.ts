import { AsyncPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { combineLatest, map, shareReplay, switchMap } from 'rxjs';
import { ProjectRepository } from '../../core/firebase/project.repository';
import { SessionService } from '../../core/firebase/session.service';
import {
  ActivityResponse,
  MatchingActivity,
  PblActivity,
  ReflectionActivity
} from '../../core/models/pbl.models';

@Component({
  selector: 'app-activity-player-page',
  imports: [AsyncPipe, RouterLink],
  templateUrl: './activity-player.page.html',
  styleUrl: './activity-player.page.scss',
})
export class ActivityPlayerPage {
  private readonly route = inject(ActivatedRoute);
  private readonly repository = inject(ProjectRepository);
  private readonly session = inject(SessionService);

  readonly selectedChoice = signal('');
  readonly matches = signal<Record<string, string>>({});
  readonly reflection = signal('');
  readonly feedback = signal('');
  readonly feedbackTone = signal<'neutral' | 'success' | 'retry'>('neutral');
  readonly saving = signal(false);

  readonly routeIds$ = this.route.paramMap.pipe(
    map((params) => ({
      projectId: params.get('projectId') ?? '',
      activityId: params.get('activityId') ?? ''
    })),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  readonly project$ = this.routeIds$.pipe(
    switchMap(({ projectId }) => this.repository.project$(projectId))
  );

  readonly activity$ = this.routeIds$.pipe(
    switchMap(({ projectId, activityId }) =>
      this.repository.activity$(projectId, activityId)
    ),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  readonly viewModel$ = combineLatest([this.project$, this.activity$, this.routeIds$]).pipe(
    map(([project, activity, routeIds]) => ({ project, activity, ...routeIds }))
  );

  setMatch(leftId: string, rightId: string): void {
    this.matches.update((current) => ({ ...current, [leftId]: rightId }));
    this.resetFeedback();
  }

  setReflection(value: string): void {
    this.reflection.set(value);
    this.resetFeedback();
  }

  wordCount(): number {
    const value = this.reflection().trim();
    return value ? value.split(/\s+/).length : 0;
  }

  matchingComplete(activity: MatchingActivity): boolean {
    return activity.left.every((item) => Boolean(this.matches()[item.id]));
  }

  reflectionComplete(activity: ReflectionActivity): boolean {
    return this.wordCount() >= activity.minWords;
  }

  async submit(activity: PblActivity, projectId: string): Promise<void> {
    const user = await this.session.ensureUser();
    if (!user) {
      this.feedbackTone.set('retry');
      this.feedback.set('Sign in before saving your work.');
      return;
    }

    const response = this.buildResponse(activity);
    if (!response) {
      return;
    }

    this.saving.set(true);
    try {
      await this.repository.saveResponse(user.uid, projectId, activity.id, response);
      this.showResult(activity, response);
    } catch (error) {
      console.error(error);
      this.feedbackTone.set('retry');
      this.feedback.set('Your response could not be saved. Check the emulator connection and try again.');
    } finally {
      this.saving.set(false);
    }
  }

  private buildResponse(activity: PblActivity): ActivityResponse | null {
    switch (activity.type) {
      case 'choice': {
        if (!this.selectedChoice()) return null;
        return {
          selectedOptionId: this.selectedChoice(),
          correct: this.selectedChoice() === activity.correctOptionId
        };
      }
      case 'matching': {
        if (!this.matchingComplete(activity)) return null;
        const correctCount = activity.left.filter(
          (item) => this.matches()[item.id] === activity.correctMatches[item.id]
        ).length;
        return {
          matches: this.matches(),
          correctCount,
          total: activity.left.length
        };
      }
      case 'reflection':
        if (!this.reflectionComplete(activity)) return null;
        return { reflection: this.reflection().trim(), wordCount: this.wordCount() };
    }
  }

  private showResult(activity: PblActivity, response: ActivityResponse): void {
    if (activity.type === 'choice' && 'correct' in response) {
      this.feedbackTone.set(response.correct ? 'success' : 'retry');
      this.feedback.set(
        response.correct ? `Exactly. ${activity.explanation}` : `Take another look. ${activity.explanation}`
      );
      return;
    }

    if (activity.type === 'matching' && 'correctCount' in response) {
      const allCorrect = response.correctCount === response.total;
      this.feedbackTone.set(allCorrect ? 'success' : 'retry');
      this.feedback.set(
        allCorrect
          ? 'Every connection works. Your systems map is saved.'
          : `${response.correctCount} of ${response.total} connections are right. Revisit the system dependencies and try again.`
      );
      return;
    }

    this.feedbackTone.set('success');
    this.feedback.set('Your thinking is saved. Strong explanations connect a claim, evidence, and tradeoff.');
  }

  private resetFeedback(): void {
    this.feedback.set('');
    this.feedbackTone.set('neutral');
  }
}
