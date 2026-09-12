"""Read-only adapter for an externally supplied, pinned notation implementation."""
import contextlib
import importlib.util
import io
import json
import os
from pathlib import Path
import sys

source = Path(sys.argv[1]).resolve()
sys.path.insert(0, str(source.parent))
os.chdir(source.parent)
spec = importlib.util.spec_from_file_location("notation_reference", source)
reference = importlib.util.module_from_spec(spec)
spec.loader.exec_module(reference)
names = {"Guitar": "distorted0", "Guitar 2": "distorted1", "Guitar 3": "distorted2",
         "Clean Guitar": "clean0", "Clean Guitar 2": "clean1"}


def normalize(song):
    beats = []
    excluded = []
    for track in song.tracks:
        instrument = names.get(track.name)
        if not instrument:
            continue
        if [string.value for string in track.strings] != [64, 59, 55, 50, 45, 40]:
            excluded.append(instrument)
            continue
        for measure in track.measures:
            for beat in measure.voices[0].beats:
                notes = sorted([dict(string=n.string - 1, fret=n.value, type=n.type.value,
                                     ring=n.effect.letRing, ghost=n.effect.ghostNote)
                                for n in beat.notes], key=lambda n: n["string"])
                beats.append(dict(instrument=instrument, tick=beat.start - 960,
                                  duration=beat.duration.time, rest=beat.status.name == "rest", notes=notes))
    return sorted(beats, key=lambda b: (b["instrument"], b["tick"])), excluded


for line in sys.stdin:
    try:
        request = json.loads(line)
        text = request.get("text")
        if text is None:
            text = Path(request["path"]).read_text(encoding="utf-8")
        with contextlib.redirect_stdout(io.StringIO()):
            song = reference.tokens2guitarpro(text.splitlines(), verbose=False)
            beats, excluded = normalize(song)
            roundtrip = None
            if request.get("roundtrip"):
                encoded = reference.guitarpro2tokens(song, "unknown", verbose=False)
                decoded = reference.tokens2guitarpro(encoded, verbose=False)
                roundtrip, _ = normalize(decoded)
        result = dict(ok=True, beats=beats, excluded=excluded, roundtrip=roundtrip)
    except Exception as error:
        result = dict(ok=False, error=type(error).__name__ + ": " + str(error))
    print(json.dumps(result, separators=(",", ":")), flush=True)
