# Educational, dictionary and product source discovery

Access date: 2026-09-13. Scope is the research-only v2 scope check. This sub-study produces a bounded reference sample, not a representative web survey or a preference dataset.

## Discovery and stopping record

Search batches independently combined guitar/chord/voicing with open textbook, Creative Commons, manual dictionary, institutional lesson, jazz, inversions and product collections. Primary pages were then inspected for attribution, license scope and creation claims. Examples of actual queries were `guitar chords open textbook Creative Commons chord diagrams`, `guitar chord dictionary manually selected fingerings copyright`, `guitar chords "Creative Commons Attribution" jazz`, and `"Guitar Chord Handbook" university`. Later searches targeted owners and licenses. Secondary results supplied leads, never independent shape votes.

The discovery covered institutional OER, collaborative teaching, author-owned jazz lessons, commercial authored dictionaries, web applications, asset-only licenses and blank teaching templates. Repeated searches mainly returned the Kansas handbook mirrors, Wikimedia derivatives, the same commercial providers or newly surfaced sites with unresolved origin. Additional low-position diagrams would increase row count without repairing independent high-position/rootless coverage. Acquisition therefore froze at the verified sample. This is pragmatic saturation of the study's material source classes, not proof that no other sources exist.

The educational manifest has **11 source entries in 9 candidate lineage buckets**. Unknown-origin and unavailable sources are included in those inventory counts. Only **2 conservative families contribute normalized curated observations**: Kansas and Wikimedia. The two educational data files contain **51 rows: 39 Kansas and 12 Wikimedia**, with **4 Kansas labels deliberately ambiguous**. Page counts, downloaded copies and transpositions are never independent votes.

## Strong provenance and sample boundaries

