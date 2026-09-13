export interface DemandRecord {
    version:'physical-demand-policy-v1'; geometryVersion:'demand-geometry-um-v1';
    J:number; T:number; G:number; G1:number; Nstop:number; K:number; U:boolean; Uop:boolean;
    tier:'compact'|'extended'|'wide-or-complex'|'unsupported';
    reasons:readonly string[];
    assumptions:{scaleLengthUm:number;nutSpacingUm:35000;bridgeSpacingHalfUm:104775;cells:'full';contacts:'partial-cover-v1'};
}
