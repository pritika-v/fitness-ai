// Fetches and validates an exercise JSON config.
// The single place that knows where configs live.

export async function loadExercise(id) {
  const res = await fetch(`/exercises/${id}.json`);
  if (!res.ok) throw new Error(`Exercise config not found: ${id}`);
  const config = await res.json();
  validateConfig(config);
  return config;
}

function validateConfig(c) {
  if (!c.id)   throw new Error('Exercise config missing id');
  if (!c.name) throw new Error('Exercise config missing name');
  if (!c.isHold && !c.repPhase) throw new Error('Config must have repPhase or isHold');
}