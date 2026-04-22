import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { NextResponse } from 'next/server';

import { buildUsagePriorAnalysisSummary } from '@/utils/guitar/chords/usage-prior-analysis';
import {
    buildUsagePriorSurfaceSetSnapshot,
    type UsagePriorSurfaceSetSnapshot,
} from '@/utils/guitar/chords/usage-prior-surface';
import {
    normalizeUsagePriorSurfaceSetSnapshot,
    USAGE_PRIOR_SURFACE_SET_STORAGE_PATH,
} from '@/utils/guitar/chords/usage-prior-surface-storage';
import type { UsagePriorReviewRecord } from '@/utils/guitar/chords/usage-prior';
import {
    applyUsagePriorReviewUpdates,
    buildUsagePriorAcceptedExport,
    normalizeUsagePriorReviewRecords,
    normalizeUsagePriorReviewSnapshot,
    USAGE_PRIOR_REVIEW_STORAGE_PATH,
    USAGE_PRIOR_REVIEWED_EXPORT_PATH,
} from '@/utils/guitar/chords/usage-prior-storage';

function isDevEnvironment(): boolean {
    return process.env.NODE_ENV !== 'production';
}

async function persistJson(filePath: string, value: unknown) {
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function readSurfaceSnapshot(options: { regenerate?: boolean } = {}): Promise<UsagePriorSurfaceSetSnapshot> {
    if (options.regenerate) {
        const snapshot = buildUsagePriorSurfaceSetSnapshot({ rootPitchClasses: [0] });
        await persistJson(USAGE_PRIOR_SURFACE_SET_STORAGE_PATH, snapshot);
        return snapshot;
    }

    try {
        const raw = await readFile(USAGE_PRIOR_SURFACE_SET_STORAGE_PATH, 'utf8');
        const snapshot = normalizeUsagePriorSurfaceSetSnapshot(JSON.parse(raw));

        if (snapshot.candidates.length > 0) {
            return snapshot;
        }
    } catch {
        // Fall through to generating the current product surface snapshot.
    }

    const snapshot = buildUsagePriorSurfaceSetSnapshot({ rootPitchClasses: [0] });
    await persistJson(USAGE_PRIOR_SURFACE_SET_STORAGE_PATH, snapshot);
    return snapshot;
}

async function readReviewSnapshot() {
    try {
        const raw = await readFile(USAGE_PRIOR_REVIEW_STORAGE_PATH, 'utf8');
        return normalizeUsagePriorReviewSnapshot(JSON.parse(raw));
    } catch {
        return { updatedAt: null, reviews: [] };
    }
}

export async function GET(request: Request) {
    if (!isDevEnvironment()) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const url = new URL(request.url);
    const surfaceSnapshot = await readSurfaceSnapshot({ regenerate: url.searchParams.get('regenerate') === '1' });
    const reviewSnapshot = await readReviewSnapshot();

    return NextResponse.json({
        ...reviewSnapshot,
        surfaceSnapshot,
        analysis: buildUsagePriorAnalysisSummary(surfaceSnapshot, reviewSnapshot),
    });
}

export async function POST(request: Request) {
    if (!isDevEnvironment()) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const surfaceSnapshot = await readSurfaceSnapshot();
    const reviewSnapshot = await readReviewSnapshot();
    const body = await request.json().catch(() => null) as { submittedReviews?: UsagePriorReviewRecord[] } | null;
    const submittedReviews = normalizeUsagePriorReviewRecords(body?.submittedReviews);

    if (submittedReviews.length === 0) {
        return NextResponse.json({
            ...reviewSnapshot,
            surfaceSnapshot,
            analysis: buildUsagePriorAnalysisSummary(surfaceSnapshot, reviewSnapshot),
            saved: false,
            submittedCount: 0,
        });
    }

    const normalizedSnapshot = applyUsagePriorReviewUpdates(reviewSnapshot, submittedReviews);
    const acceptedExport = buildUsagePriorAcceptedExport(normalizedSnapshot, surfaceSnapshot);

    await persistJson(USAGE_PRIOR_REVIEW_STORAGE_PATH, normalizedSnapshot);
    await persistJson(USAGE_PRIOR_REVIEWED_EXPORT_PATH, acceptedExport);

    return NextResponse.json({
        ...normalizedSnapshot,
        surfaceSnapshot,
        acceptedExport,
        analysis: buildUsagePriorAnalysisSummary(surfaceSnapshot, normalizedSnapshot),
        saved: true,
        submittedCount: submittedReviews.length,
    });
}
