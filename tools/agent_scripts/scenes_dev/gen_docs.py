#!/usr/bin/env python3
"""Assemble docs/scenes.md = hand-written reference + worked examples generated from docs/scene_examples.json."""
import json, pathlib, re

ROOT = pathlib.Path('/home/claude/miqwad')
HERE = pathlib.Path(__file__).resolve().parent
head = (HERE / 'doc_head.md').read_text(encoding='utf-8')
data = json.loads((ROOT / 'docs' / 'scene_examples.json').read_text(encoding='utf-8'))

NOTES = {
    'ex-rb-01': ('Roundabout priority',
                 'Single-lane roundabout. The red car is placed with `{"ring":"outer","before":"S","deg":55}`: on the ring, '
                 'upstream of the S entry, so it comes from the learner\'s LEFT. In the solution the red car continues with '
                 '`"route":"ring->E"` (from wherever it is on the ring) and `me` waits with its brake lights on, then enters '
                 '(`"S1->N"`, 2nd exit, no indicator on the approach, right indicator before leaving: automatic). '
                 '`"labels":"solution"` shows the red car\'s label while the answer plays.'),
    'ex-rb-02': ('Roundabout lane choice for the 3rd exit',
                 'Two entry lanes and two ring lanes. `me` starts in lane 1 (the RIGHT lane), changes to lane 2 (`"lane_change":"left"`, '
                 'left = higher lane number) and takes `"S2->W"` (3rd exit). The engine uses the inner ring for entry lane 2 and exits into '
                 'lane 2 of the W road; the automatic indicators show left on the approach and switch to right after passing the N exit. '
                 'A `from` arrow shows the recommended path, a callout names the lane.'),
    'ex-tl-01': ('Crossroads with lights and a green filter arrow',
                 'Divided 2-lane arms, all controlled by lights. `params.lights` sets the question-frame state: S main red with the RIGHT '
                 'filter arrow green, E green (its traffic goes straight and does not conflict with the right turn). `me` waits in lane 1 '
                 'with its right indicator on (actor key `"signal":"right"`) and turns with `"S1->E"` into lane 1 of the E road.'),
    'ex-jn-01': ('Unmarked crossroads (priority to the right)',
                 '`"control":"none"` and `"markings":"none"` give a junction without lines or signs. The blue car is on arm E, which is '
                 'on the RIGHT of a driver coming from S. The solution lets the blue car pass (`"E1->W"`) and then `me` goes straight.'),
    'ex-jn-02': ('T-junction with STOP',
                 '`tjunction` with `"side":"S"` and `"control":"stop"` (a STOP sign, a solid stop line and STOP painted on the side road). '
                 'Traffic comes from both directions of the main road; `me` (indicating left) waits until both have passed, then turns left '
                 '(`"S1->W"`), ending in the correct (north) half of the main road.'),
    'ex-em-01': ('Ambulance approaching from behind on a 3-lane road',
                 'Divided road, 3 lanes per direction. `me` is in lane 2 (middle); the ambulance (flashing and siren by default) is behind '
                 'in the same lane. Solution: `me` moves RIGHT to lane 1 (`"lane_change":"right"`, automatic right indicator) and slows '
                 '(`"drive":7` with `"ease":"out"`), the ambulance passes in lane 2. Both arrows use `"track":"solution"`, so they always '
                 'match the animation.'),
    'ex-sb-01': ('School bus stopped with the STOP arm out (undivided road)',
                 'One lane each way, broken centre line. `"stop_arm": true` on the school bus deploys the arm on its LEFT (driver) side and '
                 'turns on the red flashers. `me` stops 6 m behind the bus with `{"behind":"bus","gap":6}`; the car coming the other way '
                 'stops too (`{"y":43}`, more than 5 m before the bus). The arm folds (`"stop_arm": false`), the bus leaves, then traffic moves.'),
    'ex-pd-01': ('Pedestrian at a zebra crossing',
                 '`"zebra":{"y":32}` draws the crossing and its signs; the pedestrian stands at `{"crossing":"zebra","side":"east"}`. '
                 '`"stop_at":"crossing"` stops `me` before the stripes, `"cross":"zebra"` walks the pedestrian to the far pavement, then `me` drives on.'),
    'ex-hw-01': ('Highway merge',
                 '`highway-merge` with 3 lanes: the ramp joins from the RIGHT into an acceleration lane. `me` starts on the ramp '
                 '(`{"lane":"ramp","y":8}`), the truck is in lane 1. `"route":"merge"` with `"merge_at":62` makes `me` accelerate (`"ease":"in"`), '
                 'indicate left (automatic) and join lane 1 behind the truck. The arrow stops at the merge point (`"until":"merge"`).'),
    'ex-hz-01': ('Hazard perception: a child runs after a ball (tap question)',
                 'A 4 s `intro` clip: `me` drives along a street with cars parked on the right (`"parked":{"up":[...]}`), a ball rolls out '
                 'from a gap (`to` a lane slot) and a child steps into the gap. The question freezes at the end of the intro. Hotspots: the '
                 'child and the ball are correct (`"answer":["kid","ball"]`), the oncoming car and a parked car are distractors. '
                 'Solution: brake and stop short, the child fetches the ball (`"visible": false` hides it) and returns, then `me` continues.'),
}


