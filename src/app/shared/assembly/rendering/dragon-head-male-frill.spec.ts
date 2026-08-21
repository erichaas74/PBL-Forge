import * as THREE from 'three';
import { AssemblyPart } from '../domain/assembly.models';
import { buildHead, childNamed, headPart } from './dragon-head-mesh.spec-helpers';

/**
 * The male frill: a collar that encircles the whole skull.
 *
 * The failure it is drawn against is a flat disc behind the head, which has no
 * thickness from any angle and vanishes to a line side-on. So the two things
 * worth pinning are that the ring closes, and that it is a cone rather than a
 * plate.
 */
describe('dragon male frill', () => {
  function maleHead(): AssemblyPart {
    const base = headPart('sphere', { x: 0.42, y: 0.32, z: 0.3 });
    return {
      ...base,
      visualProfile: {
        profileId: 'dragon-head-horned',
        meshType: 'procedural',
        parameters: { sex: 'male' },
      },
    };
  }

  function spines(head: THREE.Object3D): THREE.Object3D[] {
    const found: THREE.Object3D[] = [];
    head.traverse((child) => {
      if (child.name.startsWith('dragon-male-crest-spine-')) found.push(child);
    });
    return found;
  }

  it('rings the skull rather than fanning across the back of it', () => {
    const head = buildHead(maleHead())!;
    const ring = spines(head);

    expect(ring.length).toBeGreaterThanOrEqual(12);

    // A fan spans one side to the other; a ring has spines above *and* below
    // the skull's axis, and on both flanks.
    const centres = ring.map((spine) =>
      new THREE.Box3().setFromObject(spine).getCenter(new THREE.Vector3()),
    );
    expect(centres.some((point) => point.y > 0.1)).toBe(true);
    expect(centres.some((point) => point.y < -0.1)).toBe(true);
    expect(centres.some((point) => point.z > 0.1)).toBe(true);
    expect(centres.some((point) => point.z < -0.1)).toBe(true);
  });

  it('stands well clear of the head it encircles', () => {
    const head = buildHead(maleHead())!;
    const dims = { x: 0.84, y: 0.64, z: 0.6 };
    const web = new THREE.Box3().setFromObject(childNamed(head, 'dragon-male-crest-web'));

    // Taller and wider than the skull's own extent, which is what "way bigger"
    // has to mean for a display structure.
    expect(web.max.y - web.min.y).toBeGreaterThan(dims.y * 1.4);
    expect(web.max.z - web.min.z).toBeGreaterThan(dims.z * 1.4);
  });

  it('is a cone, not a plate — it has depth along the head', () => {
    const head = buildHead(maleHead())!;
    const headLength = 0.84;
    const web = new THREE.Box3().setFromObject(childNamed(head, 'dragon-male-crest-web'));

    /*
     * The rake: the skin leaves the ring going backwards, so side-on the frill is
     * a V rather than a line. A flat disc measures zero here.
     *
     * The bar is a tenth of the head rather than the old flat 0.2. That number was
     * calibrated against a straight backward rake; the spines now curve forward
     * again over their outer half, which hands some of that depth back by design —
     * the web's fore-aft extent is the *sag* of the curve, not its full reach.
     */
    expect(web.max.x - web.min.x).toBeGreaterThan(headLength * 0.1);
  });

  it('stands every spine tip out past the membrane it carries', () => {
    const head = buildHead(maleHead())!;
    const web = new THREE.Box3().setFromObject(childNamed(head, 'dragon-male-crest-web'));
    const ring = new THREE.Box3();
    for (const spine of spines(head)) ring.union(new THREE.Box3().setFromObject(spine));

    // The points have to clear the skin on every axis the collar spreads over,
    // or they are buried in it and the frill reads as a disc with a hem.
    expect(ring.max.y).toBeGreaterThan(web.max.y);
    expect(ring.min.y).toBeLessThan(web.min.y);
    expect(ring.max.z).toBeGreaterThan(web.max.z);
    expect(ring.min.z).toBeLessThan(web.min.z);
  });

  it('curves the spines forward, so the tips finish ahead of the ring', () => {
    const head = buildHead(maleHead())!;
    const dims = { x: 0.84 };
    const ring = new THREE.Box3();
    for (const spine of spines(head)) ring.union(new THREE.Box3().setFromObject(spine));

    // Forward of the root ring at -0.16 of the head length. The spines used to
    // rake straight back, so this measured well behind it.
    expect(ring.max.x).toBeGreaterThan(-0.16 * dims.x);
    // And the rake is still in there: the curve leaves the skull going backwards.
    expect(ring.min.x).toBeLessThan(-0.16 * dims.x);
  });

  it('slopes the membrane back between the spines rather than hanging it flat', () => {
    const head = buildHead(maleHead())!;
    const web = childNamed(head, 'dragon-male-crest-web') as THREE.Mesh;
    const position = web.geometry.getAttribute('position');

    /*
     * The scallop, measured rather than eyeballed: on a flat panel every rim
     * vertex sits at the same distance from the collar's axis, so the spread of
     * those distances is zero. Sagging the skin between the spines spreads them.
     */
    const axis = new THREE.Vector3();
    const radii: number[] = [];
    for (let index = 0; index < position.count; index += 1) {
      axis.set(0, position.getY(index), position.getZ(index));
      radii.push(axis.length());
    }
    const spread = Math.max(...radii) - Math.min(...radii);

    expect(spread).toBeGreaterThan(0.05);
  });

  it('grows nothing of the kind on a female', () => {
    const head = buildHead({
      ...headPart('sphere', { x: 0.42, y: 0.32, z: 0.3 }),
      visualProfile: {
        profileId: 'dragon-head-horned',
        meshType: 'procedural',
        parameters: { sex: 'female' },
      },
    })!;

    expect(head.getObjectByName('dragon-male-crest-web')).toBeFalsy();
    expect(head.getObjectByName('dragon-female-frill-left')).toBeTruthy();
    expect(head.getObjectByName('dragon-female-frill-spine-left')).toBeTruthy();
  });
});
