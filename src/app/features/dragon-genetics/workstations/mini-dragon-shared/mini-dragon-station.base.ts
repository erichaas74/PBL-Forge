import { Directive, effect, inject, input, untracked } from '@angular/core';
import { MiniDragonKennelStore } from '../companion-show/mini-dragon-kennel.store';

/**
 * What every mini dragon station shares: the one programme, and a thin surface
 * onto it for the template.
 *
 * The four stations are separate routes over a single breeding programme, so the
 * state lives in `MiniDragonKennelStore` and each station borrows the slice its
 * template names. Forwarding the store's members here — rather than writing
 * `store.x()` through four templates — keeps the markup reading as the domain
 * rather than as plumbing, and means a station only has to declare what is
 * genuinely its own (its viewports, its motions).
 */
@Directive()
export abstract class MiniDragonStationComponent {
  protected readonly store = inject(MiniDragonKennelStore);

  readonly studentId = input.required<string>();
  abstract readonly goal: unknown;

  readonly litterSizes = this.store.litterSizes;
  readonly pairRoles = this.store.pairRoles;
  readonly founders = this.store.founders;
  readonly breeds = this.store.breeds;
  readonly showDivisions = this.store.showDivisions;
  readonly trainingSkills = this.store.trainingSkills;
  readonly rareTraitTargets = this.store.rareTraitTargets;
  readonly trainingLevelMax = this.store.trainingLevelMax;
  readonly minCitedLitters = this.store.minCitedLitters;
  readonly minGenerations = this.store.minGenerations;
  readonly breedName = this.store.breedName;
  readonly selectedBreedId = this.store.selectedBreedId;
  readonly targets = this.store.targets;
  readonly kennelFounderIds = this.store.kennelFounderIds;
  readonly pairIds = this.store.pairIds;
  readonly litterSize = this.store.litterSize;
  readonly litters = this.store.litters;
  readonly nextRunNumber = this.store.nextRunNumber;
  readonly championId = this.store.championId;
  readonly showDivisionId = this.store.showDivisionId;
  readonly trainingSessions = this.store.trainingSessions;
  readonly showRuns = this.store.showRuns;
  readonly rareTraitGeneId = this.store.rareTraitGeneId;
  readonly rareCandidateIds = this.store.rareCandidateIds;
  readonly selectedTrainingDragonId = this.store.selectedTrainingDragonId;
  readonly trainingInProgress = this.store.trainingInProgress;
  readonly championshipInProgress = this.store.championshipInProgress;
  readonly citedLitterIds = this.store.citedLitterIds;
  readonly claim = this.store.claim;
  readonly registry = this.store.registry;
  readonly activeLitterId = this.store.activeLitterId;
  readonly selectedPupId = this.store.selectedPupId;
  readonly statusMessage = this.store.statusMessage;
  readonly kennelById = this.store.kennelById;
  readonly kennel = this.store.kennel;
  readonly materializedLitters = this.store.materializedLitters;
  readonly rareTraitTarget = this.store.rareTraitTarget;
  readonly pedigreePopulation = this.store.pedigreePopulation;
  readonly pedigreeGenerations = this.store.pedigreeGenerations;
  readonly rareTraitFoundCount = this.store.rareTraitFoundCount;
  readonly standardRows = this.store.standardRows;
  readonly standardSummary = this.store.standardSummary;
  readonly selectedBreed = this.store.selectedBreed;
  readonly selectedBreedSource = this.store.selectedBreedSource;
  readonly selectedBreedPlans = this.store.selectedBreedPlans;
  readonly selectedBreedFounderLeads = this.store.selectedBreedFounderLeads;
  readonly dam = this.store.dam;
  readonly sire = this.store.sire;
  readonly pairReady = this.store.pairReady;
  readonly damSource = this.store.damSource;
  readonly sireSource = this.store.sireSource;
  readonly activeLitter = this.store.activeLitter;
  readonly nurseryPups = this.store.nurseryPups;
  readonly selectedPup = this.store.selectedPup;
  readonly standSource = this.store.standSource;
  readonly standFeatures = this.store.standFeatures;
  readonly standShowCard = this.store.standShowCard;
  readonly bloodline = this.store.bloodline;
  readonly founderLines = this.store.founderLines;
  readonly generations = this.store.generations;
  readonly citedLitters = this.store.citedLitters;
  readonly consistency = this.store.consistency;
  readonly champion = this.store.champion;
  readonly championSource = this.store.championSource;
  readonly championShowCard = this.store.championShowCard;
  readonly championRibbons = this.store.championRibbons;
  readonly championCandidates = this.store.championCandidates;
  readonly showDivision = this.store.showDivision;
  readonly divisionTargetLabels = this.store.divisionTargetLabels;
  readonly trainingDragon = this.store.trainingDragon;
  readonly trainingSource = this.store.trainingSource;
  readonly activeTrainingLevels = this.store.activeTrainingLevels;
  readonly latestShowRun = this.store.latestShowRun;
  readonly canEnterShow = this.store.canEnterShow;
  readonly evidenceChecks = this.store.evidenceChecks;
  readonly canRegister = this.store.canRegister;

