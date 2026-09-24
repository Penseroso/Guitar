# THE MODUS UI/UX design language

Status: living implementation guideline. This records the design decisions from the Scale and Chord UI review; it is not an assertion that every existing screen already conforms. Engine and music-theory behavior remain governed by their own architecture and policy documents.

## 1. Product principle

**Intuitive + minimal + crafted.** “Fancy” means a precise, responsive interaction that helps someone understand or manipulate music—not more decoration. The instrument and its musical result are the visual focus; controls should recede until needed.

Priority when trade-offs arise:

1. The next action and current state are obvious.
2. Information is progressively disclosed, not all visible at once.
3. The interface is quiet and consistent with the existing dark workspace.
4. Motion and visual flourish reinforce a real state change.

Do not solve a weak information structure by putting every item into a bordered card. Do not remove a necessary label or state indication merely to reduce pixels.

## 2. Visual grammar

| Role | Preferred expression | Avoid |
| --- | --- | --- |
| Main instrument/visualization | One deliberate surface with breathing room, e.g. fretboard, orbit, dial | A new card around every adjacent control |
| Navigation or mutually exclusive choice | Text tabs with a thin active line | Nested segmented boxes and filled pills |
| Binary diagram-label display | A compact two-position switch with both endpoint labels visible | Treating a display preference like a navigation tab or leaving “off” unexplained |
| Independent on/off preference | Text with a small state dot; visible `aria-pressed` | A large toggle card for each setting |
| Continuous range | Direct-manipulation slider with readable endpoints and live value | Numeric input boxes when the range is spatial |
| Compact context or parameter choice | Swipeable picker showing the current value and adjacent candidates; keep keyboard/click alternatives | A wall of select fields or permanently expanded segmented rails |
| Repeated results | Open rows separated by a hairline; selection distinguished within the row | A wall of rounded result cards |
| Secondary action | Quiet text/icon control with a full hit area | Every action looking like a primary button |
| Primary action | One clearly filled control where needed, e.g. Play | Several competing filled calls to action |
| Detail, provenance, advanced controls | Contextual disclosure near the relevant result | Source links and explanatory paragraphs in the primary flow |

Use a border or background only when it communicates an actual surface boundary: an instrument canvas, overlay/popover, distinct navigator, or constrained filter workspace. A border is not the default way to group related information. Prefer spacing, hierarchy, and a single 1px separator. Rounded rectangles and pills are exceptions, not the base unit.

The current shared tokens are in [`src/app/globals.css`](../src/app/globals.css): `--workspace-panel: #0a0a0a`, `--workspace-border: rgba(255,255,255,.09)`, `--workspace-muted: #aaa`, and `--workspace-focus: #a5f3fc`. Primary text is generally `#f4f4f5`. New mode-specific styling should consume these tokens instead of inventing a parallel palette. The accent/focus color is for keyboard focus, not a general decorative highlight.

Selection must be visible without relying on color alone: use an underline, dot, check, or meaningful label plus the appropriate semantic state. Keep the active indicator small but unambiguous. Hover may brighten text; it should not make a control look permanently selected. Typical transitions are subtle (~150–220 ms) and must respect `prefers-reduced-motion`.

For Harmony-style context entry, reuse the Chord root dial for key/root selection and a compact swipeable picker for Mode, Lens, Quality, and Bass. Show the current value and adjacent candidates rather than expanding the entire catalog; keep Quality in one picker instead of adding a permanent family row. Drag distance must allow several values per gesture, not require repeated single-step swipes. Horizontal gestures must not block vertical page scrolling. Preserve named current values, keyboard arrows/Home/End, previous/next click targets, bounded selection, and reduced-motion behavior. An optional observation needs an explicit unset state; never silently invent a chord to fill the control. Existing Chord filter rails remain appropriate where direct comparison of all few options matters; do not expand them into every setting by default.

## 3. Information hierarchy and copy

The default view should answer **what am I exploring, what is selected, what can I do next?** Put the instrument or main result first. Place practice/display controls near the thing they affect, not in a tall panel above it. Put comparisons, sources, filters, and long explanations behind a clearly named disclosure or in a selected-detail area.

Use concise labels and scannable fragments rather than instructional paragraphs in the main path. Preserve necessary distinctions; for example “same tonic” and “same notes” are different relationships, and chord-relative roles only make sense after a chord is selected. When comparing scales, show both complete note/degree sequences, highlight only what changed, and offer a direct action to switch; do not rely on theory terminology alone. Put sources in a detail context, not inside “Play this scale over.”

### Harmony vocabulary and mapping