def one(obj):
    if isinstance(obj, dict):
        return '{ ' + ', '.join(json.dumps(k, ensure_ascii=False) + ': ' + one(v) for k, v in obj.items()) + ' }' if obj else '{}'
    if isinstance(obj, list):
        return '[' + ', '.join(one(v) for v in obj) + ']'
    return json.dumps(obj, ensure_ascii=False)


def fmt(obj, level=0, prefix=0, width=112):
    """Width-aware pretty printer: anything that fits on its line stays on one line."""
    flat = one(obj)
    if level * 2 + prefix + len(flat) <= width or not isinstance(obj, (dict, list)) or not obj:
        return flat
    pad = '  ' * (level + 1)
    if isinstance(obj, dict):
        items = []
        for k, v in obj.items():
            key = json.dumps(k, ensure_ascii=False) + ': '
            items.append(pad + key + fmt(v, level + 1, len(key), width))
        return '{\n' + ',\n'.join(items) + '\n' + '  ' * level + '}'
    items = [pad + fmt(v, level + 1, 0, width) for v in obj]
    return '[\n' + ',\n'.join(items) + '\n' + '  ' * level + ']'


out = [head.rstrip('\n'), '']
for i, sc in enumerate(data['scenarios'], 1):
    title, note = NOTES.get(sc['id'], (sc['id'], ''))
    out.append(f'### 13.{i} {title} (`{sc["id"]}`)')
    out.append('')
    if note:
        out.append(note)
        out.append('')
    out.append('```json')
    out.append(fmt(sc))
    out.append('```')
    out.append('')

out.append('''---

## 14. Known limits

- Roads are always drawn north-south and junction arms meet at right angles (no skewed or curved roads,
  no slip lanes, no multi-junction networks). Use `view` to crop.
- Lane changes, turns and parking are geometric curves, not a vehicle physics model; very short `dist`
  values give sharp swerves.
- A car stays in the lane geometry of its template: there is no free "overtake" action; build it from
  `lane_change` + `drive` + `lane_change`.
- Traffic lights have one signal head per arm; pedestrian signals are not drawn.
- The collision check compares rectangles every 0.1 s; very fast actors can slip between samples.
- Road text painted on the asphalt is limited to STOP and BUS.
- Sign pictures come from `window.Signs` when that module is loaded (built page); otherwise simple
  built-in drawings are used for STOP, give way, roundabout, U-turn, works, school, hump and pedestrian crossing.
''')
(ROOT / 'docs' / 'scenes.md').write_text('\n'.join(out), encoding='utf-8')
print('docs/scenes.md', len('\n'.join(out)), 'chars')
