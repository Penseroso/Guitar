"""Hand-authored falsification examples and an isolated offline stress measurement."""
from fractions import Fraction as Q
import argparse
import json
from pathlib import Path
import resource
from time import perf_counter
import numpy as np

from benchmark import CATALOG, Features, Span, applied_arrivals, boundaries, key_changes, profile, segment, compare_events
from benchmark import local_key, tonic

C = (0, "major")
DM = (2, "minor")
A7 = (9, "dominant-7")
G7 = (7, "dominant-7")
CM = (0, False)
Dm = (2, True)

def voiced(chords, length=Q(1)):
    return [(i*length, (i+1)*length, (root + pc) % 12, string)
            for i, (root, kind) in enumerate(chords)
            for string, pc in enumerate(CATALOG[kind])]

def annotate(choices):
    return [Span(Q(i), Q(i+1), chord, key, applied=applied) for i, (chord, key, applied) in enumerate(choices)]

def run_controls():
    assert local_key("VI", tonic("e")) == (0, False)
    assert local_key("V/ii", tonic("C")) == (9, False)
    # One system can track these labelled boundaries; another sees the same pitches for both worlds.
    same_pcs = [(Q(0), Q(4), pitch, string) for string, pitch in enumerate((0, 4, 7, 9))]
    stable = [Span(Q(0), Q(4), (0, "major-6"), CM)]
    ambiguous_change = [Span(Q(0), Q(4,3), (0, "major-6"), CM), Span(Q(4,3), Q(4), (9, "minor-7"), CM)]
    grid = Features(same_pcs, [Q(0), Q(4)])
    model = segment(grid, 1.05, joint=True)
    cannot_locate = Q(4,3) not in grid.grid
    assert not boundaries(stable) and boundaries(ambiguous_change) and cannot_locate

    arp = [(Q(i,2), Q(i+1,2), [0,4,7][i%3], 0) for i in range(6)]
    arpeggio = Features(arp, [Q(0), Q(3)])
    arp_result = segment(arpeggio, 1.05)
    assert len(arpeggio.pc_changes) - 2 == 5

    transient = [(C, CM, False)] * 2 + [(A7, CM, True), (DM, CM, False), (G7, CM, False), (C, CM, False)]
    extended = transient[:3] + [(DM, Dm, False)]
    extended += [(chord, Dm, False) for chord in [(7,"minor"), A7, DM] * 3]
    a, b = annotate(transient), annotate(extended)
    assert [row.chord for row in a[:4]] == [row.chord for row in b[:4]]
    assert applied_arrivals(a, reference=True) == [(Q(3),2)] and not key_changes(a, established=True)
    assert key_changes(b, established=True) == [(Q(3),Dm)]

    # One lead-line fingerprint can accompany many progressions, so overlap scores are evidence of fit only.
    melody = (64, 67, 69, 67)
    contexts = [(C, C, (9,"minor"), C), ((9,"minor"), (9,"minor-7"), (5,"major"), G7)]
    assert all(all((note-root)%12 in CATALOG[kind] for note, (root, kind) in zip(melody, path)) for path in contexts)
    dorian = (2, 4, 5, 7, 9, 11, 0)
    assert set(dorian) == {0, 2, 4, 5, 7, 9, 11}
    pitches = [float(pc in dorian) for pc in range(12)]
    profile_winner = int(profile(np.array(pitches)).argmax())
    with_ambiguities = [
        {"case": "identical C6/Am7 observation", "labelsCompatibleWithSameInput": True, "sourceBoundaryRecoverable": not cannot_locate,
         "top1": model[0].chord, "allowedReferenceBoundaries": [[], ["4/3"]]},
        {"case": "arpeggiated C", "referenceBoundaries": 0, "pitchSetChangeBoundaries": 5, "sequenceBoundaries": len(boundaries(arp_result))},
        {"case": "A7–Dm common prefix", "confirmedByPrefix": False, "transientAppliedArrival": 1, "longerChangeProxy": 1},
        {"case": "same melody, two possible accompaniments", "compatibleContexts": len(contexts)},
        {"case": "C-major and D-Dorian pitch-set equivalence", "forcedMajorMinorProfileIndex": profile_winner, "modalLabelSupported": False},
    ]
    assert compare_events([(Q(1),None)], [(Q(3,4),None),(Q(5,4),None)], Q(1,2)) == [1,2,1]
    return with_ambiguities

def stress():
    # 1024 positions and six note occurrences per position. Six strings can duplicate a PC.
    progression = [C, G7, (9,"minor"), (5,"major")]
    onsets = [Q(i,4) for i in range(1024)]
    notes = []
    for i, start in enumerate(onsets):
        root, kind = progression[(i//16) % len(progression)]
        formula = CATALOG[kind]
        for string in range(6):
            notes.append((start, start + Q(1,4), (root + formula[string % len(formula)]) % 12, string))
    t = perf_counter()
    features = Features(notes, [Q(i) for i in range(0,257,4)])
    result = segment(features, 1.05, joint=True)
    assert result[0].start == 0 and result[-1].end == 256
    return {"positions": len(onsets), "occurrences": len(notes), "atoms": len(features.grid)-1, "returnedSegments": len(result),
            "elapsedMs": round((perf_counter()-t)*1000,2), "hostPeakRssKiB": resource.getrusage(resource.RUSAGE_SELF).ru_maxrss}

if __name__ == "__main__":
    cli = argparse.ArgumentParser(description=__doc__)
    cli.add_argument("output", type=Path)
    args = cli.parse_args()
    args.output.write_text(json.dumps({"cases": run_controls(), "stress": stress()}, indent=2)+"\n")
