import { Component, computed, signal } from '@angular/core';
import {
  BLOOD_TYPE_DEFINITIONS,
  BloodMarker,
  BloodPhenotypeId,
} from './blood-compatibility.models';

interface AntigenPosition {
  readonly x: number;
  readonly y: number;
  readonly rotation: number;
}

interface SerumAntibodyPosition {
  readonly x: number;
  readonly y: number;
  readonly rotation: number;
  readonly delay: number;
  readonly smoothX: number;
  readonly smoothY: number;
}

interface SerumReactionFrame {
  readonly key: string;
  readonly marker: BloodMarker;
  readonly reacts: boolean;
}

@Component({
  selector: 'app-blood-type-explorer',
  templateUrl: './blood-type-explorer.component.html',
  styleUrl: './blood-type-explorer.component.scss',
})
export class BloodTypeExplorerComponent {
  readonly bloodTypes = BLOOD_TYPE_DEFINITIONS;
  readonly selectedTypeId = signal<BloodPhenotypeId>('a-positive');
  readonly selectedSerum = signal<BloodMarker | null>(null);
  readonly serumMarkers: readonly BloodMarker[] = ['a', 'b', 'd'];
  readonly antigenPositions: readonly AntigenPosition[] = [
    { x: 370, y: 89, rotation: 0 },
    { x: 456, y: 119, rotation: 45 },
    { x: 501, y: 199, rotation: 78 },
    { x: 478, y: 291, rotation: 132 },
    { x: 400, y: 337, rotation: 168 },
    { x: 309, y: 326, rotation: 210 },
    { x: 246, y: 259, rotation: 258 },
    { x: 245, y: 168, rotation: 292 },
    { x: 295, y: 107, rotation: 330 },
  ];
  readonly serumAntibodyPositions: readonly SerumAntibodyPosition[] = [
    { x: 227, y: 190, rotation: 84, delay: 0, smoothX: 0, smoothY: -110 },
    { x: 513, y: 234, rotation: -94, delay: 0.12, smoothX: 0, smoothY: 100 },
    { x: 323, y: 76, rotation: 12, delay: 0.24, smoothX: -155, smoothY: 0 },
    { x: 424, y: 351, rotation: 168, delay: 0.36, smoothX: 145, smoothY: 0 },
  ];

  readonly selectedType = computed(
    () => this.bloodTypes.find((type) => type.id === this.selectedTypeId()) ?? this.bloodTypes[0],
  );
  readonly antibodies = computed<readonly BloodMarker[]>(() => {
    const markers = this.selectedType().markers;
    return (['a', 'b'] as const).filter((marker) => !markers.includes(marker));
  });
  readonly antibodyLabel = computed(() =>
    this.antibodies().length
      ? this.antibodies()
          .map((marker) => 'anti-' + marker.toUpperCase())
          .join(' + ') + ' antibodies'
      : 'No anti-A or anti-B antibodies',
  );
  readonly compatibleDonors = computed(() => {
    const recipientMarkers = this.selectedType().markers;
    return this.bloodTypes.filter((donor) =>
      donor.markers.every((marker) => recipientMarkers.includes(marker)),
    );
  });
  readonly serumReaction = computed(() => {
    const marker = this.selectedSerum();
    return marker === null ? null : this.selectedType().markers.includes(marker);
  });
  readonly reactionFrames = computed<readonly SerumReactionFrame[]>(() => {
    const marker = this.selectedSerum();
    if (marker === null) return [];
    return [
      {
        key: `${this.selectedTypeId()}:${marker}`,
        marker,
        reacts: this.selectedType().markers.includes(marker),
      },
    ];
  });
  readonly serumResultLabel = computed(() => {
    const marker = this.selectedSerum();
    if (marker === null) return 'No test serum added';
    const label = marker.toUpperCase();
    return this.serumReaction()
      ? `Agglutination: Anti-${label} antibodies bind the ${label} antigens and cross-link the cells.`
      : `Smooth suspension: Anti-${label} antibodies find no matching ${label} antigen, so the cells remain separate.`;
  });
  readonly ariaSummary = computed(() => {
    const type = this.selectedType();
    const antigens = type.markers.length
      ? type.markers.map((marker) => marker.toUpperCase()).join(' and ') + ' antigens'
      : 'no A or B antigens';
    const antibodies = this.antibodyLabel().toLowerCase();
    const serumResult = this.selectedSerum() ? ' ' + this.serumResultLabel() : '';
    return (
      'Type ' +
      this.typeSymbol(type.name) +
      ' red blood cell with ' +
      antigens +
      '; plasma has ' +
      antibodies +
      '.' +
      serumResult
    );
  });

  selectType(id: BloodPhenotypeId): void {
    this.selectedTypeId.set(id);
  }

  selectSerum(marker: BloodMarker): void {
    this.selectedSerum.set(this.selectedSerum() === marker ? null : marker);
  }

  clearSerum(): void {
    this.selectedSerum.set(null);
  }

  typeSymbol(name: string): string {
    return name;
  }

  markerAt(index: number): BloodMarker | null {
    const markers = this.selectedType().markers;
    if (!markers.length) return null;
    return markers[index % markers.length];
  }
}
