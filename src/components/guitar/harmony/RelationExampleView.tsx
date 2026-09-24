"use client";

import { useState } from 'react';
import type { ChordRef, RelationExample } from '@/domain/harmony/types';
import { formatAccidentals } from '@/domain/shared/spelling';
import styles from './harmony-workspace.module.css';

export function RelationExampleView({ example, onOpenChord, activeStep }: { example: RelationExample; onOpenChord: (chord: ChordRef) => void; activeStep: number | null }) {
    const [focused, setFocused] = useState<{ step: number; tone: number } | null>(null);
    return <div className={styles.example}>
        <div className={styles.steps}>
            {example.steps.map((step, index) => {
                const previous = index > 0 ? example.steps[index - 1] : undefined;
                const shared = previous ? new Set(previous.chord.tones.map(tone => tone.pitchClass)) : null;
                const fact = example.facts[index - 1];
                const focus = focused?.step === index ? step.chord.tones[focused.tone] : undefined;
                const rootDistance = fact ? Math.min(fact.rootMotion, (12 - fact.rootMotion) % 12) : 0;
                const guideMotion = previous && example.kind === 'motion' ? previous.guides.map((degree, guideIndex) => {
                    const from = previous.chord.tones.find(tone => tone.degree === degree);
                    const to = step.chord.tones.find(tone => tone.degree === step.guides[guideIndex]);
                    return from && to ? `${formatAccidentals(from.name)} → ${formatAccidentals(to.name)}` : null;
                }).filter((pair): pair is string => pair !== null) : [];
                return <div className={styles.stepGroup} key={`${example.id}-${index}`}>
                    {fact && <div className={styles.motion}>
                        {example.kind === 'comparison'
                            ? <>Root distance · {rootDistance} semitone{rootDistance === 1 ? '' : 's'}</>
                            : <><span aria-hidden="true">→</span> Root +{fact.rootMotion} / −{(12 - fact.rootMotion) % 12} semitones</>}
                        <span className={styles.motionDetails}> · {fact.shared.length} shared · {fact.removed.length} out · {fact.added.length} in</span>
                    </div>}
                    {guideMotion.length > 0 && <div className={styles.guideMotion}>Guide tones · {guideMotion.join(' · ')}</div>}
                    <div className={styles.step} data-playing={activeStep === index}>
                        <div className={styles.stepHead}>
                            <div>{example.kind === 'comparison' && <span className={styles.comparisonIndex}>{index === 0 ? 'A' : 'B'}</span>}<span className={styles.roman}>{step.roman}</span><span className={styles.role}>{step.role}</span></div>
                            <button type="button" className={styles.chordLink} onClick={() => onOpenChord(step.chord)} aria-label={`Open ${step.chord.name} in Chord`}>{step.chord.name}<span aria-hidden="true"> ↗</span></button>
                        </div>
                        <div className={styles.toneStrip} aria-label={`${step.chord.name} tones`}>
                            {step.chord.tones.map((tone, toneIndex) => <button type="button" key={`${tone.degree}-${toneIndex}`} aria-label={`${tone.name}, degree ${tone.degree} in ${step.chord.name}`} aria-pressed={focused?.step === index && focused.tone === toneIndex} onClick={() => setFocused(current => current?.step === index && current.tone === toneIndex ? null : { step: index, tone: toneIndex })} className={`${styles.tone} ${shared?.has(tone.pitchClass) ? styles.sharedTone : ''} ${shared && !shared.has(tone.pitchClass) ? styles.changedTone : ''}`}>
                                <span className={styles.toneDegree}>{formatAccidentals(tone.degree)}</span><span className={styles.toneName}>{formatAccidentals(tone.name)}</span>
                            </button>)}
                        </div>
                        {focus && <p className={styles.toneDetail}>{formatAccidentals(focus.name)} · {formatAccidentals(focus.degree)} of {step.chord.name}{previous ? shared?.has(focus.pitchClass) ? ' · shared with previous chord' : ' · changed from previous chord' : ''}{step.guides.includes(focus.degree) ? ' · guide tone' : ''}</p>}
                        {step.guides.length > 0 && <p className={styles.guide}>Guide tones · {step.guides.map(formatAccidentals).join(' · ')}</p>}
                    </div>
                </div>;
            })}
        </div>
    </div>;
}
