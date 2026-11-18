"""Offline conditional and joint chord/key baselines. Exact times are kept until feature weighting."""
import argparse
from bisect import bisect_right
from collections import Counter, defaultdict
import csv
from dataclasses import dataclass
from fractions import Fraction as Q
import hashlib
import json
from pathlib import Path
import re
import time

import numpy as np

from fetch_abc import PIN, SPLITS, piece_name

HERE = Path(__file__).resolve().parent
CATALOG = json.loads((HERE / "catalog.json").read_text())["formulas"]
CHORDS = [(root, kind) for root in range(12) for kind in CATALOG]
TYPES = {"M": "major", "m": "minor", "o": "diminished", "+": "augmented", "Mm7": "dominant-7",
         "MM7": "major-7", "mm7": "minor-7", "%7": "half-diminished-7", "o7": "diminished-7"}
MAJOR, MINOR = [0, 2, 4, 5, 7, 9, 11], [0, 2, 3, 5, 7, 8, 10]
KEYS = [(root, minor) for root in range(12) for minor in (False, True)]
# Krumhansl–Kessler profiles; only correlation ranks are evaluated.
PROFILES = np.array([[6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88],
                     [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17]])
ROTATED = np.array([np.roll(PROFILES[int(minor)], root) for root, minor in KEYS]).T
ROTATED -= ROTATED.mean(axis=0)
ROTATED /= np.linalg.norm(ROTATED, axis=0)
MASK = np.array([[int((pc - root) % 12 in CATALOG[kind]) for pc in range(12)] for root, kind in CHORDS])
ROOT = np.array([root for root, _ in CHORDS])
EXTENSION = np.maximum(MASK.sum(axis=1) - 3, 0)
PRIORS = np.array([[0.0 for _ in KEYS] for _ in CHORDS])
for chord_i, (root, quality) in enumerate(CHORDS):
    for key_i, (tonic, minor) in enumerate(KEYS):
        relative = (root - tonic) % 12
        if relative not in (MINOR if minor else MAJOR):
            PRIORS[chord_i, key_i] = -.65
        if relative == 0:
            PRIORS[chord_i, key_i] += .95 if quality == ('minor' if minor else 'major') else .10
        if relative == 7 and quality in ('major', 'dominant-7'):
            PRIORS[chord_i, key_i] += .65
        if relative == 2 and quality in ('minor', 'minor-7', 'half-diminished-7', 'diminished'):
            PRIORS[chord_i, key_i] += .26

@dataclass(frozen=True)
class Span:
    start: Q
    end: Q
    chord: tuple | None = None
    key: tuple | None = None
    chord_margin: float = 0.0
    key_margin: float = 0.0
    applied: bool = False

def tonic(text):
    match = re.fullmatch(r"([A-Ga-g])([#b]*)", text)
    if not match:
        raise ValueError(f"Unsupported ABC absolute key {text!r}")
    letter, accidental = match.groups()
    return ((dict(zip("CDEFGAB", MAJOR))[letter.upper()] + accidental.count("#") - accidental.count("b")) % 12,
            letter.islower())

def local_key(text, parent):
    # DCML degrees in a minor parent use the natural-minor collection (unlike MODUS display Romans).
    for step in reversed(text.split("/")):
        match = re.fullmatch(r"([#b]*)([IViv]+)", step)
        if not match or match[2].upper() not in ("I", "II", "III", "IV", "V", "VI", "VII"):
            raise ValueError(f"Unsupported ABC local key {text!r}")
        sign, roman = match.groups()
        degree = ("I", "II", "III", "IV", "V", "VI", "VII").index(roman.upper())
        parent = ((parent[0] + (MINOR if parent[1] else MAJOR)[degree] + sign.count("#") - sign.count("b")) % 12,
                  roman.islower())
    return parent

