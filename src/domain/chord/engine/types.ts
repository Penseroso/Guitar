import type { DemandRecord } from './demandContract';
import type { VocabularyMatch } from './vocabularyContract';
// Logical contracts. Packed execution representations are separate.
export type StringIndex = 0 | 1 | 2 | 3 | 4 | 5; // physical order: high E side first
export type Six<T> = readonly [T, T, T, T, T, T];
export type StringState = -1 | number; // validated integer: -1 unplayed, 0 open, >0 stopped
export type ToneId = string;           // canonical token in the versioned formula
export type AllocationId = string;     // canonical reversible serialization, not a hash alone
export type VersionKey = string;

export interface InstrumentSpec {
  kind: 'six-single-strings-12edo';
  tuningMidi: Six<number>;       // integer 0..127, actual sounding pitch
  maxModeledFret: number;        // integer 0..36; default 15, not measured hardware
  // Physical string identities do not change when MIDI order crosses.
}
export interface StructuralRequest {
  version: 'structural-v1';
  instrument: InstrumentSpec;
  fretDomains: Six<readonly number[]>; // sorted, unique, within modeled bounds; mute always an option
  formulaKey: VersionKey;
  rootPitchClass: number;
  allowed: readonly ToneId[];
  required: readonly ToneId[];
  minDistinctPitchClasses: number;
  predicates: readonly StructuralPredicate[]; // closed discriminated union from §5.3
}
export interface ResolvedRequest {
  requestKey: VersionKey;
  structural: StructuralRequest;
  interpretation: {
    chordId: string; rootPitchClass: number;
    slashBassPitchClass?: number; // retained intent as well as compiled bass predicate
    formula: readonly { id: ToneId; interval: number; role: string }[];
    realization: 'identity' | 'partial'; context: 'standalone' | 'accompaniment';
    policyVersion: 'identity-v1';
  };
  physicalProfile: PhysicalProfile;
  origins: readonly { field: string; origin: 'user' | 'default' | 'preset'; rule: string }[];
}
export interface StructuralCandidate {
  allocationId: AllocationId;
  requestKey: VersionKey;
  states: Six<StringState>;
  // instrument+states are canonical; MIDI and coverage below are verified derivatives.
  sounding: readonly { string: StringIndex; fret: number; midi: number; tone: ToneId }[];
  covered: readonly ToneId[];
  omittedFormula: readonly ToneId[];
  // No playable, physical status, score, fingers, or popularity fields.
}
export interface PhysicalProfile {
  key: VersionKey;
  screenVersion: 'physical-screen-v1';
  numericVersion: 'geometry-um-v1';
  scaleLengthUm: number;         // integer 1..2,000,000; default 647,700
  scaleSource: 'default' | 'declared' | 'measured';
  scope: 'generic-static-fretting' | 'restricted-or-personalized';
  allowedThumb: boolean;         // default false
  omittedStrings: 'unplayed' | 'require-left-hand-damping';
  warningSpanUm: number;         // default 95,000; envelope, not proof
  severeSpanUm: number;          // default 180,000; >= warningSpanUm
  handProfileRef?: string;       // missing analysis of a requested profile => UNCERTAIN
}
export interface Evidence {
  id: string;
  kind: 'heuristic-screen' | 'conditional-witness' | 'exclusion-certificate'
      | 'unsupported-operation' | 'unresolved-analysis' | 'source-provenance';
  methodVersion: string; profileKey: VersionKey; allocationId: AllocationId;
  assumptions: readonly string[];
  sourceRef?: string; sourceHash?: string;
  // A certificate/witness additionally carries a versioned payload and verifier result.
  artifact?: { schema: string; hash: string; scopeKey: string; verified: boolean };
}
export interface PhysicalAssessment {
  allocationId: AllocationId; profileKey: VersionKey;
  status: 'PASS' | 'UNCERTAIN' | 'REJECT';
  basis: 'heuristic-screen' | 'abstention' | 'certified-exclusion';
  reasonCodes: readonly PhysicalReason[];
  metrics: {
    stoppedWireSpanUm: number;
    partialCoverGroups: number; // partial-cover-v1, never an actual finger count
    thumbFallback?: { reliedOn: boolean; nonThumbGroups: number; nonThumbSpanUm: number };
  };
  evidence: readonly Evidence[];
  humanValidation: 'absent';   // current production capability; never inferred from notation
}
export type SurvivorAssessment = PhysicalAssessment & { status: 'PASS' | 'UNCERTAIN' };
export interface RankableCandidate {
  structural: StructuralCandidate;
  physical: SurvivorAssessment;  // pass-through metadata, inaccessible to scorer formula
  features: ClassicFeaturesV1;   // immutable, explicitly named factual/heuristic inputs
}
export interface LedgerTerm {
  id: string; active: boolean;
  inputs: Readonly<Record<string, number | boolean | string>>;
  featureVersion: string;
  interpretation: 'engineering-heuristic' | 'musical-convention' | 'product-preference';
  numerator: number; denominator: 110000;
  reasonCode: string;             // localized prose generated separately
}
export interface RankRecord {
  allocationId: AllocationId;
  policy: 'classic-v1'; numericVersion: 'rank-int-v1';
  scoreNumerator: number; denominator: 110000;
  tie: Six<StringState>;
  ledger: readonly LedgerTerm[];  // materialize on demand, exact sum equals numerator
}
export interface PresentationCandidate {
  candidate: StructuralCandidate;
  physical: SurvivorAssessment;
  facts: FactualDescriptor;
  rank: RankRecord;
  displayRank: number | null; // null until exact page; distinct from preference score
  labels: readonly string[];
  demand: DemandRecord;
  vocabulary: VocabularyMatch;
  recommendation: {version:'recommended-surface-v2';eligible:boolean};
}

