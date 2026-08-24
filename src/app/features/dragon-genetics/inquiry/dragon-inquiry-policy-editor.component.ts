import { Component, inject, output, signal } from '@angular/core';

import { DragonAdaptiveStore } from '../adaptive/dragon-adaptive.store';
import { DragonAssignment } from '../adaptive/dragon-simulation.models';
import { DRAGON_PROJECT_HUB_DEFINITION } from '../project/dragon-project-hub.definition';
import { GeneticsSkill } from '../dragon-genetics.models';
import { DRAGON_CONCEPTS, conceptsForSkill } from './concept.registry';
import { DRAGON_INQUIRY_BANK, itemsForConcept, uncoveredConcepts } from './inquiry-bank';
import { INSTRUMENT_MANIFESTS } from './instrument.registry';
import { DEFAULT_INQUIRY_SETTINGS, normalizeInquirySettings } from './inquiry-policy';
import {
  Concept,
  ConceptId,
  CoverageMode,
  HintPolicy,
  InquiryItem,
  InquiryPolicy,
  InquirySettings,
  RepeatMissStrategy,
} from './inquiry.models';

/** Teacher-facing editor for adaptive question selection and instrument probe availability. */
@Component({
  selector: 'app-dragon-inquiry-policy-editor',
  templateUrl: './dragon-inquiry-policy-editor.component.html',
  styleUrl: '../dragon-teacher.page.scss',
})
export class DragonInquiryPolicyEditorComponent {
  private readonly adaptiveStore = inject(DragonAdaptiveStore);
  readonly saveMessage = output<string>();
  readonly masterySkills: readonly { id: GeneticsSkill; title: string }[] = [
    ...new Set(DRAGON_CONCEPTS.map((concept) => concept.skillId)),
  ]
    .sort()
    .map((id) => ({
      id,
      title:
        DRAGON_PROJECT_HUB_DEFINITION.masterySkills.find((skill) => skill.id === id)?.title ?? id,
    }));
  readonly coverageModes: readonly CoverageMode[] = [
    'weakness-first',
    'concept-first',
    'balanced',
  ];
  readonly repeatMissStrategies: readonly RepeatMissStrategy[] = [
    'different-probe',
    'same-probe',
    'prerequisite-first',
  ];
  readonly hintPolicies: readonly HintPolicy[] = ['level', 'always', 'never', 'after-miss'];
  readonly instruments = INSTRUMENT_MANIFESTS;
  readonly expandedSkill = signal<GeneticsSkill | null>(null);

  inquirySettings(): InquirySettings {
    return this.adaptiveStore.assignment().inquirySettings ?? DEFAULT_INQUIRY_SETTINGS;
  }

  inquiryPolicy(): InquiryPolicy {
    return this.inquirySettings().policy;
  }

  conceptsFor(skillId: GeneticsSkill): readonly Concept[] {
    return conceptsForSkill(skillId);
  }

  toggleSkillPanel(skillId: GeneticsSkill): void {
    this.expandedSkill.update((current) => (current === skillId ? null : skillId));
  }

  bankItemsFor(conceptId: ConceptId): readonly InquiryItem[] {
    return itemsForConcept(conceptId);
  }

  conceptEnabled(conceptId: ConceptId): boolean {
    return this.inquirySettings().conceptSettings[conceptId]?.enabled !== false;
  }

  conceptPriority(conceptId: ConceptId): number {
    return this.inquirySettings().conceptSettings[conceptId]?.priority ?? 0;
  }

  itemDisabled(itemId: string): boolean {
    return this.inquirySettings().disabledItemIds.includes(itemId);
  }

  itemPinned(itemId: string): boolean {
    return this.inquirySettings().pinnedItemIds.includes(itemId);
  }

  probeDisabled(probeId: string): boolean {
    return this.inquirySettings().disabledProbeIds.includes(probeId);
  }

