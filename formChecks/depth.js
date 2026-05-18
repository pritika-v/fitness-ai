// Depth is checked at rep-finalization time in repCounter — this check
// warns during the set if the person never seems to go deep enough.
export function depthCheck(m, t) {
  // Plank: no depth check needed
  if (t.depthMin === undefined && t.minDepthAngle === undefined) return null;
  return null; // Depth failure is handled in _finalizeRep(); this is a placeholder
               // for any mid-rep depth feedback you want to add later.
}