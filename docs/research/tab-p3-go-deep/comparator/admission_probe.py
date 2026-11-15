"""Isolated P3 research predicate; not a THE MODUS adapter or timeline engine.

Admission inspects coverage, identity and coordinate transformations, not the
resulting event-ID/pitch match. Independent queries then test admitted projections.
"""
from fractions import Fraction as F
from math import isclose
from pathlib import Path
import copy
import hashlib
import json

from music21 import common, note, stream

OUT = Path('/workspace/modus-p3-go-deep/comparator')

def exact(value):
    if isinstance(value, float) or value is None:
        raise ValueError('exact authored fraction required')
    return F(value)

def manifest(events, *, anchor='0', complete=True, provenance=True, realized=True, relations=True, rests=None):
    return {'scopeId': 'research-fixture', 'coordinateFrame': {'kind': 'declared-relative', 'origin': anchor},
            'coverageComplete': complete, 'provenanceComplete': provenance,
            'fixedPitchIntervalsDeclared': realized, 'authoredRelationsResolved': relations,
            'events': [{'artifactId': f'artifact:{ident}', 'sourceNoteId': ident, 'sourcePositionId': f'position:{i}',
                        'string': i % 6, 'kind': 'attack', 'midi': midi,
                        'start': start, 'duration': duration} for i, (ident, start, duration, midi) in enumerate(events)],
            'authoredRests': rests or [], 'unknownGapsAreAuthoredRests': False}

def build(source):
    s = stream.Stream()
    for event in source['events']:
        n = note.Note(event['midi'], quarterLength=exact(event['duration']))
        n.id = event['artifactId']
        s.insert(exact(event['start']), n)
    return s

def admit(source):
    """Source/coordinate admissibility only; never consult an ID-set match."""
    reason = []
    def refused(reasons):
        return {'status': 'REFUSED', 'reasons': reasons,
                'operations': {operation: {'status':'REFUSED','reasons':reasons}
                               for operation in ['tree','chordify']}}
    for key in ['coverageComplete', 'provenanceComplete', 'fixedPitchIntervalsDeclared', 'authoredRelationsResolved']:
        if source.get(key) is not True:
            reason.append(key)
    events = source.get('events', [])
    if not events:
        reason.append('no-pitched-events-in-scope')
    if any(not all(e.get(k) is not None for k in ['artifactId', 'sourceNoteId', 'sourcePositionId', 'string', 'midi', 'start', 'duration']) for e in events):
        reason.append('missing-source-field')
    ids = [e.get('artifactId') for e in events]
    if len(ids) != len(set(ids)):
        reason.append('ambiguous-artifact-id')
    try:
        intervals = [(exact(e['start']), exact(e['start']) + exact(e['duration'])) for e in events]
        if any(end <= start for start, end in intervals):
            reason.append('not-a-positive-comparison-interval')
    except (ValueError, KeyError, TypeError, ZeroDivisionError):
        return refused(reason + ['exact-coordinates-unavailable'])
    if reason:
        return refused(reason)
    points = sorted({v for pair in intervals for v in pair})
    canonical = [float(v) for v in points]
    if any(a >= b for a, b in zip(canonical, canonical[1:])):
        return refused(['canonical-endpoint-coalescence-or-order-loss'])
    # chordify also inserts zero before the first point. Do not claim the generated
    # prefix rest is an authored rest; audit its numerical conversion too.
    audit_points = ([F(0)] if points[0] > 0 else []) + points
    for a, b in zip(audit_points, audit_points[1:]):
        af, bf = float(a), float(b)
        if isclose(af, bf, abs_tol=1e-7):
            reason.append('chordify-close-point-skip')
        if F(common.opFrac(af)) != a or F(common.opFrac(bf-af)) != b-a:
            reason.append('chordify-fraction-reconstruction-loss')
        midpoint = (a+b)/2
        if not af < float(midpoint) < bf:
            reason.append('no-canonical-strict-interior-query')
    chordify_reasons = sorted(set(reason))
    # The declared query set includes a strict midpoint per exact interval.
    # Its representability is required by Tree membership too, not just chordify.
    reason = [r for r in chordify_reasons if r == 'no-canonical-strict-interior-query']
    s = build(source)
    t = s.asTimespans(classList=(note.Note,))
    expected_by_id = {e['artifactId']: pair for e, pair in zip(events, intervals)}
    if len(t) != len(events):
        reason.append('tree-event-count-loss')
    for ts in t:
        expected_start, expected_end = expected_by_id[ts.element.id]
        if ts.offset != float(expected_start) or ts.endTime != float(expected_end):
            reason.append('tree-endpoint-transformation-loss')
    operations={'tree':{'status':'REFUSED' if reason else 'ADMITTED','reasons':sorted(set(reason))},
                'chordify':{'status':'REFUSED' if reason or chordify_reasons else 'ADMITTED',
                            'reasons':sorted(set(reason+chordify_reasons))}}
    return {'status': 'REFUSED' if reason or chordify_reasons else 'ADMITTED', 'reasons': sorted(set(reason+chordify_reasons)),
            'operations':operations,
            'boundaryCount': len(points), 'coordinateFrame': source['coordinateFrame']}

