import { it, expect } from 'vitest';
import ts from 'typescript';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
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

it('keeps production source free of research imports and retired engine paths', () => {
    const retired = [
        'src/components/guitar/chord/chord-exploration.worker.ts',
        'src/components/guitar/chord/bridge.ts',
        'src/domain/chord/exploration.ts',
        'src/domain/chord/explorationPolicies.ts',
        'src/domain/chord/voicingSearch.ts',
        'src/domain/chord/rankedVoicingSearch.ts',
        'src/domain/chord/deductiveRanking.ts',
        'src/domain/chord/descriptor.ts',
        'src/domain/chord/fretGeometry.ts',
        'src/domain/chord/voicingStyles.ts',
        'src/domain/chord/voicingTemplateTestFixtures.ts',
        'src/domain/chord/engine/legacyAdapters.ts',
    ];
    for (const file of retired) expect(existsSync(resolve(file)), `${file} must stay retired`).toBe(false);

    const pending = [resolve('src')];
    while (pending.length) {
        const directory = pending.pop()!;
        for (const entry of readdirSync(directory, { withFileTypes: true })) {
            const file = resolve(directory, entry.name);
            if (entry.isDirectory()) pending.push(file);
            else if (/\.(?:ts|tsx|js|jsx)$/.test(entry.name)) {
                const source = readFileSync(file, 'utf8');
                expect(source, file).not.toMatch(/(?:from\s*|import\s*\(|require\s*\()\s*['"][^'"]*(?:\.research|scripts\/(?:preference|reference|physical-envelope|web-voicing|engine-integration))/);
            }
        }
    }
});
