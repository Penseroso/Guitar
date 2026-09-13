import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { allocationId, parseAllocationId } from './identity';
import { canonical, record } from './validation';
import { ENGINE_VERSIONS } from './versions';

describe('engine identity and boundary contracts', () => {
    it('round trips all coordinates without pitch-set or route deduplication', () => {
        const tuning = [64,59,55,50,45,40] as const;
        for (let f = -1; f <= 36; f++) {
            const states = [f,0,-1,3,2,1] as const;
            expect(parseAllocationId(allocationId(tuning, states))).toEqual({ tuning, states });
        }
        expect(allocationId(tuning, [0,-1,-1,-1,-1,-1])).not.toBe(allocationId(tuning, [-1,5,-1,-1,-1,-1]));
    });
    it('rejects malformed and noncanonical state rather than repairing it', () => {
        for (const id of ['shape-v1:064,59,55,50,45,40:0,0,0,0,0,0', 'shape-v1:64,59:0,1', 'shape-v1:64,59,55,50,45,40:37,0,0,0,0,0']) expect(() => parseAllocationId(id)).toThrow();
        expect(() => record({ typo: true }, ['schema'], 'intent')).toThrow();
        expect(canonical({ b: 1, a: [2,3] })).toBe(canonical({ a: [2,3], b: 1 }));
        expect(ENGINE_VERSIONS.empirical.enabled).toBe(false);
    });
});

it('guards structural and ranking boundaries and offline runtime exclusion', () => {
    const dir = join(process.cwd(), 'src/domain/chord/engine');
    for (const name of readdirSync(dir).filter(n => n.endsWith('.ts') && !n.endsWith('.test.ts'))) {
        const code = readFileSync(join(dir, name), 'utf8');
        const imports = code.match(/(?:import|export)[\s\S]*?from\s*['"]([^'"]+)['"]/g) ?? [];
        expect(imports.join('\n')).not.toMatch(/\.research|scripts\/preference|DadaGP|empirical-ranking/);
        if (name === 'structuralGenerator.ts') expect(imports.join('\n')).not.toMatch(/physical|Ranking|classicFeatures|components|fretGeometry/);
        if (name === 'deterministicRanking.ts') expect(code).not.toMatch(/\.status|reasonCodes|playable|localeCompare/);
        if (name === 'classicFeatures.ts') expect(imports.join('\n')).not.toMatch(/physical|deductiveRanking|descriptor|exploration/);
        if (name === 'physical.ts') expect(imports.join('\n')).not.toMatch(/classicFeatures|Ranking|descriptor|voicingSearch|registry|catalog/);
    }
});