  coverageGaps(): readonly ConceptId[] {
    return uncoveredConcepts(this.adaptiveStore.assignment().defaultLevel);
  }

  bankSize(): number {
    return DRAGON_INQUIRY_BANK.length + this.inquirySettings().authoredItems.length;
  }

  conceptCount(): number {
    return DRAGON_CONCEPTS.length;
  }

  async setPolicyFlag(key: keyof InquiryPolicy, value: boolean): Promise<void> {
    await this.updatePolicy({ [key]: value } as Partial<InquiryPolicy>);
  }

  async setPolicyNumber(key: keyof InquiryPolicy, value: string): Promise<void> {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      await this.updatePolicy({ [key]: parsed } as Partial<InquiryPolicy>);
    }
  }

  async setPolicyChoice(key: keyof InquiryPolicy, value: string): Promise<void> {
    await this.updatePolicy({ [key]: value } as unknown as Partial<InquiryPolicy>);
  }

  async toggleConcept(conceptId: ConceptId): Promise<void> {
    const enabled = this.conceptEnabled(conceptId);
    await this.changeInquiry((settings) => ({
      ...settings,
      conceptSettings: {
        ...settings.conceptSettings,
        [conceptId]: { ...settings.conceptSettings[conceptId], enabled: !enabled },
      },
    }));
  }

  async setConceptPriority(conceptId: ConceptId, value: string): Promise<void> {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return;
    await this.changeInquiry((settings) => ({
      ...settings,
      conceptSettings: {
        ...settings.conceptSettings,
        [conceptId]: { ...settings.conceptSettings[conceptId], priority: parsed },
      },
    }));
  }

  async toggleItemDisabled(itemId: string): Promise<void> {
    await this.changeInquiry((settings) => ({
      ...settings,
      disabledItemIds: toggle(settings.disabledItemIds, itemId),
      pinnedItemIds: settings.pinnedItemIds.filter((id) => id !== itemId),
    }));
  }

  async toggleItemPinned(itemId: string): Promise<void> {
    await this.changeInquiry((settings) => ({
      ...settings,
      pinnedItemIds: toggle(settings.pinnedItemIds, itemId),
      disabledItemIds: settings.disabledItemIds.filter((id) => id !== itemId),
    }));
  }

  async toggleProbe(probeId: string): Promise<void> {
    await this.changeInquiry((settings) => ({
      ...settings,
      disabledProbeIds: toggle(settings.disabledProbeIds, probeId),
    }));
  }

  async resetInquirySettings(): Promise<void> {
    await this.changeInquiry(() => DEFAULT_INQUIRY_SETTINGS);
  }

  private async updatePolicy(patch: Partial<InquiryPolicy>): Promise<void> {
    await this.changeInquiry((settings) => ({
      ...settings,
      policy: { ...settings.policy, ...patch },
    }));
  }

  private async changeInquiry(
    change: (settings: InquirySettings) => InquirySettings,
  ): Promise<void> {
    await this.changeAssignment((assignment) => ({
      ...assignment,
      inquirySettings: normalizeInquirySettings(
        change(assignment.inquirySettings ?? DEFAULT_INQUIRY_SETTINGS),
      ),
    }));
  }

  private async changeAssignment(
    change: (assignment: DragonAssignment) => DragonAssignment,
  ): Promise<void> {
    const assignment = this.adaptiveStore.assignment();
    const next = change({ ...assignment, assignmentVersion: assignment.assignmentVersion + 1 });
    this.saveMessage.emit('Saving assignment…');
    try {
      await this.adaptiveStore.saveAssignment(next);
      this.saveMessage.emit(`Assignment v${next.assignmentVersion} saved.`);
    } catch {
      this.saveMessage.emit('Assignment could not be saved. Check teacher permissions.');
    }
  }
}

function toggle(list: readonly string[], id: string): string[] {
  return list.includes(id) ? list.filter((item) => item !== id) : [...list, id];
}
