import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { compilePhysicalProfile, compileRequest } from './requestPolicy';
import { createPhysicalScreen, CERTIFICATE_PROVIDERS } from './physical';
import { createGeometry } from './geometry';
import { GEOMETRY_TABLE_SHA256, WIRE_REMAINDER_Q } from './geometryTable';
import { partialCoverGroups, flatContactCompatible } from './contactHypotheses';
import { materializeStructural } from './structuralGenerator';
import type { Six } from './types';

describe('physical-screen-v1', () => {
    it('keeps partial cover separate from whole-fret grouping and flat-contact barriers', () => {
        expect(partialCoverGroups([5,5,5,4,5,-1])).toBe(3);
        expect(flatContactCompatible([5,5,5,4,5,-1],5,0,4)).toBe(false);
        expect(partialCoverGroups([3,0,0,0,2,3])).toBe(3);
        expect(partialCoverGroups([1,1,2,3,3,1])).toBe(3);
        expect(partialCoverGroups([0,0,0,0,0,0])).toBe(0);
    });
    it('preserves cumulative warnings and never invents an exclusion', () => {
        const states = [1,3,5,7,9,15] as const;
        const result = createPhysicalScreen(compilePhysicalProfile()).metrics(states);
        expect(result.status).toBe('UNCERTAIN');
        expect(result.reasonCodes).toEqual(['groups-over-four','groups-over-five','span-over-warning','span-over-severe']);
        expect(result.metrics.partialCoverGroups).toBe(6);
        expect(result.basis).toBe('heuristic-screen');
        expect(CERTIFICATE_PROVIDERS).toEqual([]);
    });
    it('uses exact inclusive warning boundaries with independent severe envelope', () => {
        const states = [1,-1,-1,-1,-1,5] as const;
        const span = createGeometry(647700).stoppedSpan(states);
        const at = createPhysicalScreen(compilePhysicalProfile({warningSpanUm:span,severeSpanUm:span})).metrics(states);
        const over = createPhysicalScreen(compilePhysicalProfile({warningSpanUm:span-1,severeSpanUm:span-1})).metrics(states);
        expect(at.status).toBe('PASS');
        expect(over.reasonCodes).toEqual(['span-over-warning','span-over-severe']);
        expect(() => compilePhysicalProfile({warningSpanUm:200,severeSpanUm:199})).toThrow();
    });
    it('does not erase full-target warnings with a thumb hypothesis', () => {
        const screen = createPhysicalScreen(compilePhysicalProfile({allowedThumb:true}));
        const result = screen.metrics([1,2,3,4,-1,5]);
        expect(result.reasonCodes).toContain('groups-over-four');
        expect(result.reasonCodes).toContain('thumb-fallback-relied-on');
        expect(result.metrics.partialCoverGroups).toBe(5);
        expect(result.metrics.thumbFallback?.nonThumbGroups).toBe(4);
        expect(screen.metrics([1,1,2,3,3,1]).status).toBe('PASS');
        expect(screen.metrics([1,2,3,4,-1,15]).reasonCodes).not.toContain('thumb-fallback-relied-on');
    });
    it('abstains only for applicable unsupported scope and exposes absence of human evidence', () => {
        const screen = createPhysicalScreen(compilePhysicalProfile({omittedStrings:'require-left-hand-damping'}));
        expect(screen.metrics([0,0,0,0,0,0]).status).toBe('PASS');
        expect(screen.metrics([0,0,0,0,0,-1])).toMatchObject({status:'UNCERTAIN',basis:'abstention',reasonCodes:['unsupported-damping'],humanValidation:'absent'});
        expect(createPhysicalScreen(compilePhysicalProfile({handProfileRef:'unavailable'})).metrics([0,0,0,0,0,0]).reasonCodes).toEqual(['unsupported-profile']);
    });
    it('treats corrupt candidate/profile data as errors, and freezes assessment evidence', () => {
        const req=compileRequest({schema:'intent-v1',chordId:'major',rootPitchClass:0});
        const candidate=materializeStructural([0,1,0,2,3,-1],req.structural,req.requestKey);
        const screen=createPhysicalScreen(req.physicalProfile);
        const result=screen.assess(candidate);
        expect(result.status).toBe('PASS'); expect(Object.isFrozen(result.evidence)).toBe(true);
        expect(() => screen.assess({...candidate,states:[1,1,0,2,3,-1]})).toThrow();
        expect(() => screen.metrics([NaN,0,0,0,0,0])).toThrow();
        expect(() => screen.metrics([-1,-1,-1,-1,-1,-1])).toThrow();
        expect(() => createPhysicalScreen({...req.physicalProfile,scaleLengthUm:1})).toThrow();
    });
});

it('pins the independently generated table digest and every scale/fret-pair integer bound', () => {
    expect(createHash('sha256').update(WIRE_REMAINDER_Q.join(',')).digest('hex')).toBe(GEOMETRY_TABLE_SHA256);
    expect(WIRE_REMAINDER_Q[0]).toBe(1e12); expect(WIRE_REMAINDER_Q[12]).toBe(5e11); expect(WIRE_REMAINDER_Q[36]).toBe(125e9);
    for (const scale of [1,647700,2000000]) {
        const geometry=createGeometry(scale);
        for(let a=0;a<=36;a++) for(let b=0;b<=36;b++) {
            const span=geometry.span(a,b);
            expect(Number.isInteger(span)).toBe(true); expect(span).toBeGreaterThanOrEqual(0);
            expect(span).toBe(geometry.span(b,a)); expect(span).toBeLessThanOrEqual(scale);
            expect(Math.abs(span-scale*Math.abs(2**(-a/12)-2**(-b/12)))).toBeLessThanOrEqual(0.500002);
        }
    }
});

it('matches an independent barrier-segment oracle over all 5^6 small contact patterns', () => {
    for(let code=0;code<15625;code++) {
        let n=code; const states=Array.from({length:6},()=>{const f=n%5-1;n=Math.floor(n/5);return f;}) as unknown as Six<number>;
        let groups=0;
        for(let fret=1;fret<=3;fret++) {
            let occupied=false;
            for(const f of states) {
                if(f>=0 && f<fret) {if(occupied) groups++;occupied=false;}
                if(f===fret) occupied=true;
            }
            if(occupied) groups++;
        }
        expect(partialCoverGroups(states)).toBe(groups);
    }
});
