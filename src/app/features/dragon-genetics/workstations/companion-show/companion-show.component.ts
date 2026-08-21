import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SpecimenViewportComponent } from '../../../../shared/assembly/preview/specimen-viewport.component';
import { MiniDragonStationComponent } from '../mini-dragon-shared/mini-dragon-station.base';

/**
 * The kennel: where the breeding programme actually happens.
 *
 * A student writes a breed standard here, adopts founders, pairs them and reads
 * the young against the standard. The training ground, show arena and pedigree
 * lab are three other views of the programme this room produces.
 */
@Component({
  selector: 'app-companion-show',
  imports: [RouterLink, SpecimenViewportComponent],
  templateUrl: './companion-show.component.html',
  styleUrl: './companion-show.component.scss',
})
export class CompanionShowComponent extends MiniDragonStationComponent {
  readonly goal = input(
    'Write a breed standard, then find out how reliably it is passed from parents to young.',
  );
}
