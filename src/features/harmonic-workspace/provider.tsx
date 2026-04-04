"use client";

import React, { createContext, useContext, useEffect, useMemo, useReducer } from 'react';

import {
    createHarmonicWorkspaceState,
    reduceHarmonicWorkspaceState,
    type HarmonicWorkspaceAction,
    type HarmonicWorkspaceState,
    type HarmonicWorkspaceTonalContext,
} from './state';

interface HarmonicWorkspaceContextValue {
    state: HarmonicWorkspaceState;
    dispatch: React.Dispatch<HarmonicWorkspaceAction>;
}

const HarmonicWorkspaceContext = createContext<HarmonicWorkspaceContextValue | null>(null);

export function useHarmonicWorkspaceController(scopeKey: string, tonalContext: HarmonicWorkspaceTonalContext) {
    const [state, dispatch] = useReducer(
        reduceHarmonicWorkspaceState,
        createHarmonicWorkspaceState(scopeKey, tonalContext)
    );

    useEffect(() => {
        dispatch({
            type: 'sync-scope',
            scopeKey,
            tonalContext,
        });
    }, [scopeKey, tonalContext]);

    return useMemo(() => ({ state, dispatch }), [state]);
}

export function HarmonicWorkspaceProvider({
    value,
    children,
}: {
    value: HarmonicWorkspaceContextValue;
    children: React.ReactNode;
}) {
    return (
        <HarmonicWorkspaceContext.Provider value={value}>
            {children}
        </HarmonicWorkspaceContext.Provider>
    );
}

export function useHarmonicWorkspace() {
    const context = useContext(HarmonicWorkspaceContext);
    if (!context) {
        throw new Error('useHarmonicWorkspace must be used within a HarmonicWorkspaceProvider');
    }

    return context;
}
