// CADET — aircraft/registrations.js : the school's aircraft (fictional registrations, the SY of SHOYO) and which one is
// parked on which tie-down spot. The Archers' registrations are painted on their aft fuselage (the model holds one
// mesh of letters per registration: tools/aircraft/build_archer.py).
export const TAILS = [
  { reg: 'N731SY', type: 'pa28' }, { reg: 'N732SY', type: 'pa28' }, { reg: 'N733SY', type: 'pa28' }, { reg: 'N735SY', type: 'pa28' },
  { reg: 'N736SY', type: 'pa28' }, { reg: 'N738SY', type: 'pa28' }, { reg: 'N739SY', type: 'pa28' }, { reg: 'N741SY', type: 'pa28' },
  { reg: 'N744SY', type: 'pa28' }, { reg: 'N452SY', type: 'pa44' }, { reg: 'N455SY', type: 'pa44' },
];
export const TODAY = 'N738SY';                          // the cadet's Archer (the radio's call sign, the logbook)
// the parked Archers in turn (main.js: the tie-down spots, then the hangar), today's on its own spot
export const PARKED_ARCHERS = ['N731SY', 'N732SY', 'N735SY', 'N733SY', 'N741SY', 'N736SY', 'N744SY', 'N739SY'];
