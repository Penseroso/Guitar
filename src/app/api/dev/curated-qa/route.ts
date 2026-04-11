import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { NextResponse } from 'next/server';

import {
    getCuratedQaReviewKey,
    type CuratedQaReviewRecord,
    type CuratedQaReviewState,
} from '@/utils/guitar/chords/curated-qa';
import {
    buildCuratedQaAnalysisSummary,
} from '@/utils/guitar/chords/curated-qa-analysis';
import {
    buildCuratedQaReviewSnapshot,
    CURATED_QA_REVIEW_STORAGE_PATH,
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

function buildReviewState(records: CuratedQaReviewRecord[]): CuratedQaReviewState {
    return records.reduce<CuratedQaReviewState>((accumulator, record) => {
        accumulator[getCuratedQaReviewKey(record)] = record;
        return accumulator;
    }, {});
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

    const body = await request.json().catch(() => null);
    const incomingSnapshot = normalizeCuratedQaReviewSnapshot(body);
    const normalizedSnapshot = buildCuratedQaReviewSnapshot(buildReviewState(incomingSnapshot.reviews));

    await mkdir(path.dirname(CURATED_QA_REVIEW_STORAGE_PATH), { recursive: true });
    await writeFile(
        CURATED_QA_REVIEW_STORAGE_PATH,
        `${JSON.stringify(normalizedSnapshot, null, 2)}\n`,
        'utf8'
    );

    return NextResponse.json({
        ...normalizedSnapshot,
        analysis: buildCuratedQaAnalysisSummary(normalizedSnapshot),
    });
}
