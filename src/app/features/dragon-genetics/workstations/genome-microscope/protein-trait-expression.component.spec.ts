import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideDragonSpecimenProfile } from '../../simulation/domain/dragon-specimen.profile';
import { DRAGON_ENZYME_REACTIONS } from './dragon-enzyme-reactions.models';
import { ProteinTraitExpressionComponent } from './protein-trait-expression.component';

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

  it('derives four product pathways from the shared enzyme and genetics catalogs', () => {
    expect(component.pathways().map((pathway) => pathway.id)).toEqual([
      'fire',
      'scales',
      'horns',
      'wings',
    ]);
    expect(component.pathways().map((pathway) => pathway.proteinName)).toEqual(
      DRAGON_ENZYME_REACTIONS.map((reaction) => reaction.product.name),
    );
    expect(component.pathways().map((pathway) => pathway.shape)).toEqual(
      DRAGON_ENZYME_REACTIONS.map((reaction) => reaction.product.path),
    );
    expect(component.pathways().every((pathway) => pathway.phenotype.length > 0)).toBeTrue();
  });

  it('renders each enzyme product name and exact SVG silhouette in the molecule bank', () => {
    const element = fixture.nativeElement as HTMLElement;
    const tokens = element.querySelectorAll<HTMLButtonElement>('.protein-token');

    DRAGON_ENZYME_REACTIONS.forEach((reaction, index) => {
      expect(tokens[index].textContent).toContain(reaction.product.name);
      expect(tokens[index].querySelector('svg > path')?.getAttribute('d')).toBe(
        reaction.product.path,
      );
      expect(tokens[index].getAttribute('data-product')).toBe(reaction.product.id);
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
