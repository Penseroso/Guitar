"use client";

import React from 'react';

import {
    getVoicingFamilyLabel,
    getVoicingProvenanceLabel,
    getVoicingRegisterLabel,
} from '../../../utils/guitar/chords';
import {
    getUsagePriorDecisionForCandidate,
    type UsagePriorDecision,
    type UsagePriorReviewState,
} from '../../../utils/guitar/chords/usage-prior';
import {
    groupUsagePriorSurfaceCandidates,
    type UsagePriorSurfaceCandidate,
} from '../../../utils/guitar/chords/usage-prior-surface';
import type { UsagePriorAnalysisSummary } from '../../../utils/guitar/chords/usage-prior-analysis';
import { CompactVoicingDiagram } from './CompactVoicingDiagram';

interface UsagePriorSeedPanelProps {
    candidates: UsagePriorSurfaceCandidate[];
    persistedReviews: UsagePriorReviewState;
    sessionReviews: UsagePriorReviewState;
    effectiveReviews: UsagePriorReviewState;
    onReview: (candidate: UsagePriorSurfaceCandidate, decision: UsagePriorDecision) => void;
    onSubmit: () => void;
    isSubmitting: boolean;
    hasPendingChanges: boolean;
    submitStatus: string | null;
    lastSavedAt: string | null;
    analysis?: UsagePriorAnalysisSummary | null;
}

function getCandidateMeta(candidate: UsagePriorSurfaceCandidate): string[] {
    const descriptor = candidate.voicingDescriptor;
    const tags = [
        getVoicingFamilyLabel(descriptor.family),
        getVoicingRegisterLabel(descriptor.registerBand),
        getVoicingProvenanceLabel(candidate.provenance),
        descriptor.inversion,
        `${descriptor.noteCount} notes`,
    ];

    if (descriptor.rootString !== undefined) {
        tags.push(`Root ${descriptor.rootString + 1}`);
    }

    if (descriptor.optionalCoverageDegrees.length > 0) {
        tags.push(`Optional ${descriptor.optionalCoverageDegrees.join(', ')}`);
    }

    return tags;
}

