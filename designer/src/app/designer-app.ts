import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-designer-root',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './designer-app.html',
  styleUrl: './designer-app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DesignerApp {}

