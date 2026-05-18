export function elbowFlare(m, t) {
  if (m.elbowAngle === null || m.elbowAngle > 165) return null; // only check during movement
  if (m.elbowX === null || m.shoulderX === null || m.wristX === null) return null;

  const { elbowFlareMax = 0.18 } = t;
  const expectedX = (m.shoulderX + m.wristX) / 2;

  if (Math.abs(m.elbowX - expectedX) > elbowFlareMax)
    return { code: 'ELBOW_FLARE', message: 'Elbows flaring — tuck them ~45° towards your torso', severity: 'medium' };

  return null;
}