export type Extreme = { tone: ToneId } | { pitchClass: number } | { midi: number };
export type Subset =
  | { kind: 'unrestricted' }
  | { kind: 'essential-tones' }
  | { kind: 'close-position'; toneIds: readonly ToneId[] }
  | { kind: 'drop-2' | 'drop-3'; toneIds?: readonly ToneId[] }; // compiler resolves four-token default
export type StructuralPredicate =
  | { kind: 'sounding-count'; count: number }
  | { kind: 'allowed-strings' | 'exact-strings'; strings: readonly StringIndex[] }
  | { kind: 'open'; mode: 'require' | 'exclude' }
  | { kind: 'root'; mode: 'include' | 'omit' }
  | { kind: 'formula-coverage'; mode: 'complete' | 'omissions' }
  | { kind: 'bass' | 'top'; value: Extreme }
  | { kind: 'stopped-position'; low: number; high: number }
  | { kind: 'subset'; value: Subset }
  | { kind: 'legacy-bass-subset'; tone: ToneId }; // adapter only, never new UI input
export type PhysicalReason =
  | 'groups-over-four' | 'groups-over-five' | 'span-over-warning' | 'span-over-severe'
  | 'thumb-fallback-relied-on' | 'unsupported-damping' | 'unsupported-profile'
  | 'unsupported-operation' | 'unresolved-screen' | 'conflicting-evidence';
export interface SearchIntent {
  schema: 'intent-v1'; chordId: string; rootPitchClass: number;
  context?: 'standalone' | 'accompaniment'; // default standalone
  instrument?: InstrumentSpec;             // default standard, maxModeledFret 15
  fretDomains?: Six<readonly number[]>;    // default 0..maxModeledFret on each string
  realization?:
    | { kind: 'identity'; additionalRequired?: readonly ToneId[]; allowedToneIds?: readonly ToneId[] }
    | { kind: 'partial'; requiredToneIds: readonly ToneId[]; allowedToneIds: readonly ToneId[] };
  // Root is orthogonal to the non-root required list above; including '1' there is
  // an explicit root requirement and conflicts with an explicit optional/excluded setting.
  rootMode?: 'required' | 'optional' | 'excluded';
  minDistinctPitchClasses?: number;
  excludedToneIds?: readonly ToneId[];
  completeFormula?: boolean;
  slashBassPitchClass?: number;
  subset?: Subset;
  requirements?: readonly StructuralPredicate[]; // legacy-bass-subset disallowed here
  physical?: Partial<Omit<PhysicalProfile, 'key' | 'screenVersion' | 'numericVersion'>>;
}
export interface ViewRequest {
  schema: 'view-v1';
  position: { low: number; high: number } | null;
  soundingCount: number | null;
  stringSet: { mode: 'allowed' | 'exact'; strings: readonly StringIndex[] } | null;
  open: 'any' | 'require' | 'exclude'; root: 'any' | 'include' | 'omit';
  coverage: 'any' | 'complete' | 'omissions';
  bass: Extreme | null; top: Extreme | null;
  statuses: readonly ('PASS' | 'UNCERTAIN')[]; // default both; never empty
  order: { kind: 'classic' } | { kind: 'near-position'; targetFret: number };
}
export interface FactualDescriptor {
  soundingStrings: readonly StringIndex[]; soundingCount: number; openCount: number;
  covered: readonly ToneId[]; omittedFormula: readonly ToneId[];
  missingRequired: readonly ToneId[]; // always empty for an accepted structural candidate
  bass: { midi: number; tone: ToneId; strings: readonly StringIndex[] };
  top: { midi: number; tone: ToneId; strings: readonly StringIndex[] };
  rootStrings: readonly StringIndex[];
  stoppedPosition: { min: number; max: number } | null;
  pitchSpanSemitones: number; stoppedWireSpanUm: number;
  contiguousStrings: boolean;
}
export interface ClassicFeaturesV1 {
  version: 'legacy-rank-features-v1';
  spanUm: number; wholeFretGroups: number; largestBarreContacts: number;
  diagonalPattern: boolean;
  adjacentInternalGaps: number; isolatedInternalGaps: number; openFlankedIsolatedGaps: number;
  maxStoppedFret: number; openCount: number; soundingCount: number;
  rootPresent: boolean; rootHint: 'match' | 'miss' | 'absent';
  rootBass: boolean; representativeBassString: StringIndex;
  hasExplicitSlash: boolean;
  optionalCoveredCount: number;
  legacyTechnique: 'Shell' | 'Barre' | 'Open' | 'Standard';
  unplayedCoreStringCount: number;
}
