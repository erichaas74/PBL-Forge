import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { WiseDragonGuideComponent } from './wise-dragon-guide.component';
import { WiseDragonGuideService } from './wise-dragon-guide.service';

describe('WiseDragonGuideComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WiseDragonGuideComponent],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('opens in place and adds a page-aware question and response', () => {
    const fixture = TestBed.createComponent(WiseDragonGuideComponent);
    const component = fixture.componentInstance;
    const guide = TestBed.inject(WiseDragonGuideService);
    fixture.detectChanges();

    component.openGuide();
    component.ask('What evidence should I notice?');

    expect(guide.open()).toBeTrue();
    expect(component.turns().map((turn) => turn.role)).toEqual([
      'wise-dragon',
      'student',
      'wise-dragon',
    ]);
    expect(component.turns().at(-1)?.message).toContain('map shows');
  });

  it('closes on Escape only while the guide is open', () => {
    const fixture = TestBed.createComponent(WiseDragonGuideComponent);
    const component = fixture.componentInstance;
    const guide = TestBed.inject(WiseDragonGuideService);

    guide.show();
    component.closeOnEscape();

    expect(guide.open()).toBeFalse();
  });
});
