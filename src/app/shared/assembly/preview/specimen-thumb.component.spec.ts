import { Component, input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideSpecimenPlate } from './specimen-plate.registry';
import { provideSpecimenProfile } from './specimen-profile.registry';
import {
  resetSpecimenRenderMode,
  setSpecimenRenderMode,
} from './specimen-render-mode';
import { SpecimenThumbComponent } from './specimen-thumb.component';
import { SpecimenDescriptor, SpecimenSource } from './specimen.models';

/**
 * The tile is the seam between "which dragon" and "how it is drawn". These pin
 * the dispatch: the mode and the registry decide, and the call site never has
 * to know which representation it got.
 */

const PROFILE_ID = 'test-species';

@Component({
  selector: 'app-fake-plate',
  template: `<b class="fake-plate">{{ descriptor()?.label }}</b>`,
})
class FakePlateComponent {
  readonly descriptor = input<SpecimenDescriptor | null>(null);
  readonly focusedTraitId = input<string | null>(null);
}

describe('SpecimenThumbComponent', () => {
  let fixture: ComponentFixture<SpecimenThumbComponent>;

  const source: SpecimenSource = {
    kind: 'descriptor',
    descriptor: {
      id: 'spec-1',
      label: 'Ember',
      blueprint: { parts: [], joints: [] },
      traits: [],
      profileId: PROFILE_ID,
      accentColor: '#d94841',
    },
  };

  function build(withPlate: boolean): void {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [SpecimenThumbComponent],
      providers: [
        provideSpecimenProfile({
          id: PROFILE_ID,
          supports: (genome): genome is unknown => true,
          express: () => source.kind === 'descriptor'
            ? source.descriptor
            : (undefined as never),
        }),
        ...(withPlate
          ? [provideSpecimenPlate({ profileId: PROFILE_ID, component: FakePlateComponent })]
          : []),
      ],
    });
    fixture = TestBed.createComponent(SpecimenThumbComponent);
    fixture.componentRef.setInput('source', source);
    fixture.detectChanges();
  }

  afterEach(() => resetSpecimenRenderMode());

  it('draws the registered plate in plate mode', () => {
    build(true);

    const plate = fixture.nativeElement.querySelector('.fake-plate');
    expect(plate?.textContent).toBe('Ember');
    // And costs no bake at all — that is the whole point of the flat path.
    expect(fixture.nativeElement.querySelector('img')).toBeNull();
  });

  it('falls back to the 3D path when the species has no plate registered', () => {
    // A simulation without artwork is not an error; it just gets a render.
    build(false);

    expect(fixture.nativeElement.querySelector('.fake-plate')).toBeNull();
  });

  it('switches to the render when the mode changes', () => {
    build(true);
    expect(fixture.nativeElement.querySelector('.fake-plate')).not.toBeNull();

    setSpecimenRenderMode('render');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.fake-plate')).toBeNull();
  });

  it('lets a call site force the render regardless of mode', () => {
    build(true);
    fixture.componentRef.setInput('forceRender', true);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.fake-plate')).toBeNull();
  });

  it('passes trait focus through to the plate', () => {
    build(true);
    fixture.componentRef.setInput('focusedTraitId', 'trait:wings');
    fixture.detectChanges();

    const plate = fixture.debugElement.query(
      node => node.componentInstance instanceof FakePlateComponent,
    );
    expect((plate.componentInstance as FakePlateComponent).focusedTraitId()).toBe('trait:wings');
  });
});
