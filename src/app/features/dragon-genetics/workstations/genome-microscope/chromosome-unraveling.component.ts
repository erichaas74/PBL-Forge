import {
  Component,
  OnDestroy,
  computed,
  input,
  signal,
} from '@angular/core';

export type ChromosomeUnravelingStageId = 'condensed' | 'fiber' | 'loops' | 'nucleosomes' | 'dna';

interface ChromosomeUnravelingStage {
  id: ChromosomeUnravelingStageId;
  label: string;
  shortLabel: string;
  description: string;
  packing: string;
}

interface MolecularPoint {
  x: number;
  y: number;
}

interface Nucleosome extends MolecularPoint {
  id: string;
  rotation: number;
}

interface PackedChromatinParticle extends MolecularPoint {
  id: string;
  radius: number;
  depth: number;
}

interface FiberUnit extends MolecularPoint {
  id: string;
  rotation: number;
  depth: number;
}

interface ChromatinLoopDomain {
  id: string;
  path: string;
  anchorX: number;
  anchorY: number;
}

interface HelixBackbone {
  id: string;
  first: string;
  second: string;
}

interface HelixRung {
  id: string;
  y: number;
  x1: number;
  x2: number;
  midpoint: number;
  firstBase: string;
  secondBase: string;
  depth: number;
  bondOffsets: readonly number[];
}

interface HelixPhosphate extends MolecularPoint {
  id: string;
  strand: 'blue' | 'purple';
  depth: number;
}

const STAGES: readonly ChromosomeUnravelingStage[] = [
  {
    id: 'condensed',
    label: 'Condensed chromosome',
    shortLabel: 'Chromosome',
    description: 'DNA and proteins are compressed into two thick sister-chromatid rods.',
    packing: 'most condensed',
  },
  {
    id: 'fiber',
    label: 'Chromatin fiber',
    shortLabel: 'Thick fiber',
    description: 'The same material loosens into thick, rope-like chromatin fibers.',
    packing: 'tightly coiled',
  },
  {
    id: 'loops',
    label: 'Looped chromatin',
    shortLabel: 'Open loops',
    description: 'Chromatin opens into large loops while remaining attached to a protein scaffold.',
    packing: 'loosely looped',
  },
  {
    id: 'nucleosomes',
    label: 'Nucleosomes',
    shortLabel: 'Nucleosomes',
    description: 'DNA is visible wrapping around histone proteins like beads on a string.',
    packing: 'DNA wrapped on histones',
  },
  {
    id: 'dna',
    label: 'DNA double helix',
    shortLabel: 'DNA',
    description: 'The thin DNA double helix is the continuous molecule packed into the chromosome.',
    packing: 'fully exposed',
  },
];

const COMPLEMENT: Readonly<Record<string, string>> = {
  A: 'T',
  T: 'A',
  C: 'G',
  G: 'C',
};

let nextUnravelingId = 0;

@Component({
  selector: 'app-chromosome-unraveling',
  templateUrl: './chromosome-unraveling.component.html',
  styleUrl: './chromosome-unraveling.component.scss',
})
export class ChromosomeUnravelingComponent implements OnDestroy {
  readonly sequence = input('ATGCCGTACCGAGCTACCGGATCA');
  readonly chromosomeLabel = input('Selected chromosome');

  readonly stages = STAGES;
  readonly stageIndex = signal(0);
  readonly playing = signal(false);
  readonly currentStage = computed(() => this.stages[this.stageIndex()] ?? this.stages[0]);

  readonly instanceId = `chromosome-unraveling-${nextUnravelingId++}`;
  readonly rodGradientId = `${this.instanceId}-rod-gradient`;
  readonly fiberGradientId = `${this.instanceId}-fiber-gradient`;
  readonly beadGradientId = `${this.instanceId}-bead-gradient`;
  readonly histoneInnerGradientId = `${this.instanceId}-histone-inner-gradient`;
  readonly packedParticleGradientId = `${this.instanceId}-packed-particle-gradient`;
  readonly scaffoldGradientId = `${this.instanceId}-scaffold-gradient`;
  readonly dnaBlueGradientId = `${this.instanceId}-dna-blue-gradient`;
  readonly dnaPurpleGradientId = `${this.instanceId}-dna-purple-gradient`;
  readonly chromatinPatternId = `${this.instanceId}-chromatin-pattern`;
  readonly depthGradientId = `${this.instanceId}-depth-gradient`;
  readonly depthMaskId = `${this.instanceId}-depth-mask`;
  readonly shadowId = `${this.instanceId}-shadow`;
  readonly glowId = `${this.instanceId}-glow`;
  readonly leftRodClipId = `${this.instanceId}-left-rod-clip`;
  readonly rightRodClipId = `${this.instanceId}-right-rod-clip`;

