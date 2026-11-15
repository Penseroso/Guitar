"""P3 offline reference applicability probes; no THE MODUS implementation.

Manually declared authored intervals are independent expected observations.
Known library divergences are captured and asserted, never accepted as gold output.
"""
from fractions import Fraction as F
import hashlib
import json
import platform
from pathlib import Path
import statistics
import subprocess
import time
import unittest

from music21 import common, note, stream, tie, tree

OUT = Path('/workspace/modus-p3-current/music21')
SOURCE = Path('/tmp/modus-p2-research/music21')
PIN = '86a7dc8a5fb3b1996ac0202d6bb9b4d4b9d19197'
assert subprocess.check_output(['git', '-C', str(SOURCE), 'rev-parse', 'HEAD'], text=True).strip() == PIN

def scalar(value):
    return {'type': type(value).__name__, 'value': str(value)}

def make(events):
    result = stream.Stream()
    for ident, onset, duration, midi in events:
        obj = note.Rest(quarterLength=F(duration)) if midi is None else note.Note(midi, quarterLength=F(duration))
        obj.id = ident
        result.insert(F(onset), obj)
    return result

def slices(score, duplicates=False):
    return [{'start': str(obj.offset), 'duration': str(obj.quarterLength),
             'midis': sorted(int(p.midi) for p in obj.pitches), 'kind': 'rest' if obj.isRest else 'chord',
             'noteIds': [str(n.id) for n in obj.notes] if obj.isChord else [],
             'ties': [n.tie.type if n.tie else None for n in obj.notes] if obj.isChord else []}
            for obj in score.chordify(removeRedundantPitches=not duplicates).flatten().notesAndRests]

def active(verticality):
    return sorted(str(ts.element.id) for ts in verticality.startTimespans + verticality.overlapTimespans)

results = []

# Duplicate pitches and identities are source events, not pitch-set facts.
s = make([('string1:C4', '0', '2', 60), ('string2:C4', '0', '2', 60)])
t = s.asTimespans(classList=(note.Note,))
default, preserved = slices(s), slices(s, duplicates=True)
assert active(t.getVerticalityAt(0.0)) == ['string1:C4', 'string2:C4']
assert all(ts.element is s.getElementById(ts.element.id) for ts in t)
assert default[0]['midis'] == [60] and preserved[0]['midis'] == [60, 60]
assert set(preserved[0]['noteIds']) == {'string1:C4', 'string2:C4'}
results.append({'id': 'source-unison-identity', 'expectedActiveIds': ['string1:C4', 'string2:C4'],
                'treeActiveIds': active(t.getVerticalityAt(0.0)), 'treeElementIsSource': True,
                'default': default, 'duplicatesPreserved': preserved})

s = make([('attack-a', '0', '1', 60), ('attack-b', '1', '1', 60)])
t = s.asTimespans(classList=(note.Note,))
assert active(t.getVerticalityAt(1.0)) == ['attack-b']
assert len(slices(s)) == 2
results.append({'id': 'adjacent-repeat-is-two-attacks', 'expectedAt1': ['attack-b'],
                'actualAt1': active(t.getVerticalityAt(1.0)), 'slices': slices(s)})

s = make([('attack', '0', '1', 60), ('continuation-position:origin-attack', '1', '1', 60)])
s.notes[0].tie = tie.Tie('start'); s.notes[1].tie = tie.Tie('stop')
chordified = slices(s)
collapsed = s.stripTies()
assert len(collapsed.notes) == 1 and collapsed.notes[0].id == 'attack' and collapsed.notes[0].quarterLength == 2
assert len(chordified) == 2
results.append({'id': 'explicit-tie-and-stripTies', 'chordifyPreservesSegments': chordified,
                'stripTies': [{'id': str(n.id), 'duration': str(n.quarterLength)} for n in collapsed.notes],
                'sourceNotesUnchanged': len(s.notes) == 2,
                'hazard': 'stripTies removes continuation event identity; preserve authored relation sidecar before invoking'})

s = make([('long', '0', '2', 60)])
cut = s.sliceAtOffsets([F(1)])
assert len(cut.notes) == 2 and all(n.id == 'long' for n in cut.notes)
assert [n.tie.type for n in cut.notes] == ['start', 'stop'] and s.notes[0].tie is None
results.append({'id': 'slice-generated-ties-and-reused-id',
                'pieces': [{'id': str(n.id), 'start': str(n.offset), 'duration': str(n.quarterLength), 'tie': n.tie.type} for n in cut.notes],
                'sourceStillUntied': True, 'hazard': 'library-generated split ties are not authored facts; note.id is not a unique slice identity'})

