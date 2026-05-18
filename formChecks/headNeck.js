export function headNeck(m, t) {
  if (m.neckAngle === null || !m.visible.ear || !m.visible.hip) return null;

  const { neckAngleMin = 125 } = t;
  if (m.neckAngle >= neckAngleMin) return null;

  const earY      = m.landmarks[m.side === 'left' ? 7 : 8]?.y;
  const shoulderY = m.shoulderY;
  if (earY === undefined || shoulderY === null) return null;

  if (earY < shoulderY - 0.13)
    return { code: 'HEAD_UP',   message: 'Head lifting — keep a neutral neck, look slightly ahead', severity: 'low' };
  if (earY > shoulderY + 0.09)
    return { code: 'HEAD_DOWN', message: 'Chin tucking — maintain a neutral neck position', severity: 'low' };

  return null;
}