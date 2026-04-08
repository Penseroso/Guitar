import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { buildChordDefinitionFromRegistryEntry, buildChordTonesFromRegistryEntry } from '../../../utils/guitar/chords';
import { resolveVoicingTemplate } from '../../../utils/guitar/chords/resolver';
import type { VoicingCandidate } from '../../../utils/guitar/chords/types';
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
                chordSelectorGroups={[{
                    id: 'triad',
                    label: 'Triads',
                    options: [{ id: 'major', stateValue: 'major', label: 'maj' }],
                }]}
                chordPreviewTitle="C"
                activeFutureCandidate={candidate}
                activeFuturePresentation={getVoicingPresentationMeta(candidate.voicing)}
                fretboardContainerRef={{ current: null }}
                tuning={[4, 9, 2, 7, 11, 4]}
                activeNotes={[]}
                rootNote={0}
                chordTones={[]}
                modifierNotes={[]}
                showChordTones={false}
                showIntervals={false}
                onToggleIntervals={() => {}}
                fingering={undefined}
                futureVoicingCandidates={[candidate]}
                onSelectFutureVoicing={() => {}}
                activeFutureVoicingId={candidate.voicing.id}
            />
        );

        expect(markup).not.toContain('Playable');
        expect(markup).toContain('Open');
        expect(markup).not.toContain('Harmonic Context');
        expect(markup).not.toContain('Curated QA');
    });

    it('renders voicing choices in the order provided by the chord-mode boundary', () => {
        const firstCandidate = buildWorkspaceCandidate(10, 'workspace-first');
        const secondCandidate = buildWorkspaceCandidate(8, 'workspace-second');
        firstCandidate.voicing.minFret = 10;
        secondCandidate.voicing.minFret = 8;
        const markup = renderToStaticMarkup(
            <ChordModeWorkspace
                chordType="major"
                onChordTypeChange={() => {}}
                chordSelectorGroups={[{
                    id: 'triad',
                    label: 'Triads',
                    options: [{ id: 'major', stateValue: 'major', label: 'maj' }],
                }]}
                chordPreviewTitle="C"
                activeFutureCandidate={firstCandidate}
                activeFuturePresentation={getVoicingPresentationMeta(firstCandidate.voicing)}
                fretboardContainerRef={{ current: null }}
                tuning={[4, 9, 2, 7, 11, 4]}
                activeNotes={[]}
                rootNote={0}
                chordTones={[]}
                modifierNotes={[]}
                showChordTones={false}
                showIntervals={false}
                onToggleIntervals={() => {}}
                fingering={undefined}
                futureVoicingCandidates={[firstCandidate, secondCandidate]}
                onSelectFutureVoicing={() => {}}
                activeFutureVoicingId={firstCandidate.voicing.id}
            />
        );

        expect(markup.indexOf('10fr')).toBeLessThan(markup.lastIndexOf('8fr'));
    });

    it('renders grouped compact selector sections on one screen', () => {
        const candidate = buildWorkspaceCandidate();
        const markup = renderToStaticMarkup(
            <ChordModeWorkspace
                chordType="dominant-11"
                onChordTypeChange={() => {}}
                chordSelectorGroups={[
                    {
                        id: 'triad',
                        label: 'Triads',
                        options: [
                            { id: 'major', stateValue: 'major', label: 'maj' },
                            { id: 'minor', stateValue: 'minor', label: 'm' },
                        ],
                    },
                    {
                        id: 'extended',
                        label: 'Extended',
                        options: [
                            { id: 'dominant-9', stateValue: 'dominant-9', label: '9' },
                            { id: 'dominant-11', stateValue: 'dominant-11', label: '11' },
                            { id: 'dominant-13', stateValue: 'dominant-13', label: '13' },
                        ],
                    },
                ]}
                chordPreviewTitle="C11"
                activeFutureCandidate={candidate}
                activeFuturePresentation={getVoicingPresentationMeta(candidate.voicing)}
                fretboardContainerRef={{ current: null }}
                tuning={[4, 9, 2, 7, 11, 4]}
                activeNotes={[]}
                rootNote={0}
                chordTones={[]}
                modifierNotes={[]}
                showChordTones={false}
                showIntervals={false}
                onToggleIntervals={() => {}}
                fingering={undefined}
                futureVoicingCandidates={[candidate]}
                onSelectFutureVoicing={() => {}}
                activeFutureVoicingId={candidate.voicing.id}
            />
        );

        expect(markup).toContain('Triads');
        expect(markup).toContain('Extended');
        expect(markup).toContain('11');
    });

    it('renders compact diagram previews in the voicing gallery', () => {
        const candidate = buildWorkspaceCandidate();
        const markup = renderToStaticMarkup(
            <ChordModeWorkspace
                chordType="major"
                onChordTypeChange={() => {}}
                chordSelectorGroups={[{
                    id: 'triad',
                    label: 'Triads',
                    options: [{ id: 'major', stateValue: 'major', label: 'maj' }],
                }]}
                chordPreviewTitle="C"
                activeFutureCandidate={candidate}
                activeFuturePresentation={getVoicingPresentationMeta(candidate.voicing)}
                fretboardContainerRef={{ current: null }}
                tuning={[4, 9, 2, 7, 11, 4]}
                activeNotes={[]}
                rootNote={0}
                chordTones={[]}
                modifierNotes={[]}
                showChordTones={false}
                showIntervals={false}
                onToggleIntervals={() => {}}
                fingering={undefined}
                futureVoicingCandidates={[candidate]}
                onSelectFutureVoicing={() => {}}
                activeFutureVoicingId={candidate.voicing.id}
            />
        );

        expect(markup).toContain('diagram');
        expect(markup).not.toContain('Recommended');
    });
});
