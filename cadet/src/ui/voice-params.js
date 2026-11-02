// CADET — ui/voice-params.js : how each speaker sounds when the browser's speech synthesis reads a line aloud
// (full voice, AI-instructor design §10.3). Pure data + a lookup: the browser still has only the voices it has
// (usually one Japanese voice), so the characters are told apart by pitch and rate alone. Kept apart from
// dialog-ui.js so the values are testable in Node and reusable (the in-flight instructor's lines, pumped by
// flight/day-mode.js, are spoken with the instructor's entry by the host that wires them up).
export const VOICE_PARAMS = {
  instructor: { pitch: 1.0, rate: 1.0 },    // 早瀬 教官: the plain reference voice
  chief: { pitch: 0.8, rate: 0.92 },        // 真壁 主任教官: low and slow
  examiner: { pitch: 0.7, rate: 0.85 },     // 黒田 査察官: the lowest, deliberate
  lecturer: { pitch: 1.25, rate: 1.0 },     // ミラー 講師: higher
  dispatcher: { pitch: 1.1, rate: 1.12 },   // 佐伯 運航管理: brisk
  mechanic: { pitch: 0.85, rate: 0.98 },    // 大城 整備士: fuller, a little lower
  controller: { pitch: 1.05, rate: 1.05 },  // 高嶺 管制官
  kiryu: { pitch: 1.05, rate: 1.05 },       // 桐生
  asahi: { pitch: 1.35, rate: 1.05 },       // 朝日: the brightest
  mori: { pitch: 1.15, rate: 1.0 },         // 森
  player: { pitch: 1.0, rate: 1.0 },        // the cadet's own chosen lines
};
// the entry for a speaker id (a fresh copy, clamped to what SpeechSynthesisUtterance accepts);
// a speaker with no entry of their own gets the neutral default
const FALLBACK = { pitch: 1, rate: 1.05 };
const clamp = (v, lo, hi, fb) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : fb);
export function voiceParamsFor(id) {
  const p = (typeof id === 'string' && Object.prototype.hasOwnProperty.call(VOICE_PARAMS, id) && VOICE_PARAMS[id]) || FALLBACK;
  return { pitch: clamp(p.pitch, 0, 2, FALLBACK.pitch), rate: clamp(p.rate, 0.5, 2, FALLBACK.rate) };
}
