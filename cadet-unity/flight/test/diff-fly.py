import json, sys
def load(p):
    out = {}
    for line in open(p, encoding='utf-8-sig'):
        d = json.loads(line)
        out[(d['id'], d['level'])] = d
    return out
js = load('digest-fly-js.jsonl'); cs = load('digest-fly-cs.jsonl')
assert set(js) == set(cs), (len(js), len(cs))
exact = 0; rowdiff = []; scorediff = []
for k in sorted(js):
    a, b = js[k], cs[k]
    same_head = (a.get('done') == b.get('done') and a.get('passed') == b.get('passed')
                 and a.get('grade') == b.get('grade') and a.get('passPct') == b.get('passPct'))
    sa, sb = a.get('score'), b.get('score')
    score_ok = (sa is None and sb is None) or (sa is not None and sb is not None and abs(sa - sb) <= 0.03)
    ra, rb = a.get('rows', []), b.get('rows', [])
    rows_same = len(ra) == len(rb) and all(
        x[0] == y[0] and x[1] == y[1] and x[2] == y[2] and
        ((x[3] is None and y[3] is None) or (x[3] is not None and y[3] is not None and abs(x[3] - y[3]) <= 0.03))
        for x, y in zip(ra, rb))
    if same_head and score_ok and rows_same: exact += 1
    else:
        if not rows_same: rowdiff.append(k)
        if not (same_head and score_ok): scorediff.append((k, {f: (a.get(f), b.get(f)) for f in ('done','passed','grade','score','passPct','t')}))
print(f"total {len(js)}  fully-equal {exact}")
print("row-diffs:", rowdiff)
print("head/score-diffs:")
for k, v in scorediff: print(" ", k, v)
