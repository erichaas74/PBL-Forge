import { Injectable, OnDestroy } from '@angular/core';
import { Vector3Data } from '../domain/assembly.models';
import { SpecimenDescriptor, specimenSignature } from './specimen.models';
import { SpecimenFrame, SpecimenPoseOptions } from './specimen-pose';
import {
  SpecimenRendererService,
  isSpecimenRenderingAvailable,
} from './specimen-renderer.service';
import { DRAGON_RESTING_POSE, dragonRestingPose } from './specimen-stance';

/**
 * Bakes specimens to still images through a single offscreen WebGL context.
 *
 * A clutch of eight hatchlings must not mean eight live canvases: browsers cap
 * WebGL contexts (commonly around 16) and silently drop the oldest, so a grid
 * of live viewers degrades into blank tiles as the student scrolls. Baking each
 * specimen once and handing back a data URL keeps the grid to one context total
 * and makes it free to scroll afterwards.
 *
 * Reserve the live {@link SpecimenRendererService} for the one specimen a
 * student has actually opened.
 */

export interface SpecimenThumbnailOptions {
  size?: number;
  /** Shared framing, so a grid shows real size differences between specimens. */
  frame?: SpecimenFrame | null;
  focusedTraitId?: string | null;
  transparent?: boolean;
  /** Camera angle. Lets one context bake several views of the same specimen. */
  viewDirection?: Vector3Data;
  /** Overrides the resting pose — the parts lab shows parts undrooped. */
  pose?: SpecimenPoseOptions;
}

const DEFAULT_SIZE = 160;
const CACHE_LIMIT = 64;

@Injectable({ providedIn: 'root' })
export class SpecimenThumbnailService implements OnDestroy {
  private renderer: SpecimenRendererService | null = null;
  private hostElement: HTMLElement | null = null;
  private currentSize = 0;
  /** Insertion-ordered, so the oldest key is the first one Map iterates. */
  private readonly cache = new Map<string, string>();

  /**
   * Returns a PNG data URL, or null when WebGL is unavailable so callers can
   * show an explicit unavailable state rather than an inaccurate image.
   */
  bake(descriptor: SpecimenDescriptor, options: SpecimenThumbnailOptions = {}): string | null {
    const size = options.size ?? DEFAULT_SIZE;
    const view = options.viewDirection;
    const key = [
      specimenSignature(descriptor),
      size,
      options.focusedTraitId ?? '',
      options.frame ? `${round(options.frame.radius)}@${round(options.frame.center.y)}` : '',
      view ? `${round(view.x)},${round(view.y)},${round(view.z)}` : '',
      options.pose ? `d${round(options.pose.droopRadians ?? 0)}` : '',
    ].join(':');

    const cached = this.cache.get(key);
    if (cached) {
      // Refresh recency: re-inserting moves the key to the end of the Map.
      this.cache.delete(key);
      this.cache.set(key, cached);
      return cached;
    }

    const renderer = this.ensureRenderer(size);
    if (!renderer) return null;

    renderer.setViewDirection(options.viewDirection);
    renderer.show(descriptor, {
      frame: options.frame ?? null,
      focusedTraitId: options.focusedTraitId ?? null,
      // A reared dragon has to be baked reared, or its card and its live
      // viewport show two different animals.
      pose: options.pose ?? dragonRestingPose(descriptor.blueprint),
    });
    const dataUrl = renderer.toDataUrl();
    if (!dataUrl) return null;

    this.cache.set(key, dataUrl);
    if (this.cache.size > CACHE_LIMIT) {
      const oldest = this.cache.keys().next();
      if (!oldest.done) this.cache.delete(oldest.value);
    }

    return dataUrl;
  }

  /** Bakes a set with one shared frame, so the tiles are size-comparable. */
  bakeAll(
    descriptors: readonly SpecimenDescriptor[],
    options: SpecimenThumbnailOptions = {},
  ): Map<string, string> {
    const baked = new Map<string, string>();
    for (const descriptor of descriptors) {
      const dataUrl = this.bake(descriptor, options);
      if (dataUrl) baked.set(descriptor.id, dataUrl);
    }
    return baked;
  }

  clearCache(): void {
    this.cache.clear();
  }

  ngOnDestroy(): void {
    this.releaseRenderer();
    this.cache.clear();
  }

  private ensureRenderer(size: number): SpecimenRendererService | null {
    if (!isSpecimenRenderingAvailable()) return null;

    if (!this.renderer) {
      // Detached host: never in the layout, so it costs no reflow and cannot be
      // seen. The canvas still renders — WebGL does not require attachment.
      const host = document.createElement('div');
      host.style.position = 'absolute';
      host.style.left = '-10000px';
      host.style.width = `${size}px`;
      host.style.height = `${size}px`;
      host.setAttribute('aria-hidden', 'true');

      const renderer = new SpecimenRendererService();
      renderer.mount(host, {
        // Deliberately pinned, unlike the live viewers. These bake at thumbnail
        // size through one shared offscreen context, so a post chain here costs
        // a composer and its render targets per bake to sharpen edges nobody can
        // resolve at 120px.
        quality: 'low',
        interactive: false,
        transparent: true,
        // Required: without it the drawing buffer may be cleared before
        // toDataURL runs, and the bake comes back empty.
        preserveDrawingBuffer: true,
        showGroundShadow: false,
        pose: DRAGON_RESTING_POSE,
      });

      this.hostElement = host;
      this.renderer = renderer;
      this.currentSize = 0;
    }

    if (this.currentSize !== size) {
      if (this.hostElement) {
        this.hostElement.style.width = `${size}px`;
        this.hostElement.style.height = `${size}px`;
      }
      this.renderer.setSize(size, size);
      this.currentSize = size;
    }

    return this.renderer;
  }

  private releaseRenderer(): void {
    this.renderer?.dispose();
    this.renderer = null;
    this.hostElement?.remove();
    this.hostElement = null;
    this.currentSize = 0;
  }
}

/** Matches the live viewer, so a thumbnail and its opened view agree. */

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}
