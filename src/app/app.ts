import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { SessionService } from './core/firebase/session.service';

@Component({
  selector: 'app-root',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  readonly session = inject(SessionService);
  private readonly router = inject(Router);
  private readonly currentUrl = toSignal(this.router.events.pipe(
    filter((event): event is NavigationEnd => event instanceof NavigationEnd),
    map((event) => event.urlAfterRedirects),
    startWith(this.router.url),
  ), { initialValue: this.router.url });
  readonly immersive = computed(() => /^\/dragon-genetics\/[^/]+/.test(this.currentUrl()));

  async signIn(): Promise<void> {
    await this.session.signInWithGoogle();
  }

  async returnToStudent(): Promise<void> {
    await this.session.signOut();
  }
}
