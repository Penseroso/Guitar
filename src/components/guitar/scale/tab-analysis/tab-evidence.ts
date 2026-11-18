import type { TabDocument } from '@/domain/tab/types';

export interface TabEvidenceTarget {
    noteIds?: readonly string[];
    momentIds?: readonly string[];
}

interface NoteSource {
    id: string;
    momentId: string;
    string: number;
}

export function resolveTabEvidence(document: TabDocument, target: TabEvidenceTarget) {
    const noteIds = new Set(target.noteIds);
    const momentIds = new Set(target.momentIds);
    const notes: NoteSource[] = [];
    const moments: string[] = [];
    for (const moment of document.moments) {
        if (momentIds.has(moment.id)) moments.push(moment.id);
        for (const note of moment.notes) {
            if (noteIds.has(note.id)) notes.push({ id: note.id, momentId: moment.id, string: note.string });
        }
    }
    if (!notes.length && !moments.length) return null;
    if (new Set(notes.map(note => note.id)).size !== notes.length || notes.length !== noteIds.size) return null;
    if (new Set(moments).size !== moments.length || moments.length !== momentIds.size) return null;
    return { notes, noteIds, momentIds, firstMomentId: moments[0] };
}
