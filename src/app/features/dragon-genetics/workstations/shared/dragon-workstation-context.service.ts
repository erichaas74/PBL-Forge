import { computed, inject, Service } from '@angular/core';
import { SessionService } from '../../../../core/firebase/session.service';
import { DragonAdaptiveStore } from '../../adaptive/dragon-adaptive.store';
import {
  ALLELE_VAULT_ALLELES,
  ALLELE_VAULT_GENES,
} from '../allele-workbench/allele-vault.models';
import { AccountGeneticsLibraryService } from './account-genetics-library.service';
import { LOCAL_WORKSTATION_STUDENT_ID } from './dragon-workstation-context.models';

/**
 * App-facing source of truth for every routed Dragon Genetics workstation host.
 *
 * Workstation instruments stay portable by receiving these values through inputs. They should
 * not inject this service directly: the route/page is the Angular container boundary and this
 * service is its adapter to session, assignment, catalog, and notebook state.
 */
@Service()
export class DragonWorkstationContextService {
  private readonly session = inject(SessionService);
  private readonly adaptiveStore = inject(DragonAdaptiveStore);
  private readonly accountLibrary = inject(AccountGeneticsLibraryService);

  readonly studentId = computed(
    () => this.session.user()?.uid?.trim() || LOCAL_WORKSTATION_STUDENT_ID,
  );
  readonly assignment = this.adaptiveStore.assignment;
  readonly geneticsNotebook = this.adaptiveStore.geneticsNotebook;
  readonly ready = this.adaptiveStore.ready;
  readonly isTeacherPreview = this.session.isLocalTeacher;

  readonly availableGenes = computed(() => {
    const released = new Set(this.adaptiveStore.availableAlleleGeneIds());
    return ALLELE_VAULT_GENES.filter((gene) => released.has(gene.id));
  });

  readonly availableAlleles = computed(() => {
    const released = new Set(this.availableGenes().map((gene) => gene.id));
    return ALLELE_VAULT_ALLELES.filter((allele) => released.has(allele.geneId));
  });

  readonly availableDragons = computed(
    () => this.accountLibrary.recordsFor(this.studentId()).dragons,
  );
}
