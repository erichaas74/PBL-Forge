import * as THREE from 'three';
import { ArenaHudLayer, HudCombatant } from './arena-hud-layer';

/**
 * The HUD is how combat state gets in front of the student without making them
 * look away from the fight, so what is pinned here is that it tracks the match
 * exactly and cleans up after itself.
 */
describe('ArenaHudLayer', () => {
  let scene: THREE.Scene;
  let host: HTMLElement;
  let hud: ArenaHudLayer;
  let camera: THREE.PerspectiveCamera;

  beforeEach(() => {
    scene = new THREE.Scene();
    host = document.createElement('div');
    document.body.appendChild(host);
    camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    camera.position.set(0, 4, 10);
    hud = new ArenaHudLayer(scene, host);
  });

  afterEach(() => {
    hud.dispose();
    host.remove();
  });

  function combatant(overrides: Partial<HudCombatant> = {}): HudCombatant {
    return {
      id: 'red',
      name: 'Ember',
      team: 'red',
      healthRatio: 1,
      position: { x: 0, y: 1, z: 0 },
      standingHeight: 1,
      ...overrides,
    };
  }

  /** Mirrors the production loop: state in, then a draw. CSS2DRenderer only
   *  attaches its elements to the DOM during render. */
  function draw(): void {
    hud.render(camera);
  }

  function plates(): HTMLElement[] {
    return Array.from(host.querySelectorAll<HTMLElement>('.arena-plate'));
  }

  it('draws one plate per combatant', () => {
    hud.sync([combatant(), combatant({ id: 'blue', name: 'Tide', team: 'blue' })]);
    draw();

    expect(plates().length).toBe(2);
    expect(plates()[0].textContent).toContain('Ember');
    expect(plates()[1].classList).toContain('arena-plate--blue');
  });

  it('reuses plates across frames instead of rebuilding them', () => {
    hud.sync([combatant()]);
    draw();
    const first = plates()[0];

    hud.sync([combatant({ healthRatio: 0.5 })]);
    draw();

    // Same node: swapping DOM every frame would thrash layout and restart any
    // transition on the bar.
    expect(plates()[0]).toBe(first);
  });

  it('tracks health onto the bar', () => {
    hud.sync([combatant({ healthRatio: 0.42 })]);
    draw();
    const fill = host.querySelector<HTMLElement>('.arena-plate__fill');

    expect(fill?.style.width).toBe('42%');
  });

  it('exposes health to assistive tech', () => {
    hud.sync([combatant({ healthRatio: 0.3 })]);
    draw();

    expect(plates()[0].getAttribute('aria-label')).toBe('Ember: 30% health');
  });

  it('drops plates for combatants that leave the match', () => {
    hud.sync([combatant(), combatant({ id: 'blue', name: 'Tide', team: 'blue' })]);
    draw();
    hud.sync([combatant()]);
    draw();

    expect(plates().length).toBe(1);
  });

  it('floats a damage number and retires it', () => {
    hud.reportDamage({ x: 0, y: 1, z: 0 }, 7);
    draw();
    const number = host.querySelector<HTMLElement>('.arena-damage');
    expect(number?.textContent).toBe('-7');

    // Past its lifetime it must be invisible, not merely faint.
    for (let frame = 0; frame < 120; frame += 1) hud.update(1 / 60);
    draw();
    expect(number?.style.opacity).toBe('0');
  });

  it('ignores damage too small to read', () => {
    hud.reportDamage({ x: 0, y: 1, z: 0 }, 0.2);
    draw();

    expect(host.querySelector('.arena-damage')).toBeNull();
  });

  it('caps the number of damage labels it will create', () => {
    for (let hit = 0; hit < 60; hit += 1) {
      hud.reportDamage({ x: 0, y: 1, z: 0 }, 5);
    }
    draw();

    expect(host.querySelectorAll('.arena-damage').length).toBeLessThanOrEqual(12);
  });

  it('removes every element it created on dispose', () => {
    hud.sync([combatant()]);
    hud.reportDamage({ x: 0, y: 1, z: 0 }, 5);
    draw();
    hud.dispose();

    expect(host.querySelectorAll('.arena-plate').length).toBe(0);
    expect(host.querySelectorAll('.arena-damage').length).toBe(0);
    expect(scene.children.length).toBe(0);
  });

  it('never intercepts pointer events', () => {
    // The canvas underneath owns dragging; a HUD that swallows a drag would
    // make the camera feel broken wherever a label happened to be.
    hud.sync([combatant()]);
    draw();
    const layer = host.firstElementChild as HTMLElement;

    expect(layer.style.pointerEvents).toBe('none');
  });
});
