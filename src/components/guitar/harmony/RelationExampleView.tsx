"use client";

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { ChordRef, RelationExample } from '@/domain/harmony/types';
import { exampleTransitions } from '@/domain/harmony/connections';
import { toneLabel } from '@/domain/harmony/connections';
import { formatAccidentals as accidental } from '@/domain/shared/spelling';
import { rootMotionLabel, voiceMap, type VoiceLayout } from './voice-map';
import styles from './relation-diagram.module.css';

const degreeName = (degree: string) => ({ '1': 'root', '3': '3rd', b3: '♭3rd', '7': '7th', b7: '♭7', '5': '5th' }[degree] ?? accidental(degree));
type Props = { example: RelationExample; onOpenChord: (chord: ChordRef) => void; activeStep: number | null };

function VoiceDiagram({ example, onOpenChord, activeStep, label, align }: Props & { label?: string; align?: VoiceLayout }) {
    const [focused, setFocused] = useState<{ step: number; degree: string } | null>(null);
    const { edges, lanes, rows } = voiceMap(example, align), count = example.steps.length;
    const surface = useRef<HTMLDivElement>(null);
    const [width, setWidth] = useState(count === 3 ? 330 : 290);
    useEffect(() => {
        if (!surface.current || typeof ResizeObserver === 'undefined') return;
        const observer = new ResizeObserver(entries => setWidth(entries[0].contentRect.width));
        observer.observe(surface.current);
        return () => observer.disconnect();
    }, []);
    // The legend names only connection types this example actually draws.
    const legend = example.kind === 'comparison' ? ['Chord comparison', '— Common tones', '↔ Changed tones'] : [
        edges.some(e => e.guide) && 'Guide tones',
        edges.some(e => !e.guide && e.kind === 'resolution') && '→ Resolving tones',
        edges.some(e => e.kind === 'neighbor') && '→ Neighbor tones',
        edges.some(e => e.kind === 'approach') && '→ Voice leading',
        edges.some(e => e.held) && '— Common tones',
    ].filter((item): item is string => !!item);
    const nearest = exampleTransitions(example).some(t => t.basis === 'nearest');
    const linked = new Set<string>();
    const selected = (from: number, degree: string) => focused?.step === from && focused.degree === degree;
    edges.forEach(e => {
        if (selected(e.from, e.fromDegree)) linked.add(`${e.to}:${e.toDegree}`);
        if (selected(e.to, e.toDegree)) linked.add(`${e.from}:${e.fromDegree}`);
    });
    return <section className={styles.diagram} aria-label={label ?? (example.kind === 'comparison' ? 'Chord comparison' : 'Voice movement')}>
        {label && <h4>{label}</h4>}
        <div className={styles.legend}>{legend.map(item => <span key={item}>{item}</span>)}</div>
        <div className={styles.viewport} tabIndex={0} aria-label="Chord tone connections">
            <div ref={surface} className={styles.surface} style={{ '--columns': count, '--map-min': `${count === 3 ? 330 : 290}px` } as CSSProperties}>
                <div className={styles.headings}>
                    {example.steps.map((step, index) => <div key={index} className={styles.heading} data-playing={activeStep === index}>
                        <span className={styles.roman}>{step.roman}</span>
                        <button type="button" className={styles.chord} aria-label={`Open ${step.chord.name} in Chord`} onClick={() => onOpenChord(step.chord)}>{step.chord.name}<span aria-hidden="true"> ↗</span></button>
                        <span className={styles.role}>{step.role === 'Target' ? 'Resolution destination' : step.role}</span>
                    </div>)}
                </div>
                <div className={styles.map} style={{ height: rows * 60 }}>
                    <div className={styles.lines} aria-hidden="true">
                        {edges.map((edge, i) => {
                            const x1 = (edge.from + .5) * width / count + 36, x2 = (edge.to + .5) * width / count - 36;
                            const y1 = lanes[edge.from].get(edge.fromDegree)! * 60 + 30, y2 = lanes[edge.to].get(edge.toDegree)! * 60 + 30;
                            const length = Math.hypot(x2 - x1, y2 - y1);
                            const angle = Math.atan2(y2 - y1, x2 - x1);
                            return <span key={i} className={styles.connection} style={{ left: x1, top: y1, width: length, transform: `translateY(-50%) rotate(${angle}rad)` }} data-held={edge.held} data-guide={edge.guide} data-active={selected(edge.from, edge.fromDegree) || selected(edge.to, edge.toDegree) || activeStep === edge.to} data-bidirectional={!edge.held && example.kind === 'comparison'} />;
                        })}
                    </div>
                    {example.steps.flatMap((step, index) => step.chord.tones.map(tone => {
                        const name = toneLabel(step, tone.degree), isLinked = linked.has(`${index}:${tone.degree}`);
                        const guide = edges.some(e => e.guide && (e.from === index && e.fromDegree === tone.degree || e.to === index && e.toDegree === tone.degree));
                        return <button key={`${index}:${tone.degree}`} type="button" className={styles.tone} style={{ left: `${(index + .5) * 100 / count}%`, top: lanes[index].get(tone.degree)! * 60 + 8 }} data-guide={guide} data-linked={isLinked} data-playing={guide && activeStep === index} aria-pressed={selected(index, tone.degree)} aria-label={`${name.name}, degree ${name.degree} in ${step.chord.name}${isLinked ? ', connected to selected tone' : ''}`} onClick={() => setFocused(selected(index, tone.degree) ? null : { step: index, degree: tone.degree })}>
                            <span className={styles.degree}>{degreeName(name.degree)}</span><span className={styles.note}>{accidental(name.name)}</span>
                        </button>;
                    }))}
                </div>
            </div>
        </div>
        <div className={styles.motionLabels}>{example.facts.map((fact, i) => <p key={i}>{accidental(example.steps[i].chord.root)} {example.kind === 'comparison' ? '↔' : '→'} {accidental(example.steps[i + 1].chord.root)}<span>{rootMotionLabel(example.steps[i].chord.root, example.steps[i + 1].chord.root, fact.rootMotion)}</span></p>)}</div>
        <ul className={styles.srOnly} aria-label="Tone correspondence">{edges.map((edge, i) => <li key={i}>{toneLabel(example.steps[edge.from], edge.fromDegree).name} {edge.held ? 'held as' : example.kind === 'comparison' ? 'compared with' : 'to'} {toneLabel(example.steps[edge.to], edge.toDegree).name}</li>)}</ul>
        {focused && <div className={styles.selection} aria-live="polite">{edges.filter(e => selected(e.from, e.fromDegree) || selected(e.to, e.toDegree)).map((e, i) => <p key={i}>{accidental(toneLabel(example.steps[e.from], e.fromDegree).name)} {e.held ? '—' : example.kind === 'comparison' ? '↔' : '→'} {accidental(toneLabel(example.steps[e.to], e.toDegree).name)}<span>{e.held ? 'Common tone' : `${degreeName(toneLabel(example.steps[e.from], e.fromDegree).degree)} → ${degreeName(toneLabel(example.steps[e.to], e.toDegree).degree)}`}</span></p>)}</div>}
        <details className={styles.details}><summary>Details</summary>
            <p>{example.kind === 'comparison' ? 'Common tones and chromatic differences. Not a progression.' : nearest ? 'Smallest pitch-class motion; ambiguous moves stay unlinked. Not a performed voicing.' : 'Illustrative voice connections. Not a performed voicing.'}</p>
            {example.facts.map((fact, i) => <div key={i}><h5>{example.steps[i].chord.name} / {example.steps[i + 1].chord.name}</h5><p>Root distance: {fact.rootMotion} semitones up</p><p>Common tones: {fact.shared.map(pc => accidental(example.steps[i].chord.tones.find(t => t.pitchClass === pc)!.name)).join(', ') || 'None'}</p><p>Changed tones: {fact.removed.length} out, {fact.added.length} in</p></div>)}
        </details>
    </section>;
}

export function RelationExampleView({ example, alternative, onOpenChord, activeStep }: Props & { alternative?: RelationExample }) {
    const label = (item: RelationExample) => item.id === 'original' ? 'A — Original dominant' : 'B — Tritone substitute';
    if (alternative) {
        const pair = [example, alternative].sort((a, b) => Number(b.id === 'original') - Number(a.id === 'original'));
        const original = pair[0], layout = voiceMap(original);
        return <div className={styles.alternatives}>{pair.map(item => <VoiceDiagram key={item.id} example={item} onOpenChord={onOpenChord} activeStep={item.id === example.id ? activeStep : null} label={label(item)} align={item === original ? undefined : layout} />)}</div>;
    }
    return <div>
        <VoiceDiagram example={example} onOpenChord={onOpenChord} activeStep={activeStep} />
    </div>;
}
