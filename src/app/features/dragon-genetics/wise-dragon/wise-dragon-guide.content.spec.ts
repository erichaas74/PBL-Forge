import {
  answerWiseDragonGuideQuestion,
  resolveWiseDragonGuideContext,
} from './wise-dragon-guide.content';

describe('Wise Dragon page guide content', () => {
  it('uses the canonical project activity title and objective for a workstation route', () => {
    const context = resolveWiseDragonGuideContext(
      '/dragon-genetics/allele-workbench?student=preview',
    );

    expect(context.id).toBe('allele-workbench');
    expect(context.title).toContain('Allele');
    expect(context.goal).toContain('allele');
    expect(context.operations).toContain('neutral allele samples');
  });

  it('provides route-specific investigation guidance without a forced sequence', () => {
    const context = resolveWiseDragonGuideContext('/dragon-genetics/pedigree-lab');
    const answer = answerWiseDragonGuideQuestion(context, 'What can I try on this page?');

    expect(answer).toContain('inspect relatives in any order');
    expect(answer).toContain('revise freely');
  });

  it('answers common genetics vocabulary questions', () => {
    const context = resolveWiseDragonGuideContext('/dragon-genetics/genome-microscope');
    const answer = answerWiseDragonGuideQuestion(
      context,
      'What is the difference between genotype and phenotype?',
    );

    expect(answer).toContain('allele combination');
    expect(answer).toContain('observable result');
  });

  it('coaches rather than revealing an untested answer', () => {
    const context = resolveWiseDragonGuideContext('/dragon-genetics/blood-type-lab');
    const answer = answerWiseDragonGuideQuestion(context, 'Tell me the correct answer');

    expect(answer).toContain('will not reveal an untested result');
    expect(answer).toContain('what the page showed');
  });
});
