// CADET — content/hangar-spec.js : the two hangars' insides (fictional), in the runway frame, in a lighter
// shape than the buildings' specs (no rooms or doors of their own — the hangars are one open space each, and
// world/buildings.js builds their shells): what stands in them (furniture, placed by the prop kit) and what
// can be examined there. Hangar 2 (整備) is the workshop: benches, tools, parts, the mechanic's second
// workplace. Hangar 1 stands open with the spare aircraft in it.
import { HANGARS } from '../world/layout.js';

export function hangarSpec() {
  const [h1, h2] = HANGARS;
  const areas = [
    { id: 'hangar-1', name_ja: h1.name, hangar: h1,
      furniture: [
        { type: 'parts_shelf', a: 478.0, c: 280.4, rot: 0 }, { type: 'parts_shelf', a: 512.0, c: 280.4, rot: 0 },
        { type: 'tire_stack', a: 474.5, c: 277.5, rot: 0 },
        { type: 'step_ladder', a: 516.0, c: 277.0, rot: 270 },
        { type: 'workbench', a: 504.0, c: 280.2, rot: 0 },
      ],
      interactables: [
        { id: 'hg1-spare', room: 'hangar-1', a: 492.0, c: 257.0, y: 1.2, prompt_ja: '予備機を見る', title_ja: '予備機（Archer）',
          text_ja: '格納庫 1 の予備機。今日の機体が整備に入る日は、この機体が 19 番スポットに出る。\nカバーはかかっていない：いつでも出られるように、という整備の流儀。' },
        { id: 'hg1-shelf', room: 'hangar-1', a: 478.0, c: 279.4, y: 1.4, prompt_ja: '部品棚を見る', title_ja: '部品棚',
          text_ja: 'フィルタ、プラグ、ランプ、タイヤ。棚の札には機体の番号と日付。\n部品は、付けた記録とセットで初めて部品になる——整備記録の考え方。' },
      ] },
    { id: 'hangar-2', name_ja: h2.name, hangar: h2,
      furniture: [
        { type: 'workbench', a: 548.0, c: 280.2, rot: 0 }, { type: 'workbench', a: 556.5, c: 280.2, rot: 0 },
        { type: 'tool_cabinet', a: 561.5, c: 280.5, rot: 0 },
        { type: 'parts_shelf', a: 578.0, c: 280.4, rot: 0 }, { type: 'parts_shelf', a: 583.5, c: 280.4, rot: 0 },
        { type: 'tire_stack', a: 542.0, c: 276.0, rot: 0 }, { type: 'tire_stack', a: 586.5, c: 275.0, rot: 0 },
        { type: 'step_ladder', a: 570.0, c: 249.0, rot: 90 },
        { type: 'bag', a: 552.0, c: 279.0, rot: 40 },
      ],
      interactables: [
        { id: 'hg2-bench', room: 'hangar-2', a: 552.0, c: 279.2, y: 1.1, prompt_ja: '作業台を見る', title_ja: '整備の作業台',
          text_ja: '分解した部品と、開いたままの整備マニュアル、トルクレンチ。\n機体の不具合に気づいたら、まず大城さん（整備士）へ。午後はこの格納庫で作業していることが多い。言わないで飛ぶのが、いちばん困る——が整備の合言葉。' },
        { id: 'hg2-tools', room: 'hangar-2', a: 561.5, c: 279.6, y: 1.4, prompt_ja: '工具棚を見る', title_ja: '工具棚',
          text_ja: '工具は影板（シルエットの板）に掛け、無いものが一目で分かる。\n機体のそばに工具を置き忘れる事故を防ぐ、整備の基本。' },
      ] },
  ];
  return { areas };
}
