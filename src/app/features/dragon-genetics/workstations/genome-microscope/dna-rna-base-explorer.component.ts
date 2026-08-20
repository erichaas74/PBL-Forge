import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import {
  DNA_BASES,
  DNA_COMPLEMENT,
  DnaBase,
  RnaBase,
  rnaSequence,
} from '../../../../shared/dna-process-visuals/dna-process.models';
import {
  NUCLEOBASE_SYMBOLS,
  NucleobaseSymbol,
  nucleobaseDefinition,
} from '../../../../shared/dna-process-visuals/nucleobase-chemistry.models';
import { NucleobaseMoleculeComponent } from '../../../../shared/dna-process-visuals/nucleobase-molecule.component';

type BaseExplorerView = 'compare' | 'dna' | 'rna';
type NucleicAcidContext = 'DNA' | 'RNA';

@Component({
  selector: 'app-dna-rna-base-explorer',
  imports: [NucleobaseMoleculeComponent],
  templateUrl: './dna-rna-base-explorer.component.html',
  styleUrl: './dna-rna-base-explorer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DnaRnaBaseExplorerComponent {
  readonly dnaSequence = input('ATGCCGTA');
  readonly rnaSequence = input('AUGCCGUA');

  readonly view = signal<BaseExplorerView>('compare');
  readonly selectedBase = signal<NucleobaseSymbol>('T');
  readonly selectedContext = signal<NucleicAcidContext>('DNA');
  readonly dnaBases = DNA_BASES;
  readonly rnaBases = NUCLEOBASE_SYMBOLS.filter((base) =>
    nucleobaseDefinition(base).occursIn.includes('RNA'),
  );
  readonly selectedDefinition = computed(() => nucleobaseDefinition(this.selectedBase()));
  readonly selectedPair = computed<NucleobaseSymbol>(() => {
    const definition = this.selectedDefinition();
    return this.selectedContext() === 'DNA'
      ? (definition.pairInDna ?? definition.pairInRna)
      : definition.pairInRna;
  });
  readonly dnaSample = computed<readonly DnaBase[]>(() => {
    const normalized = this.dnaSequence()
      .toUpperCase()
      .replace(/[^ACGT]/g, '')
      .slice(0, 10);
    return (normalized || 'ATGCCGTA').split('') as DnaBase[];
  });
  readonly dnaComplement = computed(() => this.dnaSample().map((base) => DNA_COMPLEMENT[base]));
  readonly rnaSample = computed<readonly RnaBase[]>(() => {
    const parsed = rnaSequence(this.rnaSequence()).slice(0, 10);
    return parsed.length ? parsed : (['A', 'U', 'G', 'C', 'C', 'G', 'U', 'A'] as RnaBase[]);
  });
  readonly observation = computed(() => {
    const selected = this.selectedDefinition();
    const context = this.selectedContext();
    const pair = nucleobaseDefinition(this.selectedPair());
    return `${selected.name} in ${context}: ${selected.ringCount === 2 ? 'two fused rings' : 'one ring'}, ${selected.formula}, pairs with ${pair.name} using ${selected.hydrogenBondCount} hydrogen bonds.`;
  });

  setView(view: BaseExplorerView): void {
    this.view.set(view);
    if (view === 'dna' && !this.selectedDefinition().occursIn.includes('DNA')) {
      this.selectBase('T', 'DNA');
    }
    if (view === 'rna' && !this.selectedDefinition().occursIn.includes('RNA')) {
      this.selectBase('U', 'RNA');
    }
  }

  selectBase(base: NucleobaseSymbol, context: NucleicAcidContext): void {
    this.selectedBase.set(base);
    this.selectedContext.set(context);
  }

  definition(base: NucleobaseSymbol) {
    return nucleobaseDefinition(base);
  }
}
