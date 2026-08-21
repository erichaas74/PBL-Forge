import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MiniDragonStationComponent } from '../mini-dragon-shared/mini-dragon-station.base';

/**
 * The pedigree lab: follow one hidden recessive form through the family the
 * student has actually bred.
 *
 * It reads the whole population — kennel dragons and every pup ever whelped,
 * kept or not — because the evidence for a carrier lives in the young a pairing
 * produced, not in the dragons the student chose to keep.
 */
@Component({
  selector: 'app-mini-dragon-pedigree',
  imports: [RouterLink],
  templateUrl: './mini-dragon-pedigree.component.html',
  styleUrl: './mini-dragon-pedigree.component.scss',
})
export class MiniDragonPedigreeComponent extends MiniDragonStationComponent {
  readonly goal = input(
    'Trace a rare recessive form through your own pedigree and decide which dragons carry it.',
  );
}