  readonly selectBreedReference = this.store.selectBreedReference.bind(this.store);
  readonly applyBreedStandard = this.store.applyBreedStandard.bind(this.store);
  readonly isBreedStandardActive = this.store.isBreedStandardActive.bind(this.store);
  readonly setBreedName = this.store.setBreedName.bind(this.store);
  readonly setTarget = this.store.setTarget.bind(this.store);
  readonly adoptFounder = this.store.adoptFounder.bind(this.store);
  readonly founderPreview = this.store.founderPreview.bind(this.store);
  readonly allowDrop = this.store.allowDrop.bind(this.store);
  readonly dropOnPair = this.store.dropOnPair.bind(this.store);
  readonly startCompanionDrag = this.store.startCompanionDrag.bind(this.store);
  readonly assignToPair = this.store.assignToPair.bind(this.store);
  readonly clearPair = this.store.clearPair.bind(this.store);
  readonly setLitterSize = this.store.setLitterSize.bind(this.store);
  readonly whelp = this.store.whelp.bind(this.store);
  readonly openLitter = this.store.openLitter.bind(this.store);
  readonly selectPup = this.store.selectPup.bind(this.store);
  readonly togglePupKept = this.store.togglePupKept.bind(this.store);
  readonly setRareTraitGene = this.store.setRareTraitGene.bind(this.store);
  readonly pedigreeEvidenceFor = this.store.pedigreeEvidenceFor.bind(this.store);
  readonly pedigreeTraitLabel = this.store.pedigreeTraitLabel.bind(this.store);
  readonly toggleRareCandidate = this.store.toggleRareCandidate.bind(this.store);
  readonly isRareCandidate = this.store.isRareCandidate.bind(this.store);
  readonly isInKennel = this.store.isInKennel.bind(this.store);
  readonly keepPedigreeCandidate = this.store.keepPedigreeCandidate.bind(this.store);
  readonly pedigreeParentNames = this.store.pedigreeParentNames.bind(this.store);
  readonly releaseCompanion = this.store.releaseCompanion.bind(this.store);
  readonly setShowDivision = this.store.setShowDivision.bind(this.store);
  readonly selectTrainingDragon = this.store.selectTrainingDragon.bind(this.store);
  readonly trainingLevel = this.store.trainingLevel.bind(this.store);
  readonly trainingLevelLabel = this.store.trainingLevelLabel.bind(this.store);
  readonly recordTrainingSession = this.store.recordTrainingSession.bind(this.store);
  readonly enterShow = this.store.enterShow.bind(this.store);
  readonly selectChampion = this.store.selectChampion.bind(this.store);
  readonly canCite = this.store.canCite.bind(this.store);
  readonly isCited = this.store.isCited.bind(this.store);
  readonly toggleCitation = this.store.toggleCitation.bind(this.store);
  readonly setClaim = this.store.setClaim.bind(this.store);
  readonly registerBreed = this.store.registerBreed.bind(this.store);
  readonly matchesFor = this.store.matchesFor.bind(this.store);
  readonly matchedCountFor = this.store.matchedCountFor.bind(this.store);
  readonly meetsCurrentStandard = this.store.meetsCurrentStandard.bind(this.store);
  readonly ribbonsFor = this.store.ribbonsFor.bind(this.store);
  readonly paintFor = this.store.paintFor.bind(this.store);
  readonly standardLabel = this.store.standardLabel.bind(this.store);
  readonly divisionLabel = this.store.divisionLabel.bind(this.store);
  readonly parentNames = this.store.parentNames.bind(this.store);
  readonly isPaired = this.store.isPaired.bind(this.store);
  readonly isAdopted = this.store.isAdopted.bind(this.store);

  constructor() {
    effect(() => {
      const studentId = this.studentId();
      // ensureRestored writes the signals the kennel is derived from; tracking
      // them here would re-enter this effect on every litter.
      untracked(() => this.store.ensureRestored(studentId));
    });
  }
}
