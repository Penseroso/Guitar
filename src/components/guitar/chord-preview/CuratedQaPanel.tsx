"use client";

import React from 'react';

import {
    getVoicingFamilyLabel,
    getVoicingProvenanceLabel,
    getVoicingRegisterLabel,
} from '../../../utils/guitar/chords';
import {
    getCuratedQaDecisionForCandidate,
    type CuratedQaCandidate,
    type CuratedQaDecision,
    type CuratedQaReviewState,
} from '../../../utils/guitar/chords/curated-qa';
import { CompactVoicingDiagram } from './CompactVoicingDiagram';

interface CuratedQaPanelProps {
    candidates: CuratedQaCandidate[];
    reviews: CuratedQaReviewState;
    onReview: (candidate: CuratedQaCandidate, decision: CuratedQaDecision) => void;
    onSubmit: () => void;
    isSubmitting: boolean;
    submitStatus: string | null;
    lastSavedAt: string | null;
}

function getCandidateMeta(candidate: CuratedQaCandidate): string[] {
    const tags = [
        getVoicingFamilyLabel(candidate.voicing.descriptor.family),
        getVoicingRegisterLabel(candidate.voicing.descriptor.registerBand),
        getVoicingProvenanceLabel(candidate.voicing.descriptor.provenance),
    ];

    if (candidate.voicing.descriptor.rootString !== undefined) {
        tags.push(`Root ${candidate.voicing.descriptor.rootString + 1}`);
    }

    return tags;
}

export function CuratedQaPanel({
    candidates,
    reviews,
    onReview,
    onSubmit,
    isSubmitting,
    submitStatus,
    lastSavedAt,
}: CuratedQaPanelProps) {
    const reviewedCount = Object.keys(reviews).length;

    return (
        <section
            className="rounded-[2rem] border border-amber-200/10 bg-[#080807] p-6"
            aria-label="Developer curated QA"
        >
            <div className="flex flex-col gap-2 border-b border-white/5 pb-4">
                <span className="text-[9px] font-black uppercase tracking-[0.35em] text-amber-100/45">Developer Only</span>
                <div className="flex flex-wrap items-end justify-between gap-3">
                    <div className="flex flex-col gap-1">
                        <h3 className="text-xl font-black tracking-tight text-white">Curated QA</h3>
                        <p className="text-xs text-white/55">
                            Internal review surface for the curated pilot only. Decisions stay in local in-memory state.
                        </p>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.22em] text-white/32">
                        {reviewedCount}/{candidates.length} reviewed
                    </span>
                </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {candidates.map((candidate) => {
                    const decision = getCuratedQaDecisionForCandidate(reviews, candidate);
                    const meta = getCandidateMeta(candidate);

                    return (
                        <article
                            key={candidate.candidateId}
                            className="rounded-[1.4rem] border border-white/6 bg-white/[0.02] p-4"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="text-[10px] font-black uppercase tracking-[0.22em] text-white/65">
                                            {candidate.chordLabel}
                                        </span>
                                        <span className="rounded-full border border-amber-100/15 bg-amber-100/5 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.18em] text-amber-50/70">
                                            {candidate.sourceLabel}
                                        </span>
                                    </div>
                                    <p className="mt-2 text-sm font-semibold text-white">{candidate.displayName}</p>
                                    <p className="mt-1 text-xs text-white/48">{candidate.chordTypeLabel}</p>
                                    {candidate.displaySubtitle && (
                                        <p className="mt-1 text-[11px] text-white/42">{candidate.displaySubtitle}</p>
                                    )}
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-white/28">
                                    {decision ?? 'pending'}
                                </span>
                            </div>

                            <div className="mt-4 flex min-h-[10.5rem] items-center justify-center rounded-[1rem] border border-white/6 bg-[#070707] px-2 py-3">
                                <CompactVoicingDiagram voicing={candidate.voicing} labelMode="degree" />
                            </div>

                            <div className="mt-4 flex flex-wrap gap-1.5">
                                {meta.map((item) => (
                                    <span
                                        key={`${candidate.candidateId}-${item}`}
                                        className="rounded-full border border-white/8 px-2 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-white/42"
                                    >
                                        {item}
                                    </span>
                                ))}
                                {candidate.seedId && (
                                    <span className="rounded-full border border-white/8 px-2 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-white/42">
                                        {candidate.seedId}
                                    </span>
                                )}
                            </div>

                            <div className="mt-4 grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => onReview(candidate, 'accept')}
                                    className={`rounded-full border px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] transition-colors ${
                                        decision === 'accept'
                                            ? 'border-emerald-200/35 bg-emerald-300/[0.12] text-emerald-50'
                                            : 'border-white/10 bg-white/[0.02] text-white/68 hover:border-emerald-200/20 hover:text-white'
                                    }`}
                                >
                                    Accept
                                </button>
                                <button
                                    type="button"
                                    onClick={() => onReview(candidate, 'reject')}
                                    className={`rounded-full border px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] transition-colors ${
                                        decision === 'reject'
                                            ? 'border-red-200/35 bg-red-300/[0.12] text-red-50'
                                            : 'border-white/10 bg-white/[0.02] text-white/68 hover:border-red-200/20 hover:text-white'
                                    }`}
                                >
                                    Reject
                                </button>
                            </div>
                        </article>
                    );
                })}
            </div>

            <div className="mt-5 flex flex-col gap-3 border-t border-white/5 pt-4 md:flex-row md:items-center md:justify-between">
                <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-black uppercase tracking-[0.18em] text-white/32">
                        {lastSavedAt ? `Saved ${new Date(lastSavedAt).toLocaleString()}` : 'Not submitted yet'}
                    </span>
                    {submitStatus && (
                        <span className="text-xs text-white/55">{submitStatus}</span>
                    )}
                </div>
                <button
                    type="button"
                    onClick={onSubmit}
                    disabled={isSubmitting}
                    className="rounded-full border border-amber-200/25 bg-amber-200/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-amber-50 transition-colors hover:border-amber-100/40 hover:bg-amber-200/14 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {isSubmitting ? 'Submitting...' : 'Submit QA'}
                </button>
            </div>
        </section>
    );
}