def read_piece(cache, piece):
    def table(kind):
        with (cache / kind / f"{piece}.{kind}.tsv").open() as source:
            return list(csv.DictReader(source, delimiter="\t"))
    bars = {}
    end = Q(0)
    for bar in table("measures"):
        bars[bar["mc"]] = end
        end += 4 * Q(bar["act_dur"])
    def start(row):
        coordinate = bars[row["mc"]] + 4 * Q(row["mc_onset"])
        reference = row.get("quarterbeats_all_endings")
        if reference and Q(reference) != coordinate:
            raise ValueError(f"{piece}: {row['mc']} is inconsistent with all-endings coordinates")
        return coordinate
    notes = []
    skips = Counter()
    for note in table("notes"):
        if note.get("gracenote"):
            skips["grace"] += 1
            continue
        onset = start(note)
        duration = 4 * Q(note["duration"])
        if duration <= 0 or onset >= end:
            skips["empty-or-outside"] += 1
            continue
        if onset + duration > end:
            skips["clipped-at-score-end"] += 1
        notes.append((onset, min(end, onset + duration), int(note["midi"]) % 12, int(note["staff"])))
    labels = {}
    for row in table("harmonies"):
        if not row["globalkey"] or not row["localkey"]:
            continue
        key = local_key(row["localkey"], tonic(row["globalkey"]))
        if row["localkey_is_minor"] and key[1] != bool(int(row["localkey_is_minor"])):
            raise ValueError(f"{piece}: local mode does not agree with ABC export")
        if not row["chord_type"] and not row["chord"] and not row.get("special"):
            continue
        onset = start(row)
        if onset >= end:
            continue
        label = ((key[0] + 7 * int(row["root"])) % 12, TYPES.get(row["chord_type"], row["chord_type"])) if row["root"] else None
        entry = (label, key, bool(row["relativeroot"]))
        if onset in labels and labels[onset] != entry:
            raise ValueError(f"{piece}: conflicting harmony labels at {onset}")
        labels[onset] = entry
    offsets = sorted(labels)
    annotated = [Span(a, b, labels[a][0], labels[a][1], applied=labels[a][2]) for a, b in zip(offsets, offsets[1:] + [end])]
    return notes, sorted(set(bars.values()) | {end}), annotated, skips

class Features:
    def __init__(self, notes, bars):
        changes = defaultdict(lambda: np.zeros(12, dtype=int))
        for a, b, pitch, _ in notes:
            changes[a][pitch] += 1
            changes[b][pitch] -= 1
        self.grid = sorted(set(changes) | set(bars))
        presence = np.zeros(12, dtype=int)
        atoms = []
        self.pc_changes = [self.grid[0]]
        previous = None
        for a, b in zip(self.grid, self.grid[1:]):
            if a in changes:
                presence += changes[a]
            measure = presence > 0
            if previous is not None and not np.array_equal(measure, previous):
                self.pc_changes.append(a)
            previous = measure
            atoms.append(measure * float(b-a))
        self.pc_changes.append(self.grid[-1])
        self.prefix = np.vstack([np.zeros(12), np.cumsum(atoms, axis=0)])

    def integral(self, coordinate):
        i = max(0, bisect_right(self.grid, coordinate) - 1)
        if i >= len(self.grid)-1 or self.grid[i] == coordinate:
            return self.prefix[i]
        return self.prefix[i] + (self.prefix[i+1] - self.prefix[i]) * float((coordinate-self.grid[i])/(self.grid[i+1]-self.grid[i]))

    def mass(self, start, end):
        return self.integral(end) - self.integral(start)

def profile(mass):
    centered = mass - mass.mean()
    norm = np.linalg.norm(centered)
    return centered @ ROTATED / norm if norm else np.zeros(len(KEYS))

def chord_fit(mass, length):
    # Average pitch-class occupancy; octave doubling cannot increase occupancy.
    occupancy = mass / length
    density = occupancy.sum()
    if density == 0:
        return np.full(len(CHORDS), -2.0)
    coverage = MASK @ occupancy
    observed = np.minimum(occupancy * 2, 1)
    missing = MASK @ (1 - observed)
    return (coverage - 1.40 * (density - coverage)) / density - .12 * missing - .16 * (1 - observed[ROOT]) - .035 * EXTENSION

def chosen_margin(scores, choice):
    if len(scores) < 2:
        return 0.0
    other = np.max(np.delete(scores, choice))
    return float(scores[choice] - other)

def choose_chord(features, a, b):
    mass = features.mass(a, b)
    if not np.any(mass > 0):
        return Span(a, b)
    scores = chord_fit(mass, float(b-a))
    i = int(scores.argmax())
    return Span(a, b, CHORDS[i], chord_margin=chosen_margin(scores, i))

