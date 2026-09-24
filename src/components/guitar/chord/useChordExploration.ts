"use client";

import { useCallback,useEffect,useState,useSyncExternalStore } from 'react';
import { createExplorationController,DEFAULT_ENGINE_VIEW,LIVE_ENGINE_VERSION,type EngineExplorationState } from './explorationController';
import type { PresentationCandidate,ViewRequest } from '@/domain/chord/engine/types';

export { LIVE_ENGINE_VERSION };
export interface EngineExploration extends EngineExplorationState {
    setSurface:(surface:'recommended'|'all')=>void;
    setView:(input:Partial<ViewRequest>|ViewRequest)=>void;
    select:(candidate:PresentationCandidate|string)=>void;
    nextPage:()=>void;previousPage:()=>void;firstPage:()=>void;retry:()=>void;continueSearch:()=>void;cancel:()=>void;
}

export function useChordExploration(enabled:boolean,chordId:string,rootPitchClass:number,context:'standalone'|'accompaniment',requestedCandidateId?:string|null,requestedBassTone?:string|null):EngineExploration {
    const [attempt,setAttempt]=useState(0);
    const [controller]=useState(()=>createExplorationController(()=>new Worker(new URL('./engine.worker.ts',import.meta.url))));
    const state=useSyncExternalStore(controller.subscribe,controller.getSnapshot,controller.getServerSnapshot);
    const requestEpoch=JSON.stringify([LIVE_ENGINE_VERSION,enabled,chordId,rootPitchClass,context,attempt]);
    useEffect(()=>{controller.restoreRequestedId(requestedCandidateId??null);},[controller,requestedCandidateId]);
    useEffect(()=>{
        if(enabled)controller.start({chordId,rootPitchClass,context,requestEpoch});else controller.stop();
        return()=>controller.stop();
    },[controller,enabled,chordId,rootPitchClass,context,requestEpoch]);
    useEffect(()=>{
        // Undefined means ordinary Chord navigation: preserve the user's existing filter.
        // Null is an explicit root-position-neutral transfer from Harmony.
        if(enabled && requestedBassTone !== undefined)controller.setView({bass:requestedBassTone?{tone:requestedBassTone}:null});
    },[controller,enabled,chordId,rootPitchClass,requestedBassTone]);
    const retry=useCallback(()=>setAttempt(value=>value+1),[]);
    // Hide a previous request synchronously, before effect cleanup/new worker setup.
    const changed=state.requestEpoch!==requestEpoch;
    const sameHarmony=state.request?.interpretation.chordId===chordId&&state.request?.interpretation.rootPitchClass===rootPitchClass;
    const visible=changed?{...state,phase:enabled?'loading' as const:'idle' as const,request:null,page:null,summary:null,
        selected:sameHarmony?state.selected:null,selectionStale:sameHarmony&&state.selected!==null,
        view:sameHarmony?state.view:DEFAULT_ENGINE_VIEW,surface:sameHarmony?state.surface:'recommended' as const,canPrevious:false,error:null}:state;
    return {...visible,requestEpoch,setView:controller.setView,setSurface:controller.setSurface,select:controller.select,nextPage:controller.nextPage,
        previousPage:controller.previousPage,firstPage:controller.firstPage,retry,continueSearch:controller.continueSearch,cancel:controller.cancel};
}
