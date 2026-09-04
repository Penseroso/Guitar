import { createHash } from 'node:crypto';

import { evaluateHandPlayability, type HandPlayabilityResult } from '../../src/domain/chord/fretGeometry';
import type { GuitarStringIndex } from '../../src/domain/chord/types';

export type EvidenceTier = 'occurrence' | 'corpus-strong' | 'corpus-very-strong' | 'reference-corroborated' | 'exploratory';
export type SplitName = 'training' | 'validation';

export interface ShapeObservation {
    frets: Array<number | null>; // engine order: high E (0) -> low E (5)
    chordId: string;
    rootPitchClass: number;
    songGroupId: string;
    artistToken: string;
    songSplit: SplitName;
    artistSplit: SplitName;
}

export interface ParsedOnset {
    instrument: string;
    frets: Array<number | null>;
    attackCount: number;
    hasDuplicateString: boolean;
}

export interface ShapeEvidence {
    signature: string;
    familySignature: string;
    frets: Array<number | null>;
    chordIds: Set<string>;
    roots: Set<number>;
    songs: Set<string>;
    knownArtists: Set<string>;
    trainingSongs: Set<string>;
    songValidationSongs: Set<string>;
    artistTrainingSongs: Set<string>;
    artistValidationSongs: Set<string>;
    observations: Map<string, Pick<ShapeObservation, 'artistToken' | 'chordId' | 'rootPitchClass' | 'songSplit' | 'artistSplit'>>;
    playability: HandPlayabilityResult;
}

export function sha256(value: string): string {
    return createHash('sha256').update(value).digest('hex');
}

export function physicalShapeSignature(frets: Array<number | null>): string {
    return frets.map((fret) => fret === null ? 'x' : String(fret)).join(',');
}

export function relativeShapeSignature(frets: Array<number | null>): string {
    if (frets.some((fret) => fret === 0)) {
        return `open:${physicalShapeSignature(frets)}`;
    }
    const fretted = frets.filter((fret): fret is number => fret !== null && fret > 0);
    if (fretted.length === 0) return `empty:${physicalShapeSignature(frets)}`;
    const minimum = Math.min(...fretted);
    return `closed:${frets.map((fret) => fret === null ? 'x' : fret - minimum).join(',')}`;
}

export function evaluateShape(frets: Array<number | null>): HandPlayabilityResult {
    const points = frets.flatMap((fret, string) =>
        fret !== null && fret > 0 ? [{ string: string as GuitarStringIndex, fret }] : []
    );
    const openStrings = frets.flatMap((fret, string) =>
        fret === 0 ? [string as GuitarStringIndex] : []
    );
    return evaluateHandPlayability(points, { openStrings });
}

export function referenceFretsToEngineOrder(frets: number[], baseFret = 1): Array<number | null> {
    if (frets.length !== 6) throw new Error(`Expected six reference frets, got ${frets.length}`);
    return frets
        .map((fret) => fret < 0 ? null : fret === 0 ? 0 : baseFret + fret - 1)
        .reverse();
}

export function parseGuitarOnsets(lines: string[]): ParsedOnset[] {
    const onsets: ParsedOnset[] = [];
    let notes: Array<{ instrument: string; string: number; fret: number; tied: boolean }> = [];
    let lastNote: (typeof notes)[number] | undefined;

    const flush = () => {
        const attacks = notes.filter((note) => !note.tied);
        const byInstrument = new Map<string, typeof attacks>();
        for (const note of attacks) {
            const list = byInstrument.get(note.instrument) ?? [];
            list.push(note);
            byInstrument.set(note.instrument, list);
        }
        for (const [instrument, instrumentNotes] of byInstrument) {
            const frets: Array<number | null> = Array.from({ length: 6 }, () => null);
            let hasDuplicateString = false;
            for (const note of instrumentNotes) {
                if (note.string < 1 || note.string > 6) continue;
                const index = note.string - 1;
                if (frets[index] !== null) hasDuplicateString = true;
                frets[index] = note.fret;
            }
            onsets.push({ instrument, frets, attackCount: instrumentNotes.length, hasDuplicateString });
        }
        notes = [];
        lastNote = undefined;
    };

    for (const line of lines) {
        if (line.startsWith('wait:') || line === 'end') {
            flush();
            continue;
        }
        const match = line.match(/^((?:clean|distorted)\d+):note:s(\d+):f(-?\d+)$/);
        if (match) {
            lastNote = { instrument: match[1], string: Number(match[2]), fret: Number(match[3]), tied: false };
            notes.push(lastNote);
            continue;
        }
        if (line === 'nfx:tie' && lastNote) lastNote.tied = true;
    }
    if (notes.length > 0) flush();
    return onsets;
}

export function addObservation(evidenceByShape: Map<string, ShapeEvidence>, observation: ShapeObservation): ShapeEvidence {
    const signature = physicalShapeSignature(observation.frets);
    let evidence = evidenceByShape.get(signature);
    if (!evidence) {
        evidence = {
            signature,
            familySignature: relativeShapeSignature(observation.frets),
            frets: observation.frets,
            chordIds: new Set(),
            roots: new Set(),
            songs: new Set(),
            knownArtists: new Set(),
            trainingSongs: new Set(),
            songValidationSongs: new Set(),
            artistTrainingSongs: new Set(),
            artistValidationSongs: new Set(),
            observations: new Map(),
            playability: evaluateShape(observation.frets),
        };
        evidenceByShape.set(signature, evidence);
    }
    evidence.chordIds.add(observation.chordId);
    evidence.roots.add(observation.rootPitchClass);
    evidence.songs.add(observation.songGroupId);
    if (observation.artistToken !== 'artist:unknown_artist') evidence.knownArtists.add(observation.artistToken);
    (observation.songSplit === 'training' ? evidence.trainingSongs : evidence.songValidationSongs).add(observation.songGroupId);
    (observation.artistSplit === 'training' ? evidence.artistTrainingSongs : evidence.artistValidationSongs).add(observation.songGroupId);
    if (!evidence.observations.has(observation.songGroupId)) {
        evidence.observations.set(observation.songGroupId, {
            artistToken: observation.artistToken,
            chordId: observation.chordId,
            rootPitchClass: observation.rootPitchClass,
            songSplit: observation.songSplit,
            artistSplit: observation.artistSplit,
        });
    }
    return evidence;
}

export function qualifiesStrong(songCount: number): boolean {
    return songCount >= 5;
}

export function qualifiesVeryStrong(songCount: number, artistCount: number, rootCount: number): boolean {
    return songCount >= 10 && artistCount >= 3 && rootCount >= 3;
}

export function deterministicReferencePartition(familySignature: string): 'development' | 'holdout' {
    return Number.parseInt(sha256(familySignature).slice(0, 8), 16) % 10 < 3 ? 'holdout' : 'development';
}

export function isTopologyReason(reason: string | undefined): boolean {
    return reason === 'too-many-fingers' || reason === 'barre-behind-unreachable-position';
}
