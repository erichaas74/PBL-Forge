import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import {
  NucleobaseAtom,
  NucleobaseSymbol,
  nucleobaseDefinition,
} from './nucleobase-chemistry.models';

interface MoleculeBondLine {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  order: 1 | 2;
}

@Component({
  selector: 'app-nucleobase-molecule',
  templateUrl: './nucleobase-molecule.component.html',
  styleUrl: './nucleobase-molecule.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NucleobaseMoleculeComponent {
  readonly base = input.required<NucleobaseSymbol>();
  readonly compact = input(false);
  readonly showCaption = input(true);

  readonly definition = computed(() => nucleobaseDefinition(this.base()));
  readonly bondLines = computed<readonly MoleculeBondLine[]>(() => {
    const definition = this.definition();
    const atoms = new Map(definition.atoms.map((atom) => [atom.id, atom]));
    return definition.bonds.flatMap((bond, bondIndex) => {
      const start = atoms.get(bond.from);
      const end = atoms.get(bond.to);
      if (!start || !end) return [];
      const offsets = bond.order === 2 ? [-2.8, 2.8] : [0];
      return offsets.map((offset, lineIndex) =>
        this.offsetBondLine(start, end, offset, `${bondIndex}:${lineIndex}`, bond.order),
      );
    });
  });
  readonly ariaLabel = computed(() => {
    const definition = this.definition();
    return `${definition.name}, ${definition.formula}. ${definition.family} with ${definition.ringCount} ${definition.ringCount === 1 ? 'ring' : 'rings'}. Colored circles label carbon, nitrogen, and oxygen positions; single and double lines show covalent bonds.`;
  });

  private offsetBondLine(
    start: NucleobaseAtom,
    end: NucleobaseAtom,
    offset: number,
    id: string,
    order: 1 | 2,
  ): MoleculeBondLine {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = Math.hypot(dx, dy) || 1;
    const offsetX = (-dy / length) * offset;
    const offsetY = (dx / length) * offset;
    return {
      id,
      x1: start.x + offsetX,
      y1: start.y + offsetY,
      x2: end.x + offsetX,
      y2: end.y + offsetY,
      order,
    };
  }
}