- Prefer working-musician terminology: Key, Major / Minor, Resolve to, Harmonic relationships, Dominant motion, Predominant, Tonic substitutes, Subdominant minor, Diminished approach, Cadence. Theory style is a secondary disclosure; notation convention belongs there too.
- Translate engine statuses into Established relation, Possible interpretation, More context needed, and Outside current scope. Never change domain status semantics to simplify copy.
- Chord identity is a vertical hierarchy: Roman numeral, chord name, function. Keep guide-tone motion and explanation on separate lines, not a chain of dot-separated phrases.
- Voice correspondence is horizontal: retain common-tone lanes; link actual notes; prioritize the supplied guide-tone paths. Keep many-to-one resolutions visible. Do not independently re-sort every chord into formula order.
- Comparison uses A/B structure and non-directional common/chromatic connections; a functional approach uses a directional path. Tritone original/substitute views stay in a stable A/B order with the same pitch lanes. Comparison links are not a new theory rule or inferred performance.
- Root-motion labels use spelled interval direction. Pitch-class distances and shared/removed/added counts belong in Details. Hearing guide tones and selecting notes should highlight relevant connections, not trigger decorative animations.
- A wide three-chord mapping may scroll inside its own labeled, keyboard-focusable region on narrow screens; the page must not overflow. Do not turn non-spatial explanations into decorative diagrams.

Repeated musical data should be explorable, not presented as a full table by default. A note strip, chord choices, or compact result rows can reveal richer interpretation upon selection. Empty and disabled states must explain or suggest the next valid action, without appearing broken or silently inactive.

## 4. Existing reference patterns

These are implementation references, not licenses to copy every incidental CSS value:

- [Scale visualization controls](../src/components/guitar/scale/scale-visual-controls.module.css): compact label switch, small on/off dots; no enclosing control card.
- [Shared diagram-label switch](../src/components/guitar/shared/DiagramLabelSwitch.tsx): the same Notes/Intervals control in Scale and Chord, with explicit endpoints and keyboard support.
- [Practice range](../src/components/guitar/scale/PracticeRangeControl.tsx) and [shared range slider](../src/components/guitar/shared/FretRangeControl.tsx): range below the fretboard, 44px touch targets, compact string selection with state dots.
- [Harmony tabs and chord choices](../src/components/guitar/cross-domain/harmony.module.css): selected line, concise primary/other grouping, detail on demand.
- [Tone roles](../src/components/guitar/scale/ToneRolesPanel.tsx): compact note selection, chord-relative detail only when relevant.
- [Related scales](../src/components/guitar/scale/ScaleRelationsPanel.tsx): collapsed by default; comparison places two note/degree sequences together, colors only changes, and offers a direct action. Registry provenance appears only when it adds information (subset or symmetry).
- [Chord mode](../src/components/guitar/chord/chord-ui.module.css): typographic workflow/family/preferences, a distinct Play action, and hairline-separated voicing rows. Keep the root dial and musical diagram as meaningful visual objects.
- [Chord filter rails](../src/components/guitar/chord/ChoiceRail.tsx): the responsive sliding selector is an intentional, compact interaction; do not replace it with a grid of boxes. On narrow screens, opening Filters should bring the filters into view.

When adding a control, first locate the closest existing interaction and reuse or extend it. If no pattern fits, describe why the new one is needed before introducing another visual language.

## 5. Responsive and accessibility contract

- Verify at approximately **390px, 768px, and 1335px**. The page itself must not overflow horizontally; a wide fretboard may scroll inside its own viewport.
- Controls may wrap, but labels, active indicators, slider thumbs, and select arrows must not clip or overlap. A collapsed secondary section is preferable to a dense multi-row toolbar.
- Interactive targets remain at least **44×44px** even if their visible text, line, or dot is tiny.
- Preserve semantic buttons, tabs, radio groups, sliders, labels, `aria-pressed`/`aria-selected`, keyboard access, and a visible focus ring. Decorative indicators are `aria-hidden`.
- A selected control must still look selected when it is temporarily disabled (for example, the last visible guitar string cannot be turned off).
- Do not mistake a disabled action for “loading.” Use distinct visual and semantic states for disabled, busy, selected, expanded, and empty.
- On mobile, opening a distant disclosure/filter must expose its content to the user; do not make them search below a long results list.

## 6. Acceptance checklist for every new UI feature

Before implementation:

1. Identify the primary task, result, and secondary information. Decide what is visible by default.
2. Point to the closest reference pattern above and shared tokens. Justify any new box, large filled button, or persistent explanation.
3. Specify default, selected, hover, focus, disabled, expanded, empty, and loading behavior where applicable.

Before completion:

1. Inspect the feature in the actual browser at the three widths above, including its important interaction states. Check page overflow and clipped indicators.
2. Confirm that selection changes the intended musical result and that a secondary action does not silently change primary state.
3. Verify keyboard/focus and accessible names/states; run relevant tests and a production build.
4. Ask: can a new user tell what is selected and what to do next without reading a paragraph? Does this section need a box at all?

This checklist is a **feature-level gate**, not a demand to re-audit the whole app for each addition. If an existing adjacent inconsistency is outside the feature's scope, record it separately rather than silently expanding the change.
