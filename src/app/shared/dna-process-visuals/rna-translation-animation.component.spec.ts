import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { RnaTranslationAnimationComponent } from './rna-translation-animation.component';

describe('RnaTranslationAnimationComponent', () => {
  let fixture: ComponentFixture<RnaTranslationAnimationComponent>;
  let component: RnaTranslationAnimationComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [RnaTranslationAnimationComponent] });
    fixture = TestBed.createComponent(RnaTranslationAnimationComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('sequence', 'AUGCCGUACCGAGCUACCGGAUCA');
    fixture.detectChanges();
  });

  it('translates the 24-base coding segment into eight amino acids', () => {
    expect(component.steps().map((step) => step.shortName)).toEqual([
      'Met',
      'Pro',
      'Tyr',
      'Arg',
      'Ala',
      'Thr',
      'Gly',
      'Ser',
    ]);

    component.setProgress(8);

    expect(component.protein().length).toBe(8);
  });

  it('gives each residue a distinct side-chain shape and folds the completed chain', () => {
    component.setProgress(8);
    fixture.detectChanges();

    const residues = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('.amino-residue'),
    );

    expect(residues.map((residue) => residue.dataset['shape'])).toEqual([
      'sulfur-chain',
      'proline-ring',
      'aromatic-hydroxyl',
      'positive-fork',
      'small-diamond',
      'branched-hydroxyl',
      'small-bead',
      'hydroxyl',
    ]);
    expect(residues[0].dataset['group']).toBe('hydrophobic');
    expect(residues[7].dataset['group']).toBe('polar');
    expect(component.foldAmount()).toBe(1);
    expect(component.backbonePath()).toContain(' C ');
    expect(component.hydrophobicInteraction()).not.toBeNull();
    expect((fixture.nativeElement as HTMLElement).querySelectorAll('.site-pocket').length).toBe(3);
  });

  it('faces matching codon and anticodon connectors toward each other', () => {
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelectorAll('.anticodon .connector-bottom').length).toBe(3);
    expect(element.querySelectorAll('.mrna-track button.active .connector-top').length).toBe(3);
  });

  it('moves through docking, bonding, and translocation phases', fakeAsync(() => {
    component.play();
    expect(component.phase()).toBe('docking');

    tick(560);
    expect(component.phase()).toBe('bonding');
    expect(component.protein().map((step) => step.shortName)).toEqual(['Met']);

    tick(560);
    expect(component.phase()).toBe('translocating');

    tick(560);
    expect(component.progress()).toBe(1);
    expect(component.phase()).toBe('docking');
    component.togglePlay();
  }));

  it('animates through the RNA sequence and releases the protein', fakeAsync(() => {
    component.play();
    tick(560 * 24);

    expect(component.complete()).toBeTrue();
    expect(component.playing()).toBeFalse();
    expect(component.phase()).toBe('released');
  }));
});