export function UsagePriorSeedPanel({
    candidates,
    persistedReviews,
    sessionReviews,
    effectiveReviews,
    onReview,
    onSubmit,
    isSubmitting,
    hasPendingChanges,
    submitStatus,
    lastSavedAt,
    analysis,
}: UsagePriorSeedPanelProps) {
    const reviewedCount = Object.keys(effectiveReviews).length;
    const acceptedCount = Object.values(effectiveReviews).filter((review) => review.decision === 'accept').length;
    const rejectedCount = Object.values(effectiveReviews).filter((review) => review.decision === 'reject').length;
    const sessionReviewCount = Object.keys(sessionReviews).length;
    const persistedReviewCount = Object.keys(persistedReviews).length;
    const candidateGroups = groupUsagePriorSurfaceCandidates(candidates);

    return (
        <section
            className="rounded-[2rem] border border-emerald-200/10 bg-[#070909] p-6"
            aria-label="Developer usage prior seed review"
        >
            <div className="flex flex-col gap-2 border-b border-white/5 pb-4">
                <span className="text-[9px] font-black tracking-[0.35em] text-emerald-100/45">Developer Only</span>
                <div className="flex flex-wrap items-end justify-between gap-3">
                    <div className="flex flex-col gap-1">
                        <h3 className="text-xl font-black tracking-tight text-white">Usage Prior Seed Review</h3>
                        <p className="text-xs text-white/55">
                            Review the current product surface set for usage-prior seeding. Submit saves the full review ledger and materializes accepted candidates into the prior export.
                        </p>
                    </div>
                    <div className="flex flex-col items-start gap-1 text-[10px] font-black tracking-[0.22em] text-white/32 md:items-end">
                        <span>{reviewedCount}/{candidates.length} reviewed</span>
                        <span>{acceptedCount} accepted · {rejectedCount} rejected</span>
                        <span>{sessionReviewCount} unsaved session edits · {persistedReviewCount} saved decisions loaded</span>
                        {analysis && (
                            <span>{analysis.unreviewedCount} unreviewed in current surface snapshot</span>
                        )}
                    </div>
                </div>
            </div>

            <div className="mt-5 flex flex-col gap-5">
                {candidateGroups.map((group) => {
                    const groupReviews = group.candidates
                        .map((candidate) => getUsagePriorDecisionForCandidate(effectiveReviews, candidate))
                        .filter((decision): decision is UsagePriorDecision => decision !== null);
                    const groupAcceptedCount = groupReviews.filter((decision) => decision === 'accept').length;
                    const groupRejectedCount = groupReviews.filter((decision) => decision === 'reject').length;

                    return (
                        <section
                            key={group.chordType}
                            className="rounded-[1.6rem] border border-white/6 bg-white/[0.02] p-4"
                        >
                            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-white/5 pb-3">
                                <div className="flex flex-col gap-1">
                                    <span className="text-[10px] font-black tracking-[0.22em] text-white/38">
                                        {group.chordLabel}
                                    </span>
                                    <h4 className="text-sm font-black tracking-[0.18em] text-white/80">
                                        {group.chordTypeLabel} surface candidates
                                    </h4>
                                </div>
                                <div className="flex flex-col items-start gap-1 text-[10px] font-black tracking-[0.2em] text-white/32 md:items-end">
                                    <span>{groupReviews.length}/{group.candidates.length} reviewed</span>
                                    <span>{groupAcceptedCount} accepted · {groupRejectedCount} rejected</span>
                                </div>
                            </div>

                            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                                {group.candidates.map((candidate) => {
                                    const savedDecision = getUsagePriorDecisionForCandidate(persistedReviews, candidate);
                                    const pendingDecision = getUsagePriorDecisionForCandidate(sessionReviews, candidate);
                                    const decision = getUsagePriorDecisionForCandidate(effectiveReviews, candidate);
                                    const meta = getCandidateMeta(candidate);

                                    return (
                                        <article
                                            key={candidate.candidateId}
                                            className="rounded-[1.4rem] border border-white/6 bg-[#090909] p-4"
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className="text-[10px] font-black tracking-[0.22em] text-white/65">
                                                            {candidate.chordLabel}
                                                        </span>
                                                        <span className="rounded-full border border-emerald-100/15 bg-emerald-100/5 px-2 py-0.5 text-[9px] font-black tracking-[0.18em] text-emerald-50/70">
                                                            {candidate.sourceLabel}
                                                        </span>
                                                    </div>
                                                    <p className="mt-2 text-sm font-semibold text-white">{candidate.displayName}</p>
                                                    <p className="mt-1 text-xs text-white/48">{candidate.chordTypeLabel}</p>
                                                    {candidate.displaySubtitle && (
                                                        <p className="mt-1 text-[11px] text-white/42">{candidate.displaySubtitle}</p>
                                                    )}
                                                </div>
                                                <span className="text-[10px] font-black tracking-[0.18em] text-white/28">
                                                    {pendingDecision
                                                        ? `unsaved ${pendingDecision}`
                                                        : savedDecision
                                                            ? `saved ${savedDecision}`
                                                            : 'pending'}
                                                </span>
                                            </div>

                                            <div className="mt-4 flex min-h-[10.5rem] items-center justify-center rounded-[1rem] border border-white/6 bg-[#070707] px-2 py-3">
                                                <CompactVoicingDiagram voicing={candidate.voicing} labelMode="degree" />
                                            </div>

                                            <div className="mt-4 flex flex-wrap gap-1.5">
                                                {meta.map((item) => (
                                                    <span
                                                        key={`${candidate.candidateId}-${item}`}
                                                        className="rounded-full border border-white/8 px-2 py-1 text-[9px] font-black tracking-[0.14em] text-white/42"
                                                    >
                                                        {item}
                                                    </span>
                                                ))}
                                                {candidate.seedId && (
                                                    <span className="rounded-full border border-white/8 px-2 py-1 text-[9px] font-black tracking-[0.14em] text-white/42">
                                                        {candidate.seedId}
                                                    </span>
                                                )}
                                            </div>

                                            <div className="mt-4 grid grid-cols-2 gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => onReview(candidate, 'accept')}
                                                    className={`rounded-full border px-3 py-2 text-[10px] font-black tracking-[0.2em] transition-colors ${
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
                                                    className={`rounded-full border px-3 py-2 text-[10px] font-black tracking-[0.2em] transition-colors ${
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
                        </section>
                    );
                })}
            </div>

            <div className="mt-5 flex flex-col gap-3 border-t border-white/5 pt-4 md:flex-row md:items-center md:justify-between">
                <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-black tracking-[0.18em] text-white/32">
                        {hasPendingChanges
                            ? `${sessionReviewCount} unsaved review updates pending submit`
                            : lastSavedAt
                                ? `Saved ${new Date(lastSavedAt).toLocaleString()}`
                                : 'No saved usage prior review ledger yet'}
                    </span>
                    {submitStatus && (
                        <span className="text-xs text-white/55">{submitStatus}</span>
                    )}
                </div>
                <button
                    type="button"
                    onClick={onSubmit}
                    disabled={isSubmitting || !hasPendingChanges}
                    className="rounded-full border border-emerald-200/25 bg-emerald-200/10 px-4 py-2 text-[10px] font-black tracking-[0.2em] text-emerald-50 transition-colors hover:border-emerald-100/40 hover:bg-emerald-200/14 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {isSubmitting ? 'Submitting...' : hasPendingChanges ? 'Submit Usage Prior Reviews' : 'No Changes To Submit'}
                </button>
            </div>
        </section>
    );
}