def profile_keys(features):
    result = []
    for a, b in zip(features.grid, features.grid[1:]):
        middle = (a+b)/2
        mass = features.mass(max(features.grid[0], middle-8), min(features.grid[-1], middle+8))
        scores = profile(mass)
        i = int(scores.argmax())
        result.append(Span(a, b, key=KEYS[i], key_margin=chosen_margin(scores, i)))
    return result

def advance(states, penalty):
    best = int(states.argmax())
    changed = states[best] - penalty > states
    return np.maximum(states, states[best] - penalty), np.where(changed, best, np.arange(len(states)))

def supports_dominant(before, after, key):
    if not before or not after or not key:
        return False
    root, minor = key
    return before[0] == (root+7)%12 and before[1] in ('major', 'dominant-7') and after == (root, 'minor' if minor else 'major')

def keys_from_chords(features, spans, change_penalty):
    values = np.zeros(len(KEYS))
    paths = []
    for i, span in enumerate(spans):
        mass = features.mass(max(features.grid[0], span.start-4), min(features.grid[-1], span.end+4))
        emission = profile(mass)
        if span.chord in CHORDS:
            emission = emission + .44 * PRIORS[CHORDS.index(span.chord)]
        if i and spans[i-1].end == span.start:
            emission = emission + np.array([.68 if supports_dominant(spans[i-1].chord, span.chord, key) else 0 for key in KEYS])
        values, previous = advance(values, change_penalty)
        values = values + emission
        paths.append((previous, emission))
    chosen = int(values.argmax())
    result = []
    for span, (previous, scores) in zip(reversed(spans), reversed(paths)):
        result.append(Span(span.start, span.end, span.chord, KEYS[chosen], span.chord_margin, chosen_margin(scores, chosen)))
        chosen = previous[chosen]
    return list(reversed(result))

def segment(features, penalty, *, supplied_key=None, joint=False, key_penalty=2.5):
    count = len(features.grid)
    key_count = len(KEYS) if joint else 1
    dp = np.full((count, key_count), -np.inf)
    dp[0] = 0
    back = {}
    key_at = supplied_key if callable(supplied_key) else lambda _: supplied_key
    for i in range(count-1):
        old, previous = advance(dp[i], key_penalty)
        reference = key_at(features.grid[i])
        prior = .17 * PRIORS[:, KEYS.index(reference)] if reference is not None else 0
        for j in range(i+1, min(count, i+19)):
            span_length = features.grid[j] - features.grid[i]
            if span_length > 8 and j > i+1:
                break
            length = float(span_length)
            mass = features.prefix[j] - features.prefix[i]
            heard = np.any(mass > 0)
            fit = chord_fit(mass, length) if heard else None
            if joint:
                if heard:
                    combined = fit[:, None] + .17 * PRIORS
                    choices = combined.argmax(axis=0)
                    best = combined[choices, np.arange(key_count)]
                else:
                    choices = np.full(key_count, -1)
                    best = np.zeros(key_count)
                emissions = (best + .32 * profile(mass)) * length
            else:
                if heard:
                    scores = fit + prior
                    choice = int(scores.argmax())
                    best = scores[choice]
                else:
                    choice, best = -1, 0
                choices = [choice]
                emissions = np.array([best * length])
            updated = old + emissions - penalty
            for k in np.flatnonzero(updated > dp[j]):
                dp[j, k] = updated[k]
                back[j, k] = (i, int(previous[k]), int(choices[k]))
    k = int(dp[-1].argmax())
    j = count-1
    spans = []
    while j:
        i, last_key, chord_i = back[j, k]
        a, b = features.grid[i], features.grid[j]
        mass = features.prefix[j] - features.prefix[i]
        selected_key = KEYS[k] if joint else key_at(a)
        if chord_i >= 0:
            fit = chord_fit(mass, float(b-a))
            scores = fit + (.17 * PRIORS[:, KEYS.index(selected_key)] if selected_key is not None else 0)
            difference = chosen_margin(scores, chord_i)
        else:
            difference = 0.0
        score = profile(mass) + (.44 * PRIORS[chord_i] if joint and chord_i >= 0 else 0)
        spans.append(Span(a, b, CHORDS[chord_i] if chord_i >= 0 else None, KEYS[k] if joint else None,
                          difference, chosen_margin(score, k) if joint else 0))
        j, k = i, last_key
    # Evaluation compares changes in root+quality, not arbitrary subdivisions of the same predicted chord.
    return list(reversed(spans))

