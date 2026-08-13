import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import {
  ACCOUNT_GENETICS_RECORD_DRAG_TYPE,
  AccountGeneticsRecord,
  accountGeneticsDragPayload,
} from './account-genetics-library.models';
import { AccountGeneticsLibraryService } from './account-genetics-library.service';

@Component({
  selector: 'app-account-genetics-file',
  templateUrl: './account-genetics-file.component.html',
  styleUrl: './account-genetics-file.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountGeneticsFileComponent {
  private readonly library = inject(AccountGeneticsLibraryService);

  readonly studentId = input('local-student');
  readonly selectedRecordId = input<string | null>(null);
  readonly recordSelected = output<AccountGeneticsRecord>();

  readonly open = signal(true);
  readonly tab = signal<AccountGeneticsRecord['kind']>('dragon');
  readonly snapshot = computed(() => this.library.recordsFor(this.studentId()));
  readonly visibleRecords = computed<readonly AccountGeneticsRecord[]>(() =>
    this.tab() === 'dragon' ? this.snapshot().dragons : this.snapshot().chromosomes,
  );

  select(record: AccountGeneticsRecord): void {
    this.recordSelected.emit(record);
  }

  startDrag(event: DragEvent, record: AccountGeneticsRecord): void {
    if (!event.dataTransfer) return;
    event.dataTransfer.effectAllowed = 'copy';
    event.dataTransfer.setData(
      ACCOUNT_GENETICS_RECORD_DRAG_TYPE,
      JSON.stringify(accountGeneticsDragPayload(record)),
    );
    event.dataTransfer.setData('text/plain', `${record.kind}:${record.id}`);
  }

  recordTitle(record: AccountGeneticsRecord): string {
    return record.kind === 'dragon' ? record.name : `${record.dragonName} · ${record.chromosome}`;
  }

  recordDetail(record: AccountGeneticsRecord): string {
    return record.kind === 'dragon'
      ? record.title
      : `${record.traitName} · ${record.alleles.join('/')}`;
  }
}
