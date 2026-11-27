import { expect,it } from 'vitest';
import { EngineSession } from './session';
import { allocationId } from './identity';
import { diagramVoicing,formatVoicingTone,getPlaybackMidi,getChordToneChoices,physicalReasonText,positionLabel } from './presentation';
import { engineEntry } from './catalog';

it('prepares authoritative notes without a feasibility boolean and verifies identity before audio',()=>{
    const session=new EngineSession({schema:'intent-v1',chordId:'major',rootPitchClass:0});
    const row=session.lookup(allocationId([64,59,55,50,45,40],[0,8,9,10,-1,-1]));
    const diagram=diagramVoicing(row);
    expect(Object.keys(diagram)).toEqual(['notes']);
    expect(diagram.notes.filter(n=>!n.isMuted).map(n=>n.midiNote)).toEqual([64,67,64,60]);
    expect(getPlaybackMidi(row)).toEqual([60,64,64,67]);
    const corrupt={...row,candidate:{...row.candidate,sounding:row.candidate.sounding.map((n,i)=>i? n:{...n,midi:65})}};
    expect(()=>getPlaybackMidi(corrupt)).toThrow(/pitches/);
});
it('spells the canonical diminished seventh and presents all-open position truthfully',()=>{
    const choices=getChordToneChoices(engineEntry('diminished-7'),0);
    expect(choices.find(c=>c.value==='bb7')).toEqual({value:'bb7',label:'B♭♭ · ♭♭7'});
    const session=new EngineSession({schema:'intent-v1',chordId:'major',rootPitchClass:0,instrument:{kind:'six-single-strings-12edo',tuningMidi:[60,64,67,60,64,67],maxModeledFret:0}});
    const row=session.lookup(allocationId([60,64,67,60,64,67],[0,0,0,0,0,0]));
    expect(positionLabel(row)).toBe('All open');
    expect(physicalReasonText('unsupported-damping')).toContain('not analyzed');
    expect(physicalReasonText('groups-over-five')).toContain('contact groups');
});

it.each([
    [0, 'b3', 63, 'E♭4'],
    [0, '#9', 63, 'D♯4'],
    [6, '#4', 60, 'B♯3'],
    [3, 'b6', 59, 'C♭4'],
    [0, 'bb7', 57, 'B♭♭3'],
] as const)('spells root %i degree %s at MIDI %i as %s', (root, degree, midi, name) => {
    expect(formatVoicingTone(root, degree, midi, true)).toBe(name);
    expect(formatVoicingTone(root, degree, midi % 12)).toBe(name.slice(0, -1));
});
