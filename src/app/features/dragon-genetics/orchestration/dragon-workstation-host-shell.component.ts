import { Component, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DragonWorkstationLaunchContext } from './dragon-workstation-launch-context';

@Component({
  selector: 'app-dragon-workstation-host-shell',
  imports: [RouterLink],
  templateUrl: './dragon-workstation-host-shell.component.html',
  styleUrl: './dragon-workstation-host-shell.component.scss',
})
export class DragonWorkstationHostShellComponent {
  readonly launchContext = input<DragonWorkstationLaunchContext | null>(null);
  readonly directTitle = input.required<string>();
  readonly missionDismissed = signal(false);
}
