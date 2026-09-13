import { WIRE_REMAINDER_Q } from './geometryTable';
import { EngineError } from './errors';
import { integer } from './validation';
import { sixIntegers } from './identity';
import type { PhysicalProfile, Six } from './types';
import type { ScreenResult } from './physical';
import type { DemandRecord } from './demandContract';

export function roundDemand(n:bigint,d:bigint):bigint {
    if(n<0n||d<=0n)throw new EngineError('contract-error','Invalid demand rational.');
    return (2n*n+d)/(2n*d);
}
function finalInteger(n:bigint):number {
    if(n<0n||n>BigInt(Number.MAX_SAFE_INTEGER))throw new EngineError('contract-error','Unsafe final demand result.');
    return Number(n);
}
// At most one immutable geometry table retained, independently of request history.
let retained:{scale:number;J:Uint32Array;T:Uint32Array}|undefined;
export function demandGeometry(scale:number) {
    integer(scale,1,2000000,'demand scale');
    if(retained?.scale===scale)return retained;
    const L=BigInt(scale),Q=1000000000000n;
    const X=WIRE_REMAINDER_Q.map(q=>roundDemand(L*(Q-BigInt(q)),Q));
    const J=new Uint32Array(37*37),T=new Uint32Array(222*222);
    for(let lo=1;lo<=36;lo++)for(let hi=lo;hi<=36;hi++)J[lo*37+hi]=finalInteger(X[hi-1]>X[lo]?X[hi-1]-X[lo]:0n);
    const endpoints=Array.from({length:222},(_,i)=>{
        const s=Math.floor(i/37),f=i%37;
        const y=(wire:number)=>(2n*BigInt(s)-5n)*(70000n*L+34775n*X[wire]);
        const a=y(Math.max(0,f-1)),b=y(f);return a<b?[a,b]:[b,a];
    });
    for(let i=0;i<222;i++)for(let j=i+1;j<222;j++){
        const a=endpoints[i][0]-endpoints[j][1],b=endpoints[j][0]-endpoints[i][1];
        const gap=a>b?a:b;
        // R(max gaps) = max R(gaps): monotone half-up rounding. Each table
        // entry is a FINAL pair T, never a rounded coordinate/intermediate.
        T[i*222+j]=T[j*222+i]=finalInteger(roundDemand(gap>0n?gap:0n,20n*L));
    }
    retained={scale,J,T};return retained;
}
export function demandTier(J:number,T:number,G:number,G1:number,Uop:boolean):DemandRecord['tier'] {
    integer(J,0,2000000,'J');integer(T,0,2000000,'T');integer(G,0,6,'G');integer(G1,0,6,'G1');
    if(typeof Uop!=='boolean')throw new EngineError('contract-error','Invalid operation flag.');
    return Uop?'unsupported':J<=55000&&T<=42000&&G<=4&&G1<=4?'compact':J<=110000&&T<=50000&&G<=5?'extended':'wide-or-complex';
}
export function createDemandProjector(profile:PhysicalProfile) {
    const geometry=demandGeometry(profile.scaleLengthUm);
    const assumptions={scaleLengthUm:profile.scaleLengthUm,nutSpacingUm:35000,bridgeSpacingHalfUm:104775,cells:'full',contacts:'partial-cover-v1'} as const;
    return (states:Six<number>,screen:Pick<ScreenResult,'metrics'|'reasonCodes'>):DemandRecord=>{
        sixIntegers(states,-1,36,'demand states');
        let Nstop=0,K=0,lo=37,hi=0,T=0;
        for(let s=0;s<6;s++)if(states[s]>0){
            const f=states[s];Nstop++;lo=Math.min(lo,f);hi=Math.max(hi,f);
            let count=0;
            for(let t=s;t<6;t++){
                if(states[t]>=0&&states[t]<f)break;
                if(states[t]===f)count++;
            }
            K=Math.max(K,count);
            for(let t=s+1;t<6;t++)if(states[t]>0)T=Math.max(T,geometry.T[(s*37+f)*222+t*37+states[t]]);
        }
        const J=Nstop<2?0:geometry.J[lo*37+hi],G=screen.metrics.partialCoverGroups,G1=Nstop?Nstop-K+1:0;
        const reasons=screen.reasonCodes.filter(r=>['unsupported-damping','unsupported-profile','unsupported-operation','unresolved-screen','conflicting-evidence'].includes(r));
        if(profile.scope!=='generic-static-fretting'||profile.handProfileRef)reasons.push('unsupported-profile');
        if(profile.omittedStrings==='require-left-hand-damping'&&states.includes(-1))reasons.push('unsupported-damping');
        if(screen.metrics.thumbFallback?.reliedOn)reasons.push('thumb-fallback-relied-on');
        const Uop=reasons.length>0,tier=demandTier(J,T,G,G1,Uop);
        return {version:'physical-demand-policy-v1',geometryVersion:'demand-geometry-um-v1',J,T,G,G1,Nstop,K,Uop,U:tier==='compact',tier,
            reasons:[...new Set([...reasons,...(J>55000?['longitudinal-over-compact']:[]),...(T>42000?['transverse-over-compact']:[]),...(G>4?['groups-over-compact']:[]),...(G1>4?['single-interval-contacts-over-compact']:[])])],assumptions};
    };
}
