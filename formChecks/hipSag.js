export function hipSag(m, t) {
  if (m.lumbarDev === null) return null;

  const { lumbarSagMargin = 0.10 } = t;

  if (m.lumbarDev > lumbarSagMargin)
    return { code: 'LOWER_BACK_SAG', message: 'Lower back sagging — engage your core and squeeze your abs', severity: 'high' };

  return null;
}