import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AssemblyBlueprint } from '../domain/assembly.models';
import { SpecimenSource, describeSpecimen } from './specimen.models';
import {
  SpecimenProfile,
  provideSpecimenProfile,
} from './specimen-profile.registry';
import { SpecimenViewComponent } from './specimen-view.component';

interface TestGenome {
  size: number;
}

function blueprint(size = 1): AssemblyBlueprint {
  return {
    parts: [
      {
        id: 'core',
        roles: ['core'],
        shape: 'box',
        mass: 1,
        dimensions: { x: size, y: size, z: size },
        position: { x: 0, y: 1, z: 0 },
        color: '#556677',
      },
      {
        id: 'wing',
        roles: ['wing'],
        shape: 'box',
        mass: 0.4,
        dimensions: { x: 0.4, y: 0.1, z: size * 2 },
        position: { x: 0, y: 1.3, z: 0 },
        color: '#556677',
      },
    ],
    joints: [],
  };
}

/** Registered on the host component, not in the root injector. */
const LOCAL_PROFILE: SpecimenProfile<TestGenome> = {
  id: 'lazy-sim',
  supports: (value): value is TestGenome =>
    typeof value === 'object' && value !== null && typeof (value as TestGenome).size === 'number',
  express: (genome, options) => describeSpecimen(options.id ?? 'expressed', blueprint(genome.size), {
    label: options.label ?? 'Expressed',
    traits: [
      { id: 'span', label: 'Span', valueLabel: `${genome.size}x`, roles: ['wing'], normalized: 0.5 },
      { id: 'hue', label: 'Colour', valueLabel: 'Teal', roles: [] },
    ],
  }),
};

@Component({
  imports: [SpecimenViewComponent],
  providers: [provideSpecimenProfile(LOCAL_PROFILE as SpecimenProfile)],
  template: `<app-specimen-view [source]="source()" (traitFocused)="focused = $event" />`,
})
class HostComponent {
  readonly source = signal<SpecimenSource>({
    kind: 'genome',
    profileId: 'lazy-sim',
    genome: { size: 2 },
    id: 'student-specimen',
    label: 'Student specimen',
  });
  focused: string | null = null;
}

describe('SpecimenViewComponent', () => {
  let fixture: ComponentFixture<HostComponent>;

  function view(): SpecimenViewComponent {
    return fixture.debugElement.children[0].componentInstance as SpecimenViewComponent;
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('adopts a profile provided on the host, not just in the root injector', () => {
    expect(view().errorMessage()).toBeNull();
    expect(view().descriptor()?.label).toBe('Student specimen');
  });

  it('expresses the genome through that profile', () => {
    expect(view().descriptor()?.blueprint.parts[0].dimensions.x).toBe(2);
  });

  it('lists the traits as selectable buttons', () => {
    const buttons = fixture.nativeElement.querySelectorAll('.specimen-view__trait');

    expect(buttons.length).toBe(2);
    expect(buttons[0].textContent).toContain('Span');
  });

  it('focuses a trait when its button is clicked, and reports it', () => {
    const button = fixture.nativeElement.querySelector('.specimen-view__trait') as HTMLButtonElement;
    button.click();
    fixture.detectChanges();

    expect(view().activeTraitId()).toBe('span');
    expect(fixture.componentInstance.focused).toBe('span');
    expect(button.getAttribute('aria-pressed')).toBe('true');
  });

  it('clears focus when the active trait is clicked again', () => {
    const button = fixture.nativeElement.querySelector('.specimen-view__trait') as HTMLButtonElement;
    button.click();
    fixture.detectChanges();
    button.click();
    fixture.detectChanges();

    expect(view().activeTraitId()).toBeNull();
    expect(fixture.componentInstance.focused).toBeNull();
  });

  it('reacts to the source changing', () => {
    fixture.componentInstance.source.set({
      kind: 'genome',
      profileId: 'lazy-sim',
      genome: { size: 5 },
      id: 'other',
      label: 'Other specimen',
    });
    fixture.detectChanges();

    expect(view().descriptor()?.label).toBe('Other specimen');
    expect(view().descriptor()?.blueprint.parts[0].dimensions.x).toBe(5);
  });

  it('shows a readable message instead of failing when the profile is unknown', () => {
    fixture.componentInstance.source.set({
      kind: 'genome',
      profileId: 'never-registered',
      genome: { size: 1 },
    });
    fixture.detectChanges();

    expect(view().descriptor()).toBeNull();
    expect(view().errorMessage()).toContain('never-registered');
    expect(fixture.nativeElement.textContent).toContain('never-registered');
  });

  it('labels the stage for screen readers using the specimen name', () => {
    const stage = fixture.nativeElement.querySelector('.specimen-view__stage') as HTMLElement;

    expect(stage.getAttribute('role')).toBe('img');
    expect(stage.getAttribute('aria-label')).toContain('Student specimen');
  });
});
