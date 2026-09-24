# UI work in THE MODUS

For changes to `src/components/guitar` or related styles, read [`docs/design-language.md`](docs/design-language.md) before designing or implementing the UI. It is the feature-level design and acceptance guideline distilled from the Scale/Chord review.

Core rule: intuitive, minimal, crafted interaction. Prefer text hierarchy, thin active lines, small state dots, direct-manipulation sliders, and hairline-separated rows. Do not default to nested cards, bordered buttons, filled pills, or long explanatory copy. Keep a filled primary action only where its priority is real. Reuse the shared workspace tokens and the closest existing component pattern.

For each feature, inspect default and changed states in a real browser at narrow, middle, and desktop widths; preserve 44px targets, accessible semantics, keyboard focus, and reduced-motion behavior. Run relevant tests and build. Do not turn a feature-level UI check into an unrelated full-app redesign.

Music theory, chord-engine behavior, and frozen product policy are specified separately under `docs/architecture`; this UI guidance does not override them.
