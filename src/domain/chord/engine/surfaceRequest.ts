import { createViewMatcher } from './view';
import { canonical,choice,freeze,record } from './validation';
import { EngineError } from './errors';
import { ENGINE_VERSIONS } from './versions';
import type { ResolvedRequest,ViewRequest } from './types';

export interface SurfaceRequest {schema:'surface-request-v2';surface:'recommended'|'all';view:ViewRequest}
export function createSurfaceRequest(request:ResolvedRequest,input:unknown={}) {
    let surface:SurfaceRequest['surface']='all',viewInput=input;
    if(input&&typeof input==='object'&&'schema' in input&&input.schema==='surface-request-v2'){
        const value=record(input,['schema','surface','view'],'surface','invalid-view');
        surface=choice(value.surface,['recommended','all'],'surface','invalid-view');viewInput=value.view;
        if(viewInput===undefined)throw new EngineError('invalid-view','Surface request requires an explicit view.');
    }
    const ordinary=createViewMatcher(request,viewInput);
    if(surface==='recommended'&&ordinary.view.order.kind!=='classic')throw new EngineError('invalid-view','Recommended requires classic order.');
    const wrapper:SurfaceRequest=freeze({schema:'surface-request-v2',surface,view:ordinary.view});
    return Object.freeze({...ordinary,surface,wrapper,key:canonical({request:wrapper,versions:ENGINE_VERSIONS})});
}
