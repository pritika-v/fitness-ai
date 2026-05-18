export function backStraight(m, t) {
  if (m.backAngle === null || !m.visible.hip || !m.visible.ankle) return null;

  const { backAngleMin = 135, hipSagYMargin = 0.09, hipRaiseYMargin = 0.11 } = t;
  if (m.backAngle >= backAngleMin) return null;

  const midY = (m.shoulderY + m.ankleY) / 2;

  if (m.hipY > midY + hipSagYMargin)
    return { code: 'HIP_SAG',    message: 'Hips are sagging — brace your core and glutes', severity: 'high' };

  if (m.hipY < midY - hipRaiseYMargin)
    return { code: 'HIP_RAISED', message: 'Hips are too high (pike) — lower hips to form a flat plank', severity: 'high' };

  return null; // angle off but y-position within noise margin
}