// Pure geometry: converts raw landmarks into named angle measurements.
// No form judgement here — just numbers.

function angle3(A, B, C) {
  if (!A || !B || !C) return null;
  const ABx = A.x - B.x, ABy = A.y - B.y;
  const CBx = C.x - B.x, CBy = C.y - B.y;
  const dot = ABx * CBx + ABy * CBy;
  const mag = Math.hypot(ABx, ABy) * Math.hypot(CBx, CBy);
  if (mag === 0) return null;
  return Math.acos(Math.max(-1, Math.min(1, dot / mag))) * (180 / Math.PI);
}

function visScore(lm, i) { return lm[i]?.visibility ?? 0; }
function vis(lm, i, thr = 0.30) { return visScore(lm, i) >= thr; }

// Choose the side with the better landmark visibility
function dominantSide(lm) {
  const l = visScore(lm,11) + visScore(lm,23);
  const r = visScore(lm,12) + visScore(lm,24);
  return l >= r ? 'left' : 'right';
}

function sideIndices(side) {
  return side === 'left'
    ? { shoulder:11, elbow:13, wrist:15, hip:23, knee:25, ankle:27, ear:7  }
    : { shoulder:12, elbow:14, wrist:16, hip:24, knee:26, ankle:28, ear:8  };
}

// Returns a measurements object used by formChecks and repCounter
export function analyze(lm) {
  const side = dominantSide(lm);
  const idx  = sideIndices(side);

  const S = i => lm[i]; // shorthand

  const elbowAngle    = angle3(S(idx.shoulder), S(idx.elbow),    S(idx.wrist));
  const kneeAngle     = angle3(S(idx.hip),      S(idx.knee),     S(idx.ankle));
  const backAngle     = angle3(S(idx.shoulder), S(idx.hip),      S(idx.ankle));
  const shoulderAngle = angle3(S(idx.elbow),    S(idx.shoulder), S(idx.hip));
  const neckAngle     = angle3(S(idx.ear),      S(idx.shoulder), S(idx.hip));

  // For knee valgus: measure horizontal deviation of knee vs hip-ankle line
  const kneeValgus = (() => {
    const hp = S(idx.hip), kn = S(idx.knee), an = S(idx.ankle);
    if (!hp || !kn || !an) return null;
    const expectedX = hp.x + (an.x - hp.x) * 0.5;
    return kn.x - expectedX; // negative = inward (valgus), positive = outward
  })();

  // Landmark y-positions for hip sag checks
  const shoulderY = S(idx.shoulder)?.y ?? null;
  const hipY      = S(idx.hip)?.y      ?? null;
  const ankleY    = S(idx.ankle)?.y    ?? null;
  const elbowX    = S(idx.elbow)?.x    ?? null;
  const shoulderX = S(idx.shoulder)?.x ?? null;
  const wristX    = S(idx.wrist)?.x    ?? null;

  // Lumbar deviation from straight shoulder-ankle line
  const lumbarDev = (() => {
    const sh = S(idx.shoulder), hp2 = S(idx.hip), an = S(idx.ankle);
    if (!sh || !hp2 || !an) return null;
    const dX = an.x - sh.x;
    if (Math.abs(dX) < 0.01) return null;
    const t = (hp2.x - sh.x) / dX;
    const lineY = sh.y + t * (an.y - sh.y);
    return hp2.y - lineY; // positive = sagging below line
  })();

  return {
    side,
    elbowAngle, kneeAngle, backAngle,
    shoulderAngle, neckAngle, kneeValgus,
    shoulderY, hipY, ankleY,
    elbowX, shoulderX, wristX,
    lumbarDev,
    landmarks: lm,
    visible: {
      shoulder: vis(lm, idx.shoulder),
      elbow:    vis(lm, idx.elbow),
      wrist:    vis(lm, idx.wrist),
      hip:      vis(lm, idx.hip),
      knee:     vis(lm, idx.knee),
      ankle:    vis(lm, idx.ankle),
      ear:      vis(lm, idx.ear),
    }
  };
}

// Check if person is in a plausible exercise position
// (elbow in valid range, wrist not high above shoulder)
export function isInExercisePosition(lm, config) {
  if (!lm) return false;
  const m = analyze(lm);

  if (config.repPhase?.jointGroup === 'elbow') {
    if (m.elbowAngle === null) return false;
    if (m.elbowAngle < 40 || m.elbowAngle > 179) return false;
    const wrist    = lm[m.side === 'left' ? 15 : 16];
    const shoulder = lm[m.side === 'left' ? 11 : 12];
    if (wrist && shoulder && wrist.y - shoulder.y < -0.42) return false;
    return true;
  }

  if (config.repPhase?.jointGroup === 'knee') {
    if (m.kneeAngle === null) return false;
    return m.kneeAngle >= 40 && m.kneeAngle <= 180;
  }

  if (config.repPhase?.jointGroup === 'shoulder') {
    if (m.shoulderAngle === null) return false;
    return true;
  }

  if (config.isHold) {
    return m.visible.shoulder && m.visible.hip;
  }

  return true;
}