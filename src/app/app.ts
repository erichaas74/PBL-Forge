import { Component, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { SessionService } from './core/firebase/session.service';
import { DragonTestingShortcutComponent } from './features/dragon-genetics/project/dragon-testing-shortcut.component';
import { WiseDragonGuideComponent } from './features/dragon-genetics/wise-dragon/wise-dragon-guide.component';

@Component({
  selector: 'app-root',
  imports: [
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    DragonTestingShortcutComponent,
    WiseDragonGuideComponent,
  ],
  templateUrl: './app.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './app.scss',
})
export class App {
  readonly session = inject(SessionService);
  private readonly router = inject(Router);
  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );
  readonly immersive = computed(() => /^\/dragon-genetics\/[^/]+/.test(this.currentUrl()));
  readonly dragonGenetics = computed(() => /^\/dragon-genetics(?:[/?#]|$)/.test(this.currentUrl()));
  readonly dragonGeneticsHome = computed(
    () => this.currentUrl().split(/[?#]/, 1)[0].replace(/\/$/, '') === '/dragon-genetics',
  );
  readonly showWiseDragonGuide = computed(
    () =>
      this.dragonGenetics() &&
      this.currentUrl().split(/[?#]/, 1)[0].replace(/\/$/, '') !== '/dragon-genetics/wise-dragon',
  );
  readonly journeyReturnUrl = computed(() => {
    const [path, query = ''] = this.currentUrl().split('?', 2);
    if (!path.startsWith('/dragon-genetics/') || path.startsWith('/dragon-genetics/journey')) {
      return null;
    }
    const params = new URLSearchParams(query.split('#', 1)[0]);
    const journeyPath = params.get('journeyPath');
    const lesson = params.get('lesson');
    return journeyPath && lesson
      ? `/dragon-genetics/journey/${encodeURIComponent(journeyPath)}/lesson/${encodeURIComponent(lesson)}`
      : null;
  });

  async signIn(): Promise<void> {
    await this.session.signInWithGoogle();
  }

  async returnToStudent(): Promise<void> {
    await this.session.signOut();
  }
}
