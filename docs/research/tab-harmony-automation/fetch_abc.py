"""Fetch the pinned ABC files into a caller-provided research cache."""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.request import urlopen
import argparse
import hashlib
import json

PIN = "b6b7d38500bacb30c81db7e09d8790df1a2edd46"
OPUS = ["18-1", "18-2", "18-3", "18-4", "18-5", "18-6", "59-1", "59-2",
        "59-3", "74", "95", "127", "130", "131", "132", "135"]
SPLITS = {"dev": [1, 6, 8, 11, 14], "calibration": [2, 7, 12, 16], "test": [3, 4, 5, 9, 10, 13, 15]}

def piece_name(index):
    return f"n{index:02d}op{OPUS[index - 1]}_01"

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("cache", type=Path)
    parser.add_argument("split", choices=SPLITS)
    args = parser.parse_args()
    args.cache.mkdir(parents=True, exist_ok=True)
    files = [f"{kind}/{piece_name(i)}.{kind}.tsv" for i in SPLITS[args.split]
             for kind in ("notes", "harmonies", "measures")]

    def acquire(relative):
        destination = args.cache / relative
        destination.parent.mkdir(exist_ok=True)
        if not destination.exists():
            with urlopen(f"https://raw.githubusercontent.com/DCMLab/ABC/{PIN}/{relative}", timeout=40) as response:
                destination.write_bytes(response.read())
        return relative, hashlib.sha256(destination.read_bytes()).hexdigest()

    with ThreadPoolExecutor(max_workers=6) as pool:
        hashes = dict(pool.map(acquire, files))
    print(json.dumps({"revision": PIN, "split": args.split, "sha256": hashes}, indent=2))

if __name__ == "__main__":
    main()
