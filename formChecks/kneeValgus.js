export function kneeValgus(m, t) {
  if (m.kneeValgus === null || !m.visible.knee || !m.visible.ankle) return null;

  const { kneeValgusInwardMax = 0.06 } = t;

  if (m.kneeValgus < -kneeValgusInwardMax)
    return { code: 'KNEE_VALGUS', message: 'Knee caving inward — push knees out over your toes', severity: 'high' };

  return null;
}