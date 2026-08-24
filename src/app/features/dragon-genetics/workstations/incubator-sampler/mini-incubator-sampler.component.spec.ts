import { TestBed } from '@angular/core/testing';
import { MiniIncubatorSamplerComponent } from './mini-incubator-sampler.component';

describe('MiniIncubatorSamplerComponent', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ imports: [MiniIncubatorSamplerComponent] });
  });

  it('sorts every offspring into a visible-trait bucket', () => {
    const fixture = TestBed.createComponent(MiniIncubatorSamplerComponent);
    const component = fixture.componentInstance;

    component.runBatch();

    const batch = component.latest();
    expect(batch).not.toBeNull();
    expect(batch!.buckets.reduce((total, bucket) => total + bucket.count, 0)).toBe(batch!.size);
  });

  it('keeps completed batches in the local investigation ledger', () => {
    const fixture = TestBed.createComponent(MiniIncubatorSamplerComponent);
    fixture.componentInstance.runBatch();

    const restored = TestBed.createComponent(MiniIncubatorSamplerComponent).componentInstance;
    expect(restored.batches()).toHaveLength(1);
    expect(restored.batches()[0].size).toBe(8);
  });
});
