"""Independent ID+MIDI cross-check of the finite admitted operation cases only."""
import hashlib, importlib.util, json
from fractions import Fraction as F
from pathlib import Path
from music21 import note, stream

root=Path('/workspace/modus-p3-go-deep')
module=root/'comparator/admission_probe.py'
digest=hashlib.sha256(module.read_bytes()).hexdigest()
spec=importlib.util.spec_from_file_location('gate',module)
gate=importlib.util.module_from_spec(spec);spec.loader.exec_module(gate)
cases=json.loads((root/'comparator/results.json').read_text())['cases']
checks=[]
for case in cases:
    source=case['manifest']
    allowed=[name for name,decision in case['admission']['operations'].items() if decision['status']=='ADMITTED']
    if not allowed:continue
    s=stream.Stream()
    for e in source['events']:
        n=note.Note(e['midi'],quarterLength=F(e['duration']))
        n.id=e['artifactId'];s.insert(F(e['start']),n)
    tree=s.asTimespans(classList=(note.Note,))
    chord=s.chordify(removeRedundantPitches=False,copyPitches=True,addTies=False,toSoundingPitch=False) if 'chordify' in allowed else None
    endpoints=sorted({v for e in source['events'] for v in [F(e['start']),F(e['start'])+F(e['duration'])]})
    queries=sorted(set(endpoints+[(a+b)/2 for a,b in zip(endpoints,endpoints[1:])]))
    for q in queries:
        expected=sorted((e['artifactId'],e['midi']) for e in source['events'] if F(e['start'])<=q<F(e['start'])+F(e['duration']))
        row={'case':case['id'],'query':str(q),'expected':expected}
        if 'tree' in allowed:
            v=tree.getVerticalityAt(float(q))
            actual=sorted((x.element.id,x.element.pitch.midi) for x in v.startTimespans+v.overlapTimespans)
            assert actual==expected,('tree',case['id'],str(q),actual,expected)
            row['tree']=actual
        if chord is not None:
            actual=sorted((n.id,n.pitch.midi) for c in chord.notes for n in c.notes if F(c.offset)<=q<F(c.offset)+F(c.quarterLength))
            assert actual==expected,('chordify',case['id'],str(q),actual,expected)
            row['chordify']=actual
        checks.append(row)

prior=json.loads((root/'challenge/tree-only-admission-counterexample.json').read_text())
after=gate.admit(prior['manifest'])
assert after['operations']['tree']['status']=='REFUSED'
assert 'no-canonical-strict-interior-query' in after['operations']['tree']['reasons']
assert hashlib.sha256(module.read_bytes()).hexdigest()==digest
result={'scope':'Finite authored endpoints+selected exact midpoint queries only; not all possible rational query inputs or a production exporter',
        'caseCount':len(cases),'combinedAdmitted':sum(c['admission']['status']=='ADMITTED' for c in cases),'casesWithAnyAdmittedOperation':len({c['case'] for c in checks}),
        'queryChecks':len(checks),'treeQueries':sum('tree' in c for c in checks),'chordifyQueries':sum('chordify' in c for c in checks),
        'idOrMidiMismatches':0,'treeOnlyCounterexampleAfterFix':after,'moduleSha256':digest,'checks':checks}
(root/'challenge/final-comparator-crosscheck.json').write_text(json.dumps(result,indent=2))
print(json.dumps({k:v for k,v in result.items() if k not in ['checks','treeOnlyCounterexampleAfterFix']}))
