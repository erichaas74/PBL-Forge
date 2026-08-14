import { DragonSex } from '../../simulation/domain/dragon-expressive-genome';
import { DragonTraitId } from '../../simulation/domain/dragon-lab.models';
import { DragonParentProfile } from '../../simulation/domain/dragon-lab.models';

export type AccountGeneticsRecord = AccountDragonRecord | AccountChromosomeRecord;

export interface AccountDragonRecord extends DragonParentProfile {
  kind: 'dragon';
  sex: DragonSex;
  source: 'foundation' | 'student';
  storedAtIso: string;
}

export interface AccountChromosomeRecord {
  kind: 'chromosome';
  id: string;
  dragonId: string;
  dragonName: string;
  chromosome: string;
  traitId: DragonTraitId;
  traitName: string;
  alleles: readonly [string, string];
  storedAtIso: string;
}

export interface AccountGeneticsLibrarySnapshot {
  studentId: string;
  dragons: readonly AccountDragonRecord[];
  chromosomes: readonly AccountChromosomeRecord[];
}

export interface StoredAccountGeneticsLibrary {
  schemaVersion: 1;
  studentId: string;
  dragons: readonly AccountDragonRecord[];
}

export const ACCOUNT_GENETICS_RECORD_DRAG_TYPE = 'application/x-pbl-genetics-account-record';

export interface AccountGeneticsDragPayload {
  kind: AccountGeneticsRecord['kind'];
  id: string;
}

export function accountGeneticsDragPayload(
  record: AccountGeneticsRecord,
): AccountGeneticsDragPayload {
  return { kind: record.kind, id: record.id };
}

export function parseAccountGeneticsDragPayload(value: string): AccountGeneticsDragPayload | null {
  try {
    const candidate = JSON.parse(value) as Partial<AccountGeneticsDragPayload>;
    if (
      (candidate.kind === 'dragon' || candidate.kind === 'chromosome') &&
      typeof candidate.id === 'string'
    ) {
      return { kind: candidate.kind, id: candidate.id };
    }
  } catch {
    // Native drag payloads are untrusted browser input; an invalid payload is simply ignored.
  }
  return null;
}
