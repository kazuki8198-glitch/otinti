// CADET — content/people.js : the academy's people (M5), all fictional. Who they are, how they look (npc/actor.js's
// look and colours), where they are at each time of the day (rooms of the academy, the apron), and the colour their
// name has on the subtitles. The instructor (早瀬 教官, M2) is the cadet's own; the others came with M5.
// Positions are in the runway frame (a along, c across), facing a point (yaw is worked out from it).
export const PEOPLE = {
  instructor: { name: '早瀬 航', title: '早瀬 教官', role: '担当教官', color: '#5cc8ff', height: 1.76,
    look: { tag: 'HAYASE' }, colors: {} },
  chief: { name: '真壁 恭一', title: '真壁 主任教官', role: '主任教官（ソロ前の審査・ソロの許可）', color: '#ffb35c', height: 1.8,
    look: { tag: 'MAKABE', bars: 4 }, colors: { hair: 0x8f8a84, skin: 0xd0a080 } },
  lecturer: { name: 'ダナ・ミラー', title: 'ミラー 講師', role: '座学の講師（英語と日本語）', color: '#9be08a', height: 1.7,
    look: { tag: 'MILLER', bars: 0, tie: false, badge: false, hair: 'bun', glasses: true }, colors: { shirt: 0xc9dcef, pocket: 0xbdd2e8, hair: 0x7a5a3a, skin: 0xe9c2a8, trousers: 0x3a3f48 } },
  dispatcher: { name: '佐伯 由美', title: '佐伯さん（運航管理）', role: '運航管理：予定・機体・天気', color: '#e9a0e0', height: 1.62,
    look: { tag: 'SAEKI', bars: 0, tie: false, badge: true, hair: 'bun' }, colors: { shirt: 0x24456e, pocket: 0x213f66, button: 0x1a2c44, hair: 0x241c18, trousers: 0x2a2d33 } },
  mechanic: { name: '大城 剛', title: '大城さん（整備士）', role: '整備士：機体の不具合はここへ', color: '#f2d36b', height: 1.74,
    look: { tag: 'OSHIRO', bars: 0, tie: false, badge: false, lanyard: false, hair: 'crop' }, colors: { shirt: 0x5d6b78, pocket: 0x55626e, button: 0x3c444c, trousers: 0x5d6b78, skin: 0xc58f6c } },
  kiryu: { name: '桐生 蓮', title: '桐生', role: '同期の訓練生（何でもよくできる）', color: '#c9b6ff', height: 1.82, peer: true,
    look: { tag: 'KIRYU', bars: 1 }, colors: { hair: 0x1c1a1a } },
  asahi: { name: '朝日 さくら', title: '朝日', role: '同期の訓練生（明るく、まわりをよく見ている）', color: '#ffc4a8', height: 1.63, peer: true,
    look: { tag: 'ASAHI', bars: 1, hair: 'long' }, colors: { hair: 0x3b2a20, skin: 0xe6bba0, lip: 0xc07870 } },
  mori: { name: '森 拓海', title: '森', role: '同期の訓練生（学科で苦戦している）', color: '#a8e3ff', height: 1.69, peer: true,
    look: { tag: 'MORI', bars: 1, glasses: true }, colors: { hair: 0x2c2420 } },
};
// (M6) the examiner: from outside the academy, for the final check only (a designated examiner: fictional)
PEOPLE.examiner = { name: '黒田 誠一', title: '黒田 審査官', role: '審査官（最終審査の Check Flight）', color: '#b9c4d0', height: 1.74,
  look: { tag: 'KURODA', bars: 4, glasses: true, hair: 'crop' }, colors: { hair: 0x6e6a66, skin: 0xd4aa8a, shirt: 0xeef0f2, pocket: 0xe2e5e8, trousers: 0x2b2e34 } };
export const PEERS = ['kiryu', 'asahi', 'mori'];