def compare_events(reference, candidate, tolerance):
    # Sorted greedy matching maximizes one-to-one matches on a line within a fixed tolerance.
    hits = 0
    for tag in set(key for _, key in reference + candidate):
        left = sorted(t for t, key in reference if key == tag)
        right = sorted(t for t, key in candidate if key == tag)
        i = j = 0
        while i < len(left) and j < len(right):
            if right[j] < left[i] - tolerance:
                j += 1
            elif left[i] < right[j] - tolerance:
                i += 1
            else:
                hits += 1
                i += 1
                j += 1
    return [hits, len(candidate), len(reference)]

def boundaries(spans):
    return [(after.start, None) for before, after in zip(spans, spans[1:]) if before.chord != after.chord
            and before.chord is not None and after.chord is not None and before.end == after.start]

def key_runs(spans):
    runs = []
    for span in spans:
        if runs and runs[-1][-1].key == span.key and runs[-1][-1].end == span.start:
            runs[-1].append(span)
        else:
            runs.append([span])
    return runs

def key_changes(spans, established=False):
    output = []
    runs = key_runs(spans)
    for prior, run in zip(runs, runs[1:]):
        key = run[0].key
        if not key or not prior[0].key or prior[-1].end != run[0].start:
            continue
        if established:
            chord_path = [run[0].chord]
            for item in run[1:]:
                if item.chord != chord_path[-1]:
                    chord_path.append(item.chord)
            if run[-1].end - run[0].start < 8 or len(chord_path) < 3 or not any(
                supports_dominant(a, b, key) for a, b in zip(chord_path, chord_path[1:])
            ):
                continue
        output.append((run[0].start, key))
    return output

def applied_arrivals(spans, reference=False):
    arrivals = []
    for before, after in zip(spans, spans[1:]):
        if not before.key or before.key != after.key or not before.chord or not after.chord or before.end != after.start:
            continue
        root, quality = after.chord
        if root != before.key[0] and quality in ("major", "minor") and supports_dominant(before.chord, after.chord, (root, quality == "minor")):
            if not reference or before.applied:
                arrivals.append((after.start, root))
    return arrivals

def compare_durations(reference, candidate):
    i = j = 0
    outcomes = {"chord": [], "root": [], "key": []}
    while i < len(reference) and j < len(candidate):
        truth, guess = reference[i], candidate[j]
        duration = min(truth.end, guess.end) - max(truth.start, guess.start)
        if duration > 0:
            if truth.chord is not None:
                outcomes["root"].append((guess.chord_margin, float(duration), guess.chord is not None,
                                         guess.chord is not None and truth.chord[0] == guess.chord[0]))
                if truth.chord in CHORDS:
                    outcomes["chord"].append((guess.chord_margin, float(duration), guess.chord is not None, truth.chord == guess.chord))
            if truth.key is not None:
                outcomes["key"].append((guess.key_margin, float(duration), guess.key is not None, truth.key == guess.key))
        if truth.end <= guess.end:
            i += 1
        if guess.end <= truth.end:
            j += 1
    return outcomes

def summarize_durations(outcomes, margin=None):
    eligible = sum(x[1] for x in outcomes)
    retained = [x for x in outcomes if x[2] and (margin is None or x[0] >= margin)]
    issued = sum(x[1] for x in retained)
    correct = sum(x[1] for x in retained if x[3])
    return {"eligibleQuarterNotes": round(eligible, 4), "accuracy": round(correct / eligible, 4) if eligible else None,
            "coverage": round(issued / eligible, 4) if eligible else None,
            "issuedPrecision": round(correct / issued, 4) if issued else None}

def event_metrics(triple):
    hit, predicted, truth = triple
    return {"matches": hit, "predicted": predicted, "reference": truth,
            "precision": round(hit/predicted, 4) if predicted else None,
            "recall": round(hit/truth, 4) if truth else None,
            "f1": round(2*hit/(truth+predicted), 4) if (truth+predicted) else None}

