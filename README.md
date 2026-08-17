This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Architecture: logic → function, not feature → feature

All music theory and chord/scale/progression reasoning lives in `src/domain/{chord,scale,progression,shared}/`
as pure, React-free TypeScript — no UI code, and no per-item hardcoded table where a rule can be deduced
instead. `src/components/` only renders what `domain/` has already computed; a component should never contain
business logic of its own — a scale's chord-fit, a voicing's ranking, a valid string pair, anything with a "why"
behind it belongs in `domain/`, not inline in JSX or a `useMemo`.

When adding a feature, ask first: **does this fact already exist somewhere in `domain/`, or does it fall out of
combining two things that already do?** Prefer extending/reusing an existing deductive function over writing a
new hardcoded rule, and prefer deriving a fact once in `domain/` over letting a component recompute it. A few
examples from this codebase's own history:

- The chord-voicing engine (`domain/chord/{registry,voicingSearch,deductiveRanking}.ts`) generates and ranks
  fret positions from physics (real mm hand-span, barre reachability) and harmony (required-degree rules) —
  never a table of hand-authored shapes per chord id.
- Scale mode's "which chords does this exact note collection also fit, at a different root" feature
  (`domain/chord/scale-chord-context.ts::getModalSiblingChordsForScale`) reuses the *existing*
  notes→chord recognizer (`identifyChordsForPitchClasses`) instead of writing new quality-detection logic.
- The same scale-rotation math that powers that feature (`domain/scale/scales.ts::getModalSiblings`) also
  already encodes textbook substitutions like "G altered = Ab melodic minor" with zero new code, since it's
  the same relationship (same parent scale, different rotation) expressed the other way round.
- Two real bugs were caught by this rule during review: a "which string pairs are valid for this harmonic
  interval" fact and a "default string pair for this interval" fact were both found hardcoded inline in a
  component (`ScaleModeWorkspace.tsx`) instead of living in `domain/scale/doubleStops.ts`, where the
  fret-stretch math they depend on already did.

If a UI component needs an inline `if`/`useMemo` to decide something musically meaningful, that's usually a
sign the decision belongs in `domain/` instead.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
