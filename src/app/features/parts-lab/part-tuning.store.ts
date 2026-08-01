import { Injectable, computed, signal } from '@angular/core';
import { Vector3Data } from '../../shared/assembly/domain/assembly.models';
import { WingMembraneShape } from '../../shared/assembly/rendering/dragon-procedural-mesh.factory';

/**
 * Values recorded while tuning a part, kept so they can be hardcoded later.
 *
 * The lab is for finding numbers by eye; the numbers then have to survive the
 * trip back into source. Records persist to localStorage because tuning happens
 * across reloads — a hot reload after every mesh edit would otherwise wipe the
 * session's work.
 */

export interface PartTuningRecord {
  id: string;
  partId: string;
  label: string;
  /** Dimensions as tuned, already multiplied out — paste-ready. */
  dimensions: Vector3Data;
  /** Multipliers used to reach them, for reference. */
  scale: Vector3Data;
  /** Present only for wing parts. */
  wingShape?: WingMembraneShape;
  note?: string;
  recordedAt: string;
}

const STORAGE_KEY = 'pbl-forge.parts-lab.tuning';

@Injectable({ providedIn: 'root' })
export class PartTuningStore {
  private readonly records = signal<PartTuningRecord[]>(readStored());

  readonly all = this.records.asReadonly();
  readonly count = computed(() => this.records().length);

  /** Paste-ready TypeScript for every record, newest last. */
  readonly snippet = computed(() => {
    const records = this.records();
    if (!records.length) return '';

    return records.map(record => {
      const lines = [
        `// ${record.label} (${record.partId}) — recorded ${record.recordedAt.slice(0, 16).replace('T', ' ')}`,
      ];
      if (record.note) lines.push(`// ${record.note}`);

      lines.push(
        '// assembly-part-definitions.ts',
        `dimensions: { x: ${round(record.dimensions.x)}, y: ${round(record.dimensions.y)}, `
        + `z: ${round(record.dimensions.z)} },`,
      );

      if (record.wingShape) {
        lines.push(
          '// dragon-procedural-mesh.factory.ts — WING_SHAPES entry',
          `{ camber: ${round(record.wingShape.camber)}, fingerSag: ${round(record.wingShape.fingerSag)}, `
          + `dihedral: ${round(record.wingShape.dihedral)}, scallop: ${round(record.wingShape.scallop)} },`,
        );
      }

      return lines.join('\n');
    }).join('\n\n');
  });

  add(record: Omit<PartTuningRecord, 'id' | 'recordedAt'>): void {
    const entry: PartTuningRecord = {
      ...record,
      id: `${record.partId}-${Date.now().toString(36)}`,
      recordedAt: new Date().toISOString(),
    };
    this.records.update(current => [...current, entry]);
    this.persist();
  }

  remove(id: string): void {
    this.records.update(current => current.filter(record => record.id !== id));
    this.persist();
  }

  clear(): void {
    this.records.set([]);
    this.persist();
  }

  private persist(): void {
    try {
      globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(this.records()));
    } catch {
      // Private mode or a full quota: the session keeps working, values are
      // just not durable. Losing them is preferable to breaking the lab.
    }
  }
}

function readStored(): PartTuningRecord[] {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isRecord) : [];
  } catch {
    return [];
  }
}

function isRecord(value: unknown): value is PartTuningRecord {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<PartTuningRecord>;
  return typeof candidate.id === 'string'
    && typeof candidate.partId === 'string'
    && isVector(candidate.dimensions);
}

function isVector(value: unknown): value is Vector3Data {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<Vector3Data>;
  return typeof candidate.x === 'number'
    && typeof candidate.y === 'number'
    && typeof candidate.z === 'number';
}

function round(value: number): number {
  return Math.round(value * 10000) / 10000;
}
