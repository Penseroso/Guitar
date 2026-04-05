import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { buildChordDefinitionFromRegistryEntry, buildChordTonesFromRegistryEntry } from '../../../utils/guitar/chords';
import { resolveVoicingTemplate } from '../../../utils/guitar/chords/resolver';
import type { VoicingCandidate } from '../../../utils/guitar/chords/types';
import type { ProgressionHandoffPayload } from '../../../utils/guitar/chords';
import { getVoicingPresentationMeta } from '../chord-preview/voicing-labels';
import { ChordModeWorkspace } from './ChordModeWorkspace';

function buildWorkspaceCandidate(rootFret = 3, id = 'workspace-major'): VoicingCandidate {
    const chord = buildChordDefinitionFromRegistryEntry('major', 0);
    const tones = buildChordTonesFromRegistryEntry('major', 0);
    const voicing = resolveVoicingTemplate(chord, tones, {
        id,
        label: 'workspace major',
        instrument: 'guitar',
        rootString: 4,
        source: 'generated',
        strings: [
            { string: 0, fretOffset: null },
            { string: 1, fretOffset: -2, toneDegree: '1' },
            { string: 2, fretOffset: -3, toneDegree: '5' },
            { string: 3, fretOffset: -1, toneDegree: '3' },
            { string: 4, fretOffset: 0, toneDegree: '1' },
            { string: 5, fretOffset: null },
        ],
    }, { rootFret });

    return {
        voicing,
        score: 100,
        reasons: [],
        matchedRequiredDegrees: ['1', '3', '5'],
        missingRequiredDegrees: [],
    };
}

describe('ChordModeWorkspace', () => {
    it('does not render a Playable badge in the normal chord workspace', () => {
        const candidate = buildWorkspaceCandidate();
        const markup = renderToStaticMarkup(
            <ChordModeWorkspace
                chordType="major"
                onChordTypeChange={() => {}}
                chordSelectorOptions={[{ id: 'major', stateValue: 'major', label: 'major' }]}
                chordPreviewTitle="C"
                activeFutureCandidate={candidate}
                activeFuturePresentation={getVoicingPresentationMeta(candidate.voicing)}
                futureVoicingSelection={{
                    activeCandidateId: candidate.voicing.id,
                    selectionSource: 'requested',
                }}
                fretboardContainerRef={{ current: null }}
                tuning={[4, 9, 2, 7, 11, 4]}
                activeNotes={[]}
                rootNote={0}
                chordTones={[]}
                modifierNotes={[]}
                showChordTones={false}
                showIntervals={false}
                fingering={undefined}
                futureVoicingCandidates={[candidate]}
                onSelectFutureVoicing={() => {}}
                activeFutureVoicingId={candidate.voicing.id}
                activeSelectedScaleId={null}
                onActiveVoicingChange={() => {}}
                onScaleSelect={() => {}}
                onPrepareProgressionHandoff={(_payload: ProgressionHandoffPayload) => {}}
                selectedKey={0}
                tonalContext={{
                    selectedKey: 0,
                    tonicPitchClass: 0,
                    scaleGroup: 'Diatonic Modes',
                    scaleName: 'Ionian',
                }}
                activePreparedChordWorkspaceHandoff={null}
                activeStagedProgression={null}
                activeDraftApplyMode="replace"
                onSelectDraftApplyMode={() => {}}
                onApplyPreparedChordWorkspaceHandoff={() => {}}
                onOpenProgressionWorkspace={() => {}}
                onClearPreparedChordWorkspaceHandoff={() => {}}
            />
        );

        expect(markup).not.toContain('Playable');
        expect(markup).toContain('Duplicated-root voicing');
    });

    it('renders voicing choices in ascending fretboard position order', () => {
        const higherCandidate = buildWorkspaceCandidate(8, 'workspace-high');
        const lowerCandidate = buildWorkspaceCandidate(3, 'workspace-low');
        const markup = renderToStaticMarkup(
            <ChordModeWorkspace
                chordType="major"
                onChordTypeChange={() => {}}
                chordSelectorOptions={[{ id: 'major', stateValue: 'major', label: 'major' }]}
                chordPreviewTitle="C"
                activeFutureCandidate={higherCandidate}
                activeFuturePresentation={getVoicingPresentationMeta(higherCandidate.voicing)}
                futureVoicingSelection={{
                    activeCandidateId: higherCandidate.voicing.id,
                    selectionSource: 'requested',
                }}
                fretboardContainerRef={{ current: null }}
                tuning={[4, 9, 2, 7, 11, 4]}
                activeNotes={[]}
                rootNote={0}
                chordTones={[]}
                modifierNotes={[]}
                showChordTones={false}
                showIntervals={false}
                fingering={undefined}
                futureVoicingCandidates={[higherCandidate, lowerCandidate]}
                onSelectFutureVoicing={() => {}}
                activeFutureVoicingId={higherCandidate.voicing.id}
                activeSelectedScaleId={null}
                onActiveVoicingChange={() => {}}
                onScaleSelect={() => {}}
                onPrepareProgressionHandoff={(_payload: ProgressionHandoffPayload) => {}}
                selectedKey={0}
                tonalContext={{
                    selectedKey: 0,
                    tonicPitchClass: 0,
                    scaleGroup: 'Diatonic Modes',
                    scaleName: 'Ionian',
                }}
                activePreparedChordWorkspaceHandoff={null}
                activeStagedProgression={null}
                activeDraftApplyMode="replace"
                onSelectDraftApplyMode={() => {}}
                onApplyPreparedChordWorkspaceHandoff={() => {}}
                onOpenProgressionWorkspace={() => {}}
                onClearPreparedChordWorkspaceHandoff={() => {}}
            />
        );

        expect(markup.indexOf('3fr')).toBeLessThan(markup.indexOf('8fr'));
    });
});
