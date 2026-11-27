"use client";

import { Fragment, useEffect, useRef, useState, type CSSProperties } from 'react';
import type { ChordRef, RelationExample } from '@/domain/harmony/types';
import { exampleTransitions, toneLabel } from '@/domain/harmony/connections';
import { formatAccidentals as accidental } from '@/domain/shared/spelling';
import { pitchMotion, rootMotionLabel, voiceMap } from './voice-map';
import styles from './relation-diagram.module.css';

const degreeName = (degree: string) => ({ '1': 'root', '3': '3rd', b3: '♭3rd', '7': '7th', b7: '♭7', '5': '5th' }[degree] ?? accidental(degree));
type Props = { example: RelationExample; onOpenChord: (chord: ChordRef) => void; activeStep: number | null; previewGuide?: boolean };

function VoiceDiagram({ example, onOpenChord, activeStep, previewGuide, label }: Props & { label?: string }) {
    const [focused, setFocused] = useState<{ step: number; degree: string } | null>(null);
    const { edges, lanes, rows } = voiceMap(example), count = example.steps.length;
    const surface = useRef<HTMLDivElement>(null);
    const minWidth = count * 156;
    const [width, setWidth] = useState(minWidth);
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
    const selected = (step: number, degree: string) => focused?.step === step && focused.degree === degree;
    edges.forEach(e => {
        if (selected(e.from, e.fromDegree)) linked.add(`${e.to}:${e.toDegree}`);
        if (selected(e.to, e.toDegree)) linked.add(`${e.from}:${e.fromDegree}`);
    });
    const preview = previewGuide && !focused ? edges.find(edge => edge.guide && !edge.held) ?? edges.find(edge => edge.guide) : undefined;
    const captions = edges.map(edge => {
        if (edge !== preview && !selected(edge.from, edge.fromDegree) && !selected(edge.to, edge.toDegree)) return null;
        const from = toneLabel(example.steps[edge.from], edge.fromDegree);
        const to = toneLabel(example.steps[edge.to], edge.toDegree);
        const a = accidental(from.name), b = accidental(to.name);
        if (edge.held) return { symbol: `${a} = ${b}`, spoken: `${a} held as ${b}` };
        if (example.kind === 'comparison') return { symbol: `${a} ↔ ${b}`, spoken: `${a} compared with ${b}` };
        const motion = pitchMotion(from.pitchClass, to.pitchClass);
        return { symbol: `${a} → ${b}  ${motion.symbol}`, spoken: `${a} to ${b}, ${motion.spoken}` };
    });
    const unlinked = focused && !linked.size;
    return <section className={styles.diagram} aria-label={label ?? (example.kind === 'comparison' ? 'Chord comparison' : 'Voice movement')}>
        {label && <h4>{label}</h4>}
        <div className={styles.legend}>{legend.map(item => <span key={item}>{item}</span>)}</div>
        <div className={styles.viewport} tabIndex={0} aria-label="Chord tone connections">
            <div ref={surface} className={styles.surface} style={{ '--columns': count, '--map-min': `${minWidth}px` } as CSSProperties}>
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
                            const caption = captions[i];
                            return <Fragment key={i}>
                                <span className={styles.connection} style={{ left: x1, top: y1, width: length, transform: `translateY(-50%) rotate(${angle}rad)` }} data-held={edge.held} data-guide={edge.guide} data-active={!!caption || activeStep === edge.to} />
                                {caption && <span className={styles.lineCaption} style={{ left: (x1 + x2) / 2, top: (y1 + y2) / 2 }}>{caption.symbol}</span>}
                            </Fragment>;
                        })}
                        {unlinked && <span className={styles.lineCaption} style={{
                            left: (focused.step === count - 1 ? focused.step : focused.step + 1) * width / count,
                            top: lanes[focused.step].get(focused.degree)! * 60 + 30,
                        }}>No link</span>}
                    </div>
                    {example.steps.flatMap((step, index) => step.chord.tones.map(tone => {
                        const name = toneLabel(step, tone.degree), isLinked = linked.has(`${index}:${tone.degree}`);
                        // Analytical bass: badged in its own role row, never moved to the bottom.
                        const bass = step.chord.bass !== undefined && tone.pitchClass === step.chord.bassPitchClass;
                        const guide = edges.some(e => e.guide && (e.from === index && e.fromDegree === tone.degree || e.to === index && e.toDegree === tone.degree));
                        return <button key={`${index}:${tone.degree}`} type="button" className={styles.tone} style={{ left: `${(index + .5) * 100 / count}%`, top: lanes[index].get(tone.degree)! * 60 + 8 }} data-guide={guide} data-linked={isLinked} data-playing={guide && activeStep === index} aria-pressed={selected(index, tone.degree)} data-bass={bass} aria-label={`${name.name}, degree ${name.degree}${bass ? ', bass' : ''} in ${step.chord.name}${isLinked ? ', connected to selected tone' : ''}`} onClick={() => setFocused(selected(index, tone.degree) ? null : { step: index, degree: tone.degree })}>
                            <span className={styles.degree}>{degreeName(name.degree)}{bass && <span className={styles.bass} aria-hidden="true"> · bass</span>}</span><span className={styles.note}>{accidental(name.name)}</span>
                        </button>;
                    }))}
                </div>
            </div>
        </div>
        <div className={styles.motionLabels}>{example.facts.map((fact, i) => <p key={i}>{accidental(example.steps[i].chord.root)} {example.kind === 'comparison' ? '↔' : '→'} {accidental(example.steps[i + 1].chord.root)}<span>{rootMotionLabel(example.steps[i].chord.root, example.steps[i + 1].chord.root, fact.rootMotion)}</span></p>)}</div>
        <ul className={styles.srOnly} aria-label="Tone correspondence">{edges.map((edge, i) => <li key={i}>{toneLabel(example.steps[edge.from], edge.fromDegree).name} {edge.held ? 'held as' : example.kind === 'comparison' ? 'compared with' : 'to'} {toneLabel(example.steps[edge.to], edge.toDegree).name}</li>)}</ul>
        <div className={styles.srOnly} role="status">{!focused ? '' : unlinked ? 'No linked tone' : captions.flatMap(caption => caption ? [caption.spoken] : []).join('. ')}</div>
        <details className={styles.details}><summary>Common and changed tones</summary>
            <p>Rows · chord roles, root at bottom</p>
            <p>{example.kind === 'comparison' ? 'Pitch comparison' : nearest ? 'Nearest agreed pitch-class motion' : 'Illustrative voice leading'}</p>
            {example.facts.map((fact, i) => <div key={i}><h5>{example.steps[i].chord.name} / {example.steps[i + 1].chord.name}</h5><p>Root distance: {fact.rootMotion} semitones up</p><p>Common tones: {fact.shared.map(pc => accidental(example.steps[i].chord.tones.find(t => t.pitchClass === pc)!.name)).join(', ') || 'None'}</p><p>Changed tones: {fact.removed.length} out, {fact.added.length} in</p></div>)}
        </details>
    </section>;
}