def expected_ids(source, query):
    return sorted(e['artifactId'] for e in source['events'] if exact(e['start']) <= query < exact(e['start']) + exact(e['duration']))

def exercise(source, *, duplicates=False):
    """Independent exact half-open oracle vs actual tree and chordify event IDs."""
    s = build(source)
    t = s.asTimespans(classList=(note.Note,))
    c = s.chordify(removeRedundantPitches=not duplicates, copyPitches=True, addTies=False, toSoundingPitch=False)
    points = sorted({v for e in source['events'] for v in [exact(e['start']), exact(e['start']) + exact(e['duration'])]})
    queries = sorted(set(points + [(a+b)/2 for a, b in zip(points, points[1:])]))
    checks = []
    for q in queries:
        expected = expected_ids(source, q)
        v = t.getVerticalityAt(float(q))
        tree_ids = sorted(ts.element.id for ts in v.startTimespans + v.overlapTimespans)
        chord_ids = sorted(n.id for obj in c.notes for n in obj.notes
                           if F(obj.offset) <= q < F(obj.offset) + F(obj.quarterLength))
        checks.append({'at': str(q), 'expectedIds': expected, 'treeIds': tree_ids, 'chordifyIds': chord_ids,
                       'treeMatch': expected == tree_ids, 'chordifyMatch': expected == chord_ids})
    return checks

def scaled(base, factor, shift=F(0)):
    result = copy.deepcopy(base)
    for e in result['events']:
        e['start'] = str(exact(e['start'])*factor + shift)
        e['duration'] = str(exact(e['duration'])*factor)
    result['coordinateFrame'] = {'kind': 'explicit-research-transform', 'scale': str(factor), 'origin': str(shift)}
    return result