The [Kansas handbook](https://hdl.handle.net/1808/29433) identifies its authors and pedagogical sequencing and supplies photographs alongside selected diagrams. The [institutional metadata](https://kuscholarworks.ku.edu/server/api/pid/find?id=1808/29433) grants CC BY-NC 4.0 subject to exceptions. All retained facts come from inspected chapter diagrams without third-party credit notices. The PDF is 47 pages; 39 depicted examples were transcribed, with repeated photos/fingerings merged. Printed-page references, licensed attribution and SHA-256 identify the source. Textual transposition exercises and the final repeated reference page add no rows. `chapter-primary-example` means the chapter's displayed example, not a universal author ranking.

The [Wikibooks Jazz lesson](https://en.wikibooks.org/w/index.php?title=Guitar/Jazz&oldid=3931946) deliberately sequences movable voicings. The [Sluffs original-file provenance](https://commons.wikimedia.org/wiki/File:G_major_jazz_chord_for_guitar_(root).png) says the author created the diagram with Sibelius and released it to the public domain. Software rendering does not make these algorithmic enumeration observations; the authored exercise supplies the evidence of selection. Conversely, the [Ashaio CC0 example](https://commons.wikimedia.org/wiki/File:A_major_chord_for_guitar_(open).svg) only proves artwork authorship. Its underlying shape-selection procedure remains unknown, so it contributes no extra manual-selection rows or votes.

Six jazz image originals were successfully acquired and visually transcribed. The remaining 18 displayed occurrences returned HTTP 429 and were preserved in the acquisition inventory without shapes. Successful canonical-URL reads used the native HTTP client after tracking-query/Python requests failed; subsequent rate limits were not treated as permission to invent or bulk reconstruct rows. Six further facts come from [explicit Wikibooks open-chord prose](https://en.wikibooks.org/w/index.php?title=Guitar/Open_Chords&oldid=4212611), under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). Finger numbers are not fret numbers. Only explicit fret/string descriptions or expressly marked fret vectors were accepted.

Wikibooks, Commons, its English/Italian/Polish reuse and individual diagram authors are conservatively grouped as `wikimedia-guitar`. They do not form independent replications. Kansas mirrors found on FlipHTML5 and ebook directories belong to the Kansas family. An absence of documented copying between Kansas and Wikimedia permits two operational families; it does not prove cultural or pedagogical independence of ubiquitous guitar conventions.

## Why larger-looking sources were not added

| Candidate | Finding | Consequence |
|---|---|---|
| [Standard Guitar](https://www.standardguitar.com/download-chord-and-scale-images) | Images have CC BY 4.0, while the [about page](https://www.standardguitar.com/about) explains the interface project, not voicing creation. Former name Awesome Guitar Solo is the same lineage. | Origin UNKNOWN; no curatorial votes. |
| [String Warrior](https://stringwarrior.com/license) | License covers specific SVG/widget/card surfaces and expressly excludes compiled libraries. Sister sites belong to its named network. | Do not turn image permission or network page counts into a reusable independent chord database. |
| [Dick Gordon studio](https://www.dickgordonjrmusicstudio.com/resources/guitar-downloads.html) | CC BY charts are blank. Direct fetch timed out; primary indexed text describes the blank templates. | Zero voicing observations. |
| [Dirk Laukens dictionary](https://www.jazzguitar.be/blog/jazz-guitar-chord-dictionary/) | Named author deliberately organizes 244 jazz shapes, including shells, inversions and extensions; page says all rights reserved. | Metadata and acquisition lead only; no copied lesson/database. |
| [Berklee](https://online.berklee.edu/courses/guitar-chords-101) | Rick Peckham course and [public inversion excerpt](https://online.berklee.edu/takenote/guitar-chords-101-triad-inversions-up-the-fretboard/) establish authored instruction beyond open chords. | Reuse permission not established; course/excerpt one family. |
| [Spanish411](https://spanish411.net/resources/GuitarChords.pdf) | Indexed PDF text states BY-NC-SA; origin and visual mapping remain unverified after direct-fetch timeout. | Metadata-only; 132 chart cells are not 132 proven curated observations. |
| [William Bay encyclopedia](https://www.melbay.com/Products/93283EB/deluxe-guitar-chord-encyclopedia.aspx) | Authored commercial reference classifies shapes by musical role; thousands of alternatives, not a default recommendation frequency. | Bibliographic metadata only; editions are one lineage. |

FIU's discovered record-10641 PDF endpoint returned no inspectable document; its relationship to any other handbook was not established and it contributes no source family, row or independent evidence. The source discovery log records this failed lead rather than treating an institutional hostname as curatorial validation.

## Normalization checks and exclusions

The shared representation uses high-to-low physical string order, mute=-1, open=0 and absolute nut-relative frets. The PDF's orientation key explicitly shows low E on the left; retained rows reverse that visual order. Standard six-string EADGBE and no capo are verified from the diagrams/instructions and pitch checks. The exact diagram strings, original labels and source fingerings are retained. All diagram rows were visually inspected; no OCR-only coordinate guesses were accepted.

- Kansas D minor is explicitly **x00231**, including the open A bass. It was not changed to the more familiar xx0231. The latter separately appears in Wikibooks prose.
- Kansas color example **C9 = x32033** contains C/E/G/D and lacks the dominant seventh. It remains a label/formula conflict; Cadd9 is a possible interpretation, not an automatic correction.
- Three Kansas diminished diagrams are each offered for four chord names as harmonic support. Each remains one grouped ambiguous observation, with no forced root or formula. Their contextual substitution is not twelve independent chord labels or player votes.
- The Kansas page-33 heading includes `minor` alongside a Bb7 diagram and dominant-seventh description. The diagram's Bb7 label and pitches agree; the stray heading word is recorded.
- Unacquired diagrams, incomplete prose coordinates and alternative-tuning sources are missing evidence, never negatives.

## Reproduction and rights

The old Kansas `bitstream/1808/...` URL now returns a DSpace application shell. Resolve `server/api/pid/find?id=1808/29433`, follow the returned bundles link, choose ORIGINAL, then use the returned bitstream content link. The acquired source is [bitstream 3de2afa0-42b6-47c8-a251-a4dbd13c53fc](https://kuscholarworks.ku.edu/server/api/core/bitstreams/3de2afa0-42b6-47c8-a251-a4dbd13c53fc/content), SHA-256 `61b3d86cec4158075ba6141cbf1fa1b86b75ca2de471bc230a1757c4573acbac`. Its PDF was read with pypdf and rendered using the PDF skill's Poppler workflow. Original PDF/page images remain in OS temp, not the repository.

`educational-acquire.py` discovers each Wikimedia file description and creates a provenance manifest; it is not a bulk extraction parser. Individual assets require their recorded permission and source availability. It explicitly leaves unacquired images blank. `educational-wikimedia-image-inventory.json` records all 24 encountered diagram occurrences, six verified assets and 18 missing assets. The normalized sample records permanent lesson revisions and individual asset hashes. Diagram/software authorship and user-interface page creation do not automatically establish independent voicing selection.

Kansas adaptations are restricted to noncommercial research with attribution; Wikimedia prose adaptations carry attribution/ShareAlike, and the six Sluffs diagrams have their individually verified public-domain grants. The mixed sample has no blanket permissive commercial license. No production corpus, commercial redistribution or deployment is authorized by this study.

## Evidence-level consequence

This sample supports a small, attributed catalog of deliberately taught shapes and exact overlap diagnostics between two operational families. It cannot estimate global canonicality, source-weighted popularity, high-position protection or generalized idiomaticity. In particular, the lack of adequate independent high-position/rootless rows is a support deficit, not a successful regression check. The strongest claim carried forward is author/page/shape evidence with missingness and license provenance. No observed human preference, comfort, difficulty or playability validation exists in these labels.
