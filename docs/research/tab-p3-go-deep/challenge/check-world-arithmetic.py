"""Recalculate only the finite manual countermodels supplied by the contracts task."""
from pathlib import Path
from fractions import Fraction as F
import json, copy

root = Path('/workspace/modus-p3-go-deep')
cases = json.loads((root/'contracts/fixtures.json').read_text())['cases']
fraction = lambda x: F(x['numerator'], x['denominator'])
checks = []
for case in cases:
    if case['kind'] not in ['admissible-missing-field-completions', 'positive-nominal-subset']:
        continue
    worlds = case.get('counterfactualWorlds', []) or [{'name':'explicit-positive','assignmentsOnlyToPreviouslyUnknownFields':[], 'manuallyExpectedActiveAtQuery':case['manualNominalActive']}]
    for world in worlds:
        doc = copy.deepcopy(case['sourceInput'])
        for assignment in world['assignmentsOnlyToPreviouslyUnknownFields']:
            parts = assignment['path'].split('.')
            obj = doc
            for part in parts[:-1]:obj = obj[int(part)] if isinstance(obj,list) else obj[part]
            key = int(parts[-1]) if isinstance(obj,list) else parts[-1]
            assert key not in obj if isinstance(obj,dict) else False
            obj[key] = assignment['value']
        query = case['query']
        if 'illustrativeGlobalQuarter' in query:
            q = F(query['illustrativeGlobalQuarter'])
            meter = doc['meter']
            origin = lambda m: (m-1)*F(meter['numerator']*4,meter['denominator'])
        else:
            assert query['bar'] == 1 and all(m['measure']==1 for m in doc['moments'])
            q = F(query['localQuarter'])
            origin = lambda m: F(0)
        arithmetic=[]
        for moment in doc['moments']:
            start = origin(moment['measure']) + fraction(moment['beatOffset'])
            for n in moment['notes']:
                end = start+fraction(n['duration'])
                arithmetic.append({'id':n['id'],'start':str(start),'end':str(end),'active':start<=q<end})
        active = sorted(n['id'] for n in arithmetic if n['active'])
        expected = sorted(world['manuallyExpectedActiveAtQuery'])
        assert active==expected,(case['id'],world['name'],active,expected)
        checks.append({'case':case['id'],'world':world['name'],'query':str(q),'intervalArithmetic':arithmetic,'expected':expected,'checked':active})
result={'scope':'Independent exact arithmetic of 13 finite declared nominal fixture worlds; not a product observer or coverage classifier','checkedWorlds':len(checks),'mismatches':0,'checks':checks}
(root/'challenge/world-arithmetic.json').write_text(json.dumps(result,indent=2))
print(json.dumps({'checkedWorlds':len(checks),'mismatches':0}))
