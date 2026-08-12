import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { GarageInspectorComponent } from './garage-inspector.component';
import { AssemblyGarageStore } from '../../state/assembly-garage.store';
import { ASSEMBLY_PART_DEFINITIONS } from '../../data/assembly-part-definitions';
import { DesignerDragonDraftStore } from '../../../designer-dragon-draft.store';

const CATALOG_DEFINITION_ID = 'dragon-clawed-foot';

describe('GarageInspectorComponent', () => {
  let fixture: ComponentFixture<GarageInspectorComponent>;
  let component: GarageInspectorComponent;
  let store: AssemblyGarageStore;

  beforeEach(async () => {
    // The draft store hydrates from localStorage, so a stale saved size would
    // silently move every baseline in here.
    localStorage.removeItem('dragon-designer.draft.v1');

    await TestBed.configureTestingModule({
      imports: [GarageInspectorComponent],
      // The inspector links out to the Snap Workshop for catalog parts.
      providers: [AssemblyGarageStore, provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(GarageInspectorComponent);
    component = fixture.componentInstance;
    store = TestBed.inject(AssemblyGarageStore);
    fixture.detectChanges();
  });

  function loadCatalogPart(): void {
    const definition = catalogDefinition();

    store.loadAssemblyState({
      parts: [
        {
          id: 'foot',
          definitionId: definition.id,
          shape: definition.shape,
          mass: definition.mass,
          dimensions: { ...definition.dimensions },
          position: { x: 0, y: 1, z: 0 },
          color: definition.color,
        },
      ],
      joints: [],
      isSimulating: false,
    });
    store.selectPart('foot');
    fixture.detectChanges();
  }

  function catalogDefinition() {
    const definition = ASSEMBLY_PART_DEFINITIONS.find(item => item.id === CATALOG_DEFINITION_ID);
    if (!definition) throw new Error(`Missing catalog part "${CATALOG_DEFINITION_ID}".`);
    return definition;
  }

  function sliderEvent(value: number): Event {
    return { target: { value: String(value) } } as unknown as Event;
  }

  it('measures a hand-built part against its size when it was selected', () => {
    const part = store.state().parts[0];
    store.selectPart(part.id);
    fixture.detectChanges();

    expect(component.scaleFor('x')).toBe(1);

    component.setUniformScale(sliderEvent(2));

    expect(store.selectedPart()?.dimensions).toEqual({
      x: part.dimensions.x * 2,
      y: part.dimensions.y * 2,
      z: part.dimensions.z * 2,
    });
    expect(component.scaleFor('y')).toBe(2);
  });

  it('does not re-baseline when the same part is selected again mid-edit', () => {
    const part = store.state().parts[0];
    store.selectPart(part.id);
    fixture.detectChanges();

    component.setUniformScale(sliderEvent(1.5));
    store.selectPart(part.id);
    fixture.detectChanges();

    expect(component.scaleFor('x')).toBe(1.5);
  });

  it('measures a catalog part against its definition and resets back to it', () => {
    loadCatalogPart();
    const authored = catalogDefinition().dimensions;

    component.setUniformScale(sliderEvent(1.5));

    expect(component.sizeBaseline()).toEqual(authored);
    expect(store.selectedPart()?.dimensions.x).toBeCloseTo(authored.x * 1.5, 3);

    component.resetSize();

    expect(store.selectedPart()?.dimensions).toEqual(authored);
    expect(component.scaleFor('x')).toBe(1);
  });

  it('scales one axis at a time from the baseline, not from the current size', () => {
    loadCatalogPart();
    const authored = catalogDefinition().dimensions;

    component.setAxisScale('y', sliderEvent(2));
    component.setAxisScale('y', sliderEvent(2));

    expect(store.selectedPart()?.dimensions.y).toBeCloseTo(authored.y * 2, 3);
    expect(store.selectedPart()?.dimensions.x).toBeCloseTo(authored.x, 3);
  });

  it('saves a tuned size to the catalog definition and rebaselines onto it', () => {
    loadCatalogPart();
    const authored = catalogDefinition().dimensions;

    component.setUniformScale(sliderEvent(2));
    component.saveSizeToCatalog();
    fixture.detectChanges();

    const saved = TestBed.inject(DesignerDragonDraftStore)
      .dimensionsFor(CATALOG_DEFINITION_ID, authored);

    expect(saved.x).toBeCloseTo(authored.x * 2, 3);
    expect(component.scaleFor('x')).toBe(1);
    expect(component.saveMessage()).toContain(CATALOG_DEFINITION_ID);
  });

  it('offers the catalog save only for parts stamped from the catalog', () => {
    store.selectPart(store.state().parts[0].id);
    fixture.detectChanges();

    expect(component.catalogDefinitionId()).toBeNull();

    loadCatalogPart();

    expect(component.catalogDefinitionId()).toBe(CATALOG_DEFINITION_ID);
  });

  afterEach(() => {
    localStorage.removeItem('dragon-designer.draft.v1');
  });
});
