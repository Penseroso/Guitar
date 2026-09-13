# Reproduction

This directory is a completed research snapshot. Production and the locked Product Policy v2 are unchanged. Run from the repository root, using the existing Node 22 / TypeScript toolchain. Source coordinates use physical strings high E to low E; Markdown human-readable shapes explicitly reverse this order.

## Frozen inputs

- `acquisition.json`: 600 page counts and 1,510 minimal comparable allocation records; page, explicit-state and SVG hashes. No raw source bytes are retained.
- `taxonomy.json`: twelve roots, fifty types, twenty exact engine mappings, interface distinction and index hash.
- Integrated engine HEAD `32f9d3f8a71dc0d2a5f18520bfad738e67ba26c0`; existing engine-map.ts and production modules are imported without edits.
- `docs/architecture/product-policy-v2.md`: locked predicate; byte identity is checked against the pilot's frozen verification record.
- The original study's `delivery-verification.json` and the pilot's `verification.json` are read-only controls. Never rerun their writers for this audit.

## Acquisition

`node scripts/web-voicing-corpus-v2/acquire-sitewide.mjs` follows the 600 detail links actually present in the public index, using three bounded concurrent readers. Each mapped page's variation headings, state-block count and image count must agree. Each comparable allocation must match all six states in its linked SVG. Every failed page or variation retains an explicit error; no row is silently omitted. A resumable checkpoint allowed recovery from a transient local write error. The completed snapshot has no remaining acquisition errors.

The acquisition command resumes existing completed pages rather than refreshing them. A fresh future acquisition must be placed in a new versioned directory and treated as different evidence; the public site is not immutable. Its page hashes can change with advertisements or other presentation bytes. Do not replace this completed snapshot to make later hashes agree. No operator contact, authentication, API posting or source-database download is involved.

## Offline mapping and analysis

Run in order:

```powershell
node --import tsx scripts/web-voicing-corpus-v2/map-sitewide.ts
node --import tsx scripts/web-voicing-corpus-v2/verify-sitewide-demand.ts
node --import tsx scripts/web-voicing-corpus-v2/analyze-sitewide.ts
node --import tsx scripts/web-voicing-corpus-v2/verify-sitewide.ts
node scripts/web-voicing-corpus-v2/report-sitewide.mjs
node scripts/web-voicing-corpus-v2/finish-sitewide.mjs
```

The TypeScript runner requires its normal local esbuild subprocess. Mapping checkpoints live in `.research/web-voicing-corpus-v2/sitewide-practical-mapping`. They are keyed by query and guarded by exact input-row hashes. Remove only that audit-specific derived cache before an intentionally fresh mapping; leave prior studies and source observations intact. A completed query is enumerated fully, ranked by the unchanged comparator and checked against the integrated top-18 page. All 240 final counts and top-18 lists are compared with the frozen census.

Source labels such as C#/Db are preserved separately and canonicalized as one root, never parsed as an explicit slash bass. Site formula steps must match the engine's exact degree list, except dim7's spelling 6 becomes bb7. Default standalone structural failures remain failures; no omitted third is supplied and no alternative chord label is substituted.

`sitewide-demand.ts` is a research-equivalent calculation of the locked policy. It uses the exact pinned integer fret table and BigInt rational operations for J/T, unchanged partial-cover G and separately computed one-interval G1. Every source survivor receives an exact U result. Allocation diagnostics on the 56 structural exclusions do not create engine eligibility or ranks.

`analyze-sitewide.ts` creates exact harmonic template keys and preserves source-versus-extrapolated placements. The pairwise verifier independently tests constant fret deltas rather than reusing those keys. It maps all 77 proposed unseen translations through the integrated engine, computes U for each and verifies every adopted source allocation against the research matcher. It does not fit or evaluate a new ranking model.

The priority-access artifact orders only the finite U-eligible representative partition. When a query has fewer than six representatives, it intentionally does not invent the remaining fallback rows or count the complete fallback pool.

## Type and contract checks

```powershell
node node_modules/typescript/bin/tsc --noEmit --strict --target es2022 --module esnext --moduleResolution bundler --esModuleInterop --skipLibCheck scripts/web-voicing-corpus-v2/sitewide-demand.ts scripts/web-voicing-corpus-v2/map-sitewide.ts scripts/web-voicing-corpus-v2/analyze-sitewide.ts scripts/web-voicing-corpus-v2/verify-sitewide-demand.ts scripts/web-voicing-corpus-v2/verify-sitewide.ts
git diff --exit-code HEAD -- .
```

The exact arithmetic tests cover inclusive thresholds, unsupported-operation reasons, status independence, the two supported scale extremes, fret 36 in the separate demand function, and 4,095 independent topology cases. The adopted vocabulary itself is bounded to fret 15. The delivery check verifies the pilot's 44 shared observations, local links, source inventories, proposed match inventory, frozen prior hashes and all new artifact/script hashes.

## Production handoff boundary

Only the abstract proposed-vocabulary structure and exact matching convention are intended for policy adjudication. Research observations, page/variation lists, raw mapping outputs and source sidecars are not a production dataset import. The proposal is not yet adopted, deployed or granted a source-reference badge. Source-observed metadata requires an exact source witness; all 77 unseen placements remain product-extrapolated even after successful engine mapping.
