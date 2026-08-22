import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { stubSpecimenViewportRendering } from '../../../../shared/assembly/preview/specimen-viewport.testing';
import { MiniDragonPedigreeComponent } from './mini-dragon-pedigree.component';

describe('MiniDragonPedigreeComponent', () => {
  const studentId = 'mini-dragon-pedigree-component-spec';
  const storageKey = `pbl-forge.dragon-genetics.companion-show.v4.${studentId}`;

  beforeEach(async () => {
    localStorage.removeItem(storageKey);
    stubSpecimenViewportRendering();
    await TestBed.configureTestingModule({
      imports: [MiniDragonPedigreeComponent],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  afterEach(() => localStorage.removeItem(storageKey));

  function createComponent() {
    const fixture = TestBed.createComponent(MiniDragonPedigreeComponent);
    fixture.componentRef.setInput('studentId', studentId);
    fixture.detectChanges();
    return fixture;
  }

  it('builds a pedigree from offspring and moves a flagged candidate to breeding', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;

    component.adoptFounder('dam', 'mini-biscuit');
    component.adoptFounder('sire', 'mini-pepper');
    component.whelp();
    component.setRareTraitGene('coat');
    const pup = component.nurseryPups()[0];
    const candidate = component.pedigreePopulation().find((dragon) => dragon.id === pup.id)!;

    expect(component.pedigreePopulation().length).toBe(8);
    expect(component.pedigreeGenerations().map((group) => group.generation)).toEqual([0, 1]);
    component.toggleRareCandidate(candidate.id);
    expect(component.pedigreeEvidenceFor(candidate)).not.toBeNull();
    component.keepPedigreeCandidate(candidate);
    component.assignToPair('dam', candidate.id);

    expect(component.isInKennel(candidate.id)).toBe(true);
    expect(component.dam()?.id).toBe(candidate.id);
    fixture.destroy();
  });

  it('reads every pup whelped, not only the ones the student kept', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;

    component.adoptFounder('dam', 'mini-cinder');
    component.adoptFounder('sire', 'mini-thistle');
    component.whelp();
    fixture.detectChanges();

    // Two founders plus six young, none of them kept: the evidence for a carrier
    // is in the litter a pairing produced, not in the dragons kept from it.
    expect(component.kennel().length).toBe(2);
    expect(component.pedigreePopulation().length).toBe(8);
    fixture.destroy();
  });

  it('clears flagged candidates when the traced trait changes', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;

    component.adoptFounder('dam', 'mini-biscuit');
    component.adoptFounder('sire', 'mini-pepper');
    component.whelp();
    const [first, second] = component.rareTraitTargets;
    component.setRareTraitGene(first.geneId);
    component.toggleRareCandidate(component.pedigreePopulation()[0].id);
    expect(component.rareCandidateIds().length).toBe(1);

    // Flags are evidence about one trait, so they do not survive a change of trait.
    component.setRareTraitGene(second.geneId);

    expect(component.rareCandidateIds()).toEqual([]);
    fixture.destroy();
  });
});