function TritoneComparison({ original, substitute, selectedId }: {
    original: RelationExample; substitute: RelationExample; selectedId: string;
}) {
    const approaches = [original, substitute];
    const a = original.steps[0], b = substitute.steps[0];
    const guidePairs = a.chord.tones.flatMap(tone => {
        if (tone.degree !== '3' && tone.degree !== 'b7') return [];
        const partner = b.chord.tones.find(other => other.pitchClass === tone.pitchClass
            && (other.degree === '3' || other.degree === 'b7'));
        return partner ? [[toneLabel(a, tone.degree), toneLabel(b, partner.degree)]] : [];
    });
    return <table className={styles.tritoneTable} aria-label="Tritone substitution comparison">
        <thead><tr>{approaches.map(item => <th key={item.id} scope="col" aria-current={item.id === selectedId ? 'true' : undefined}>
            <small>{item.id === 'original' ? 'A · Original dominant' : 'B · Tritone substitute'}</small>
            {item.steps.map(step => step.chord.name).join(' → ')}
        </th>)}</tr></thead>
        <tbody>
            <tr><th colSpan={2} scope="rowgroup">Shared guide tones</th></tr>
            {guidePairs.map(pair => <tr key={pair[0].degree}>{pair.map((tone, index) => <td key={index}>
                {accidental(tone.name)} <small>{degreeName(tone.degree)}</small>
            </td>)}</tr>)}
        </tbody>
        <tbody>
            <tr><th colSpan={2} scope="rowgroup">Root motion</th></tr>
            <tr>{approaches.map(item => {
                const [from, to] = item.steps;
                return <td key={item.id}>{accidental(from.chord.root)} → {accidental(to.chord.root)}
                    <small className={styles.rootInterval}>{rootMotionLabel(from.chord.root, to.chord.root, item.facts[0].rootMotion)}</small>
                </td>;
            })}</tr>
        </tbody>
    </table>;
}

export function RelationExampleView({ example, alternative, onOpenChord, activeStep, previewGuide }: Props & { alternative?: RelationExample }) {
    if (alternative) {
        const original = example.id === 'original' ? example : alternative;
        const substitute = example.id === 'original' ? alternative : example;
        return <>
            <TritoneComparison original={original} substitute={substitute} selectedId={example.id} />
            <details className={styles.details}>
                <summary>Compare voice leading</summary>
                <div className={styles.alternatives}>{[original, substitute].map(item =>
                    <VoiceDiagram key={item.id} example={item} onOpenChord={onOpenChord}
                        activeStep={item.id === example.id ? activeStep : null}
                        label={item.id === 'original' ? 'A — Original dominant' : 'B — Tritone substitute'} />)}</div>
            </details>
        </>;
    }
    return <VoiceDiagram example={example} onOpenChord={onOpenChord} activeStep={activeStep} previewGuide={previewGuide} />;
}
