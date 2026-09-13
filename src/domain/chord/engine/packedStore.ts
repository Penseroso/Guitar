import type { ScreenResult } from './physical';
import type { PhysicalReason, Six } from './types';
import { EngineError } from './errors';
import { integer } from './validation';
import type { SurfacePartition } from './recommendedSurface';

export const PACKED_ROW_BYTES=32;
export const ROW_BUDGET_BYTES=32*1024*1024;
export const ENGINE_BUFFER_BUDGET_BYTES=64*1024*1024;
const REASONS:readonly PhysicalReason[]=['groups-over-four','groups-over-five','span-over-warning','span-over-severe',
    'thumb-fallback-relied-on','unsupported-damping','unsupported-profile','unsupported-operation','unresolved-screen','conflicting-evidence'];
export interface StoredRow {states:Six<number>;status:'PASS'|'UNCERTAIN';scoreNumerator:number}

/** Chunk allocation is charged before allocation, reserving two uint32 indices per
 * row even though this v1 scan implementation needs neither sorting index. */
export class PackedStore {
    private chunks:DataView[]=[];
    private capacity=0;
    count=0;
    complete=false;
    discarded=false;
    readonly limit:number;
    constructor(readonly budgetBytes=ROW_BUDGET_BYTES) {
        integer(budgetBytes,0,ROW_BUDGET_BYTES,'cache budget');
        this.limit=Math.floor(budgetBytes/(PACKED_ROW_BYTES+8));
        this.discarded=this.limit===0;
    }
    get retainedBytes(){return this.capacity*PACKED_ROW_BYTES;}
    get accountedBytes(){return this.capacity*(PACKED_ROW_BYTES+8);}
    discard(){this.chunks=[];this.capacity=0;this.count=0;this.complete=false;this.discarded=true;}
    append(states:Six<number>,screen:ScreenResult,scoreNumerator:number):boolean {
        if(this.discarded) return false;
        if(this.complete) throw new EngineError('contract-error','Cannot append to a completed pool.');
        if(this.count===this.limit){this.discard();return false;}
        if(this.count===this.capacity) {
            const size=Math.min(4096,this.limit-this.capacity);
            try {this.chunks.push(new DataView(new ArrayBuffer(size*PACKED_ROW_BYTES)));this.capacity+=size;}
            catch {this.discard();return false;}
        }
        const chunk=this.chunks[Math.floor(this.count/4096)], offset=(this.count%4096)*PACKED_ROW_BYTES;
        for(let s=0;s<6;s++)chunk.setInt8(offset+s,states[s]);
        chunk.setUint8(offset+6,screen.status==='PASS'?0:1);chunk.setUint8(offset+7,screen.metrics.partialCoverGroups);
        chunk.setUint16(offset+8,screen.reasonCodes.reduce((mask,r)=>mask|(1<<REASONS.indexOf(r)),0),true);
        const thumb=screen.metrics.thumbFallback;
        chunk.setUint8(offset+10,thumb?(thumb.reliedOn?3:1):0);chunk.setUint8(offset+11,thumb?.nonThumbGroups??0);
        chunk.setInt32(offset+12,screen.metrics.stoppedWireSpanUm,true);chunk.setInt32(offset+16,thumb?.nonThumbSpanUm??0,true);
        chunk.setInt32(offset+20,scoreNumerator,true);chunk.setUint8(offset+24,255);this.count++;return true;
    }
    partition(index:number):number {
        integer(index,0,this.count-1,'row index');return this.chunks[Math.floor(index/4096)].getUint8((index%4096)*PACKED_ROW_BYTES+24);
    }
    setPartition(index:number,value:SurfacePartition) {
        integer(index,0,this.count-1,'row index');integer(value,0,2,'partition');
        this.chunks[Math.floor(index/4096)].setUint8((index%4096)*PACKED_ROW_BYTES+24,value);
    }
    read(index:number):StoredRow {
        integer(index,0,this.count-1,'row index');
        const chunk=this.chunks[Math.floor(index/4096)],offset=(index%4096)*PACKED_ROW_BYTES;
        // A fixed six-string record needs no per-row Array.from callback/iterator.
        // Keep a fresh array: page heaps and callers may retain this snapshot.
        const states:Six<number>=[chunk.getInt8(offset),chunk.getInt8(offset+1),chunk.getInt8(offset+2),
            chunk.getInt8(offset+3),chunk.getInt8(offset+4),chunk.getInt8(offset+5)];
        return {states,status:chunk.getUint8(offset+6)===0?'PASS':'UNCERTAIN',scoreNumerator:chunk.getInt32(offset+20,true)};
    }
}
