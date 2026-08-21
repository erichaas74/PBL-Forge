import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  BattleBodySnapshot,
  ControlFrameByCombatant,
} from '../../shared/assembly-arena/models/arena.models';
import { ArenaViewportAppearance } from '../../shared/assembly-arena/components/arena-viewport/arena-viewport.component';
import { DragonArenaComponent } from './dragon-arena.component';
import { findParent, runDragonBatch } from './dragon-genetics.domain';

@Component({
  selector: 'app-arena-viewport',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template:
    '<div class="viewport-stub" [attr.data-appearance]="appearance()" [attr.aria-label]="ariaLabel()"></div>',
})
class ArenaViewportStubComponent {
  readonly controlFrameFactory =
    input.required<(snapshots: BattleBodySnapshot[]) => ControlFrameByCombatant>();
  readonly appearance = input<ArenaViewportAppearance>('standard');
  readonly ariaLabel = input('Assembly battle arena viewport');
}

describe('DragonArenaComponent', () => {
  let fixture: ComponentFixture<DragonArenaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [DragonArenaComponent] })
      .overrideComponent(DragonArenaComponent, {
        set: { imports: [ArenaViewportStubComponent] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(DragonArenaComponent);
    fixture.componentRef.setInput(
      'champion',
      runDragonBatch(findParent('ember'), findParent('tide'), 7, 1).sample[0],
    );
    fixture.detectChanges();
  });

  it('renders the Viking arena shell around the shared viewport', () => {
    const element = fixture.nativeElement as HTMLElement;
    const viewport = element.querySelector<HTMLElement>('.viewport-stub');

    expect(element.querySelector('.arena-masthead')?.textContent).toContain('Dragon Trial Arena');
    expect(viewport?.dataset['appearance']).toBe('dragon-pit');
    expect(viewport?.getAttribute('aria-label')).toContain('The Arena Warden');
    expect(element.querySelectorAll('.combat-hud article').length).toBe(2);
    expect(element.querySelector('.field-guide')?.hasAttribute('open')).toBeFalse();
  });

  it('changes command mode while keeping the same combatants', () => {
    const element = fixture.nativeElement as HTMLElement;
    const matchId = fixture.componentInstance.arena.state().matchId;
    const combatants = fixture.componentInstance.arena
      .state()
      .combatants.map((combatant) => combatant.name);
    const tacticalButton = [...element.querySelectorAll<HTMLButtonElement>('.mode-button')].find(
      (button) => button.textContent?.includes('Tactical turns'),
    );

    tacticalButton?.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.arena.state().matchId).toBeGreaterThan(matchId);
    expect(
      fixture.componentInstance.arena.state().combatants.map((combatant) => combatant.name),
    ).toEqual(combatants);
    expect(element.querySelector('.turn-panel')).not.toBeNull();
    expect(element.querySelectorAll('.move-card').length).toBeGreaterThan(0);
  });

  it('shows inherited move availability in the control deck', () => {
    const buttons = [
      ...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>(
        '.attack-controls button',
      ),
    ];
    const wing = buttons.find((button) => button.textContent?.includes('Wing buffet'));
    const horn = buttons.find((button) => button.textContent?.includes('Horn charge'));
    const fire = buttons.find((button) => button.textContent?.includes('Fire breath'));

    expect(wing?.disabled).toBeFalse();
    expect(horn?.disabled).toBeTrue();
    expect(fire?.disabled).toBeFalse();
  });
});
