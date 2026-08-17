import {
  CELL_ANNOTATIONS,
  CELL_BODY,
  CELL_ER_RIBBONS,
  CELL_NUCLEAR_PORES,
  CELL_NUCLEOLUS,
  CELL_NUCLEUS,
  CELL_ORGANELLES,
  CELL_POLES,
  CELL_RIBOSOMES,
  CELL_SPINDLE_POLES,
  CELL_VIEW,
  cellFocusRect,
  cellMembranePath,
  cellNucleusPath,
  cellViewBox,
  chromosomeSlots,
  insideEllipse,
  metaphasePlateSlots,
  polarSlots,
  slotInsideEllipse,
} from './cell-model.geometry';

const CHROMOSOME_RATIO = 0.2;
const REPLICATED_RATIO = 0.32;

describe('cell model geometry', () => {
  it('keeps every chromosome slot inside the nucleus at any count', () => {
    for (let count = 1; count <= 24; count += 1) {
      const slots = chromosomeSlots(count, CELL_NUCLEUS, CHROMOSOME_RATIO);

      expect(slots.length).toBe(count);
      slots.forEach((slot) => {
        expect(slot.width).toBeGreaterThan(0);
        expect(slotInsideEllipse(slot, CELL_NUCLEUS))
          .withContext(`count ${count}, slot at ${slot.x},${slot.y} sized ${slot.width}`)
          .toBeTrue();
      });
    }
  });

  it('keeps replicated chromosomes inside the nucleus despite their extra height', () => {
    const slots = chromosomeSlots(10, CELL_NUCLEUS, REPLICATED_RATIO);

    expect(slots.length).toBe(10);
    slots.forEach((slot) => {
      // Slot values are rounded for the DOM, so the ratio only holds to 2 places.
      expect(slot.height / slot.width).toBeCloseTo(REPLICATED_RATIO, 2);
      expect(slotInsideEllipse(slot, CELL_NUCLEUS)).toBeTrue();
    });
  });

  it('never overlaps two slots, across rows as well as along them', () => {
    const layouts = [
      chromosomeSlots(10, CELL_NUCLEUS, CHROMOSOME_RATIO),
      chromosomeSlots(10, CELL_NUCLEUS, REPLICATED_RATIO),
      metaphasePlateSlots(5, REPLICATED_RATIO),
      metaphasePlateSlots(10, REPLICATED_RATIO, { lanes: 2 }),
      metaphasePlateSlots(5, REPLICATED_RATIO, { axis: 'vertical' }),
      metaphasePlateSlots(10, REPLICATED_RATIO, { lanes: 2, axis: 'vertical' }),
      polarSlots(10, REPLICATED_RATIO),
      polarSlots(10, REPLICATED_RATIO, 'vertical'),
    ];

    layouts.forEach((slots, layout) => {
      slots.forEach((slot, index) => {
        slots.slice(index + 1).forEach((other) => {
          const apart =
            Math.abs(slot.x - other.x) >= (slot.width + other.width) / 2 ||
            Math.abs(slot.y - other.y) >= (slot.height + other.height) / 2;
          expect(apart).withContext(`layout ${layout}: slots ${index} and ${index + 1} overlap`)
            .toBeTrue();
        });
      });
    });
  });

  it('returns nothing for an empty cell', () => {
    expect(chromosomeSlots(0, CELL_NUCLEUS, CHROMOSOME_RATIO)).toEqual([]);
    expect(polarSlots(0, CHROMOSOME_RATIO)).toEqual([]);
  });

  it('stacks the metaphase plate down the middle when the poles are at the sides', () => {
    const slots = metaphasePlateSlots(5, CHROMOSOME_RATIO);

    expect(slots.length).toBe(5);
    expect(slots.map((slot) => slot.x)).toEqual(slots.map(() => CELL_BODY.cx));
    expect([...slots].sort((left, right) => left.y - right.y)).toEqual(slots);
    slots.forEach((slot) => expect(slotInsideEllipse(slot, CELL_BODY)).toBeTrue());
  });

  it('lays the metaphase plate across the middle when the poles are top and bottom', () => {
    const slots = metaphasePlateSlots(5, CHROMOSOME_RATIO, { axis: 'vertical' });

    expect(slots.length).toBe(5);
    expect(slots.map((slot) => slot.y)).toEqual(slots.map(() => CELL_BODY.cy));
    expect([...slots].sort((left, right) => left.x - right.x)).toEqual(slots);
    // The chromosomes stay the same way up; only the plate turns.
    expect(slots.every((slot) => slot.width > slot.height)).toBeTrue();
    slots.forEach((slot) => expect(slotInsideEllipse(slot, CELL_BODY)).toBeTrue());
  });

  it('splits chromosomes between the two poles on either division axis', () => {
    const sideways = polarSlots(5, CHROMOSOME_RATIO);

    expect(sideways.length).toBe(5);
    expect(
      sideways.slice(0, 3).every((slot) => slotInsideEllipse(slot, CELL_POLES.horizontal.a)),
    ).toBeTrue();
    expect(
      sideways.slice(3).every((slot) => slotInsideEllipse(slot, CELL_POLES.horizontal.b)),
    ).toBeTrue();
    expect(sideways.every((slot) => slotInsideEllipse(slot, CELL_BODY))).toBeTrue();

    const endways = polarSlots(10, CHROMOSOME_RATIO, 'vertical');

    expect(endways.slice(0, 5).every((slot) => slot.y < CELL_BODY.cy)).toBeTrue();
    expect(endways.slice(5).every((slot) => slot.y > CELL_BODY.cy)).toBeTrue();
    expect(
      endways.slice(0, 5).every((slot) => slotInsideEllipse(slot, CELL_POLES.vertical.a)),
    ).toBeTrue();
    expect(
      endways.slice(5).every((slot) => slotInsideEllipse(slot, CELL_POLES.vertical.b)),
    ).toBeTrue();
    expect(endways.every((slot) => slotInsideEllipse(slot, CELL_BODY))).toBeTrue();
  });

  it('puts the spindle poles square across whichever way the cell divides', () => {
    expect(CELL_SPINDLE_POLES.horizontal.a.y).toBe(CELL_SPINDLE_POLES.horizontal.b.y);
    expect(CELL_SPINDLE_POLES.horizontal.a.x).toBeLessThan(CELL_SPINDLE_POLES.horizontal.b.x);
    expect(CELL_SPINDLE_POLES.vertical.a.x).toBe(CELL_SPINDLE_POLES.vertical.b.x);
    expect(CELL_SPINDLE_POLES.vertical.a.y).toBeLessThan(CELL_SPINDLE_POLES.vertical.b.y);

    [CELL_SPINDLE_POLES.horizontal, CELL_SPINDLE_POLES.vertical].forEach((poles) => {
      expect(insideEllipse(poles.a, CELL_BODY)).toBeTrue();
      expect(insideEllipse(poles.b, CELL_BODY)).toBeTrue();
    });
  });

  it('pinches the cleavage furrow across the division axis, not along it', () => {
    const resting = cellMembranePath();
    const sideways = cellMembranePath(1, 1, 'horizontal');
    const endways = cellMembranePath(1, 1, 'vertical');

    expect(sideways).not.toBe(resting);
    expect(endways).not.toBe(resting);
    expect(endways).not.toBe(sideways);
  });

  it('places every organelle in the cytoplasm, never in the nucleus or outside the cell', () => {
    expect(CELL_ORGANELLES.length).toBeGreaterThan(0);

    CELL_ORGANELLES.forEach((organelle) => {
      const point = { x: organelle.x, y: organelle.y };
      expect(insideEllipse(point, CELL_BODY, 0.92))
        .withContext(`${organelle.id} escaped the membrane`)
        .toBeTrue();
      expect(insideEllipse(point, CELL_NUCLEUS, 1.05))
        .withContext(`${organelle.id} landed inside the nucleus`)
        .toBeFalse();
    });
  });

  it('scatters free ribosomes through the cytoplasm only', () => {
    expect(CELL_RIBOSOMES.length).toBeGreaterThan(20);

    CELL_RIBOSOMES.forEach((point) => {
      expect(insideEllipse(point, CELL_BODY, 0.9)).toBeTrue();
      expect(insideEllipse(point, CELL_NUCLEUS, 1.14)).toBeFalse();
    });
  });

  it('wraps the rough ER around the nucleus without crossing the membrane', () => {
    expect(CELL_ER_RIBBONS.length).toBe(2);

    CELL_ER_RIBBONS.forEach((ribbon) => {
      expect(ribbon.path.startsWith('M ')).toBeTrue();
      expect(ribbon.ribosomes.length).toBeGreaterThan(0);
      ribbon.ribosomes.forEach((point) => {
        expect(insideEllipse(point, CELL_BODY, 0.94)).toBeTrue();
      });
    });
  });

  it('keeps the nucleolus and the nuclear pores on the nucleus', () => {
    expect(insideEllipse({ x: CELL_NUCLEOLUS.cx, y: CELL_NUCLEOLUS.cy }, CELL_NUCLEUS)).toBeTrue();
    expect(CELL_NUCLEAR_PORES.length).toBe(18);
    CELL_NUCLEAR_PORES.forEach((pore) => {
      expect(insideEllipse(pore, CELL_NUCLEUS, 1.001)).toBeTrue();
      expect(insideEllipse(pore, CELL_NUCLEUS, 0.999)).toBeFalse();
    });
  });

  it('anchors every annotation on the cell and keeps its text in the label gutter', () => {
    const ids = CELL_ANNOTATIONS.map((annotation) => annotation.id);
    const gutter = cellViewBox(true);

    expect(new Set(ids).size).toBe(ids.length);
    CELL_ANNOTATIONS.forEach((annotation) => {
      expect(annotation.label.length).toBeGreaterThan(0);
      expect(insideEllipse(annotation.target, CELL_BODY))
        .withContext(`${annotation.id} points outside the cell`)
        .toBeTrue();
      expect(annotation.x).toBeGreaterThanOrEqual(gutter.x);
      expect(annotation.x).toBeLessThanOrEqual(gutter.x + gutter.width);
      expect(annotation.y).toBeGreaterThanOrEqual(gutter.y);
      expect(annotation.y).toBeLessThanOrEqual(gutter.y + gutter.height);

      // The leader must leave from beyond the text, or from the side away from
      // it, so the line never strikes through its own label.
      const textWidth = annotation.label.length * 2.4;
      const clear =
        annotation.anchor === 'start'
          ? annotation.from.x >= annotation.x + textWidth || annotation.from.x <= annotation.x - 1
          : annotation.from.x <= annotation.x - textWidth || annotation.from.x >= annotation.x + 1;
      expect(clear).withContext(`${annotation.id} leader crosses its own text`).toBeTrue();
    });
  });

  it('only widens the view for the labelled diagram', () => {
    const plain = cellViewBox();
    const labelled = cellViewBox(true);

    expect(plain.width).toBe(CELL_VIEW.width);
    expect(labelled.width).toBeGreaterThan(plain.width);
    expect(labelled.x).toBeLessThan(0);
  });

  it('draws a closed membrane that pinches into a furrow as the cell divides', () => {
    const resting = cellMembranePath();
    const dividing = cellMembranePath(1);

    expect(resting.startsWith('M ')).toBeTrue();
    expect(resting.endsWith(' Z')).toBeTrue();
    expect(dividing).not.toBe(resting);
    expect(cellMembranePath(0.5, 0.96)).not.toBe(resting);
    expect(cellNucleusPath().endsWith(' Z')).toBeTrue();
  });

  it('frames the nucleus when the chromosomes are still inside it', () => {
    const rect = cellFocusRect(chromosomeSlots(10, CELL_NUCLEUS, CHROMOSOME_RATIO), [CELL_NUCLEUS]);

    expect(rect.width).toBeLessThan(CELL_VIEW.width);
    expect(rect.height).toBeLessThan(CELL_VIEW.height);
    expect(rect.x + rect.width / 2).toBeCloseTo(CELL_NUCLEUS.cx, 1);
    expect(rect.y + rect.height / 2).toBeCloseTo(CELL_NUCLEUS.cy, 1);
  });

  it('pulls the frame back once the chromosomes leave for the poles', () => {
    const held = cellFocusRect(chromosomeSlots(10, CELL_NUCLEUS, CHROMOSOME_RATIO), [CELL_NUCLEUS]);
    const separating = cellFocusRect(polarSlots(10, CHROMOSOME_RATIO));

    expect(separating.width).toBeGreaterThan(held.width);
    expect(cellFocusRect(polarSlots(10, CHROMOSOME_RATIO, 'vertical')).height).toBeGreaterThan(
      held.height,
    );
    expect(separating.x).toBeGreaterThanOrEqual(0);
    expect(separating.x + separating.width).toBeLessThanOrEqual(CELL_VIEW.width);
    expect(separating.y).toBeGreaterThanOrEqual(0);
    expect(separating.y + separating.height).toBeLessThanOrEqual(CELL_VIEW.height);
  });

  it('falls back to the nucleus when there is nothing to frame', () => {
    const empty = cellFocusRect([], []);

    expect(empty.width).toBeGreaterThan(CELL_NUCLEUS.rx * 2);
    expect(empty.x + empty.width / 2).toBeCloseTo(CELL_NUCLEUS.cx, 1);
  });
});
