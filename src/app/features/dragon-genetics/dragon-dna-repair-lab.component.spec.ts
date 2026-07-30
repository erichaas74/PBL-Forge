import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { DragonDnaRepairLabComponent } from './dragon-dna-repair-lab.component';

describe('DragonDnaRepairLabComponent', () => {
  let fixture: ComponentFixture<DragonDnaRepairLabComponent>;
  let lab: DragonDnaRepairLabComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [DragonDnaRepairLabComponent] });
    fixture = TestBed.createComponent(DragonDnaRepairLabComponent);
    lab = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('moves through the chromosome-to-gene uncoiling stages', () => {
    lab.setUncoilStep(3);
    expect(lab.activeStage().label).toBe('Highlighted gene section');
  });

  it('animates complementary DNA replication', fakeAsync(() => {
    lab.selectMode('replicate');
    lab.playReplication();
    tick(260 * lab.template.length);
    expect(lab.replicationProgress()).toBe(lab.template.length);
  }));

  it('repairs the deliberate mismatch with the complementary base', () => {
    lab.selectMode('repair');
    lab.chooseRepair('A');
    expect(lab.repaired()).toBeTrue();
    expect(lab.displayedRepairBase(4)).toBe('A');
  });
});
