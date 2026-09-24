// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, renderHook } from '@testing-library/react';
import { useChordExploration } from './useChordExploration';

const controller = vi.hoisted(() => ({
    start: vi.fn(), stop: vi.fn(), setView: vi.fn(), restoreRequestedId: vi.fn(),
    setSurface: vi.fn(), select: vi.fn(), nextPage: vi.fn(), previousPage: vi.fn(),
    firstPage: vi.fn(), continueSearch: vi.fn(), cancel: vi.fn(),
}));

// Keep the hook and React effect lifecycle real; replace only the worker-backed controller.
vi.mock('./explorationController', async importOriginal => {
    const actual = await importOriginal<typeof import('./explorationController')>();
    return {
        ...actual,
        createExplorationController: () => ({
            ...controller,
            subscribe: () => () => {},
            getSnapshot: () => actual.INITIAL_ENGINE_STATE,
            getServerSnapshot: () => actual.INITIAL_ENGINE_STATE,
        }),
    };
});

afterEach(() => { cleanup(); vi.clearAllMocks(); });

interface Props {
    enabled: boolean;
    root: number;
    context: 'standalone' | 'accompaniment';
    bassTone?: string | null;
}
const initial: Props = { enabled: true, root: 0, context: 'standalone' };
const useExploration = (props: Props) => useChordExploration(props.enabled, 'major', props.root, props.context, null, props.bassTone);

describe('Chord hook explicit Harmony bass transfer', () => {
    it('does not clear user bass filters during ordinary navigation with no transfer', () => {
        const { rerender } = renderHook(useExploration, { initialProps: initial });
        expect(controller.start).toHaveBeenCalledTimes(1);
        expect(controller.setView).not.toHaveBeenCalled();
        rerender({ ...initial, enabled: false });
        rerender(initial);
        rerender({ ...initial, root: 4 });
        expect(controller.setView).not.toHaveBeenCalled();
    });

    it('applies an explicit chord-tone transfer to the bass filter', () => {
        const { rerender } = renderHook(useExploration, { initialProps: initial });
        rerender({ ...initial, bassTone: '3' });
        expect(controller.setView).toHaveBeenCalledExactlyOnceWith({ bass: { tone: '3' } });
        rerender({ ...initial, bassTone: '3' });
        expect(controller.setView).toHaveBeenCalledTimes(1);
    });

    it('treats null as an explicit clear and undefined as no further instruction', () => {
        const { rerender } = renderHook(useExploration, { initialProps: { ...initial, bassTone: '3' } as Props });
        expect(controller.setView).toHaveBeenLastCalledWith({ bass: { tone: '3' } });
        controller.setView.mockClear();
        rerender({ ...initial, bassTone: null });
        expect(controller.setView).toHaveBeenCalledExactlyOnceWith({ bass: null });
        rerender({ ...initial, bassTone: undefined });
        expect(controller.setView).toHaveBeenCalledTimes(1);
    });

    it('does not replay a previous bass transfer when the playing context changes', () => {
        const { rerender } = renderHook(useExploration, { initialProps: { ...initial, bassTone: '3' } as Props });
        expect(controller.setView).toHaveBeenCalledExactlyOnceWith({ bass: { tone: '3' } });
        controller.setView.mockClear();
        rerender({ ...initial, bassTone: '3', context: 'accompaniment' });
        expect(controller.start).toHaveBeenLastCalledWith(expect.objectContaining({ context: 'accompaniment' }));
        expect(controller.setView).not.toHaveBeenCalled();
    });

    it('waits for Chord mode to become enabled before applying the transfer', () => {
        const { rerender } = renderHook(useExploration, { initialProps: { ...initial, enabled: false, bassTone: '3' } as Props });
        expect(controller.setView).not.toHaveBeenCalled();
        rerender({ ...initial, bassTone: '3' });
        expect(controller.setView).toHaveBeenCalledExactlyOnceWith({ bass: { tone: '3' } });
    });
});