gap = make([('a', '0', '1', 60), ('b', '2', '1', 64)])
rest = make([('a', '0', '1', 60), ('authored-rest', '1', '1', None), ('b', '2', '1', 64)])
gap_out, rest_out = slices(gap), slices(rest)
assert gap_out == rest_out
assert gap_out[1]['kind'] == 'rest'
results.append({'id': 'unknown-gap-vs-authored-rest', 'unknownGapOutput': gap_out,
                'authoredRestOutput': rest_out, 'sameProjection': True,
                'hazard': 'empty verticality creates a rest; output cannot establish authored silence without input sidecar'})

s = make([('a', '0', '1/2', 60), ('b', '1/2', '1/2', 64)])
t = s.asTimespans(classList=(note.Note,))
at_half = t.getVerticalityAt(0.5)
assert active(at_half) == ['b'] and [x.element.id for x in at_half.stopTimespans] == ['a']
assert active(t.getVerticalityAt(1.0)) == []
results.append({'id': 'half-open-dyadic-boundary', 'expectedAtHalf': ['b'], 'actualAtHalf': active(at_half),
                'stoppedAtHalf': [str(x.element.id) for x in at_half.stopTimespans], 'activeAtEnd': []})

s = make([('a', '0', '1/10', 60), ('b', '1/10', '1/10', 64)])
t = s.asTimespans(classList=(note.Note,))
exact_query, library_query = active(t.getVerticalityAt(F(1, 10))), active(t.getVerticalityAt(float(F(1, 10))))
assert exact_query == ['a'] and library_query == ['b']
results.append({'id': 'fraction-query-vs-float-tree-boundary', 'allSourceFractionsWithinProductBounds': True,
                'manualExpectedAt1_10': ['b'], 'directFractionQuery': exact_query, 'libraryCoordinateQuery': library_query,
                'sourceOnset': scalar(s.notes[1].offset), 'treeOnset': scalar(t[1].offset),
                'hazard': 'tree stores floats; Fraction query is not guaranteed same-coordinate lookup'})

s = make([('a', '0', '1/3', 60), ('b', '1/3', '1/3', 64)])
t = s.asTimespans(classList=(note.Note,))
vf, vd = t.getVerticalityAt(F(1, 3)), t.getVerticalityAt(float(F(1, 3)))
assert s.notes[0].quarterLength == F(1, 3)
assert not vf.startTimespans and [x.element.id for x in vd.startTimespans] == ['b']
results.append({'id': 'exact-duration-does-not-imply-exact-tree',
                'sourceDuration': scalar(s.notes[0].quarterLength), 'storedTreeEnd': scalar(t[0].endTime),
                'fractionQueryStarts': [], 'fractionQueryOverlaps': [str(x.element.id) for x in vf.overlapTimespans],
                'libraryQueryStarts': [str(x.element.id) for x in vd.startTimespans]})

# Each authored input numerator/denominator is <=1024. The derived overlap is much narrower.
start_a, duration_a, start_b = F(167, 1001), F(601, 1002), F(772, 1007)
overlap = start_a + duration_a - start_b
assert overlap == F(1, 1010023014)
s = make([('a', str(start_a), str(duration_a), 60), ('b', str(start_b), '1/4', 64)])
t = s.asTimespans(classList=(note.Note,))
tree_ids = active(t.getVerticalityAt(float(start_b)))
output = slices(s, duplicates=True)
assert tree_ids == ['a', 'b'] and not any(r['midis'] == [60, 64] for r in output)
results.append({'id': 'product-valid-narrow-overlap-lost-in-chordify', 'allSourceFractionsWithinProductBounds': True,
                'authored': {'a': {'start': str(start_a), 'duration': str(duration_a)}, 'b': {'start': str(start_b), 'duration': '1/4'}},
                'expectedOverlapStart': str(start_b), 'expectedOverlapDuration': str(overlap), 'expectedActive': ['a', 'b'],
                'treeActualAtOverlapStart': tree_ids, 'chordifyOutput': output, 'overlapSlicePresent': False,
                'hazard': 'chordify isclose(abs_tol=1e-7) skips this nonzero exact interval'})

