"""Independent exact counterexamples, not a product timeline or comparator implementation."""
import json, math
from fractions import Fraction as F
from pathlib import Path
from music21 import note, stream

OUT = Path(__file__).parent
base = 1023 * 128  # Declared uniform full-bar anchor: 1024 measures, score-wide 32/1.
ax, al, bx, bl = F(1, 506), F(1, 1015), F(1, 507), F(1, 1011)
aend, bend = F(base) + ax + al, F(base) + bx + bl
assert aend < bend and bend - aend == F(1, 87751473810)
assert float(aend) == float(bend)
left, right = aend.numerator * bend.denominator, bend.numerator * aend.denominator
assert right - left == 1 and float(left) == float(right)
s = stream.Stream()
for source_id, midi, start, length in [('a', 60, F(base) + ax, al), ('b', 64, F(base) + bx, bl)]:
    n = note.Note(midi, quarterLength=length)
    n.id = source_id
    s.insert(start, n)
tree = s.asTimespans(classList=(note.Note,))
v = tree.getVerticalityAt(float(aend))
actual = sorted(x.element.id for x in v.startTimespans + v.overlapTimespans)
expected = ['b']  # Independently specified: a ends at t; b's strictly later end has not occurred.
assert actual == [] and actual != expected

result = {
    'scope': 'Valid source fractions and meter/bar bounds. Uniform full-bar global anchoring is declared for this fixture, not implemented product policy.',
    'globalAnchor': base,
    'source': {'a': {'bar': 1024, 'start': str(ax), 'length': str(al)}, 'b': {'bar': 1024, 'start': str(bx), 'length': str(bl)}, 'meter': '32/1'},
    'exactEndA': str(aend), 'exactEndB': str(bend), 'endDelta': str(bend - aend),
    'sameFloatEnd': float(aend), 'crossProducts': [left, right],
    'atExactEndA': {'expectedActive': expected, 'treeCanonicalFloatActive': actual},
    'treeOffsets': [{'id': x.element.id, 'start': x.offset, 'end': x.endTime} for x in tree],
    'relativeIscloseCheck': {'largeOffset': base, 'a': base + .01, 'b': base + .01 + 1/10100,
                             'delta': '1/10100', 'iscloseAbsTol1e7DefaultRel': math.isclose(base + .01, base + .01 + 1/10100, abs_tol=1e-7)},
    'meaning': 'Endpoint coalescence must reject a comparison before an empty active set can be counted as agreement; per-source fraction bounds do not establish floating or Number cross-product exactness.'
}
assert result['relativeIscloseCheck']['iscloseAbsTol1e7DefaultRel']
(OUT / 'adversarial-results.json').write_text(json.dumps(result, indent=2))
print(json.dumps(result, indent=2))
