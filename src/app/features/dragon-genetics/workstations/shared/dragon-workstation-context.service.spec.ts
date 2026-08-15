import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SessionService } from '../../../../core/firebase/session.service';
import { DragonAdaptiveStore } from '../../adaptive/dragon-adaptive.store';
import { ALLELE_VAULT_GENES } from '../allele-workbench/allele-vault.models';
import { createEmptyGeneticsNotebook } from './genetics-notebook.models';
import { DragonWorkstationContextService } from './dragon-workstation-context.service';

describe('DragonWorkstationContextService', () => {
  const user = signal<{ uid: string } | null>(null);
  const releasedGeneIds = signal<readonly string[]>([ALLELE_VAULT_GENES[0].id]);
  const assignment = signal({ id: 'assignment-spec' });
  const geneticsNotebook = signal(createEmptyGeneticsNotebook('context-spec'));
  const ready = signal(true);
  const isLocalTeacher = signal(false);

  beforeEach(() => {
    user.set(null);
    releasedGeneIds.set([ALLELE_VAULT_GENES[0].id]);
    TestBed.configureTestingModule({
      providers: [
        DragonWorkstationContextService,
        { provide: SessionService, useValue: { user, isLocalTeacher } },
        {
          provide: DragonAdaptiveStore,
          useValue: {
            assignment,
            geneticsNotebook,
            ready,
            availableAlleleGeneIds: releasedGeneIds,
          },
        },
      ],
    });
  });

  it('owns the local fallback and follows the signed-in student identity', () => {
    const context = TestBed.inject(DragonWorkstationContextService);

    expect(context.studentId()).toBe('local-student');
    user.set({ uid: 'student-42' });
    expect(context.studentId()).toBe('student-42');
  });

  it('derives released genes and their alleles from the assignment catalog', () => {
    const context = TestBed.inject(DragonWorkstationContextService);

    expect(context.availableGenes().map((gene) => gene.id)).toEqual([ALLELE_VAULT_GENES[0].id]);
    expect(
      context.availableAlleles().every((allele) => allele.geneId === ALLELE_VAULT_GENES[0].id),
    ).toBeTrue();

    releasedGeneIds.set([ALLELE_VAULT_GENES[1].id]);
    expect(context.availableGenes().map((gene) => gene.id)).toEqual([ALLELE_VAULT_GENES[1].id]);
  });
});
