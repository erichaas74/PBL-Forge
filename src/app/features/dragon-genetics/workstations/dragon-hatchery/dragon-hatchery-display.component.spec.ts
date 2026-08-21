import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DRAGON_VISUAL_CONTRACT_VERSION, DragonAnalysisSample, DragonHatcheryInstrument, DragonVisualPhase, DragonVisualScene, DragonVisualStageEvent, } from '../../../../shared/dragon-visuals/domain/dragon-visual.models';
import { DragonVisualBridge } from '../../../../shared/dragon-visuals/state/dragon-visual.bridge';
import { DragonHatcheryDisplayComponent } from './dragon-hatchery-display.component';
import { DRAGON_HATCHERY_THEME } from './dragon-hatchery.theme';

const COPY = {
    'clutch.clutch-1.label': 'Ember × Tide · run 1',
    'trait.wings.name': 'Wings',
    'evidence.genotype-record': 'The DNA sample showed the allele pair.',
    'evidence.hatch-record': 'Hatching showed me the alleles.',
};

function egg(id: string, alleles: readonly [
    string,
    string
]): DragonAnalysisSample {
    return {
        id,
        sampleType: 'egg',
        role: 'offspring',
        label: `Hatchling ${id.slice(-1)}`,
        generation: 1,
        genes: [
            {
                traitId: 'wings',
                geneId: 'W',
                chromosomeModel: 1,
                allelePair: [
                    {
                        id: `${id}:0`,
                        geneId: 'W',
                        symbol: alleles[0],
                        parentSource: 'parent-a',
                        expression: 'dominant',
                    },
                    {
                        id: `${id}:1`,
                        geneId: 'W',
                        symbol: alleles[1],
                        parentSource: 'parent-b',
                        expression: 'recessive',
                    },
                ],
                phenotypeId: alleles.includes('W') ? 'Winged' : 'Wingless',
            },
        ],
    };
}

function scene(phase: DragonVisualPhase, overrides: Partial<DragonHatcheryInstrument> = {}): DragonVisualScene {
    return {
        contractVersion: DRAGON_VISUAL_CONTRACT_VERSION,
        sceneId: 'hatchery-scene',
        stationId: 'dragon-hatchery',
        kind: 'dragon-hatchery',
        mode: 'learn',
        phase,
        seed: 'seed-h',
        samples: [egg('egg-1', ['W', 'w']), egg('egg-2', ['w', 'w'])],
        instrument: {
            kind: 'dragon-hatchery',
            clutchId: 'clutch-1',
            focusGeneId: 'W',
            eggs: [
                {
                    eggId: 'egg-1',
                    sampleId: 'egg-1',
                    position: 1,
                    examined: false,
                    sampled: false,
                    hatched: false,
                },
                {
                    eggId: 'egg-2',
                    sampleId: 'egg-2',
                    position: 2,
                    examined: false,
                    sampled: false,
                    hatched: false,
                },
            ],
            activeEggId: 'egg-1',
            selectedEggIds: [],
            hatchLimit: 1,
            evidenceMarks: [
                { id: 'genotype-record', labelId: 'evidence.genotype-record', anchorId: 'allele-slot-a' },
                { id: 'hatch-record', labelId: 'evidence.hatch-record', anchorId: 'hatch-control' },
            ],
            showHints: true,
            ...overrides,
        },
        metrics: [],
        selection: { selectedIds: [], highlightedIds: [], disabledIds: [] },
    };
}

