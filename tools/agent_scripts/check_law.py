import json, re, collections, sys
P = '/home/claude/miqwad/content/q_law.json'
d = json.load(open(P, encoding='utf-8'))
errs = []
TOPICS = {'law', 'penalties', 'accidents', 'dubai-specific', 'sharjah-specific'}
BAD_CHARS = {'ً': 'fathatan', 'ٌ': 'dammatan', 'ٍ': 'kasratan', 'ّ': 'shadda',
             '—': 'em dash', '–': 'en dash'}
PASSIVE = re.compile(r'(^|\s)(يمنع|يسمح|يعاقب|يحظر|تمنع|تحظر)(\s|$)')
LATIN = re.compile(r'[A-Za-z]')


def check_text(where, s, is_question=False):
    if not isinstance(s, str):
        errs.append('%s: not a string' % where); return
    for ch, name in BAD_CHARS.items():
        if ch in s:
            errs.append('%s: contains %s: %s' % (where, name, s))
    st = s.rstrip()
    if st != s:
        errs.append('%s: trailing whitespace' % where)
    if st.endswith('.') or st.endswith('۔'):
        errs.append('%s: ends with full stop: %s' % (where, s))
    if LATIN.search(s):
        errs.append('%s: Latin letters: %s' % (where, s))
    if '  ' in s:
        errs.append('%s: double space' % where)


ids = set()
for s_id, s in d['sources'].items():
    assert re.fullmatch(r'S\d+', s_id), s_id
    for k in ('title', 'url', 'publisher', 'date'):
        if not s.get(k):
            errs.append('source %s missing %s' % (s_id, k))

used_src = set()
for c in d['cards']:
    if c['id'] in ids: errs.append('dup id ' + c['id'])
    ids.add(c['id'])
    if c['topic'] not in TOPICS: errs.append('bad topic ' + c['id'])
    if c['level'] not in range(1, 6): errs.append('bad level ' + c['id'])
    for f in ('title', 'body'):
        check_text(c['id'] + '.' + f, c[f])
    if c.get('key'):
        check_text(c['id'] + '.key', c['key'])
    for s in c['src']:
        used_src.add(s)
        if s not in d['sources']: errs.append('%s: unknown src %s' % (c['id'], s))
    if c['confidence'] not in ('high', 'medium'): errs.append('bad conf ' + c['id'])

pos = collections.Counter()
lv_topic = collections.defaultdict(collections.Counter)
dirham_q = []
for q in d['questions']:
    qid = q['id']
    if qid in ids: errs.append('dup id ' + qid)
    ids.add(qid)
    if q['topic'] not in TOPICS: errs.append('bad topic ' + qid)
    if not qid.startswith('law-%s-' % q['topic']): errs.append('id/topic mismatch ' + qid)
    if q['level'] not in range(1, 6): errs.append('bad level ' + qid)
    lv_topic[q['topic']][q['level']] += 1
    if len(q['options']) != 4: errs.append('%s: %d options' % (qid, len(q['options'])))
    if len(set(q['options'])) != len(q['options']): errs.append('%s: duplicate options' % qid)
    if not (isinstance(q['answer'], int) and 0 <= q['answer'] < len(q['options'])):
        errs.append('%s: bad answer index' % qid)
    pos[q['answer']] += 1
    check_text(qid + '.q', q['q'])
    if not q['q'].endswith('؟'): errs.append('%s: question without ؟' % qid)
    for i, o in enumerate(q['options']):
        check_text('%s.opt%d' % (qid, i), o)
        if o.endswith('؟'): errs.append('%s: option ends with ?' % qid)
        if 'كل ما سبق' in o or 'لا شيء مما سبق' in o: errs.append('%s: forbidden option' % qid)
    check_text(qid + '.explain', q['explain'])
    if q.get('tip'): check_text(qid + '.tip', q['tip'])
    if q.get('notes'): check_text(qid + '.notes', q['notes'])
    for s in q['src']:
        used_src.add(s)
        if s not in d['sources']: errs.append('%s: unknown src %s' % (qid, s))
    if q['confidence'] not in ('high', 'medium'): errs.append('bad conf ' + qid)
    if q['exam'] not in (['dubai', 'sharjah'], ['dubai'], ['sharjah']): errs.append('bad exam ' + qid)
    opts_text = ' '.join(q['options'])
    if re.search(r'\d درهم|\d دراهم|\d درهما', opts_text):
        dirham_q.append(qid)
        if q['level'] < 4: errs.append('%s: exact-dirham question below level 4' % qid)
        if not q.get('notes'): errs.append('%s: exact-dirham question without notes' % qid)
    for f in ('q', 'explain', 'tip', 'notes'):
        text = q.get(f) or ''
        words = text.replace('،', ' ').split()
        for i, wd in enumerate(words):
            if wd in ('يمنع', 'يسمح', 'يعاقب', 'يحظر', 'تمنع', 'تحظر', 'تسمح', 'تعاقب'):
                before = ' '.join(words[max(0, i - 3):i])
                after = words[i + 1] if i + 1 < len(words) else ''
                if not re.search(r'القانون|المادة|اللائحة|جدول|القرار|الشرطة|مرسوم|الدليل|دليل', before) \
                        and after not in ('القانون',):
                    errs.append('%s.%s: check passive/subject "%s"' % (qid, f, wd))
for c in d['cards']:
    words = c['body'].replace('،', ' ').split()
    for i, wd in enumerate(words):
        if wd in ('يمنع', 'يسمح', 'يعاقب', 'يحظر', 'تمنع', 'تحظر', 'تسمح', 'تعاقب'):
            before = ' '.join(words[max(0, i - 3):i])
            if not re.search(r'القانون|المادة|اللائحة|جدول|القرار|الشرطة|مرسوم', before):
                errs.append('%s.body: check passive/subject "%s"' % (c['id'], wd))

unused = set(d['sources']) - used_src
print('cards:', len(d['cards']), collections.Counter(c['topic'] for c in d['cards']))
print('questions:', len(d['questions']))
for t in sorted(lv_topic):
    print('  %-17s total %3d  levels %s' % (t, sum(lv_topic[t].values()), dict(sorted(lv_topic[t].items()))))
tot = collections.Counter()
for t in lv_topic: tot.update(lv_topic[t])
print('levels overall:', dict(sorted(tot.items())))
print('answer positions:', dict(sorted(pos.items())))
print('exact-dirham questions:', len(dirham_q))
print('confidence:', collections.Counter(q['confidence'] for q in d['questions']),
      'cards', collections.Counter(c['confidence'] for c in d['cards']))
print('unused sources:', sorted(unused, key=lambda s: int(s[1:])))
print('ERRORS:', len(errs))
for e in errs: print(' -', e)
