import { TestBed } from '@angular/core/testing';
import { CompanionShowComponent } from './companion-show.component';

describe('CompanionShowComponent', () => {
  const studentId = 'companion-show-component-spec';
  const storageKey = `pbl-forge.dragon-genetics.companion-show.v2.${studentId}`;

  beforeEach(async () => {
    localStorage.removeItem(storageKey);
    await TestBed.configureTestingModule({
      imports: [CompanionShowComponent],
    }).compileComponents();
  });

  afterEach(() => localStorage.removeItem(storageKey));

  function createComponent() {
    const fixture = TestBed.createComponent(CompanionShowComponent);
    fixture.componentRef.setInput('studentId', studentId);
    fixture.detectChanges();
    return fixture;
  }

  it('breeds a litter from two founders and keeps a young dragon in the kennel', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;

    component.adoptFounder('dam', 'mini-biscuit');
    component.adoptFounder('sire', 'mini-pepper');
    component.setTarget('coat', 'coat:fluffy');
    component.whelp();
    fixture.detectChanges();

    expect(component.pairReady()).toBe(true);
    expect(component.nurseryPups().length).toBe(6);
    expect(component.kennel().length).toBe(2);

    component.togglePupKept(component.nurseryPups()[0]);
    fixture.detectChanges();

    expect(component.kennel().length).toBe(3);
    expect(component.generations()).toBe(1);
    expect(component.nurseryPups()[0].kept).toBe(true);

    component.togglePupKept(component.nurseryPups()[0]);
    fixture.detectChanges();

    expect(component.kennel().length).toBe(2);
    fixture.destroy();
  });

  it('runs a show card of judged trials for the selected young dragon', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;

    component.adoptFounder('dam', 'mini-cinder');
    component.adoptFounder('sire', 'mini-thistle');
    component.whelp();
    fixture.detectChanges();

    const card = component.standShowCard();
    expect(card.length).toBe(4);
    expect(card.every((result) => result.outcome.label.length > 0)).toBe(true);
    // The card is a consequence of the genome, not a stored score.
    expect(component.ribbonsFor(component.selectedPup()!.genome)).toBe(
      card.filter((result) => result.outcome.places).length,
    );
    fixture.destroy();
  });

  it('releases cited evidence when the standard changes', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;

    component.adoptFounder('dam', 'mini-biscuit');
    component.adoptFounder('sire', 'mini-pepper');
    component.setTarget('coat', 'coat:fluffy');
    component.whelp();
    fixture.detectChanges();

    const litter = component.materializedLitters()[0];
    component.toggleCitation(litter);
    expect(component.citedLitterIds().length).toBe(1);

    component.setTarget('horns', 'horns:curled');
    fixture.detectChanges();

    expect(component.citedLitterIds()).toEqual([]);
    expect(component.canCite(component.materializedLitters()[0])).toBe(false);
  });

  it('withholds registration until the student records their own evidence', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;

    component.adoptFounder('dam', 'mini-biscuit');
    component.adoptFounder('sire', 'mini-pepper');
    component.setTarget('coat', 'coat:fluffy');
    component.whelp();
    fixture.detectChanges();

    expect(component.canRegister()).toBe(false);
    component.registerBreed();
    expect(component.registry().length).toBe(0);
    expect(component.evidenceChecks().filter((check) => !check.met).length).toBeGreaterThan(0);
    fixture.destroy();
  });

  it('reads the bloodline warning from the pedigree when siblings are paired', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;

    component.adoptFounder('dam', 'mini-biscuit');
    component.adoptFounder('sire', 'mini-pepper');
    component.whelp();
    fixture.detectChanges();

    const [first, second] = component.nurseryPups();
    component.togglePupKept(first);
    component.togglePupKept(component.nurseryPups()[1]);
    component.assignToPair('dam', first.id);
    component.assignToPair('sire', second.id);
    fixture.detectChanges();

    expect(component.bloodline()?.band).toBe('Very close');
    expect(component.bloodline()?.inbreedingPercent).toBeCloseTo(25, 5);
    fixture.destroy();
  });

  it('stays an open workstation with no question dock and no genotype on the surface', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;

    component.adoptFounder('dam', 'mini-cinder');
    component.adoptFounder('sire', 'mini-sorrel');
    component.setTarget('coat', 'coat:fluffy');
    component.whelp();
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    const text = host.textContent ?? '';
    expect(host.querySelector('.question-dock')).toBeNull();
    expect(text.toLowerCase()).not.toContain('genotype');
    expect(text.toLowerCase()).not.toContain('punnett');
    expect(text.toLowerCase()).not.toContain('allele');
    expect(text.toLowerCase()).not.toContain('step 1');
    fixture.destroy();
  });

  it('restores a saved program on reload', () => {
    const first = createComponent();
    const component = first.componentInstance;

    component.adoptFounder('dam', 'mini-biscuit');
    component.adoptFounder('sire', 'mini-pepper');
    component.setTarget('coat', 'coat:fluffy');
    component.whelp();
    component.togglePupKept(component.nurseryPups()[0]);
    const keptName = component.kennel().find((dragon) => dragon.origin === 'bred')?.name;
    first.destroy();

    const second = createComponent();
    const restored = second.componentInstance;

    expect(restored.targets().length).toBe(1);
    expect(restored.materializedLitters().length).toBe(1);
    expect(restored.kennel().find((dragon) => dragon.origin === 'bred')?.name).toBe(keptName);
    expect(restored.pairIds()).toEqual(['mini-biscuit', 'mini-pepper']);
    second.destroy();
  });
});
