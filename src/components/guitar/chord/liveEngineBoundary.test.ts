import { it, expect } from 'vitest';
import ts from 'typescript';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { LIVE_ENGINE_VERSION } from './explorationController';

it('keeps the atomic browser path outside legacy search, boolean eligibility and offline models', () => {
    const roots = ['useChordExploration.ts', 'ChordExplorationPanel.tsx', 'voicing-playback.ts', 'engine.worker.ts'];
    const pending = roots.map(name => resolve('src/components/guitar/chord', name)), visited = new Set<string>();
    while (pending.length) {
        const file = pending.pop()!;
        if (visited.has(file)) continue;
        visited.add(file);
        const normalized = file.replaceAll('\\', '/');
        expect(normalized).not.toMatch(/\/chord\/(?:exploration|explorationPolicies|voicingSearch|rankedVoicingSearch|deductiveRanking|descriptor|fingeringConstraints)\.ts$/);
        expect(normalized).not.toMatch(/\.research|scripts\/preference|legacyAdapters|chord-exploration\.worker/);
        const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
        for (const node of source.statements) {
            if (!ts.isImportDeclaration(node) && !ts.isExportDeclaration(node)) continue;
            if (ts.isImportDeclaration(node) && node.importClause?.isTypeOnly) continue;
            if (ts.isExportDeclaration(node) && node.isTypeOnly) continue;
            if (!node.moduleSpecifier || !ts.isStringLiteral(node.moduleSpecifier)) continue;
            const specifier = node.moduleSpecifier.text;
            const base = specifier.startsWith('@/') ? resolve('src', specifier.slice(2)) : specifier.startsWith('.') ? resolve(dirname(file), specifier) : null;
            if (!base) continue;
            const target = ['.ts', '.tsx', '/index.ts'].map(suffix => base + suffix).find(existsSync);
            if (target) pending.push(target);
        }
    }
    expect(visited.size).toBeGreaterThan(25);
    expect(LIVE_ENGINE_VERSION).toBe('guitar-engine/2');
    const app = readFileSync(resolve('src/components/guitar/ClientApp.tsx'), 'utf8');
    expect(app).not.toMatch(/resolveBridgeSelection|exploration\.candidates|hasPlayableCandidates|\.voicing\.playable/);
});
