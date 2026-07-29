import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { SessionService } from './core/firebase/session.service';

@Component({
  selector: 'app-root',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  readonly session = inject(SessionService);

  async signIn(): Promise<void> {
    await this.session.signInWithGoogle();
  }

  async returnToStudent(): Promise<void> {
    await this.session.signOut();
  }
}
