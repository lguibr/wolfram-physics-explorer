import type { ModelState } from './types';

/** Incidence counts include every tuple position, including repeated atoms. */
export function measureGraph(state: ModelState) {
  const parent = new Map<string, string>();
  const degree = new Map<string, number>();
  const arityCounts: Record<number, number> = {};
  let incidences = 0, selfLoops = 0;
  const root = (atom: string): string => {
    let current = atom;
    while (parent.get(current)! !== current) current = parent.get(current)!;
    let next = atom;
    while (next !== current) { const previous = parent.get(next)!; parent.set(next, current); next = previous; }
    return current;
  };
  for (const edge of state.edges) {
    const arity = edge.atoms.length;
    incidences += arity; arityCounts[arity] = (arityCounts[arity] ?? 0) + 1;
    if (arity === 2 && edge.atoms[0] === edge.atoms[1]) selfLoops++;
    for (const atom of edge.atoms) {
      if (!parent.has(atom)) parent.set(atom, atom);
      degree.set(atom, (degree.get(atom) ?? 0) + 1);
    }
    for (let i = 1; i < arity; i++) parent.set(root(edge.atoms[i]), root(edge.atoms[0]));
  }
  return {
    atoms: degree.size, relations: state.edges.length, incidences,
    events: state.step, generation: state.generation,
    components: new Set([...parent.keys()].map(root)).size,
    meanIncidence: degree.size ? incidences / degree.size : 0,
    maxIncidence: degree.size ? Math.max(...degree.values()) : 0,
    meanArity: state.edges.length ? incidences / state.edges.length : 0,
    selfLoops, arityCounts,
  };
}
export function summarizeSamples(values: readonly number[]) {
  if (!values.length) return { median: 0, p95: 0 };
  const ordered = [...values].sort((a, b) => a - b);
  const middle = Math.floor(ordered.length / 2);
  return { median: ordered.length % 2 ? ordered[middle] : (ordered[middle - 1] + ordered[middle]) / 2, p95: ordered[Math.ceil(ordered.length * 0.95) - 1] };
}
