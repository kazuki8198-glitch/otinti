// ledgers/src/acs.mjs — reads the knowledge elements of the FAA ACS (sources/acs/*.txt: only the Area/Task titles and
// the K elements were copied from the FAA PDFs) → [{ code: 'PA.I.C.K2', area, areaTitle, task, taskTitle, text, sub[] }]
import fs from 'node:fs';
import path from 'node:path';
import { HERE } from './design.mjs';

export const ACS = {
  PA: { file: 'pa-6c.txt', title: 'Private Pilot – Airplane ACS (FAA-S-ACS-6C, November 2023)', url: 'https://www.faa.gov/training_testing/testing/acs/private_airplane_acs_6.pdf' },
  IR: { file: 'ir-8c.txt', title: 'Instrument Rating – Airplane ACS (FAA-S-ACS-8C, November 2023)', url: 'https://www.faa.gov/training_testing/testing/acs/instrument_rating_airplane_acs_8.pdf' },
  CA: { file: 'ca-7b.txt', title: 'Commercial Pilot – Airplane ACS (FAA-S-ACS-7B, November 2023)', url: 'https://www.faa.gov/training_testing/testing/acs/commercial_airplane_acs_7.pdf' },
};

export function parseAcs(key) {
  const lines = fs.readFileSync(path.join(HERE, 'sources', 'acs', ACS[key].file), 'utf8').split('\n').filter(l => !l.startsWith('#'));
  const areas = {}, tasks = {}, out = [];
  let curTask = null, cur = null, lastArea = null;
  for (const l of lines) {
    let m;
    if ((m = l.match(/^Area of Operation ([IVX]+)\. (.+)$/))) { areas[m[1]] = m[2].trim(); continue; }
    if ((m = l.match(/^Task ([A-Z])\. (.+)$/))) { curTask = { letter: m[1], title: m[2].trim() }; cur = null; continue; }
    if ((m = l.match(/^\s*((PA|IR|CA)\.([IVX]+)\.([A-Z])\.K(\d+))([a-z]?)\s+(.*)$/))) {
      const [, code, , area, task, , sub, text] = m;
      if (area !== lastArea && curTask && curTask.letter !== task) curTask = { letter: task, title: '?' };
      lastArea = area;
      tasks[`${key}.${area}.${task}`] = curTask && curTask.letter === task ? curTask.title : tasks[`${key}.${area}.${task}`] || '?';
      if (sub) { const parent = out.find(e => e.code === code); if (parent) { parent.sub.push({ code: code + sub, text: text.replace(/^[a-z]\.\s*/, '').trim() }); cur = parent.sub[parent.sub.length - 1]; } continue; }
      cur = { code, area, task: `${key}.${area}.${task}`, text: text.trim(), sub: [] };
      out.push(cur);
      continue;
    }
    if (cur && /^\s{10,}\S/.test(l)) cur.text = (cur.text + ' ' + l.trim()).trim();
  }
  for (const e of out) { e.areaTitle = areas[e.area] || '?'; e.taskTitle = tasks[e.task] || '?'; }
  return { elements: out, areas, tasks };
}
