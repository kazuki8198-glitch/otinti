#!/usr/bin/env python3
"""Compare digest-js.jsonl vs digest-cs.jsonl.
Numbers: abs tolerance 1e-9 (rel for large). Strings/bools/null: exact.
Reports the first N mismatches with JSON paths; also aligns by (tag, day)
when line counts diverge so a pacing difference is localized."""
import json, sys

TOL = 1e-9

def cmp(a, b, path, errs):
    if len(errs) >= 25:
        return
    if isinstance(a, bool) or isinstance(b, bool):
        if a is not b:
            errs.append(f"{path}: bool {a!r} != {b!r}")
        return
    if isinstance(a, (int, float)) and isinstance(b, (int, float)):
        if abs(a - b) > TOL * max(1.0, abs(a), abs(b)):
            errs.append(f"{path}: num {a!r} != {b!r}")
        return
    if type(a) is not type(b):
        if a is None or b is None:
            errs.append(f"{path}: {a!r} != {b!r}")
            return
        errs.append(f"{path}: type {type(a).__name__} {a!r} != {type(b).__name__} {b!r}")
        return
    if isinstance(a, dict):
        ka, kb = set(a), set(b)
        if ka != kb:
            errs.append(f"{path}: keys js-only={sorted(ka-kb)[:6]} cs-only={sorted(kb-ka)[:6]}")
        for k in sorted(ka & kb):
            cmp(a[k], b[k], f"{path}.{k}", errs)
        return
    if isinstance(a, list):
        if len(a) != len(b):
            errs.append(f"{path}: len {len(a)} != {len(b)}")
        for i, (x, y) in enumerate(zip(a, b)):
            cmp(x, y, f"{path}[{i}]", errs)
        return
    if a != b:
        errs.append(f"{path}: {a!r} != {b!r}")

def key(o):
    return (o.get('tag'), o.get('seed'), o.get('day'), o.get('chapter'))

def main():
    js = [json.loads(l) for l in open('digest-js.jsonl')]
    cs = [json.loads(l) for l in open('digest-cs.jsonl')]
    print(f"lines: js={len(js)} cs={len(cs)}")
    errs = []
    n = min(len(js), len(cs))
    bad_lines = 0
    for i in range(n):
        e0 = len(errs)
        cmp(js[i], cs[i], f"line{i}({key(js[i])})", errs)
        if len(errs) > e0:
            bad_lines += 1
        if len(errs) >= 25:
            break
    print(f"compared {n} line pairs, mismatching lines: {bad_lines}")
    for e in errs:
        print("MISMATCH", e)
    if len(js) != len(cs):
        jk = [key(o) for o in js]; ck = [key(o) for o in cs]
        for i in range(n):
            if jk[i] != ck[i]:
                print(f"first key divergence at line {i}: js={jk[i]} cs={ck[i]}")
                break

if __name__ == '__main__':
    main()