exact, coerced = common.opFrac(F(1, 65536)), common.opFrac(float(F(1, 65536)))
assert F(exact) == F(1, 65536) and F(coerced) == F(1, 65535)
tiny = common.opFrac(float(F(1, 100000000)))
assert tiny == 0
results.append({'id': 'float-opFrac-denominator-limit', 'directInputOutsideCurrentProductBounds': True,
                'exactFractionInputResult': scalar(exact), 'floatInputResult': scalar(coerced),
                'float1_100000000Result': scalar(tiny),
                'hazard': 'limitOffsetDenominator=65535 applies to float rational reconstruction; do not coerce exact inputs to float and reconstruct as ground truth'})

results.append({'id': 'missing-duration-default-refused', 'notInvokedForUnknownInput': True,
                'defaultDurationOfUnspecifiedMusic21Note': str(note.Note(60).quarterLength),
                'reason': 'fixture export must refuse missing onset/length, not instantiate library defaults'})
assert note.Note(60).quarterLength == 1

refusals = [
    {'input': 'unknown onset or length', 'action': 'exclude/mark incomplete; never call music21 with missing value'},
    {'input': 'global position requires unknown preceding bar lengths', 'action': 'refuse global comparison; explicitly local same-bar comparison may remain valid'},
    {'input': 'dangling/ambiguous/noncontiguous sustain chain', 'action': 'do not invent tie repair; record unsupported or invalid relation'},
    {'input': 'bend/release trajectory, let-ring, grace realization not declared', 'action': 'base-pitch authored observation only, not performed sounding comparison'},
    {'input': 'collapsed/narrow/unmapped library coordinates', 'action': 'precision-limited exclusion, never count a match or musical error'},
    {'input': 'unknown gap', 'action': 'generated Rest is projection only; do not add authored rest to expected input'},
]

benchmarks = []
for positions in [32, 128, 1024]:
    # Six authored events per position, one-quarter overlap, exact dyadic coordinates.
    s = stream.Stream()
    for i in range(positions):
        for string in range(6):
            n = note.Note(48+string, quarterLength=1); n.id = f'{i}:{string}'; s.insert(F(i, 4), n)
    tree_times, chord_times = [], []
    samples = 3 if positions < 1024 else 2
    for _ in range(samples):
        then = time.perf_counter(); tt = tree.fromStream.asTimespans(s, flatten=True, classList=(note.Note,)); tree_times.append((time.perf_counter()-then)*1000)
        then = time.perf_counter(); cs = s.chordify(removeRedundantPitches=False); chord_times.append((time.perf_counter()-then)*1000)
    benchmarks.append({'positions': positions, 'notes': positions*6, 'samples': samples,
                       'treeBuildMs': tree_times, 'treeBuildMedianMs': statistics.median(tree_times),
                       'chordifyMs': chord_times, 'chordifyMedianMs': statistics.median(chord_times),
                       'spans': len(tt), 'slices': len(cs.notesAndRests)})

names = ['music21.tree.fromStream.Test.testTripletEndsWhereTheNextNoteStarts',
         'music21.stream.tests.Test.testSliceAtOffsetsSimple',
         'music21.stream.tests.Test.testSliceAtOffsetsBuilt',
         'music21.stream.tests.Test.testChordifyRests']
test_result = unittest.TextTestRunner(verbosity=1).run(unittest.defaultTestLoader.loadTestsFromNames(names))
assert test_result.wasSuccessful()

paths = ['LICENSE', 'music21/stream/base.py', 'music21/tree/fromStream.py', 'music21/tree/spans.py',
         'music21/tree/trees.py', 'music21/tree/verticality.py', 'music21/common/numberTools.py', 'music21/stream/tests.py']
output = {'source': 'cuthbertLab/music21', 'commit': PIN, 'python': platform.python_version(),
          'scope': 'isolated synthetic offline comparison; not product timeaxis/runtime or harmonic analysis',
          'results': results, 'refusalContract': refusals, 'benchmarks': benchmarks,
          'upstreamTests': {'names': names, 'run': test_result.testsRun, 'failures': len(test_result.failures), 'errors': len(test_result.errors)},
          'sourceSha256': {p: hashlib.sha256((SOURCE/p).read_bytes()).hexdigest() for p in paths},
          'probeSha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest()}
(OUT/'results.json').write_text(json.dumps(output, indent=2))
print(json.dumps({'cases': len(results), 'upstreamTests': output['upstreamTests'], 'benchmarks': benchmarks}))
