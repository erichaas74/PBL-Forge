import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DragonPedigreeLabComponent } from './dragon-pedigree-lab.component';
import { investigationById } from './pedigree-population';

describe('DragonPedigreeLabComponent', () => {
  let fixture: ComponentFixture<DragonPedigreeLabComponent>;
  let lab: DragonPedigreeLabComponent;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ imports: [DragonPedigreeLabComponent] });
    fixture = TestBed.createComponent(DragonPedigreeLabComponent);
    fixture.componentRef.setInput('studentId', 'spec-student');
    lab = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => localStorage.clear());

  it('opens on the legendary ancestor with no inheritance model assumed', () => {
    expect(lab.investigation().id).toBe('frost-scale');
    expect(lab.selectedId()).toBe('vyrak');
    expect(lab.model()).toBeNull();
    expect(lab.deduction()).toBeNull();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelectorAll('.pedigree-node').length).toBeGreaterThan(0);
    expect(element.querySelector('.pedigree-node')?.getAttribute('data-status')).toBe('no-model');
  });

  it('deduces carrier status only once the student chooses a model', () => {
    lab.chooseModel('autosomal-recessive');
    fixture.detectChanges();

    expect(lab.deduction()).not.toBeNull();
    expect(lab.stats().confirmedCarriers).toBeGreaterThan(0);

    const element = fixture.nativeElement as HTMLElement;
    const kaenor = element.querySelector('[data-dragon="kaenor"]');
    expect(kaenor?.getAttribute('data-status')).toBe('confirmed-carrier');
  });

  it('redraws the canvas around the dragon that was selected', () => {
    // Ivrid is one of three siblings and Vyrak's grandson: opening him should
    // leave his own parents and line on the canvas and take his brother,
    // sister, and every cousin off it.
    lab.selectDragon('ivrid');
    fixture.detectChanges();

    expect(lab.focusId()).toBe('ivrid');
    const drawn = new Set(lab.canvasNodes().map((node) => node.dragonId));

    expect(drawn.has('ivrid')).toBeTrue();
    expect(drawn.has('kaenor')).withContext('father').toBeTrue();
    expect(drawn.has('orsa')).withContext('mother').toBeTrue();
    expect(drawn.has('hesper')).withContext('daughter').toBeTrue();
    expect(drawn.has('halgrim')).withContext('brother').toBeFalse();
    expect(drawn.has('aster')).withContext('sister').toBeFalse();
    expect(drawn.has('sindri')).withContext('cousin').toBeFalse();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('[data-dragon="halgrim"]')).toBeNull();
    expect(element.querySelector('[data-dragon="ivrid"]')).not.toBeNull();
  });

  it('brings the whole bloodline back when the ancestor is reopened', () => {
    lab.selectDragon('arkon');
    fixture.detectChanges();
    expect(lab.canvasNodes().some((node) => node.dragonId === 'sindri')).toBeFalse();

    lab.selectDragon(lab.investigation().ancestorId);
    fixture.detectChanges();

    const drawn = new Set(lab.canvasNodes().map((node) => node.dragonId));
    expect(drawn.has('vyrak')).toBeTrue();
    expect(drawn.has('sindri')).toBeTrue();
    expect(drawn.has('ivrid')).toBeTrue();
  });

  it('spends a limited sequencing budget and refuses damaged samples', () => {
    const budget = lab.investigation().dnaTestBudget;
    lab.chooseModel('autosomal-recessive');

    lab.selectDragon('brandt');
    lab.runDnaTest('brandt');
    expect(lab.testsSpent()).toBe(0);
    expect(lab.message()).toContain('No usable sample');

    lab.runDnaTest('arkon');
    expect(lab.testsSpent()).toBe(1);
    expect(lab.testsRemaining()).toBe(budget - 1);
    expect(lab.deduction()?.states.get('arkon')?.sequenced).toBeTrue();

    lab.runDnaTest('arkon');
    expect(lab.testsSpent()).toBe(1);
    expect(lab.message()).toContain('already been sequenced');
  });

  it('stages two living dragons and warns when they are close relatives', () => {
    lab.addToTray('arkon');
    lab.addToTray('signe');
    expect(lab.breedingPair()?.mother.id).toBe('signe');
    expect(lab.relatedness()?.level).toBe('very-close');

    lab.removeFromTray('signe');
    lab.addToTray('sylva');
    expect(lab.relatedness()?.level).not.toBe('very-close');
  });

  it('refuses to breed a deceased dragon', () => {
    lab.addToTray('vyrak');
    expect(lab.trayDragons().length).toBe(0);
    expect(lab.message()).toContain('not living');
  });

  it('requires evidence, a prediction, and a reason before authorising a breeding', () => {
    lab.chooseModel('autosomal-recessive');
    lab.addToTray('arkon');
    lab.addToTray('sylva');
    expect(lab.canAuthorize()).toBeFalse();

    lab.predictedMotherGenotype.set('Ss');
    lab.predictedFatherGenotype.set('Ss');
    lab.predictedPercent.set(25);
    expect(lab.canAuthorize()).toBeFalse();

    lab.justification.set('Both descend from Ivrid and each has one confirmed carrier parent.');
    expect(lab.authorizationBlockers()).toEqual([]);
    expect(lab.canAuthorize()).toBeTrue();

    lab.authorizeBreeding();
    fixture.detectChanges();

    expect(lab.hatchRecords().length).toBe(1);
    expect(lab.record().hatchlings.length).toBe(lab.clutchSize);
    expect(lab.hatchRecords()[0].predictedPercent).toBe(25);
  });

  it('keeps the investigation on the device across a reload', () => {
    lab.chooseModel('x-linked-recessive');
    lab.addToTray('arkon');
    lab.writeHypothesis('The allele runs through Hesper.');

    const reloaded = TestBed.createComponent(DragonPedigreeLabComponent);
    reloaded.componentRef.setInput('studentId', 'spec-student');
    reloaded.detectChanges();

    expect(reloaded.componentInstance.model()).toBe('x-linked-recessive');
    expect(reloaded.componentInstance.record().hypothesis).toBe('The allele runs through Hesper.');
    expect(reloaded.componentInstance.trayDragons().map((dragon) => dragon.id)).toEqual(['arkon']);
  });

  it('opens the bloodline a mission-map link names, over the one last left open', () => {
    lab.openInvestigation('stonewake-tail');
    fixture.detectChanges();

    const linked = TestBed.createComponent(DragonPedigreeLabComponent);
    linked.componentRef.setInput('studentId', 'spec-student');
    linked.componentRef.setInput('openInvestigationId', 'duskmere-eye');
    linked.detectChanges();

    expect(linked.componentInstance.investigation().id).toBe('duskmere-eye');
    expect(linked.componentInstance.focusId()).toBe('ilira');
  });

  it('ignores a stale investigation link rather than breaking the laboratory', () => {
    const linked = TestBed.createComponent(DragonPedigreeLabComponent);
    linked.componentRef.setInput('studentId', 'spec-student');
    linked.componentRef.setInput('openInvestigationId', 'no-such-bloodline');
    linked.detectChanges();

    expect(linked.componentInstance.investigation().id).toBe('frost-scale');
  });

  it('switches investigations without carrying the previous bloodline over', () => {
    lab.chooseModel('autosomal-recessive');
    lab.openInvestigation('duskmere-eye');
    fixture.detectChanges();

    expect(lab.investigation()).toBe(investigationById('duskmere-eye'));
    expect(lab.model()).toBeNull();
    expect(lab.focusId()).toBe('ilira');
    expect(lab.selectedId()).toBe('ilira');
  });
});
