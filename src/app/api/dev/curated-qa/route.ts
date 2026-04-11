import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { NextResponse } from 'next/server';

import {
    type CuratedQaReviewRecord,
} from '@/utils/guitar/chords/curated-qa';
import {
    buildCuratedQaAnalysisSummary,
} from '@/utils/guitar/chords/curated-qa-analysis';
import {
    applyCuratedQaReviewUpdates,
    CURATED_QA_REVIEW_STORAGE_PATH,
    normalizeCuratedQaReviewRecords,
    normalizeCuratedQaReviewSnapshot,
} from '@/utils/guitar/chords/curated-qa-storage';

function isDevEnvironment(): boolean {
    return process.env.NODE_ENV !== 'production';
}

async function readSnapshot() {
    try {
        const raw = await readFile(CURATED_QA_REVIEW_STORAGE_PATH, 'utf8');
        return normalizeCuratedQaReviewSnapshot(JSON.parse(raw));
    } catch {
        return { updatedAt: null, reviews: [] };
    }
}

export async function GET() {
    if (!isDevEnvironment()) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const snapshot = await readSnapshot();
    return NextResponse.json({
        ...snapshot,
        analysis: buildCuratedQaAnalysisSummary(snapshot),
    });
}

export async function POST(request: Request) {
    if (!isDevEnvironment()) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const snapshot = await readSnapshot();
    const body = await request.json().catch(() => null) as { submittedReviews?: CuratedQaReviewRecord[] } | null;
    const submittedReviews = normalizeCuratedQaReviewRecords(body?.submittedReviews);

    if (submittedReviews.length === 0) {
        return NextResponse.json({
            ...snapshot,
            analysis: buildCuratedQaAnalysisSummary(snapshot),
            saved: false,
            submittedCount: 0,
        });
    }

    const normalizedSnapshot = applyCuratedQaReviewUpdates(snapshot, submittedReviews);

    await mkdir(path.dirname(CURATED_QA_REVIEW_STORAGE_PATH), { recursive: true });
    await writeFile(
        CURATED_QA_REVIEW_STORAGE_PATH,
        `${JSON.stringify(normalizedSnapshot, null, 2)}\n`,
        'utf8'
    );

    return NextResponse.json({
        ...normalizedSnapshot,
        analysis: buildCuratedQaAnalysisSummary(normalizedSnapshot),
        saved: true,
        submittedCount: submittedReviews.length,
    });
}
