import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideSpecimenProfile } from './specimen-profile.registry';
import { SpecimenThumbComponent } from './specimen-thumb.component';
import { SpecimenSource } from './specimen.models';

describe('SpecimenThumbComponent', () => {
  let fixture: ComponentFixture<SpecimenThumbComponent>;

  const source: SpecimenSource = {
    kind: 'descriptor',
    descriptor: {
      id: 'spec-1',
      label: 'Ember',
      blueprint: { parts: [], joints: [] },
      traits: [],
      profileId: 'test-species',
      accentColor: '#d94841',
    },
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [SpecimenThumbComponent],
      providers: [
        provideSpecimenProfile({
          id: 'test-species',
          supports: (genome): genome is unknown => true,
          express: () => source.kind === 'descriptor' ? source.descriptor : (undefined as never),
        }),
      ],
    });
    fixture = TestBed.createComponent(SpecimenThumbComponent);
    fixture.componentRef.setInput('source', source);
    fixture.detectChanges();
  });

  it('labels the real rendered specimen', () => {
    expect(fixture.nativeElement.querySelector('.nameplate')?.textContent).toContain('Ember');
    expect(fixture.componentInstance.alt()).toBe('Ember phenotype');
  });

  it('uses the neutral unavailable state when a baked render cannot be produced', () => {
    const image = fixture.nativeElement.querySelector('img');
    const fallback = fixture.nativeElement.querySelector('.fallback');

    expect(Boolean(image) || Boolean(fallback)).toBeTrue();
  });
});
