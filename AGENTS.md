# UI work in THE MODUS

For changes to `src/components/guitar` or related styles, read [`docs/design-language.md`](docs/design-language.md) before designing or implementing the UI. It is the feature-level design and acceptance guideline distilled from the Scale/Chord review.

Core rule: intuitive, minimal, crafted interaction. Prefer text hierarchy, thin active lines, small state dots, direct-manipulation sliders, and hairline-separated rows. Do not default to nested cards, bordered buttons, filled pills, or long explanatory copy. Keep a filled primary action only where its priority is real. Reuse the shared workspace tokens and the closest existing component pattern.

For each feature, inspect default and changed states in a real browser at narrow, middle, and desktop widths; preserve 44px targets, accessible semantics, keyboard focus, and reduced-motion behavior. Run relevant tests and build. Do not turn a feature-level UI check into an unrelated full-app redesign.

Music theory, chord-engine behavior, and frozen product policy are specified separately under `docs/architecture`; this UI guidance does not override them.

# Current cloud collaboration workflow

Use `feat/tab-timing-inspection` as the shared branch for this ongoing cloud task. Reuse its existing worktree (currently `/workspace/Guitar-p2`) for completed P2 work, P3 research, and later P3 implementation. Coordinate subagents through file ownership on the same branch.

Preserve the historical `feat/tab-p2-explicit-timeline` worktree and its local changes separately. It is an earlier candidate, not the current implementation baseline. Commit and push current work on the shared branch; merge to `master` only when the user requests it.
