"use client";

import { useMemo, useState } from 'react';
import { exploreRelation } from '@/domain/harmony/relations';
import type { RelationQuery } from '@/domain/harmony/types';

export const DEFAULT_HARMONY_QUERY: RelationQuery = {
    frame: { tonic: 'C', mode: 'major', lens: 'jazz-pop' },
    target: { root: 'C', chordId: 'major' },
    kind: 'dominant',
};

export function useHarmony() {
    const [query, setQuery] = useState<RelationQuery>(DEFAULT_HARMONY_QUERY);
    const result = useMemo(() => exploreRelation(query), [query]);
    return { query, setQuery, result };
}
