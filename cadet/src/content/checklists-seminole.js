// CADET — content/checklists-seminole.js : the twin's ground checklists (M6), the Archer's (content/checklists-archer.js)
// with what a published PA-44 training checklist adds: the gear lever checked DOWN before the start, the two engines
// started one after the other (the left first), the propellers cycled (and the feathering checked) in the run-up.
// Simplified, written for the game; the aircraft's POH and the school's checklist govern.
import { CHECKLISTS as A } from './checklists-archer.js';

const near = (x, v, d) => Math.abs(x - v) <= d;
export const CHECKLISTS = {
  ...A,
  before_start: { title: 'エンジン始動前（BEFORE STARTING ENGINES）', items: [
    ...A.before_start.items,
    ['脚のレバー', 'DOWN', null, null, '引き込み脚の機体です。地上では、脚のレバーが DOWN にあることを必ず確かめます。', null],
  ] },
  start: { title: 'エンジン始動（STARTING ENGINES・左から）', items: [
    ...A.start.items.filter(it => !['マグネトー', 'スロットル', '油圧'].includes(it[0])).flatMap(it => (it[0] === 'ミクスチャー' ? [['ミクスチャー', 'フル リッチ（左右とも）', it[2], it[3], '赤いレバーを 2 本とも、いちばん前まで。', it[5]],
      ['スロットル', '1/4 インチ開く（左右とも）', c => c.s.thr >= 0.03 && c.s.thr <= 0.16, 'throttle', '左右のレバーを、ほんの少しだけ。', c => c.setThr(0.05)]] : [it])),
    ['左エンジン', 'START（かかったら離す）', c => c.sys.runningL || c.sys.running, 'mag', 'まず左のエンジンから。キーを START まで回し、かかったら手を離します。', c => { if (!c.sys.cranking && !c.sys.runningL) c.sw.mag = 'START'; }],
    ['右エンジン', 'START（かかったら離す）', c => c.sys.running, 'mag', '左が回ったら、右。もう一度 START です。', c => { if (!c.sys.cranking && c.sys.runningL && !c.sys.running) c.sw.mag = 'START'; }],
    ['スロットル', '1,000 rpm（左右とも）', c => c.sys.running && near(c.rpm, 1000, 180), 'throttle', '', c => c.setThr(0.045)],
    ['油圧', '左右とも 30 秒以内に上がる', c => c.sys.running && c.sys.oil > 25, null, 'MFD のエンジン計器で、左右の両方を確かめます。', null],
  ] },
  runup: { title: 'ランナップ（RUN-UP）', items: [
    ...A.runup.items.slice(0, 6),
    ['プロペラ', 'サイクル（定速プロペラ・フェザーの確認）', null, null, 'プロペラのレバーを引いて回転が下がり、戻すと上がることを確かめます。左右とも。', null],
    ...A.runup.items.slice(6),
  ] },
};
