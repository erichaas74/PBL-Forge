import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describeSpecimen } from './specimen.models';
import { SpecimenViewportComponent } from './specimen-viewport.component';
import { stubSpecimenViewportRendering } from './specimen-viewport.testing';

describe('SpecimenViewportComponent', () => {
  let fixture: ComponentFixture<SpecimenViewportComponent>;

  beforeEach(async () => {
    stubSpecimenViewportRendering();
    await TestBed.configureTestingModule({ imports: [SpecimenViewportComponent] }).compileComponents();
    fixture = TestBed.createComponent(SpecimenViewportComponent);
  });

  it('keeps the surface empty until a source is supplied', () => {
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('.viewport__stage--empty')).not.toBeNull();
    expect((fixture.nativeElement as HTMLElement).querySelector('.viewport__controls')).toBeNull();
  });

  it('resolves descriptor sources without adding assay panels', () => {
    fixture.componentRef.setInput('source', {
      kind: 'descriptor',
      descriptor: describeSpecimen('test', { parts: [], joints: [] }, { label: 'Test dragon' }),
    });
    fixture.detectChanges();

    expect(fixture.componentInstance.descriptor()?.label).toBe('Test dragon');
    expect((fixture.nativeElement as HTMLElement).querySelector('.bench__panels')).toBeNull();
  });
});
