import { By } from '@angular/platform-browser';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SpecimenViewportComponent } from '../../../../shared/assembly/preview/specimen-viewport.component';
import { stubSpecimenViewportRendering } from '../../../../shared/assembly/preview/specimen-viewport.testing';
import { MiniDragonTrainingComponent } from '../mini-dragon-training/mini-dragon-training.component';
import { MiniDragonArenaComponent } from './mini-dragon-arena.component';

describe('MiniDragonArenaComponent', () => {
  const studentId = 'mini-dragon-arena-component-spec';
  const storageKey = `pbl-forge.dragon-genetics.companion-show.v4.${studentId}`;

  beforeEach(async () => {
    localStorage.removeItem(storageKey);
    stubSpecimenViewportRendering();
    await TestBed.configureTestingModule({
      imports: [MiniDragonArenaComponent, MiniDragonTrainingComponent],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  afterEach(() => localStorage.removeItem(storageKey));

  function createComponent() {
    const fixture = TestBed.createComponent(MiniDragonArenaComponent);
    fixture.componentRef.setInput('studentId', studentId);
    fixture.detectChanges();
    return fixture;
  }

  it('judges a representative 50/50 on what it inherited and what it learned', async () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;

    component.adoptFounder('dam', 'mini-biscuit');
    component.setTarget('coat', 'coat:sleek');
    component.selectChampion('mini-biscuit');
    component.setShowDivision('sky-circuit');
    fixture.detectChanges();

    // Practice happens in the training ground; the arena reads the record it left
    // on the shared programme.
    const training = TestBed.createComponent(MiniDragonTrainingComponent);
    training.componentRef.setInput('studentId', studentId);
    training.detectChanges();
    const trainingViewport = training.debugElement.query(
      By.css('.training-model app-specimen-viewport'),
    ).componentInstance as SpecimenViewportComponent;
    vi.spyOn(trainingViewport, 'playMotion').mockResolvedValue();
    await training.componentInstance.practiceTraining('course-cue');
    fixture.detectChanges();

    expect(component.trainingLevel('course-cue')).toBe(1);
    expect(component.champion()?.genome).toEqual(component.trainingDragon()?.genome);

    component.enterShow();
    fixture.detectChanges();
    const run = component.latestShowRun();
    expect(run).not.toBeNull();
    expect(run!.geneticScore).toBeLessThanOrEqual(50);
    expect(run!.trainingScore).toBe(3.1);
    expect(run!.combinedScore).toBeCloseTo(run!.geneticScore + run!.trainingScore, 1);

    const routineButton = fixture.nativeElement.querySelector(
      '[data-testid="championship-routine"]',
    ) as HTMLButtonElement | null;
    expect(routineButton).not.toBeNull();
    const championViewport = fixture.debugElement.query(
      By.css('.champion-model app-specimen-viewport'),
    ).componentInstance as SpecimenViewportComponent;
    vi.spyOn(championViewport, 'playMotion').mockResolvedValue();
    await component.performChampionshipRoutine();
    expect(championViewport.playMotion).toHaveBeenCalled();
    training.destroy();
    fixture.destroy();
  });

  it('will not enter the ring without both a representative and a division', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;

    component.adoptFounder('dam', 'mini-biscuit');
    component.selectChampion('mini-biscuit');
    fixture.detectChanges();

    expect(component.canEnterShow()).toBe(false);
    component.enterShow();
    expect(component.showRuns().length).toBe(0);

    component.setShowDivision('hearth-companion');
    fixture.detectChanges();
    expect(component.canEnterShow()).toBe(true);
    fixture.destroy();
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
});