// where each one stands: { a, c, face: { a, c } } by the time of day; null: not in the academy then (gone home, flying)
// (the instructor's own places stay main.js's: his room, the apron by today's aircraft)
const AT = {
  counter: { a: 670.0, c: 254.7, face: { a: 670.0, c: 258.0 } },               // the dispatch counter, behind it
  apron: { a: 640.2, c: 214.6, face: { a: 636.5, c: 208.0 } },                 // on the apron, by today's aircraft's tail
  chiefRoom: { a: 672.6, c: 270.8, face: { a: 668.0, c: 266.0 } },             // the instructors' room
  lobbyFront: { a: 655.0, c: 266.5, face: { a: 655.0, c: 260.0 } },            // the lobby, by the plaque (the welcome)
  classroom: { a: 622.3, c: 256.6, face: { a: 627.0, c: 254.6 } },             // briefing room 2, at the whiteboard
  sim: { a: 628.6, c: 268.6, face: { a: 622.0, c: 270.6 } },                   // the training device room, by its screen
  planning: { a: 684.0, c: 268.0, face: { a: 690.0, c: 270.0 } },              // the planning room (the written tests)
  lounge1: { a: 692.6, c: 253.9, face: { a: 695.2, c: 252.6 } }, lounge2: { a: 697.6, c: 253.9, face: { a: 695.2, c: 253.0 } }, lounge3: { a: 690.8, c: 257.1, face: { a: 693.0, c: 255.0 } },
  pilot1: { a: 681.0, c: 252.6, face: { a: 682.0, c: 254.0 } }, pilot2: { a: 683.2, c: 252.6, face: { a: 682.0, c: 254.0 } },
  lobby1: { a: 650.6, c: 262.4, face: { a: 652.0, c: 266.0 } }, lobby2: { a: 652.2, c: 263.8, face: { a: 650.8, c: 262.6 } }, lobby3: { a: 657.6, c: 265.2, face: { a: 655.0, c: 266.5 } },
  // (M6) the examiner's place in the instructors' room; the graduation in the lobby: everyone in a half circle round
  // the plaque, facing the chief instructor
  examRoom: { a: 675.0, c: 268.4, face: { a: 670.0, c: 266.0 } },
  grad1: { a: 651.2, c: 262.2, face: { a: 655.0, c: 266.5 } }, grad2: { a: 653.0, c: 261.6, face: { a: 655.0, c: 266.5 } }, grad3: { a: 657.0, c: 261.6, face: { a: 655.0, c: 266.5 } },
  grad4: { a: 658.8, c: 262.4, face: { a: 655.0, c: 266.5 } }, grad5: { a: 650.2, c: 264.4, face: { a: 655.0, c: 266.5 } }, grad6: { a: 659.8, c: 264.6, face: { a: 655.0, c: 266.5 } },
  grad7: { a: 652.4, c: 268.6, face: { a: 655.0, c: 266.5 } },
};
export const PLACES = AT;
// placeOf(id, slot, chapter, what) → a place or null. what: today's work ({ kind } of career/career.js schedule()),
// so the lecturer is where the class or the device is, the chief where the welcome or the check ride is
export function placeOf(id, slot, chapter, what = []) {
  const has = (k) => what.some(x => x.kind === k && (x.slot === slot || (slot === 'morning' && x.slot === 'am')));
  if (slot === 'evening') return PEERS.includes(id) ? AT[`lounge${PEERS.indexOf(id) + 1}`] : null;
  // (M6) the graduation morning: everyone in the lobby
  if (has('graduation')) return id === 'chief' ? AT.lobbyFront : AT[`grad${['kiryu', 'asahi', 'mori', 'lecturer', 'dispatcher', 'mechanic', 'examiner'].indexOf(id) + 1}`] || null;
  if (id === 'examiner') return chapter === 'ch6' && has('checkride') ? AT.examRoom : null;
  switch (id) {
    case 'dispatcher': return AT.counter;
    case 'mechanic': return AT.apron;
    case 'chief': return chapter === 'prologue' && slot === 'morning' ? AT.lobbyFront : AT.chiefRoom;
    case 'lecturer':
      if (chapter === 'prologue') return slot === 'morning' ? { ...AT.lobbyFront, a: 657.4, c: 267.2 } : null;
      if (has('class')) return AT.classroom;
      if (has('ftd')) return AT.sim;
      if (has('exam') && chapter === 'ch1') return AT.planning;
      return chapter === 'ch1' ? AT.classroom : null;
    default:
      if (!PEERS.includes(id)) return null;
      if (chapter === 'prologue' && slot === 'morning') return AT[`lobby${PEERS.indexOf(id) + 1}`];
      if (chapter === 'ch1' && has('class')) return { ...AT.classroom, a: 627.4 + PEERS.indexOf(id) * 1.2, c: 257.4, face: AT.classroom };
      if (chapter === 'ch1' && has('ftd')) return { a: 613.0 + PEERS.indexOf(id) * 5, c: 266.2, face: { a: 613.0 + PEERS.indexOf(id) * 5, c: 268.0 } };
      // the rest of the day: two of them planning in the pilot room, one studying in the lounge
      return id === 'kiryu' ? AT.pilot1 : id === 'asahi' ? AT.pilot2 : AT.lounge3;
  }
}
