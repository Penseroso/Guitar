import type { DemandRecord } from './demandContract';
import type { VocabularyMatch } from './vocabularyContract';

export type SurfacePartition=0|1|2; // representative, fallback, All only; internal only
export function surfacePartition(M:boolean,status:'PASS'|'UNCERTAIN'|'REJECT',demand:Pick<DemandRecord,'U'|'Uop'>,vocabulary:Pick<VocabularyMatch,'V'>):SurfacePartition {
    if(!M||status==='REJECT')return 2;
    if(vocabulary.V&&!demand.Uop&&(status==='PASS'||demand.U))return 0;
    if(!vocabulary.V&&demand.U)return 1;
    return 2;
}
