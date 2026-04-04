import { describe, expect, it } from 'vitest';

import { applyDraftToProgressionDocument } from './progression';
import type { ProgressionDocument } from './types';

const baseDoc: ProgressionDocument = {
    measures: [
        { id: 'm1', index: 0, timeSignature: [4, 4], nodes: [{ id: 'n1', displayDegree: 'I', coreDegree: 'I', durationInBeats: 4, harmonicFunction: 'Tonic', isSecondary: false }] },
        { id: 'm2', index: 1, timeSignature: [4, 4], nodes: [{ id: 'n2', displayDegree: 'V', coreDegree: 'V', durationInBeats: 4, harmonicFunction: 'Dominant', isSecondary: false }] },
    ],
};

const draftDoc: ProgressionDocument = {
    measures: [
        { id: 'd1', index: 0, timeSignature: [4, 4], nodes: [{ id: 'dn1', displayDegree: 'ii', coreDegree: 'ii', durationInBeats: 4, harmonicFunction: 'Subdominant', isSecondary: false }] },
        { id: 'd2', index: 1, timeSignature: [4, 4], nodes: [{ id: 'dn2', displayDegree: 'V', coreDegree: 'V', durationInBeats: 4, harmonicFunction: 'Dominant', isSecondary: false }] },
    ],
};

describe('progression draft application modes', () => {
    it('replaces the progression document in replace mode', () => {
        const next = applyDraftToProgressionDocument(baseDoc, draftDoc, 'replace');

        expect(next.measures).toHaveLength(2);
        expect(next.measures[0]?.nodes[0]?.displayDegree).toBe('ii');
    });

    it('appends draft measures in append mode', () => {
        const next = applyDraftToProgressionDocument(baseDoc, draftDoc, 'append');

        expect(next.measures).toHaveLength(4);
        expect(next.measures[2]?.nodes[0]?.displayDegree).toBe('ii');
        expect(next.measures[3]?.index).toBe(3);
    });

    it('inserts draft measures after the focused measure in insert-after-focus mode', () => {
        const next = applyDraftToProgressionDocument(baseDoc, draftDoc, 'insert-after-focus', 'n1');

        expect(next.measures).toHaveLength(4);
        expect(next.measures[1]?.nodes[0]?.displayDegree).toBe('ii');
        expect(next.measures[3]?.nodes[0]?.displayDegree).toBe('V');
    });

    it('preserves the current document in stage-only mode', () => {
        const next = applyDraftToProgressionDocument(baseDoc, draftDoc, 'stage-only', 'n1');

        expect(next.measures).toHaveLength(2);
        expect(next.measures[0]?.nodes[0]?.displayDegree).toBe('I');
    });
});
