import * as THREE from 'three';
import { ArenaImpactEffects, TELEGRAPH_MESH_NAME } from './arena-impact-effects';

/**
 * The impact layer is the difference between a duel that reads and one that
 * does not, so the behaviour that carries the meaning is pinned here: severity
 * has to reach the screen, the effects have to settle, and none of it may run
 * away with the camera.
 */
describe('ArenaImpactEffects', () => {
    let scene: THREE.Scene;
    let effects: ArenaImpactEffects;

    beforeEach(() => {
        scene = new THREE.Scene();
        effects = new ArenaImpactEffects(scene, 'high');
    });

    afterEach(() => effects.dispose());

    const at = (x = 0, y = 1, z = 0) => ({ x, y, z });

    it('shakes harder for a heavier hit', () => {
        const light = new ArenaImpactEffects(new THREE.Scene(), 'high');
        light.report({ position: at(), severity: 0.05 });
        light.update(1 / 60);
        const lightReach = light.shakeOffset.length();

        effects.report({ position: at(), severity: 0.9 });
        effects.update(1 / 60);

        expect(effects.shakeOffset.length()).toBeGreaterThan(lightReach);
        light.dispose();
    });

    it('settles back to a still camera', () => {
        effects.report({ position: at(), severity: 1 });
        for (let frame = 0; frame < 200; frame += 1)
            effects.update(1 / 60);

        expect(effects.shakeOffset.length()).toBeLessThan(1e-3);
    });

    it('never throws the camera further than its reach', () => {
        // Twenty simultaneous hits must not add up to a camera on the other side of
        // the arena — amplitude is clamped, so a pile-up stays watchable.
        for (let hit = 0; hit < 20; hit += 1) {
            effects.report({ position: at(), severity: 1 });
        }
        effects.update(1 / 60);

        expect(effects.shakeOffset.length()).toBeLessThan(1);
    });

    it('grants hit-stop only for a heavy blow, and only once', () => {
        effects.report({ position: at(), severity: 0.02 });
        expect(effects.takeHitStopSeconds()).toBe(0);

        effects.report({ position: at(), severity: 0.8 });
        expect(effects.takeHitStopSeconds()).toBeGreaterThan(0);
        // Consumed on read: a stale value would slow every following frame.
        expect(effects.takeHitStopSeconds()).toBe(0);
    });

    it('ignores a hit that did no damage', () => {
        effects.report({ position: at(), severity: 0 });
        effects.update(1 / 60);

        expect(effects.shakeOffset.length()).toBe(0);
        expect(effects.takeHitStopSeconds()).toBe(0);
    });

    it('honours reduced motion', () => {
        const calm = new ArenaImpactEffects(new THREE.Scene(), 'high', true);
        calm.report({ position: at(), severity: 1 });
        calm.update(1 / 60);

        expect(calm.shakeOffset.length()).toBeLessThan(0.1);
        expect(calm.takeHitStopSeconds()).toBe(0);
        calm.dispose();
    });

    it('skips particle systems on the low tier but still shakes', () => {
        // Low-end machines lose fill-rate cost, not feedback.
        const low = new ArenaImpactEffects(new THREE.Scene(), 'low');
        const before = low['scene'].children.length;
        low.report({ position: at(), severity: 1 });
        low.update(1 / 60);

        expect(low['scene'].children.length).toBe(before);
        expect(low.shakeOffset.length()).toBeGreaterThan(0);
        low.dispose();
    });

    it('shows a wind-up ring and clears it', () => {
        effects.setTelegraph('red', at(2, 1, 3), 0.8);
        expect(scene.getObjectByName(TELEGRAPH_MESH_NAME)?.visible).toBe(true);

        effects.setTelegraph('red', at(2, 1, 3), 0);
        expect(scene.getObjectByName(TELEGRAPH_MESH_NAME)?.visible).toBe(false);
    });

    it('brightens the ring as the strike approaches', () => {
        effects.setTelegraph('red', at(), 0.2);
        const ring = scene.getObjectByName(TELEGRAPH_MESH_NAME) as THREE.Mesh;
        const early = (ring.material as THREE.MeshBasicMaterial).opacity;

        effects.setTelegraph('red', at(), 0.95);
        const late = (ring.material as THREE.MeshBasicMaterial).opacity;

        expect(late).toBeGreaterThan(early);
        // And it closes in rather than expanding — a countdown, not an aftermath.
        expect(ring.scale.x).toBeLessThan(4.6);
    });

    it('releases everything it added to the scene', () => {
        effects.report({ position: at(), severity: 1 });
        effects.update(1 / 60);
        expect(scene.children.length).toBeGreaterThan(0);

        effects.dispose();
        expect(scene.children.length).toBe(0);
    });

    it('survives more hits than its particle budget', () => {
        // The pool wraps rather than growing; a long duel must not leak.
        for (let hit = 0; hit < 400; hit += 1) {
            effects.report({ position: at(hit % 5, 1, hit % 3), severity: 0.5 });
            effects.update(1 / 120);
        }

        expect(scene.children.length).toBeLessThan(20);
    });
});
