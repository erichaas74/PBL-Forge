import { By } from '@angular/platform-browser';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SpecimenViewportComponent } from '../../../../shared/assembly/preview/specimen-viewport.component';
import { stubSpecimenViewportRendering } from '../../../../shared/assembly/preview/specimen-viewport.testing';
import { MiniDragonTrainingComponent } from './mini-dragon-training.component';

describe('MiniDragonTrainingComponent', () => {
  const studentId = 'mini-dragon-training-component-spec';
  const storageKey = `pbl-forge.dragon-genetics.companion-show.v4.${studentId}`;

  beforeEach(async () => {
    localStorage.removeItem(storageKey);
    stubSpecimenViewportRendering();
    await TestBed.configureTestingModule({
      imports: [MiniDragonTrainingComponent],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  afterEach(() => localStorage.removeItem(storageKey));

  function createComponent() {
    const fixture = TestBed.createComponent(MiniDragonTrainingComponent);
    fixture.componentRef.setInput('studentId', studentId);
    fixture.detectChanges();
    return fixture;
  }

  it('records practice against the dragon and leaves its genome untouched', async () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;

    component.adoptFounder('dam', 'mini-biscuit');
    component.selectChampion('mini-biscuit');
    fixture.detectChanges();
    const genomeBefore = component.trainingDragon()!.genome;

    const viewport = fixture.debugElement.query(By.css('.training-model app-specimen-viewport'))
      .componentInstance as SpecimenViewportComponent;
    vi.spyOn(viewport, 'playMotion').mockResolvedValue();
    await component.practiceTraining('course-cue');
    fixture.detectChanges();

    expect(component.trainingLevel('course-cue')).toBe(1);
    expect(viewport.playMotion).toHaveBeenCalled();
    // Practice is a record about an animal, never an edit to what it inherited.
    expect(component.trainingDragon()!.genome).toEqual(genomeBefore);
    fixture.destroy();
  });

  it('stops practice at the top level rather than banking sessions past it', async () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;

    component.adoptFounder('dam', 'mini-biscuit');
    component.selectChampion('mini-biscuit');
    fixture.detectChanges();
    const viewport = fixture.debugElement.query(By.css('.training-model app-specimen-viewport'))
      .componentInstance as SpecimenViewportComponent;
    vi.spyOn(viewport, 'playMotion').mockResolvedValue();

    for (let attempt = 0; attempt < component.trainingLevelMax + 3; attempt += 1) {
      await component.practiceTraining('weave');
    }

    expect(component.trainingLevel('weave')).toBe(component.trainingLevelMax);
    fixture.destroy();
  });

  it('does not pass a trained parent’s skill to its young', async () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;

    component.adoptFounder('dam', 'mini-biscuit');
    component.adoptFounder('sire', 'mini-pepper');
    component.selectChampion('mini-biscuit');
    fixture.detectChanges();
    const viewport = fixture.debugElement.query(By.css('.training-model app-specimen-viewport'))
      .componentInstance as SpecimenViewportComponent;
    vi.spyOn(viewport, 'playMotion').mockResolvedValue();
    await component.practiceTraining('settle');

    component.whelp();
    fixture.detectChanges();
    const pup = component.nurseryPups()[0];
    component.togglePupKept(pup);
    component.selectTrainingDragon(pup.id);
    fixture.detectChanges();

    expect(component.trainingDragon()!.id).toBe(pup.id);
    expect(component.trainingLevel('settle')).toBe(0);
    fixture.destroy();
  });
});