  readonly leftRodPath = rodPath(250);
  readonly rightRodPath = rodPath(550);
  readonly packedChromatinParticles = [
    buildPackedChromatinParticles(250, 0),
    buildPackedChromatinParticles(550, 1),
  ];
  readonly fiberPaths = [ropePath(250, 0.3), ropePath(550, 2.4)];
  readonly fiberUnits = [buildFiberUnits(250, 0.3, 0), buildFiberUnits(550, 2.4, 1)];
  readonly scaffoldPaths = [scaffoldPath(250, -1), scaffoldPath(550, 1)];
  readonly loopDomains = buildLoopDomains();
  readonly nucleosomes = buildNucleosomes();
  readonly nucleosomeLinkers = [
    pathThrough(this.nucleosomes.filter((bead) => bead.id.startsWith('left'))),
    pathThrough(this.nucleosomes.filter((bead) => bead.id.startsWith('right'))),
  ];
  readonly helixBackbones: readonly HelixBackbone[] = [250, 550].map((center, index) => ({
    id: `helix-${index}`,
    first: helixPath(center, 0),
    second: helixPath(center, Math.PI),
  }));
  readonly helixRungs = computed<readonly HelixRung[]>(() => buildHelixRungs(this.sequence()));
  readonly helixPhosphates = buildHelixPhosphates();

  private timer: ReturnType<typeof setInterval> | null = null;

  selectStage(index: number): void {
    this.stop();
    this.stageIndex.set(Math.max(0, Math.min(this.stages.length - 1, index)));
  }

  toggleAnimation(): void {
    if (this.playing()) {
      this.stop();
      return;
    }
    if (this.stageIndex() >= this.stages.length - 1) this.stageIndex.set(0);
    this.playing.set(true);
    this.timer = setInterval(() => {
      const next = this.stageIndex() + 1;
      if (next >= this.stages.length) {
        this.stop();
        return;
      }
      this.stageIndex.set(next);
      if (next === this.stages.length - 1) this.stop(false);
    }, 1250);
  }

  ngOnDestroy(): void {
    this.stop();
  }

  private stop(resetPlaying = true): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    if (resetPlaying) this.playing.set(false);
    else queueMicrotask(() => this.playing.set(false));
  }
}

function rodPath(center: number): string {
  const left = center - 46;
  const right = center + 46;
  return [
    `M ${center} 18`,
    `C ${left + 4} 18 ${left} 39 ${left} 67`,
    `L ${left} 134`,
    `C ${left} 151 ${center - 21} 155 ${center - 15} 170`,
    `C ${center - 21} 185 ${left} 190 ${left} 207`,
    `L ${left} 274`,
    `C ${left} 302 ${left + 4} 322 ${center} 322`,
    `C ${right - 4} 322 ${right} 302 ${right} 274`,
    `L ${right} 207`,
    `C ${right} 190 ${center + 21} 185 ${center + 15} 170`,
    `C ${center + 21} 155 ${right} 151 ${right} 134`,
    `L ${right} 67`,
    `C ${right} 39 ${right - 4} 18 ${center} 18 Z`,
  ].join(' ');
}

function ropePath(center: number, phaseOffset: number): string {
  const points = Array.from({ length: 35 }, (_, index) => ({
    x: center + Math.sin(index * 0.78 + phaseOffset) * 31,
    y: 18 + index * 9,
  }));
  return smoothPath(points);
}

function buildPackedChromatinParticles(
  center: number,
  column: number,
): readonly PackedChromatinParticle[] {
  return Array.from({ length: 20 }, (_, row) =>
    Array.from({ length: 7 }, (__, particle) => ({
      id: `${column}-${row}-${particle}`,
      x: center + (particle - 3) * 15 + Math.sin(row * 0.82 + particle) * 3.2,
      y: 18 + row * 16,
      radius: 5.4 + ((row + particle * 2) % 3) * 1.15,
      depth: (row * 2 + particle + column) % 3,
    })),
  ).flat();
}