def alternatives(cache, piece, variant, config):
    notes, bars, truth, omissions = read_piece(cache, piece)
    if variant == "first-staff":
        first = min(staff for *_, staff in notes)
        notes = [entry for entry in notes if entry[-1] == first]
    features = Features(notes, bars)
    start_offsets = [span.start for span in truth]
    def supplied_at(t):
        return truth[max(0, bisect_right(start_offsets, t) - 1)].key
    def clocked(func, *args, **kwargs):
        began = time.perf_counter()
        value = func(*args, **kwargs)
        return value, 1000 * (time.perf_counter() - began)
    results = {}
    results["fixed-bars"] = clocked(lambda: [choose_chord(features, a, b) for a,b in zip(bars, bars[1:])])
    results["pc-change"] = clocked(lambda: [choose_chord(features, a, b) for a,b in zip(features.pc_changes, features.pc_changes[1:])])
    penalty, key_penalty = config["segmentPenalty"], config["keyChangePenalty"]
    results["provided-key-segmentation"] = clocked(segment, features, penalty, supplied_key=supplied_at)
    results["profile-key"] = clocked(profile_keys, features)
    results["provided-chord-key"] = clocked(keys_from_chords, features, truth, key_penalty)
    def cascaded():
        return keys_from_chords(features, segment(features, penalty), key_penalty)
    results["cascade"] = clocked(cascaded)
    results["joint"] = clocked(segment, features, penalty, joint=True, key_penalty=key_penalty)
    return truth, results, {"notes": len(notes), "atoms": len(features.grid)-1, "quarterNotes": str(bars[-1]),
                             "annotations": len(truth), "droppedNotes": dict(omissions),
                             "appliedLabels": sum(span.applied for span in truth),
                             "unsupportedChordLabels": sum(span.chord is not None and span.chord not in CHORDS for span in truth)}

BASELINE = {"segmentPenalty": 1.05, "keyChangePenalty": 2.50}
CHORD_METHODS = {"fixed-bars", "pc-change", "provided-key-segmentation", "cascade", "joint"}
KEY_METHODS = {"profile-key", "provided-chord-key", "cascade", "joint"}

def run_suite(cache, split, variants, config):
    scorecards = []
    samples = defaultdict(list)
    for index in SPLITS[split]:
        piece = piece_name(index)
        for variant in variants:
            truth, results, metadata = alternatives(cache, piece, variant, config)
            for method, (candidate, elapsed) in results.items():
                readings = compare_durations(truth, candidate)
                dimensions = ({"chord", "root"} if method in CHORD_METHODS else set()) | ({"key"} if method in KEY_METHODS else set())
                readings = {field: values for field, values in readings.items() if field in dimensions}
                for field, rows in readings.items():
                    samples[(variant, method, field)].extend(rows)
                scorecards.append({"piece": piece, "variant": variant, "method": method, "input": metadata,
                    "elapsedMs": round(elapsed, 2), "durations": {field: summarize_durations(values) for field, values in readings.items()},
                    "rawSegments": len(candidate),
                    "boundaries": compare_events(boundaries(truth), boundaries(candidate), Q(1,2)) if method in CHORD_METHODS else None,
                    "localChanges": compare_events(key_changes(truth), key_changes(candidate), Q(4)) if method in KEY_METHODS else None,
                    "appliedArrivals": compare_events(applied_arrivals(truth, reference=True), applied_arrivals(candidate), Q(1,2))
                    if method in {"provided-chord-key", "cascade", "joint"} else None,
                    "establishedChangeProxy": compare_events(key_changes(truth, True), key_changes(candidate, True), Q(4))
                    if method in {"provided-chord-key", "cascade", "joint"} else None})
            print(f"{split} {piece} {variant}", flush=True)
    return scorecards, samples

def choose_threshold(samples):
    for threshold in [0, .02, .04, .06, .08, .10, .15, .20, .30, .40, .60, .80]:
        stats = summarize_durations(samples, threshold)
        if (stats["issuedPrecision"] or 0) >= .80 and (stats["coverage"] or 0) >= .05:
            return {"margin": threshold, "calibration": stats, "attained": True}
    return {"margin": None, "calibration": None, "attained": False}