def main():
    cases = []
    def case(ident, data, disposition, scope='current-authored-fractions'):
        decision = admit(data)
        assert decision['status'] == disposition, (ident, decision)
        observed = exercise(data, duplicates=True) if all(e.get('start') is not None and e.get('duration') is not None for e in data.get('events', [])) and data.get('events') else None
        if disposition == 'ADMITTED':
            assert all(c['treeMatch'] and c['chordifyMatch'] for c in observed), (ident, observed)
        cases.append({'id': ident, 'scope': scope, 'manualExpectedDisposition': disposition, 'manifest': data,
                      'admission': decision, 'unsafeProjectionQueries': observed,
                      'countedAsReferenceMatch': disposition == 'ADMITTED' and all(c['treeMatch'] and c['chordifyMatch'] for c in observed)})
    case('dyadic-half-open-unison-repeat', manifest([('a','0','1',60),('u','0','1',60),('repeat','1','1',60),('e','1','1/2',64)]), 'ADMITTED')
    case('nonbinary-triplet-boundary', manifest([('a','0','1/3',60),('b','1/3','1/3',64),('unison','1/3','1/3',64)]), 'ADMITTED')
    case('nonbinary-multiple-simultaneous-ends-starts', manifest([('a','0','2/3',60),('b','1/3','1/3',64),('new','2/3','1/3',60)]), 'ADMITTED')
    repeated=manifest([('first','0','1',60),('second','1','1',60)])
    case('repeated-attack-kind-sidecar',repeated,'ADMITTED')
    continued=copy.deepcopy(repeated)
    continued['events'][1]['kind']='continuation'
    continued['events'][1]['sourceNoteId']='first'
    continued['events'][1]['originArtifactId']='artifact:first'
    case('explicit-continuation-kind-sidecar',continued,'ADMITTED')
    assert exercise(repeated,duplicates=True)==exercise(continued,duplicates=True)
    base = manifest([('a','0','1/100',60),('b','1/101','1/2',64)])
    for factor in [F(1),F(1,2),F(1,4)]:
        case('nonbinary-overlap-scale-'+str(factor), scaled(base,factor), 'ADMITTED')
    case('nonbinary-scale-1_8-duration-reconstruction', scaled(base,F(1,8)), 'REFUSED')
    for offset in [F(1), F(32), F(1024)]:
        case('nonbinary-translated-'+str(offset), scaled(base,F(1),offset), 'ADMITTED', 'declared-coordinate-transform-not-direct-bar-offset')
    translated = scaled(base,F(1),F(130944))
    case('nonbinary-high-global-offset-relative-close', translated, 'REFUSED', 'complete-32_1-meter-1024-bar-assumption-only')
    rebased = scaled(translated,F(1),-F(130944))
    case('same-high-offset-events-explicitly-rebased-local', rebased, 'ADMITTED', 'explicit-reference-coordinate-normalization-option')
    collision = manifest([('a',str(F(130944)+F(1,506)),'1/1015',60),('b',str(F(130944)+F(1,507)),'1/1011',64)])
    case('current-valid-local-fractions-global-endpoint-collision', collision,'REFUSED','complete-32_1-meter-1024-bar-assumption-only')
    no_interior=manifest([('a',str(F(130944)+F(1,501)),'1/999',60),('b',str(F(130944)+F(1,500)),'1/1003',64)])
    case('distinct-endpoints-without-a-canonical-interior-query',no_interior,'REFUSED','complete-32_1-meter-1024-bar-assumption-only')
    assert admit(no_interior)['operations']['tree']['status']=='REFUSED'
    missing = manifest([('a',None,'1',60)])
    case('missing-onset',missing,'REFUSED')
    for name, field in [('missing-scope-coverage','coverageComplete'),('missing-source-provenance','provenanceComplete'),('unresolved-performed-trajectory','fixedPitchIntervalsDeclared'),('unresolved-authored-relations','authoredRelationsResolved')]:
        refusal = copy.deepcopy(base);refusal[field]=False;case(name,refusal,'REFUSED')
    ambiguous = copy.deepcopy(base);ambiguous['events'][1]['artifactId']=ambiguous['events'][0]['artifactId']
    case('ambiguous-artifact-id',ambiguous,'REFUSED')

    # A PC-set-only comparison falsely accepts default unison reduction. The actual
    # admitted comparator's event-ID multiset detects it, without changing admission.
    unison = manifest([('a','0','1',60),('b','0','1',60)])
    assert admit(unison)['status']=='ADMITTED'
    default_output=build(unison).chordify()  # intentionally unsafe negative control
    source_pc={e['midi']%12 for e in unison['events']}
    result_pc={p.midi%12 for p in default_output.notes[0].pitches}
    unsafe=exercise(unison,duplicates=False)
    assert source_pc==result_pc and any(not q['chordifyMatch'] for q in unsafe)
    controls={'defaultUnisonDedup':{'pitchClassSetMatch':True,'eventIdentityMultisetMatch':False,'queries':unsafe},
              'repeatAttackIdentity':{'sourceIds':['a','repeat'],'pitchClassSetAloneInsufficient':True},
              'attackVsContinuation':{'sameLibraryObservation':True,'authoredAttackCounts':{'repeat':2,'continuation':1},
                                      'truthLocation':'manifest.events[].kind and originArtifactId, not library-generated ties'},
              'restProvenance':{'generatedEmptySlicesAreAuthored':False,'truthLocation':'manifest.authoredRests only'}}
    output={'stage':'conditional-GO condition study only; no product comparator implemented',
            'source':'cuthbertLab/music21@86a7dc8a5fb3b1996ac0202d6bb9b4d4b9d19197',
            'predicateUsesResultIdentityMatches':False,'cases':cases,'negativeControls':controls,
            'summary':{'cases':len(cases),'admitted':sum(c['admission']['status']=='ADMITTED' for c in cases),'refused':sum(c['admission']['status']=='REFUSED' for c in cases),'falseMatchesCounted':sum(c['countedAsReferenceMatch'] and any(not q['treeMatch'] or not q['chordifyMatch'] for q in c['unsafeProjectionQueries']) for c in cases)},
            'scriptSha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest()}
    (OUT/'results.json').write_text(json.dumps(output,indent=2))
    print(json.dumps(output['summary']))

if __name__=='__main__':main()