function buildFiberUnits(
  center: number,
  phaseOffset: number,
  column: number,
): readonly FiberUnit[] {
  return Array.from({ length: 35 }, (_, index) => ({
    id: `${column}-${index}`,
    x: center + Math.sin(index * 0.78 + phaseOffset) * 31,
    y: 18 + index * 9,
    rotation: Math.cos(index * 0.78 + phaseOffset) * 48,
    depth: (index + column) % 3,
  }));
}

function scaffoldPath(center: number, direction: -1 | 1): string {
  return `M ${center} 16 C ${center + direction * 9} 104 ${center - direction * 8} 232 ${center} 324`;
}

function buildLoopDomains(): readonly ChromatinLoopDomain[] {
  return [250, 550].flatMap((center, column) =>
    Array.from({ length: 7 }, (_, index) => {
      const top = 19 + index * 44;
      const bottom = top + 39;
      const direction = (index + column) % 2 === 0 ? -1 : 1;
      const reach = 84 * direction;
      return {
        id: `${column}-${index}`,
        path: `M ${center} ${top} C ${center + reach} ${top - 2}, ${center + reach} ${bottom + 2}, ${center} ${bottom}`,
        anchorX: center,
        anchorY: top + 19.5,
      };
    }),
  );
}

function buildNucleosomes(): readonly Nucleosome[] {
  return [250, 550].flatMap((center, column) =>
    Array.from({ length: 8 }, (_, index) => ({
      id: `${column === 0 ? 'left' : 'right'}-${index}`,
      x: center + Math.sin(index * 1.08 + column * 0.7) * 17,
      y: 24 + index * 42,
      rotation: (index % 2 === 0 ? -1 : 1) * (9 + column * 3),
    })),
  );
}

function pathThrough(points: readonly MolecularPoint[]): string {
  return smoothPath(points);
}

function helixPath(center: number, phase: number): string {
  const points = Array.from({ length: 73 }, (_, index) => {
    const y = -16 + index * 5;
    return { x: center + Math.sin(y / 16 + phase) * 22, y };
  });
  return smoothPath(points);
}

function buildHelixRungs(sequence: string): readonly HelixRung[] {
  const normalized = sequence
    .toUpperCase()
    .replaceAll('U', 'T')
    .split('')
    .filter((base) => Boolean(COMPLEMENT[base]));
  const bases = normalized.length ? normalized : 'ATGCCGTACCGAGCTACCGGATCA'.split('');
  return [250, 550].flatMap((center, helixIndex) =>
    Array.from({ length: 22 }, (_, index) => {
      const y = -5 + index * 16;
      const phase = y / 16;
      const x1 = center + Math.sin(phase) * 22;
      const x2 = center - Math.sin(phase) * 22;
      const firstBase = bases[(index + helixIndex * 7) % bases.length];
      return {
        id: `${helixIndex}-${index}`,
        y,
        x1,
        x2,
        midpoint: (x1 + x2) / 2,
        firstBase,
        secondBase: COMPLEMENT[firstBase],
        depth: 0.48 + Math.abs(Math.cos(phase)) * 0.52,
        bondOffsets: firstBase === 'A' || firstBase === 'T' ? [-2, 2] : [-3, 0, 3],
      };
    }),
  );
}

function buildHelixPhosphates(): readonly HelixPhosphate[] {
  return [250, 550].flatMap((center, helixIndex) =>
    [
      { strand: 'blue' as const, phase: 0 },
      { strand: 'purple' as const, phase: Math.PI },
    ].flatMap(({ strand, phase }) =>
      Array.from({ length: 23 }, (_, index) => {
        const y = -8 + index * 16;
        const helixPhase = y / 16 + phase;
        return {
          id: `${helixIndex}-${strand}-${index}`,
          strand,
          x: center + Math.sin(helixPhase) * 22,
          y,
          depth: 0.55 + Math.abs(Math.cos(helixPhase)) * 0.45,
        };
      }),
    ),
  );
}

function smoothPath(points: readonly MolecularPoint[]): string {
  if (!points.length) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let index = 0; index < points.length - 1; index += 1) {
    const current = points[index];
    const next = points[index + 1];
    const midpoint = { x: (current.x + next.x) / 2, y: (current.y + next.y) / 2 };
    path += ` Q ${current.x} ${current.y}, ${midpoint.x} ${midpoint.y}`;
  }
  const last = points[points.length - 1];
  return `${path} T ${last.x} ${last.y}`;
}
