import { afterAll, describe, expect, it } from 'vitest';
import { framesFromNotation, parseNotation } from './frames';
import { openReference } from './reference';

const score = (body: string) => `artist:unknown\ndowntune:0\ntempo:120\nstart\nnew_measure\n${body}\nend`;
const chord = 'clean0:note:s1:f0\nclean0:note:s2:f1\nclean0:note:s3:f0';
const fixtures = {
    attacks: score(chord + '\nwait:960'),
    tie: score(chord + '\nwait:480\nclean0:note:s1:f0\nnfx:tie\nwait:480'),
    rest: score(chord + '\nwait:480\nclean0:rest\nwait:480'),
    absentTrack: score(chord + '\nclean1:rest\nwait:480'),
    ring: score('clean0:note:s1:f0\nnfx:let_ring\nwait:480\nclean0:rest\nwait:480'),
    ghost: score('clean0:note:s1:f0\nnfx:ghost_note\nwait:480'),
    dead: score('clean0:note:s1:f0\nnfx:dead\nwait:480'),
    duplicate: score('clean0:rest\nclean0:note:s1:f0\nclean0:note:s1:f3\nwait:480'),
    interleaved: score('clean0:note:s1:f0\nwait:240\nbass:note:s2:f0\nwait:720'),
    initialRest: score('bass:note:s2:f0\nwait:240\nclean0:note:s1:f0\nwait:720'),
    terminalDuration: score('clean0:note:s1:f0\nnew_measure\nclean0:note:s1:f0\nnfx:tie'),
    orphan: score('nfx:let_ring\nclean0:note:s1:f0\nwait:480'),
    rounded: score('clean0:note:s1:f0\nwait:481'),
    roundedDotted: score('clean0:note:s1:f0\nwait:560'),
    longDuration: score('clean0:note:s1:f0\nwait:7680'),
    droppedTrack: score('clean0:note:s6:f-2\nwait:480\nclean0:note:s1:f0\nwait:480'),
};

it('separates attacks, tied notation, rests, and unknown ring releases', () => {
    const tied = framesFromNotation(parseNotation(fixtures.tie));
    expect(tied[1].attack.every(f => f === null)).toBe(true);
    expect(tied[1].explicitSounding[0]).toBe(0);
    const ring = framesFromNotation(parseNotation(fixtures.ring));
    expect(ring[0].duration).toBe(480);
    expect(ring[0].sustainUncertain).toBe(true);
    expect(ring[1].rest).toBe(true);
    expect(ring[1].explicitSounding.every(f => f === null)).toBe(true);
    expect(framesFromNotation(parseNotation(fixtures.ghost))[0].invalid).toBe(false);
    expect(framesFromNotation(parseNotation(fixtures.dead))[0].invalid).toBe(true);
});

const enabled = Boolean(process.env.REFERENCE_PYTHON && process.env.REFERENCE_DECODER);
describe.skipIf(!enabled)('external notation conformance', () => {
    const reference = enabled ? openReference(process.env.REFERENCE_PYTHON!, process.env.REFERENCE_DECODER!) : undefined;
    afterAll(() => reference?.close());
    for (const [name, text] of Object.entries(fixtures)) it(name, async () => {
        const decoded = await reference!.decode({ text });
        expect(decoded.ok, decoded.error).toBe(true);
        expect(parseNotation(text)).toEqual(decoded.beats);
    });
    it('encoder/decoder roundtrip retains a simple chord', async () => {
        const decoded = await reference!.decode({ text: fixtures.attacks, roundtrip: true });
        expect(decoded.ok, decoded.error).toBe(true);
        expect(decoded.roundtrip).toEqual(decoded.beats);
    });
});
