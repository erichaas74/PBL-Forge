import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { IncubatorSamplerComponent } from './incubator-sampler.component';

describe('IncubatorSamplerComponent', () => {
  const studentId = 'incubator-component-spec';
  const storageKey = `pbl-forge.dragon-genetics.incubator-sampler.v2.${studentId}`;

  beforeEach(async () => {
    localStorage.removeItem(storageKey);
    await TestBed.configureTestingModule({
      imports: [IncubatorSamplerComponent],
    }).compileComponents();
  });

  afterEach(() => localStorage.removeItem(storageKey));

  it('breeds every hatchling in a populated phenotype bucket as one pool', fakeAsync(() => {
    const fixture = TestBed.createComponent(IncubatorSamplerComponent);
    fixture.componentRef.setInput('studentId', studentId);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    const [ember, tide] = component.account().dragons;

    component.selectAccountRecord('a', ember);
    component.selectAccountRecord('b', tide);
    component.startBatch();
    tick(3500);
    fixture.detectChanges();

    expect(component.batches().length).toBe(1);
    expect(component.buckets().reduce((sum, bucket) => sum + bucket.count, 0)).toBe(8);
    const populated = component.buckets().find((bucket) => bucket.count >= 2);
    expect(populated).toBeDefined();

    component.breedFromBucket(populated!);
    tick(1100);
    fixture.detectChanges();

    expect(component.nextGeneration()).toBe(2);
    expect(component.activeBreedingPoolIds()).toEqual(populated!.offspringIds);
    expect(component.activeParentIds()).toEqual(populated!.offspringIds.slice(0, 2));
    expect(component.breedingPool().length).toBe(populated!.count);
    expect(component.running()).toBeTrue();
    expect(fixture.nativeElement.textContent).toContain('BALANCED BREEDING POOL');
    expect(fixture.nativeElement.textContent.toLowerCase()).not.toContain('genotype');
    expect(fixture.nativeElement.textContent.toLowerCase()).not.toContain('punnett');
    expect(fixture.nativeElement.querySelector('.question-dock')).toBeNull();

    tick(3500);
    expect(component.batches().length).toBe(2);
    expect(component.latestRecord()?.breedingPoolIds).toEqual(populated!.offspringIds);
    expect(component.latestRecord()?.results.map((result) => result.count)).toEqual([6, 2]);
    expect(
      (fixture.nativeElement.querySelector('.parent-row td') as HTMLElement).textContent,
    ).toContain('Ember + Tide');
    fixture.destroy();
  }));
});
