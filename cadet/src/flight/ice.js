// CADET — flight/ice.js : airframe icing (B3.4), the pure part. On the career's seeded cold low-cloud
// days (career.js's `icing` modifier — ordinary lowCloud days never see this), ice accretes in the cloud
// band at icing temperatures, and melts in warm air or out of the band. The accretion lives on the flight
// state (s.ice, 0..1); what it does to the aeroplane is applied through the state's own derived aircraft
// (s.AC): less lift, more drag, an earlier stall, and the ice's weight. The pitot/static side of icing is
// the systems branch's business and is not duplicated here.

// in the band: in cloud (500–7,000 ft AGL on a low-cloud day), at a temperature ice forms (−12…+2 °C)
export const iceInBand = (gate, aglFt, oatC) => !!gate && aglFt > 500 && aglFt < 7000 && oatC <= 2 && oatC >= -12;

// one frame of accretion / melting. Full ice in about four minutes in the band; warm air (OAT > +5 °C)
// sheds it in under half a minute, merely leaving the band takes a minute and a half.
export function iceStep(ice, gate, aglFt, oatC, dt) {
  if (iceInBand(gate, aglFt, oatC)) return Math.min(1, ice + dt / 240);
  return Math.max(0, ice - dt / (oatC > 5 ? 25 : 90));
}

// apply the ice to the derived aircraft, from the clean base values (kept by the caller, per state)
export function iceApply(AC, base, k) {
  AC.CL0 = base.CL0 * (1 - 0.22 * k);
  AC.CD0 = base.CD0 + 0.028 * k;
  AC.aStall = base.aStall - 0.035 * k;
  AC.mass = base.mass + 14 * k;
}
