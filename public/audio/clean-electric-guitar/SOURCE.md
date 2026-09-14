# Clean Electric Guitar samples — source & license

**Source project:** FreePats — "Electric Guitar FSBS (clean)"
https://freepats.zenvoid.org/ElectricGuitar/clean-electric-guitar.html

**Downloaded from:** the project's GitHub release, "bridge small" variant (SFZ+FLAC),
version `2026-08-07`:
https://github.com/freepats/electric-guitar-FSBS-clean/releases/download/2026-08-07/EGuitarFSBS-clean-bridge-small-SFZ%2BFLAC-20260807.7z

**License:** Creative Commons CC0 1.0 Universal (public domain dedication).
Full legal text in `LICENSE.txt` in this directory; canonical copy at
https://creativecommons.org/publicdomain/zero/1.0/. No attribution is required, but the
source is documented here for provenance.

**What the samples are:** direct recordings of a Fender electric guitar (basic model,
bridge pickup), processed through an amplifier/effects rack by the FreePats project to
produce a "clean" electric guitar tone (per the source README).

## What this app uses

The FreePats "bridge small" package is itself already a sparse set of anchor notes (as
opposed to their full multi-velocity, near-chromatic packages) intended for exactly this
kind of pitch-shifted sample playback. All 13 of its anchor notes are used here, unmodified
in pitch — nothing was re-sampled or re-picked. Each source FLAC file was:

1. Downmixed to mono (voicings only need pitch/timbre, not the recorded stereo image).
2. Resampled to 44.1 kHz.
3. Encoded to MP3 (LAME, VBR quality 4) to keep the asset small and broadly decodable
   (`AudioContext.decodeAudioData` support for MP3 is universal across evergreen browsers,
   whereas FLAC support is inconsistent, notably on Safari).

Total: 13 files, ~656 KB, at `public/audio/clean-electric-guitar/*.mp3`.

## Anchor-note map (used by `Tone.Sampler` in `src/utils/audio/audioEngine.ts`)

| Note | MIDI | File     | Original FreePats sample |
|------|------|----------|---------------------------|
| C2   | 36   | C2.mp3   | C2_s1_01.flac  |
| F2   | 41   | F2.mp3   | F2_s1_01.flac  |
| A2   | 45   | A2.mp3   | A2_s2_01.flac  |
| C3   | 48   | C3.mp3   | C3_s2_02.flac  |
| E3   | 52   | E3.mp3   | E3_s3_01.flac  |
| G3   | 55   | G3.mp3   | G3_s4_01.flac  |
| B3   | 59   | B3.mp3   | B3_s5_01.flac  |
| E4   | 64   | E4.mp3   | E4_s6_01.flac  |
| G4   | 67   | G4.mp3   | G4_s6_01.flac  |
| B4   | 71   | B4.mp3   | B4_s6_01.flac  |
| D5   | 74   | D5.mp3   | D5_s6_01.flac  |
| G#5  | 80   | Gs5.mp3  | G#5_s6_03.flac |
| C#6  | 85   | Cs6.mp3  | C#6_s6_01.flac |

This spans MIDI 36–85 (C2–C#6), covering standard guitar tuning's low E2 (40) through well
above the 24-fret range used elsewhere in this app. `Tone.Sampler` pitch-shifts any requested
note to the nearest anchor above rather than requiring a recording of every semitone.
