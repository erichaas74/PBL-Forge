import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideDragonSpecimenProfile } from '../../simulation/domain/dragon-specimen.profile';
import { ALLELE_VAULT_GENES } from '../allele-workbench/allele-vault.models';
import { DRAGON_GENE_DNA_CATALOG, geneProtein } from '../shared/dragon-gene-dna.catalog';
import { ProteinTraitExpressionComponent } from './protein-trait-expression.component';

const RELEASED_GENE_IDS = new Set(ALLELE_VAULT_GENES.map((gene) => gene.id));
const EXPECTED_RECORDS = DRAGON_GENE_DNA_CATALOG.filter((record) =>
  RELEASED_GENE_IDS.has(record.geneId),
);

describe('ProteinTraitExpressionComponent', () => {
  let fixture: ComponentFixture<ProteinTraitExpressionComponent>;
  let component: ProteinTraitExpressionComponent;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [ProteinTraitExpressionComponent],
      providers: [provideDragonSpecimenProfile()],
    });
    fixture = TestBed.createComponent(ProteinTraitExpressionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => localStorage.clear());

  it('derives one pathway per released gene from the shared gene catalog', () => {
    expect(component.pathways().map((pathway) => pathway.id)).toEqual(
      EXPECTED_RECORDS.map((record) => record.geneId),
    );
    expect(component.pathways().map((pathway) => pathway.proteinName)).toEqual(
      EXPECTED_RECORDS.map((record) => record.protein.traitSignal.name),
    );
    expect(component.pathways().map((pathway) => pathway.shape)).toEqual(
      EXPECTED_RECORDS.map((record) => record.protein.traitSignal.path),
    );
    expect(component.pathways().every((pathway) => pathway.phenotype.length > 0)).toBeTrue();
  });

  it('carries both routes to a trait: enzyme products and proteins acting directly', () => {
    expect(component.enzymePathways().length).toBeGreaterThan(0);
    expect(component.directPathways().length).toBeGreaterThan(0);
    expect(component.enzymePathways().length + component.directPathways().length).toBe(
      component.pathways().length,
    );

    for (const pathway of component.directPathways()) {
      // A structural or signal protein docks as itself.
      expect(pathway.shape).toBe(pathway.proteinShape);
      expect(pathway.proteinName).toBe(pathway.sourceProteinName);
    }
    for (const pathway of component.enzymePathways()) {
      expect(pathway.shape).not.toBe(pathway.proteinShape);
      expect(pathway.routeLabel).toContain(pathway.sourceProteinName);
    }
  });

  it('renders each molecule name and its exact generated silhouette in the bank', () => {
    const element = fixture.nativeElement as HTMLElement;
    const tokens = element.querySelectorAll<HTMLButtonElement>('.protein-token');

    expect(tokens.length).toBe(EXPECTED_RECORDS.length);
    EXPECTED_RECORDS.forEach((record, index) => {
      const { traitSignal, form } = geneProtein(record.geneId);
      expect(tokens[index].textContent).toContain(traitSignal.name);
      expect(tokens[index].querySelector('.protein-signal')?.getAttribute('d')).toBe(
        traitSignal.path,
      );
      expect(tokens[index].querySelector('.protein-origin')?.getAttribute('d')).toBe(
        form.shapePath,
      );
      expect(tokens[index].getAttribute('data-product')).toBe(traitSignal.id);
    });
  });

  it('gives every receptor the same shape as the molecule that opens it', () => {
    const element = fixture.nativeElement as HTMLElement;
    const receptors = element.querySelectorAll<HTMLButtonElement>('.receptor-target');

    expect(receptors.length).toBe(component.pathways().length);
    component.pathways().forEach((pathway, index) => {
      expect(receptors[index].querySelector('.receptor-outline')?.getAttribute('d')).toBe(
        pathway.shape,
      );
    });
  });

  it('rejects a mismatched receptor without changing the dragon expression profile', () => {
    const [protein, wrongReceptor] = component.pathways();
    component.selectProtein(protein.id);
    component.testSelectedProtein(wrongReceptor.id);

    expect(component.activatedCount()).toBe(0);
    expect(component.statusMessage()).toContain('does not match');
  });

  it('activates a matching pathway through the select-then-select interaction', () => {
    const pathway = component.pathways()[0];
    component.selectProtein(pathway.id);
    component.testSelectedProtein(pathway.id);

    expect(component.isActivated(pathway.id)).toBeTrue();
    expect(component.activatedCount()).toBe(1);
    expect(component.statusMessage()).toContain(pathway.phenotype);
    expect(component.expressionProfile().genome[pathway.id]).toEqual([
      pathway.activeAllele.symbol,
      pathway.activeAllele.symbol,
    ]);
  });

  it('persists tested pathways and can reset the comparison', () => {
    const pathway = component.pathways()[0];
    component.selectProtein(pathway.id);
    component.testSelectedProtein(pathway.id);
    expect(localStorage.length).toBe(1);

    component.reset();
    expect(component.activatedCount()).toBe(0);
    expect(localStorage.length).toBe(0);
  });
});
