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

@Component({
  selector: 'app-blood-type-explorer',
  templateUrl: './blood-type-explorer.component.html',
  styleUrl: './blood-type-explorer.component.scss',
})
export class BloodTypeExplorerComponent {
  readonly bloodTypes = BLOOD_TYPE_DEFINITIONS;
  readonly selectedTypeId = signal<BloodPhenotypeId>('a-positive');
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
  readonly ariaSummary = computed(() => {
    const type = this.selectedType();
    const antigens = type.markers.length
      ? type.markers.map((marker) => marker.toUpperCase()).join(' and ') + ' antigens'
      : 'no A or B antigens';
    const antibodies = this.antibodyLabel().toLowerCase();
    return (
      'Type ' +
      this.typeSymbol(type.name) +
      ' red blood cell with ' +
      antigens +
      '; plasma has ' +
      antibodies +
      '.'
    );
  });

  selectType(id: BloodPhenotypeId): void {
    this.selectedTypeId.set(id);
  }

  typeSymbol(name: string): string {
    return name.replace('+', '');
  }

  markerAt(index: number): BloodMarker | null {
    const markers = this.selectedType().markers;
    if (!markers.length) return null;
    return markers[index % markers.length];
  }
}
