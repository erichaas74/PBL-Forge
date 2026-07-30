import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DragonDiscoveryGalleryComponent } from './dragon-discovery-gallery.component';

describe('DragonDiscoveryGalleryComponent', () => {
  let fixture: ComponentFixture<DragonDiscoveryGalleryComponent>;
  let gallery: DragonDiscoveryGalleryComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [DragonDiscoveryGalleryComponent] });
    fixture = TestBed.createComponent(DragonDiscoveryGalleryComponent);
    gallery = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('selects dragons and resets the model-ready view', () => {
    gallery.rotate(30);
    gallery.changeZoom(.2);
    gallery.selectDragon(gallery.dragons[1].id);

    expect(gallery.selectedDragon().id).toBe(gallery.dragons[1].id);
    expect(gallery.rotation()).toBe(0);
    expect(gallery.zoom()).toBe(1);
  });

  it('collects inspected traits in the field guide', () => {
    const newTrait = gallery.traits[1];
    gallery.inspectTrait(newTrait.id);

    expect(gallery.selectedTrait()).toBe(newTrait);
    expect(gallery.collectedTraitIds().has(newTrait.id)).toBeTrue();
    expect(gallery.collectedCount()).toBe(2);
  });

  it('keeps first impressions ungraded and reveals the evidence boundary after all prompts', () => {
    gallery.impressionPrompts.forEach((prompt, index) => {
      gallery.recordImpression(prompt.id, gallery.dragons[index % gallery.dragons.length].id);
    });

    expect(gallery.impressionComplete()).toBeTrue();
    gallery.revealImpressions();
    expect(gallery.impressionReveal()).toBeTrue();
  });

  it('checks Trait or Trick answers against the inherited side', () => {
    const challenge = gallery.trickChallenges[0];
    gallery.answerTraitOrTrick(challenge.id, challenge.inheritedSide);

    expect(gallery.trickCorrect(challenge)).toBeTrue();
  });
});
