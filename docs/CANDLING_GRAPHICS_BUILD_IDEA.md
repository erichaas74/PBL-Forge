# Candling graphics build idea

Recorded October 14, 2026. **Status: shelved for later. Not approved for implementation.**

Preserve the existing Candling workstation and improve the depth, lighting, and visual response of its existing artwork. The first proposed comparison is a 2.5D polish of the examination egg and surrounding light, not a new 3D room.

## Preserve

- Existing egg outline, warm bone palette, deterministic speckle positions, and specimen identity.
- Existing layout, labels, controls, keyboard operation, scientific diagrams, and evidence records.
- Existing experiment state and genetics: traits remain concealed until examination or hatching; genotype remains concealed until DNA sampling.
- Existing dragon models and renderers. No replacement generated imagery.
- Other Hatchery screens: any future treatment must be explicitly scoped to Candling because its display and egg glyph are shared.

## Proposed build path

1. Capture the current workstation visually before implementation. Prepare an isolated comparison of the same examination egg with curved shell shading, a soft highlight, darker edge, contact shadow, and layered candling light. Preserve its silhouette and markings.
2. If the user accepts that comparison, extend the same lighting direction to shallow panel bevels, restrained brass highlights, and recessed instrument interiors.
3. Polish the existing sampling needle feedback and chromosome-panel illumination without changing sampling actions or scientific values.
4. Give existing crack lines depth and a brief state-driven appearance animation. Keep the current hatch action and result display.
5. Refine existing pressed, focused, selected, and disabled control appearances without moving controls or changing available actions.

Animations must reflect real state, honor reduced motion, and show settled results when restoring an already completed experiment. Verify readability, keyboard operation, scientific concealment, and performance on intended school hardware.

## Outside this proposal

A movable lamp, an invented embryo silhouette, a new hatchling emergence sequence, new interaction requirements, a full-room redesign, and changes to other workstations are excluded. Those would require separate design decisions.

## Existing implementation references

- `src/app/features/dragon-genetics/workstations/candling-workstation/candling-workstation.component.html`
- `src/app/features/dragon-genetics/workstations/dragon-hatchery/dragon-hatchery-display.component.html`
- `src/app/features/dragon-genetics/workstations/dragon-hatchery/hatchery-egg-glyph.component.html`
- `src/app/features/dragon-genetics/workstations/dragon-hatchery/hatchery-egg-glyph.component.scss`
- `src/app/features/dragon-genetics/workstations/dragon-hatchery/dragon-hatchery.theme.ts`

The proposal is based on source inspection; a live visual baseline is still required before implementing it.
