# Spin re-tune retry — investigation report (game-quality wave, item 2)

**Verdict: NOT ADOPTED. No production physics change.** The steep-spin equilibrium
(α sustained in 22–48°, steady yaw + descent over multiple turns, P.A.R.E. recovery)
does not exist in this model's moment surfaces within the allowed envelope
(normal flight envelope bit-identical). This confirms and extends the previous
investigation (`flight-lab/tools/spin-investigation/REPORT.md`, branch next/spin).

## Method

- `score.mjs` — entry → 13 s pro-spin hold → P.A.R.E., reports developed-phase
  (last 60%) stats separately from the entry average (the old scorer's whole-run
  average masked which mode the aircraft ended in).
- `hold.mjs` — direct initialisation into a developed steep spin
  (α≈38°, Ω=−100°/s about the vertical, pitch −42°, bank 20°, pro-spin controls),
  20 s, mode trajectory.
- `scan.mjs` — rotary-balance scan: frozen spin states across α=20…90°,
  angular accelerations.
- `capture.mjs` / `slice45.mjs` / `probe13.mjs` — frozen-state decomposition
  (rate components and controls zeroed one at a time).
- `physics-wip.js` — the previous investigation's best variant ported onto the
  current physics (port verified faithful: reproduces the old numbers exactly),
  plus experiment knobs via `globalThis.SPIN_EXP` (fuselage crossflow, CL bump
  shape, ClpPost, fuselage side-force gain). WIP only — never in `src/`.

## Baseline vs ported variant (score.mjs, dir=+1)

| | fracAlpha 22–48° | mean α | mean yaw | sink fpm | P.A.R.E. |
|---|---|---|---|---|---|
| base physics | 0.00 | 12.8° | 32°/s | 5,304 | 329 ft (spiral dive, not a spin) |
| ported best variant | 0.13 | 79.8° | 68°/s | 4,263 | never completes |

From a developed-spin initialisation (hold.mjs), the variant sustains a *flat*
spin (α≈85°, Ω≈95–128°/s, sink ≈4,500 fpm, 5.3 turns/20 s) — the only attractor.
α leaves the steep band within ≈1 s of release in every configuration tested.

## What was measured this time (new findings)

1. **Static pitch balance at the steep slice is fine; rate coupling is not.**
   At the live t=0.6 s state (α 41°, β −11°, w=(18,−107,−44)°/s), frozen
   decomposition: all-rates-zero pitch acceleration ≈ −0.5°/s² (balanced),
   as-is ≈ −25.9°/s². The imbalance is entirely rate-term driven.
2. **The dominant imbalance is roll.** Rotary-balance scan (bank 15°, γ=−80°):
   roll acceleration crosses zero at α≈25° and reaches −195°/s² at α=50°.
   At the α=45 slice, zeroing the roll rate w[2] removes 92% of it
   (−264 → −22°/s²): the spin band has strong roll *anti*-damping.
3. **But the anti-damping is not the CL bump's falling slope.** Widening the
   post-stall CL bump (0.14→0.30 rad) / lowering it (0.95→0.70) moved the slice
   roll acceleration only −264 → −231°/s²; strengthening the post-stall Clp
   residual (0.16→0.30) made it *worse* (−297). The elements' collective
   response at α≈50 (plate-curve slope + drag moment arms) dominates.
4. **Fuselage crossflow (quadratic, gated to |incidence|>17.5° so the normal
   envelope is untouched) does not create the steep equilibrium either:**
   full distribution → α runs *past* vertical (mean 107°); aft-stations-only →
   spin dies into a spiral descent (yaw damping from the tail body dominates);
   lateral-only / normal-only → flat mode unchanged.
5. **Fuselage side-force (pure β weathercock, no rate term) is not the missing
   piece:** gain 0.45→2.5 (clamp widened to 1.2 rad) holds β near 0 but α still
   runs to ≈57–62° within 1 s. β growth was a symptom, not the driver.
6. Elevator is a dead control in the slice (elev 0 vs 1: pitch Δ≈0.1°/s²) —
   the fully-stalled hstab has no remaining authority to hold α in the band.

## Conclusion

Across two investigations, ~10 distinct mechanisms (element post-stall retune,
deep-stall gating, rotary Cm_pr term, CL bump shape, ClpPost, fuselage
crossflow ×4 distributions, fuselage side force ×3 gains, fin subdivision was
analysed previously) all converge to the same flat attractor or kill the
rotation. The steep equilibrium appears to require a *coupled* rotary-balance
identification (Cm/Cn/Cl as functions of α, Ω_nd, β extracted from the element
model, then solving for the missing cross-derivatives) — a research project of
its own, not a re-tune. Per the wave's acceptance rule, no sub-change was
adopted: the variant's only stable product is an *unrecoverable* flat spin,
which is worse for a training simulator than the current spiral-dive outcome.
No spin/UPRT lesson was added. Scripted/fake spin remains prohibited.

If this is revisited: start from rotary-balance maps (scan.mjs generalised to
Ω and β), not from live trajectories; budget it as its own wave.
