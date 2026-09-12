import { generateExplorationPool, rankExplorationPool, type ExplorationCandidate, type ExplorationRequest } from '@/domain/chord/exploration';

export type ExplorationWorkerResponse =
    | { status: 'ready'; candidates: ExplorationCandidate[] }
    | { status: 'unsupported' | 'error'; message: string };

const scope = self as unknown as {
    onmessage: ((event: MessageEvent<ExplorationRequest>) => void) | null;
    postMessage: (response: ExplorationWorkerResponse) => void;
};

scope.onmessage = ({ data }) => {
    try {
        const pool = generateExplorationPool(data);
        scope.postMessage(pool.status === 'ready'
            ? { status: 'ready', candidates: rankExplorationPool(pool) }
            : { status: 'unsupported', message: pool.message });
    } catch {
        scope.postMessage({ status: 'error', message: 'Voicing search failed. Try the search again.' });
    }
};
