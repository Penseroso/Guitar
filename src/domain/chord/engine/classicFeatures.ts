import { resolveChordRegistryEntry } from '../helpers';
import { legacyRequiredToneIds } from './catalog';
import { flatContactCompatible } from './contactHypotheses';
import { createGeometry, type Geometry } from './geometry';
import { EngineError } from './errors';
import { compileStructuralMatcher } from './structuralGenerator';
import type { ClassicFeaturesV1, ResolvedRequest, Six, StringIndex } from './types';

/** Pinned legacy facts: independent of physical verdicts and presentation labels. */
export function createClassicProjector(request: ResolvedRequest, geometry: Geometry = createGeometry(request.physicalProfile.scaleLengthUm)) {
    if (geometry.scaleLengthUm !== request.physicalProfile.scaleLengthUm) throw new EngineError('contract-error', 'Ranking geometry does not match the explicit request scale.');
    const entry = resolveChordRegistryEntry(request.interpretation.chordId);
    // The old registry retains diminished 6; canonical bb7 is pitch-identical here.
    const required = legacyRequiredToneIds(entry.formula.degrees);
    const root = request.structural.rootPitchClass;
    const requiredMask = entry.formula.degrees.reduce((mask, degree, index) => required.includes(degree)
        ? mask | (1 << ((root + entry.formula.intervals[index]) % 12)) : mask, 0);
    const optionalMask = entry.formula.degrees.reduce((mask, degree, index) => !required.includes(degree)
        ? mask | (1 << ((root + entry.formula.intervals[index]) % 12)) : mask, 0);
    const hints = entry.voicingHint?.rootStrings ?? [];
    const valid = compileStructuralMatcher(request.structural);
    const tuning = request.structural.instrument.tuningMidi;
    return (states: Six<number>): ClassicFeaturesV1 => {
        if (!valid(states)) throw new EngineError('contract-error', 'Ranking requires an allocation satisfying the resolved structural request.');
        const stoppedStrings: number[] = [];
        const roots: StringIndex[] = [];
        let covered = 0, soundingCount = 0, openCount = 0, maxStoppedFret = 0;
        let first = 6, last = -1, bassMidi = Infinity, representativeBassString: StringIndex = 0;
        for (let string = 0; string < 6; string++) {
            const fret = states[string];
            if (fret < 0) continue;
            soundingCount++; first = Math.min(first,string); last = string;
            const midi = tuning[string] + fret;
            covered |= 1 << (midi % 12);
            // Old production notes were low-E-first: stable MIDI ties chose index 5 first.
            if (midi <= bassMidi) { bassMidi = midi; representativeBassString = string as StringIndex; }
            if (midi % 12 === root) roots.push(string as StringIndex);
            if (fret === 0) openCount++;
            else { stoppedStrings.push(string); maxStoppedFret = Math.max(maxStoppedFret,fret); }
        }
        let wholeFretGroups = 0, largestBarreContacts = 0, barreStringMask = 0;
        for (const firstString of stoppedStrings) {
            const fret = states[firstString];
            if (stoppedStrings.some(string => string < firstString && states[string] === fret)) continue;
            const strings = stoppedStrings.filter(string => states[string] === fret);
            const isBarre = strings.length > 1 && flatContactCompatible(states,fret,strings[0],strings[strings.length-1]);
            wholeFretGroups += isBarre ? 1 : strings.length;
            if (isBarre) {
                largestBarreContacts = Math.max(largestBarreContacts,strings.length);
                for (const string of strings) barreStringMask |= 1 << string;
            }
        }
        const independent = stoppedStrings.filter(string => !(barreStringMask & (1 << string)));
        const step = independent.length >= 2 ? states[independent[1]] - states[independent[0]] : 0;
        const diagonalPattern = independent.length >= 2 && Math.abs(step) === 1
            && independent.every((string,index) => index === 0 || string === independent[index-1]+1 && states[string] - states[independent[index-1]] === step);
        let adjacentInternalGaps = 0, isolatedInternalGaps = 0, openFlankedIsolatedGaps = 0;
        for (let string = first+1; string < last; string++) {
            if (states[string] >= 0) continue;
            if (states[string-1] > 0 || states[string+1] > 0) adjacentInternalGaps++;
            else {
                isolatedInternalGaps++;
                if (states[string-1] === 0 && states[string+1] === 0) openFlankedIsolatedGaps++;
            }
        }
        let optionalCoveredCount = 0;
        for (let bits = covered & optionalMask; bits; bits &= bits-1) optionalCoveredCount++;
        const rootPresent = roots.length > 0;
        const shell = rootPresent && (covered & requiredMask) === requiredMask && optionalCoveredCount === 0
            && soundingCount <= required.length+1 && last-first <= 3;
        const legacyTechnique = shell ? 'Shell' : largestBarreContacts >= 3 && soundingCount >= 5 ? 'Barre' : openCount > 0 ? 'Open' : 'Standard';
        return Object.freeze({
            version: 'legacy-rank-features-v1', spanUm: geometry.stoppedSpan(states), wholeFretGroups,
            largestBarreContacts, diagonalPattern, adjacentInternalGaps, isolatedInternalGaps, openFlankedIsolatedGaps,
            maxStoppedFret, openCount, soundingCount, rootPresent,
            rootHint: !rootPresent || !hints.length ? 'absent' : roots.some(string => hints.includes(string)) ? 'match' : 'miss',
            rootBass: bassMidi % 12 === root, representativeBassString,
            hasExplicitSlash: request.interpretation.slashBassPitchClass !== undefined,
            optionalCoveredCount, legacyTechnique,
            unplayedCoreStringCount: [1,2,3].filter(string => states[string] < 0).length,
        });
    };
}
