// Local sample checks only. Each run keeps an immutable copy of the checked fields.
export function createArtifact(id) {
  return { id, revision: 1, fields: { start: '', end: '', owner: '', nextAction: 'Confirm dependencies with the project team.', nextDue: '' } };
}

export function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + 'T00:00:00Z');
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function evaluateArtifact(fields) {
  return {
    period: validDate(fields.start) && validDate(fields.end) && fields.start <= fields.end,
    owner: Boolean(fields.owner.trim()),
    next: Boolean(fields.nextAction.trim()) && validDate(fields.nextDue)
  };
}

export function makeReview(artifact, previous) {
  const fields = { ...artifact.fields };
  return {
    docId: artifact.id, revision: artifact.revision,
    run: (previous?.run || 0) + 1, fields,
    checks: evaluateArtifact(fields), previous: previous ? { ...previous.checks } : null
  };
}
