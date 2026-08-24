import * as THREE from 'three';
import { buildMiniBody, buildMiniDorsalScales, buildMiniNeck } from './mini-dragon-body-mesh';
import { meshCount, named, renderMiniPart } from './mini-dragon-mesh.spec-helpers';

describe('body', () => {
  it('names its clean rounded torso without legacy tuft meshes', () => {
    const body = renderMiniPart(buildMiniBody, 'mini-dragon-body')!;

    expect(named(body, 'mini-dragon-torso').length).toBe(1);
    expect(named(body, 'mini-dragon-front-body-cap').length).toBe(1);
    expect(named(body, 'mini-dragon-rear-body-cap').length).toBe(1);
    expect(meshCount(body)).toBeGreaterThan(0);
  });

  it('recesses matching neck and tail sockets into the torso', () => {
    const body = renderMiniPart(buildMiniBody, 'mini-dragon-body')!;
    const neck = named(body, 'mini-dragon-neck-socket-cavity')[0];
    const tail = named(body, 'mini-dragon-tail-socket-cavity')[0];

    expect(named(body, 'mini-dragon-neck-socket-rim').length).toBe(1);
    expect(named(body, 'mini-dragon-tail-socket-rim').length).toBe(1);
    expect(neck.position.x).toBeGreaterThan(0);
    expect(tail.position.x).toBeLessThan(0);
    expect(neck.position.y).toBeGreaterThan(tail.position.y);
  });

  it('renders smooth rows or rounded baby spikes from the inherited back-scale form', () => {
    const smooth = renderMiniPart(
      buildMiniDorsalScales,
      'mini-dragon-dorsal-scales',
      {},
      { miniDorsalBumps: 0 },
    )!;
    const bumpy = renderMiniPart(
      buildMiniDorsalScales,
      'mini-dragon-dorsal-scales',
      {},
      { miniDorsalBumps: 1 },
    )!;

    expect(named(smooth, 'mini-dragon-smooth-scale').length).toBeGreaterThan(0);
    expect(named(smooth, 'mini-dragon-baby-spike').length).toBe(0);
    expect(named(bumpy, 'mini-dragon-bumpy-scale').length).toBeGreaterThan(0);
    expect(named(bumpy, 'mini-dragon-baby-spike').length).toBeGreaterThan(0);
  });

  it('builds a separate neck for expressive learned poses', () => {
    const neck = renderMiniPart(buildMiniNeck, 'mini-dragon-neck')!;
    expect(named(neck, 'mini-dragon-neck').length).toBe(1);
  });

  it('adds coat patches only when the specimen is two-toned', () => {
    const plain = renderMiniPart(
      buildMiniBody,
      'mini-dragon-body',
      { color: '#c8a24a' },
      { miniPatchColor: '#c8a24a' },
    );
    const patched = renderMiniPart(
      buildMiniBody,
      'mini-dragon-body',
      { color: '#c8a24a' },
      { miniPatchColor: '#3b2a1c' },
    );

    expect(named(plain!, 'mini-dragon-coat-patch').length).toBe(0);
    expect(named(patched!, 'mini-dragon-coat-patch').length).toBeGreaterThan(0);
  });

  it('uses stable marking layouts to make two-toned hatches visibly distinct', () => {
    const saddle = renderMiniPart(
      buildMiniBody,
      'mini-dragon-body',
      { color: '#c8a24a' },
      { miniPatchColor: '#3b2a1c', miniPatternStyle: 'saddle' },
    )!;
    const freckles = renderMiniPart(
      buildMiniBody,
      'mini-dragon-body',
      { color: '#c8a24a' },
      { miniPatchColor: '#3b2a1c', miniPatternStyle: 'freckles' },
    )!;

    expect(named(freckles, 'mini-dragon-coat-patch').length)
      .toBeGreaterThan(named(saddle, 'mini-dragon-coat-patch').length);
  });

  it('draws inherited body feathers as one bounded instanced alpha-card layer', () => {
    const bare = renderMiniPart(buildMiniBody, 'mini-dragon-body', {}, { miniFeatherCoverage: 0 })!;
    const feathered = renderMiniPart(
      buildMiniBody,
      'mini-dragon-body',
      {},
      { miniFeatherCoverage: 1 },
    )!;
    const layer = named(feathered, 'mini-dragon-body-feathers')[0] as THREE.InstancedMesh;
    const material = layer.material as THREE.MeshStandardMaterial;
    const firstMatrix = new THREE.Matrix4();
    layer.getMatrixAt(0, firstMatrix);

    expect(named(bare, 'mini-dragon-body-feathers').length).toBe(0);
    expect(layer).toBeInstanceOf(THREE.InstancedMesh);
    expect(layer.count).toBe(104);
    expect(material.map?.name).toBe('mini-dragon-feather-test-mini-dragon-body-feathers-albedo');
    expect(material.alphaMap?.name).toBe('mini-dragon-feather-test-mini-dragon-body-feathers-alpha');
    expect(material.alphaTest).toBeGreaterThan(0);
    expect(material.transparent).toBe(false);
    expect(firstMatrix.elements.every(Number.isFinite)).toBe(true);
  });

  it('uses feather coverage to change instance density without adding draw layers', () => {
    const fringe = renderMiniPart(
      buildMiniBody,
      'mini-dragon-body',
      {},
      { miniFeatherCoverage: 0.55 },
    )!;
    const full = renderMiniPart(buildMiniBody, 'mini-dragon-body', {}, { miniFeatherCoverage: 1 })!;

    const fringeLayer = named(fringe, 'mini-dragon-body-feathers')[0] as THREE.InstancedMesh;
    const fullLayer = named(full, 'mini-dragon-body-feathers')[0] as THREE.InstancedMesh;
    expect(fringeLayer.count).toBeLessThan(fullLayer.count);
    expect(named(fringe, 'mini-dragon-body-feathers').length).toBe(1);
    expect(named(full, 'mini-dragon-body-feathers').length).toBe(1);
  });
});