describe('DragonHatcheryDisplayComponent', () => {
    let fixture: ComponentFixture<DragonHatcheryDisplayComponent>;
    let bridge: DragonVisualBridge;
    let events: DragonVisualStageEvent[];

    beforeEach(() => {
        TestBed.configureTestingModule({ imports: [DragonHatcheryDisplayComponent] });
        bridge = TestBed.inject(DragonVisualBridge);
        fixture = TestBed.createComponent(DragonHatcheryDisplayComponent);
        fixture.componentRef.setInput('copy', COPY);
        fixture.componentRef.setInput('reducedMotionOverride', true);
        events = [];
        fixture.componentInstance.stageEvent.subscribe((event) => events.push(event));
    });

    function render(next: DragonVisualScene): void {
        bridge.showScene(next);
        fixture.detectChanges();
    }

    function host(): HTMLElement {
        return fixture.nativeElement as HTMLElement;
    }

    it('draws one shell per egg with the locus shielded until it is sampled', () => {
        render(scene('manipulate'));

        expect(host().querySelectorAll('.tray .egg').length).toBe(2);
        expect(host().querySelectorAll('.tray app-hatchery-egg-glyph').length).toBe(2);
        expect(host().querySelector('[data-egg="egg-1"]')?.getAttribute('data-status')).toBe('intact');
        expect(host().querySelector('.chromosome-frame .shield')).toBeTruthy();
        expect(host().querySelector('.genotype-chip')?.textContent).toContain('— — —');
        expect(host().querySelector('.sealed')?.textContent).toContain('has not been candled');
    });

    it('reports examining and sampling as semantic reveal requests', () => {
        render(scene('manipulate'));

        host().querySelector<HTMLButtonElement>('[data-target="examine-control"]')?.click();
        expect(events.at(-1)).toEqual(expect.objectContaining({
            type: 'reveal-requested',
            targetId: 'egg-1',
            value: 'examine',
        }));

        host().querySelector<HTMLButtonElement>('[data-target="sample-control"]')?.click();
        expect(events.at(-1)).toEqual(expect.objectContaining({
            type: 'reveal-requested',
            targetId: 'egg-1',
            value: 'sample',
        }));
    });

    it('shows the trait readout once examined and the allele pair once sampled', () => {
        render(scene('manipulate', {
            eggs: [
                {
                    eggId: 'egg-1',
                    sampleId: 'egg-1',
                    position: 1,
                    examined: true,
                    sampled: false,
                    hatched: false,
                },
            ],
        }));

        expect(host().querySelector('.trait-list')?.textContent).toContain('Winged');
        expect(host().querySelector('.chromosome-frame .shield')).toBeTruthy();
        expect(host().querySelector('[data-target="allele-slot-a"]')?.textContent).toContain('?');

        render(scene('manipulate', {
            eggs: [
                {
                    eggId: 'egg-1',
                    sampleId: 'egg-1',
                    position: 1,
                    examined: true,
                    sampled: true,
                    hatched: false,
                },
            ],
        }));

        expect(host().querySelector('.chromosome-frame .shield')).toBeNull();
        expect(host().querySelector('[data-target="allele-slot-a"]')?.textContent).toContain('W');
        expect(host().querySelector('.genotype-chip')?.textContent).toContain('Ww');
    });

    it('stages an egg and commits the hatch through semantic events', () => {
        render(scene('manipulate'));
        host().querySelectorAll<HTMLButtonElement>('.stage-toggle')[1].click();

        expect(events.at(-1)).toEqual(expect.objectContaining({
            type: 'egg-marked',
            targetId: 'egg-2',
            value: 'select',
        }));

        render(scene('manipulate', { selectedEggIds: ['egg-2'] }));
        // The tray is full at one egg, so the other shell can no longer be staged.
        expect(host().querySelectorAll<HTMLButtonElement>('.stage-toggle')[0].disabled).toBe(true);
        expect(host().querySelector<HTMLButtonElement>('[data-target="hatch-control"]')?.disabled).toBe(true);

        render(scene('reveal', { selectedEggIds: ['egg-2'] }));
        const control = host().querySelector<HTMLButtonElement>('[data-target="hatch-control"]');
        expect(control?.disabled).toBe(false);
        control?.click();

        expect(events.at(-1)).toEqual(expect.objectContaining({
            type: 'hatch-committed',
            targetId: 'hatch-control',
            value: 1,
        }));
    });

    it('lists hatched dragons without publishing an unsampled genotype', () => {
        render(scene('explain', {
            eggs: [
                {
                    eggId: 'egg-1',
                    sampleId: 'egg-1',
                    position: 1,
                    examined: false,
                    sampled: false,
                    hatched: false,
                },
                {
                    eggId: 'egg-2',
                    sampleId: 'egg-2',
                    position: 2,
                    examined: false,
                    sampled: false,
                    hatched: true,
                },
            ],
            selectedEggIds: ['egg-2'],
            hatchCommitted: true,
        }));

        const hatched = host().querySelector('.hatched-row');
        expect(hatched?.textContent).toContain('Wingless');
        expect(hatched?.textContent).toContain('genotype not sampled');
        expect(host().querySelector<HTMLButtonElement>('[data-target="hatch-control"]')?.disabled).toBe(true);

        const marks = host().querySelectorAll<HTMLButtonElement>('.mark');
        expect(marks.length).toBe(2);
        expect(marks[0].disabled).toBe(false);
        marks[0].click();

        expect(events.at(-1)).toEqual(expect.objectContaining({
            type: 'evidence-pinned',
            targetId: 'genotype-record',
        }));
    });

    it('selects an egg for the bench and publishes a live summary', () => {
        render(scene('manipulate'));
        host().querySelector<HTMLButtonElement>('[data-egg="egg-2"]')?.click();

        expect(events.at(-1)).toEqual(expect.objectContaining({
            type: 'specimen-selected',
            targetId: 'egg-2',
        }));
        expect(host().querySelector('.bay')?.classList).toContain('reduced-motion');
        // Against the theme, not a literal — see the note in the scanner spec.
        expect(host().querySelector<HTMLElement>('.bay')?.style.getPropertyValue('--dh-brass')).toBe(DRAGON_HATCHERY_THEME.palette.brass);
        expect(host().querySelector('[aria-live="polite"]')?.textContent).toContain('Clutch of 2 eggs: 0 examined, 0 sampled, 0 hatched.');
    });

    it('removes lesson captions as well as the phase rail in open-lab mode', () => {
        fixture.componentRef.setInput('openLab', true);
        render(scene('manipulate'));

        expect(host().querySelector('.caption')).toBeNull();
        expect(host().querySelector('.phase-rail')).toBeNull();
        expect(host().querySelector('.evidence-row')).toBeNull();
    });

    it('renders a placeholder when the bridge holds another station scene', () => {
        fixture.detectChanges();

        expect(host().querySelector('.bay')).toBeNull();
        expect(host().querySelector('.station-idle')).toBeTruthy();
    });
});
