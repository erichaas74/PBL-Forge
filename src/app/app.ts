import { Component, computed, inject } from '@angular/core';
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
  readonly immersive = computed(() => {
    const path = this.currentUrl().split(/[?#]/, 1)[0].replace(/\/$/, '');
    return (
      path.startsWith('/dragon-genetics/') &&
      !path.startsWith('/dragon-genetics/path')
    );
  });
  readonly dragonGenetics = computed(() => /^\/dragon-genetics(?:[/?#]|$)/.test(this.currentUrl()));
  readonly dragonGeneticsHome = computed(
    () => this.currentUrl().split(/[?#]/, 1)[0].replace(/\/$/, '') === '/dragon-genetics',
  );
  readonly showWiseDragonGuide = computed(
    () =>
      this.dragonGenetics() &&
      this.currentUrl().split(/[?#]/, 1)[0].replace(/\/$/, '') !== '/dragon-genetics/wise-dragon',
  );
  readonly showDragonTestingShortcut = computed(
    () => this.immersive() && this.session.isLocalTeacher(),
  );
  async signIn(): Promise<void> {
    await this.session.signInWithGoogle();
  }

  async signInDemoStudent(): Promise<void> {
    await this.session.signInAsLocalStudent();
  }

  async signInDemoTeacher(): Promise<void> {
    await this.session.signInAsLocalTeacher();
  }

  async returnToStudent(): Promise<void> {
    await this.session.signOut();
    await this.router.navigate(['/dragon-genetics']);
  }

  skipToMain(event: Event): void {
    event.preventDefault();
    const main = document.getElementById('main-content');
    main?.focus();
    main?.scrollIntoView();
  }
}
