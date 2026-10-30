// CADET — content/tower-spec.js : the control tower as a place (fictional), in the runway frame, in the same
// shape as content/academy-spec.js (rooms / doors / interactables / furniture), so world/tower.js can build it
// with the same kit. The tower stands north of the academy (world/layout.js TOWER: base a 712–730, c 253–271,
// the shaft a 718.6–723.4, c 259.6–264.4 rising to the cab at 17.2). Inside: a ground-floor hall around the
// shaft, the dog-leg stair in the shaft (its geometry is world/layout.js towerStairs()), and the cab — a glass
// room whose walkable floor is the disc's top, in pieces around the stair's opening (world/tower.js).
import { TOWER, towerStairs } from '../world/layout.js';

export function towerSpec() {
  const T = TOWER, S = towerStairs(T);
  const lightsGrid = (a0, a1_, c0, c1, step = 3) => { const out = []; const na = Math.max(1, Math.round((a1_ - a0) / step)), nc = Math.max(1, Math.round((c1 - c0) / step)); for (let i = 0; i < na; i++) for (let j = 0; j < nc; j++) out.push({ a: +(a0 + (i + 0.5) * (a1_ - a0) / na).toFixed(2), c: +(c0 + (j + 0.5) * (c1 - c0) / nc).toFixed(2) }); return out; };
  // the stair's own lights: a fixture over every other landing (no prop hangs in the shaft: prop: false — the
  // light pool only), climbing with the flights
  const stairLights = S.landings.filter((l, i) => i % 2 === 0 && l.y < T.cabFloor).map(l => ({ a: (l.a0 + l.a1) / 2, c: (S.inC0 + S.inC1) / 2, y: l.y + 2.4, prop: false }));
  // the cab's floor, in colliders' pieces (world/tower.js builds them, and the floor flats over them): the east
  // lane's block, the south-west block, and the aprons over the disc beyond the shaft's square — the north-west
  // L (the last flight and its landing) stays open, that is where the stair arrives
  const cabFloors = [
    [S.inA0, S.inA1, S.inC0 + S.laneW + 0.2, S.inC1],
    [S.inA1 - S.land, S.inA1, S.inC0, S.inC0 + S.laneW + 0.2],
    [717.9, S.inA0, 260.6, 263.4],
    [S.inA1, 724.1, 260.6, 263.4],
    [719.3, 722.7, 258.9, S.inC0],
    [719.3, 722.7, S.inC1, 265.1],
  ];

  const rooms = [
    { id: 'tower-hall', name_ja: '管制塔 1 階（ホール）', purpose: '管制塔の入口。見学は管制官の許可を得てから、階段で管制室へ。', a0: 712.4, a1: 729.6, c0: 253.4, c1: 270.6, floor: 'tile', ceiling: T.baseTop, closed: false,
      floorRects: [[712.4, T.s0, 253.4, 270.6], [T.s1, 729.6, 253.4, 270.6], [T.s0, T.s1, 253.4, T.sc0], [T.s0, T.s1, T.sc1, 270.6]],
      lights: lightsGrid(713, 729.1, 254, 270.1, 3.4),
      furniture: [
        { type: 'bench', a: 716.0, c: 254.6, rot: 90 }, { type: 'bench', a: 726.0, c: 254.6, rot: 90 },
        { type: 'bulletin_board', a: 729.54, c: 262.0, rot: 270 },
        { type: 'sign_board', a: 714.0, c: 253.46, rot: 0, note: 'tower' },
        { type: 'plant', a: 713.4, c: 269.6, rot: 0 }, { type: 'plant', a: 728.6, c: 269.6, rot: 0 },
        { type: 'wall_clock', a: 712.46, c: 262.0, rot: 90 },
        { type: 'trash_bin', a: 717.0, c: 269.8, rot: 0 },
      ] },
    { id: 'tower-stairs', name_ja: '管制塔の階段', purpose: 'シャフトの中の階段。5 つの折り返しで管制室まで上がる。', a0: S.inA0, a1: S.inA1, c0: S.inC0, c1: S.inC1, floor: 'concrete', ceiling: T.cabFloor, open: true, closed: false,
      lights: stairLights,
      furniture: [] },
    { id: 'tower-cab', name_ja: '管制室', purpose: '管制官の席と管制卓。全周のガラスから場周と駐機場が見渡せる。交信の見学ができる。', level: 2, floorY: T.cabFloor, a0: 717.5, a1: 724.5, c0: 258.5, c1: 265.5, floor: 'concrete', ceiling: T.cabCeil, open: true, closed: false,
      floorRects: cabFloors,
      lights: [],
      furniture: [
        { type: 'atc_console', a: 722.6, c: 260.4, rot: 180 }, { type: 'office_chair', a: 722.6, c: 261.5, rot: 0 },
        { type: 'atc_console', a: 719.9, c: 263.6, rot: 180 }, { type: 'office_chair', a: 719.9, c: 262.5, rot: 0 },
        { type: 'atc_console', a: 722.9, c: 263.6, rot: 180 }, { type: 'office_chair', a: 722.9, c: 262.5, rot: 0 },
        { type: 'stool', a: 720.5, c: 264.6, rot: 0 }, { type: 'stool', a: 719.6, c: 259.6, rot: 0 },
      ] },
  ];

  // ---------------------------------------------------------------- doors
  const doors = [
    { id: 'x-tower-main', rooms: ['tower-hall', 'outside'], kind: 'sliding_auto', wall: 'c', at: T.c0 + 0.2, from: 720.1, to: 721.9, label_ja: '管制塔 入口' },
    { id: 'd-tower-stair', rooms: ['tower-hall', 'tower-stairs'], kind: 'swing', wall: 'a', at: T.s1 - T.wall / 2, from: 260.4, to: 261.6, label_ja: '階段' },
    // the stair itself as a graph edge (graph: no leaf is built and no wall is cut — the flights are in the room)
    { id: 'stair-tower', rooms: ['tower-stairs', 'tower-cab'], kind: 'opening', wall: 'a', at: S.inA0, from: S.inC0, to: S.inC0 + S.laneW + 0.2, graph: true, label_ja: '管制室' },
  ];

  // ---------------------------------------------------------------- what can be examined (E)
  const interactables = [
    { id: 'tower-notice', room: 'tower-hall', a: 729.2, c: 262.0, y: 1.5, prompt_ja: '掲示板を見る', title_ja: '管制塔の掲示板',
      text_ja: '見学について：訓練生の見学は、管制官の許可を得てから。管制室では静かに、管制官の後ろで。\n交信は記録ではなく勉強のために聞くこと。分からない言い回しは、降りてから教官に聞くこと。\n（この飛行場と管制は架空です）' },
    { id: 'tower-sign', room: 'tower-hall', a: 714.0, c: 253.8, y: 1.6, prompt_ja: '案内を見る', title_ja: '管制塔',
      text_ja: 'LAB 飛行場の管制塔（架空）。\n1 階：ホール／ 階段：管制室まで 5 つの折り返し\n管制室：場周・駐機場・滑走路のすべてが見えます。' },
    { id: 'tower-visit', room: 'tower-cab', a: 721.6, c: 261.6, y: T.cabFloor + 1.2, prompt_ja: '管制を見学する', title_ja: '管制の見学',
      text_ja: '管制官の後ろで、実際の交信を聞けます。' },
    { id: 'tower-scope', room: 'tower-cab', a: 721.4, c: 263.2, y: T.cabFloor + 1.1, prompt_ja: 'レーダースコープを見る', title_ja: 'レーダースコープ',
      text_ja: '場周と訓練空域の機影。光点の横の小さな数字が、便名と高度。\n自分の機体がここにどう見えているか——交信の向こう側の景色。' },
    { id: 'tower-view', room: 'tower-cab', a: 720.6, c: 259.3, y: T.cabFloor + 1.6, prompt_ja: '場周を眺める', title_ja: '管制室からの眺め',
      text_ja: '西に滑走路 36/18 と場周、真下に駐機場とアカデミー、東に駐車場と寮。\n訓練空域は北東。自分が飛ぶ空を、管制官は毎日ここから見ている。' },
  ];

  return {
    rooms, doors, interactables, cabFloors,
    // the controller's place in the cab: at the south-west console, facing the apron and the runway
    controller: { a: 722.6, c: 261.5, y: T.cabFloor, face: { a: 722.6, c: 250.0 } },
    hall: { a: 721.0, c: 258.0 },
  };
}