def aggregate(scorecards, samples, calibrations):
    output = {}
    for variant, method, _ in samples:
        key = f"{variant}/{method}"
        if key in output:
            continue
        rows = [row for row in scorecards if row["variant"] == variant and row["method"] == method]
        duration = {}
        for field in ("root", "chord", "key"):
            values = samples.get((variant, method, field))
            if values is None:
                continue
            calibration = calibrations.get(f"{method}/{field}")
            duration[field] = {"forced": summarize_durations(values),
                               "selected": summarize_durations(values, calibration["margin"]) if calibration and calibration["attained"] else None}
        events = {}
        for field in ("boundaries", "localChanges", "appliedArrivals", "establishedChangeProxy"):
            observed = [row[field] for row in rows if row[field] is not None]
            if observed:
                events[field] = event_metrics([sum(row[i] for row in observed) for i in range(3)])
        output[key] = {"duration": duration, "rawSegments": sum(row["rawSegments"] for row in rows), **events, "offlineHostMs": {
            "min": min(row["elapsedMs"] for row in rows), "max": max(row["elapsedMs"] for row in rows)}}
    return dict(sorted(output.items()))

def ordinal_profiles(cache, split):
    output = []
    for index in SPLITS[split]:
        piece = piece_name(index)
        notes, _, truth, _ = read_piece(cache, piece)
        if not notes or not truth:
            continue
        first = min(staff for *_, staff in notes)
        counts = defaultdict(lambda: np.zeros(12, dtype=int))
        for start, _, pitch, staff in notes:
            if staff == first:
                counts[start][pitch] += 1
        positions = sorted(counts)
        prefix = np.vstack([np.zeros(12), np.cumsum([counts[t] for t in positions], axis=0)])
        reference_starts = [span.start for span in truth]
        correct = eligible = 0
        for i, position in enumerate(positions):
            ref_index = bisect_right(reference_starts, position) - 1
            if ref_index < 0:
                continue
            votes = prefix[min(i+13, len(positions))] - prefix[max(i-12, 0)]
            correct += int(KEYS[int(profile(votes).argmax())] == truth[ref_index].key)
            eligible += 1
        output.append({"piece": piece, "correctPositions": correct, "eligiblePositions": eligible})
    return output

def research_hashes():
    files = ("benchmark.py", "catalog.json", "protocol.json", "fetch_abc.py", "export_catalog.cjs", "controls.py", "product_controls.cjs")
    return {name: hashlib.sha256((HERE / name).read_bytes()).hexdigest() for name in files}

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("cache", type=Path)
    parser.add_argument("split", choices=SPLITS)
    parser.add_argument("output", type=Path)
    parser.add_argument("--lock", type=Path)
    args = parser.parse_args()
    signature = research_hashes()
    if args.split == "test":
        if not args.lock:
            parser.error("the test split requires the sealed calibration file via --lock")
        lock = json.loads(args.lock.read_text())
        if lock["researchSha256"] != signature or lock["revision"] != PIN:
            parser.error("benchmark sources or corpus pin differ from the calibration lock")
    else:
        lock = {"revision": PIN, "config": BASELINE, "calibrations": {}}
    began = time.perf_counter()
    rows, samples = run_suite(args.cache, args.split, ("full-score",) if args.split != "test" else ("full-score", "first-staff"), lock["config"])
    if args.split == "calibration":
        lock["researchSha256"] = signature
        lock["calibrations"] = {f"{method}/{field}": choose_threshold(values) for (_, method, field), values in samples.items()
                                if field in {"key", "chord"}}
        if args.lock:
            args.lock.write_text(json.dumps(lock, indent=2, sort_keys=True) + "\n")
    args.output.write_text(json.dumps({"revision": PIN, "researchSha256": signature, "split": args.split, "sourcePieces": len(SPLITS[args.split]),
        "hostElapsedSeconds": round(time.perf_counter()-began, 3), "config": lock["config"],
        "aggregate": aggregate(rows, samples, lock["calibrations"]), "perPiece": rows,
        "ordinalFirstStaffProfile": ordinal_profiles(args.cache, args.split)}, indent=2, sort_keys=True) + "\n")

if __name__ == "__main__":
    main()
