import { beforeAll, describe, expect, it, vi } from 'vitest';
import { EngineSession } from '@/domain/chord/engine/session';
import { allocationId } from '@/domain/chord/engine/identity';
import { getPlaybackMidi,midiNoteLabel } from '@/domain/chord/engine/presentation';
import type { PresentationCandidate } from '@/domain/chord/engine/types';
import { createVoicingPlayback } from './voicing-playback';

const getPlaybackNotes=(row:PresentationCandidate)=>getPlaybackMidi(row).map(midiNoteLabel);

function deferred<T>() {
    let resolve!: (value: T) => void;
    let reject!: (error: Error) => void;
    const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
    return { promise, resolve, reject };
}

function engine() {
    return { start: vi.fn(async () => {}), playChord: vi.fn<(notes: string[]) => void>() };
}

describe('voicing playback requests', () => {
    let first: PresentationCandidate;
    let second: PresentationCandidate;
    beforeAll(() => {
        const session=new EngineSession({schema:'intent-v1',chordId:'major',rootPitchClass:0});
        first=session.lookup(allocationId([64,59,55,50,45,40],[0,1,0,2,3,3]));
        const damping=new EngineSession({schema:'intent-v1',chordId:'major',rootPitchClass:0,physical:{omittedStrings:'require-left-hand-damping'}});
        second=damping.lookup(allocationId([64,59,55,50,45,40],[0,8,9,10,-1,-1]));
    });

    it('plays an uncertain crossing with exact repeated MIDI pitches and never substitutes formula notes',async()=>{
        const audio=engine(),playback=createVoicingPlayback(async()=>audio,vi.fn());
        expect(second.physical.status).toBe('UNCERTAIN');
        await playback.play(second);
        expect(audio.playChord).toHaveBeenCalledExactlyOnceWith(['C4','E4','E4','G4']);
    });

    it('loads only on play and passes every sounding note with its octave and doubling', async () => {
        const audio = engine();
        const load = vi.fn(async () => audio);
        const state = vi.fn();
        const playback = createVoicingPlayback(load, state);
        expect(load).not.toHaveBeenCalled();
        expect(state).not.toHaveBeenCalled();
        await playback.play(first);
        expect(audio.start).toHaveBeenCalledOnce();
        expect(audio.playChord).toHaveBeenCalledExactlyOnceWith(getPlaybackNotes(first));
        const notes = audio.playChord.mock.calls[0][0];
        expect(notes).toHaveLength(6);
        expect(notes).toEqual(['G2','C3','E3','G3','C4','E4']);
        expect(new Set(notes.map(note => note.replace(/-?\d+$/, ''))).size).toBeLessThan(notes.length);
        expect(notes.every(note => /\d$/.test(note))).toBe(true);
        expect(state.mock.calls).toEqual([
            [{ error: null, loadingCandidateId: first.candidate.allocationId }],
            [{ error: null, loadingCandidateId: null }],
        ]);
    });

    it('ignores an older import resolving after the newer request has played', async () => {
        const older = deferred<ReturnType<typeof engine>>();
        const oldAudio = engine();
        const newAudio = engine();
        const load = vi.fn().mockReturnValueOnce(older.promise).mockResolvedValueOnce(newAudio);
        const state = vi.fn();
        const playback = createVoicingPlayback(load, state);
        const pendingFirst = playback.play(first);
        await playback.play(second);
        const calls = state.mock.calls.length;
        older.resolve(oldAudio);
        await pendingFirst;
        expect(oldAudio.start).not.toHaveBeenCalled();
        expect(oldAudio.playChord).not.toHaveBeenCalled();
        expect(newAudio.playChord).toHaveBeenCalledExactlyOnceWith(getPlaybackNotes(second));
        expect(state).toHaveBeenCalledTimes(calls);
    });

    it.each(['resolve', 'reject'] as const)('ignores an older start that later %ss', async completion => {
        const oldStart = deferred<void>();
        const audio = engine();
        audio.start.mockReturnValueOnce(oldStart.promise).mockResolvedValueOnce(undefined);
        const state = vi.fn();
        const playback = createVoicingPlayback(async () => audio, state);
        const pendingFirst = playback.play(first);
        await Promise.resolve();
        expect(audio.start).toHaveBeenCalledOnce();
        await playback.play(second);
        const calls = state.mock.calls.length;
        if (completion === 'resolve') oldStart.resolve();
        else oldStart.reject(new Error('Old start failed'));
        await pendingFirst;
        expect(audio.playChord).toHaveBeenCalledExactlyOnceWith(getPlaybackNotes(second));
        expect(state).toHaveBeenCalledTimes(calls);
        expect(state).toHaveBeenLastCalledWith({ error: null, loadingCandidateId: null });
    });

    it.each(['import', 'start'] as const)('cancellation during %s prevents later playback and state callbacks', async phase => {
        const gate = deferred<void>();
        const audio = engine();
        if (phase === 'start') audio.start.mockReturnValueOnce(gate.promise);
        const state = vi.fn();
        const playback = createVoicingPlayback(async () => {
            if (phase === 'import') await gate.promise;
            return audio;
        }, state);
        const pending = playback.play(first);
        await Promise.resolve();
        playback.cancel();
        const calls = state.mock.calls.length;
        gate.resolve();
        await pending;
        expect(audio.playChord).not.toHaveBeenCalled();
        expect(state).toHaveBeenCalledTimes(calls);
        if (phase === 'import') expect(audio.start).not.toHaveBeenCalled();
    });

    it.each(['import', 'start'] as const)('reports %s failure, then clears the error and retries', async phase => {
        const audio = engine();
        const load = vi.fn(async () => audio);
        if (phase === 'import') load.mockRejectedValueOnce(new Error('Import failed'));
        else audio.start.mockRejectedValueOnce(new Error('Start failed'));
        const state = vi.fn();
        const playback = createVoicingPlayback(load, state);
        await playback.play(first);
        expect(audio.playChord).not.toHaveBeenCalled();
        expect(state).toHaveBeenLastCalledWith({ error: expect.any(String), loadingCandidateId: null });
        const retry = playback.play(second);
        expect(state).toHaveBeenLastCalledWith({ error: null, loadingCandidateId: second.candidate.allocationId });
        await retry;
        expect(audio.playChord).toHaveBeenCalledExactlyOnceWith(getPlaybackNotes(second));
        expect(state).toHaveBeenLastCalledWith({ error: null, loadingCandidateId: null });
    });
});
