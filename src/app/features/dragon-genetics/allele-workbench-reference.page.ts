import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AlleleWorkbenchStationComponent } from './stations/allele-workbench-station.component';

@Component({
  selector: 'app-allele-workbench-reference-page',
  imports: [RouterLink, AlleleWorkbenchStationComponent],
  templateUrl: './allele-workbench-reference.page.html',
  styleUrl: './allele-workbench-reference.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlleleWorkbenchReferencePage {}
