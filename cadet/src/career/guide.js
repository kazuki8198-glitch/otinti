// CADET — career/guide.js : what to do next, said in one line (the guide at the top of the screen), and the way there
// through the academy's doors. Pure: it reads what main.js tells it (today's plan, what is decided and done, the
// walk-around's progress) and the academy's rooms and doors (content/academy-spec.js).
//   nextStep(s) → { text, who, room, at } — who: a person to talk to (or null); room: where it happens (an academy room
//   id, 'outside'); at: 'person' | 'room' | 'walk' (the next place of the walk-around) | 'board' (the aircraft's door)
//   | 'entrance' (the front doors, home)
//   makeRouter(spec).next(fromRoom, toRoom) → the first door on the way ({ a, c, label }) or null (the same room)

const SLOT_JA = { morning: '朝', am: '午前', pm: '午後', evening: '夜' };
const ORDER = ['morning', 'am', 'pm', 'evening'];
const FLYING = new Set(['flight', 'checkride', 'solo']);

// s: { chapter, slot, plan: [{ slot, kind, id, title, where, who, state: 'done' | 'missed' | 'now' | 'later' }],
//      decided, briefed (today's briefing heard: the chief's on the check ride's day), walk: { done, total }, flown }
export function nextStep(s) {
  const plan = (s.plan || []).filter(x => x.kind !== 'off');
  if (!plan.length) return { text: '今日は休日。ラウンジで休んでも、自習してもいい。正面入口から寮に帰ると次の日になります', who: null, room: 'outside', at: 'entrance' };
  const cur = plan.find(x => x.state === 'now' || x.state === 'later');
  if (!cur) {
    const evening = s.slot === 'evening';
    return { text: evening ? '今日の予定は終わり。ラウンジで同期と話せます。正面入口から寮に帰ると次の日になります'
      : '今日の予定は終わりました。正面入口から寮に帰ると、次の日になります', who: null, room: 'outside', at: 'entrance' };
  }
  const later = ORDER.indexOf(cur.slot) > ORDER.indexOf(s.slot) ? `${SLOT_JA[cur.slot]}：` : '';
  if (FLYING.has(cur.kind)) {
    if (!s.decided) return { text: `${later}運航管理で今日の天気を見て、飛ぶかを決める（佐伯さんに話しかける）`, who: 'dispatcher', room: 'dispatch', at: 'person' };
    if (!s.briefed) {
      return cur.kind === 'checkride'
        ? { text: `${later}審査の前に、真壁 主任教官のブリーフィングを受ける`, who: 'chief', room: null, at: 'person' }
        : { text: `${later}ブリーフィング室 1 で、早瀬 教官から今日の課目の説明を受ける`, who: 'instructor', room: 'brief-1', at: 'person' };
    }
    if (s.walk && s.walk.done < s.walk.total) return { text: `駐機場の今日の機体で外部点検（${s.walk.done} / ${s.walk.total}）。光る印の所を調べる（E）`, who: null, room: 'outside', at: 'walk' };
    return { text: '今日の機体に乗り込む（右の翼の付け根のドア：E）', who: null, room: 'outside', at: 'board' };
  }
  const T = {
    ceremony: { text: 'ロビーで、真壁 主任教官の歓迎の言葉を聞く（近づいて E で話しかける）', who: 'chief', room: 'lobby' },
    tour: { text: '運航管理（ロビーの北）の佐伯さんに話しかけて、訓練所を案内してもらう', who: 'dispatcher', room: 'dispatch' },
    brief: { text: 'ブリーフィング室 1 で、担当の早瀬 教官に会う', who: 'instructor', room: 'brief-1' },
    class: { text: `ブリーフィング室 2 で、ミラー講師の授業を受ける（${cur.title}）`, who: 'lecturer', room: 'brief-2' },
    ftd: { text: `訓練装置室で、ミラー講師と${cur.title}`, who: 'lecturer', room: 'sim' },
    exam: { text: `計画室で、${cur.title}を受ける`, who: cur.who, room: 'planning' },
    study: { text: cur.title, who: cur.who, room: cur.where },
  }[cur.kind] || { text: cur.title, who: cur.who, room: cur.where };
  return { ...T, text: later + T.text, at: T.who ? 'person' : 'room' };
}

// the academy's doors as a graph: the way from one room to another goes through the doors that open
export function makeRouter(spec) {
  const open = spec.doors.filter(d => d.kind !== 'locked');
  const mid = (d) => (d.wall === 'a' ? { a: d.at, c: (d.from + d.to) / 2 } : { a: (d.from + d.to) / 2, c: d.at });
  function next(from, to) {
    if (!from || !to || from === to) return null;
    const prev = new Map([[from, null]]), queue = [from];
    while (queue.length) {
      const r = queue.shift();
      if (r === to) break;
      for (const d of open) {
        if (!d.rooms.includes(r)) continue;
        const o = d.rooms[0] === r ? d.rooms[1] : d.rooms[0];
        if (!prev.has(o)) { prev.set(o, { room: r, door: d }); queue.push(o); }
      }
    }
    if (!prev.has(to)) return null;
    let r = to, step = prev.get(r);
    while (step && step.room !== from) { r = step.room; step = prev.get(r); }
    return step ? { ...mid(step.door), label: step.door.label_ja || '', door: step.door.id } : null;
  }
  const room = (id) => spec.rooms.find(r => r.id === id) || null;
  const centre = (id) => { const r = room(id); return r ? { a: (r.a0 + r.a1) / 2, c: (r.c0 + r.c1) / 2 } : null; };
  return { next, centre, room };
}
