import type { CompiledRule, Hyperedge, ModelLimits, ModelState } from './types';

export const DEFAULT_LIMITS = { maxNodes: 5000, maxEdges: 20000, maxEvents: 10000, maxMatchChecks: 100000 };
export const ORDERING = 'First complete match in rule-input order, oldest edge occurrence first';

export function createModelState(seed: readonly (readonly string[])[]): ModelState {
  let maximum = 0;
  const edges = seed.map((atoms, i) => {
    if (!atoms.length || atoms.some(atom => typeof atom !== 'string' || !atom.length)) throw new Error('Each relation needs at least one atom.');
    for (const atom of atoms) {
      if (/^\d+$/.test(atom)) {
        const value = Number(atom);
        if (!Number.isSafeInteger(value) || value >= Number.MAX_SAFE_INTEGER) throw new Error('Numeric atom label is too large.');
        maximum = Math.max(maximum, value);
      }
    }
    return { id: `e${i}`, atoms: [...atoms], creator: null, generation: 0 };
  });
  return { edges, events: [], nextAtomId: maximum + 1, nextEdgeId: edges.length, step: 0, generation: 0, status: 'ready', searchChecks: 0 };
}

export function findMatch(edges: readonly Hyperedge[], rule: CompiledRule, maxChecks: number) {
  // Every bucket follows occurrence order. Selecting the smallest compatible
  // bucket narrows the search without changing the first complete match.
  const indexes = new Map<number, { all: number[]; positions: Map<string, number[]>[] }>();
  if (rule.lhs.length > 1) {
    for (const pattern of rule.lhs) {
      if (!indexes.has(pattern.length)) {
        indexes.set(pattern.length, { all: [], positions: Array.from({ length: pattern.length }, () => new Map()) });
      }
    }
    edges.forEach((edge, index) => {
      const bucket = indexes.get(edge.atoms.length);
      if (!bucket) return;
      bucket.all.push(index);
      edge.atoms.forEach((atom, position) => {
        const matches = bucket.positions[position].get(atom);
        if (matches) matches.push(index);
        else bucket.positions[position].set(atom, [index]);
      });
    });
  }
  const candidateIndices = (pattern: readonly string[], bindings: Map<string, string>) => {
    const bucket = indexes.get(pattern.length);
    if (!bucket) return undefined; // Single-input rules keep the direct scan.
    let candidates = bucket.all;
    for (let position = 0; position < pattern.length; position++) {
      const atom = bindings.get(pattern[position]);
      if (atom === undefined) continue;
      const matches = bucket.positions[position].get(atom);
      if (!matches) return [];
      if (matches.length < candidates.length) candidates = matches;
    }
    return candidates;
  };
  let checks = 0;
  let exhausted = false;
  const used = new Set<number>();
  const selected: number[] = [];
  let answer: { indices: number[]; bindings: Map<string, string> } | undefined;
  const visit = (position: number, bindings: Map<string, string>): boolean => {
    if (position === rule.lhs.length) {
      answer = { indices: [...selected], bindings };
      return true;
    }
    const pattern = rule.lhs[position];
    const candidates = candidateIndices(pattern, bindings);
    for (let ordinal = 0; ordinal < (candidates?.length ?? edges.length); ordinal++) {
      const index = candidates ? candidates[ordinal] : ordinal;
      if (used.has(index) || edges[index].atoms.length !== pattern.length) continue;
      // The budget counts candidates examined by full unification, not index construction.
      if (checks >= maxChecks) { exhausted = true; return false; }
      checks++;
      const next = new Map(bindings);
      let compatible = true;
      for (let p = 0; p < pattern.length; p++) {
        const variable = pattern[p], atom = edges[index].atoms[p];
        if (next.has(variable) && next.get(variable) !== atom) { compatible = false; break; }
        next.set(variable, atom);
      }
      if (!compatible) continue;
      used.add(index); selected.push(index);
      if (visit(position + 1, next)) return true;
      selected.pop(); used.delete(index);
      if (exhausted) return false;
    }
    return false;
  };
  visit(0, new Map());
  return { match: answer, checks, exhausted };
}

export function rewriteOnce(state: ModelState, rule: CompiledRule, requested: ModelLimits = {}): ModelState {
  const limits = { ...DEFAULT_LIMITS, ...requested };
  for (const [key, value] of Object.entries(limits)) {
    if (!Number.isSafeInteger(value) || value < 0) throw new Error(`${key} must be a nonnegative integer.`);
  }
  if (!rule.lhs.length || rule.lhs.some(e => !e.length) || rule.rhs.some(e => !e.length)) throw new Error('A rule needs nonempty input relations.');
  if (state.step >= limits.maxEvents) return { ...state, status: 'event-limit', searchChecks: 0 };
  const { match, checks, exhausted } = findMatch(state.edges, rule, limits.maxMatchChecks);
  if (!match) return { ...state, status: exhausted ? 'match-limit' : 'no-match', searchChecks: checks };
  const consumed = new Set(match.indices);
  const inputs = match.indices.map(i => state.edges[i]);
  const generation = Math.max(...inputs.map(e => e.generation)) + 1;
  const eventId = state.step + 1;
  let nextAtomId = state.nextAtomId;
  let nextEdgeId = state.nextEdgeId;
  const bindings = new Map(match.bindings);
  const outputs: Hyperedge[] = rule.rhs.map(pattern => ({
    id: `e${nextEdgeId++}`,
    atoms: pattern.map(variable => {
      if (!bindings.has(variable)) {
        if (nextAtomId >= Number.MAX_SAFE_INTEGER) throw new Error('Fresh atom identifier limit reached.');
        bindings.set(variable, String(nextAtomId++));
      }
      return bindings.get(variable)!;
    }),
    creator: eventId,
    generation,
  }));
  const edges = state.edges.filter((_, i) => !consumed.has(i)).concat(outputs);
  const liveAtoms = new Set(edges.flatMap(e => [...e.atoms]));
  if (liveAtoms.size > limits.maxNodes) return { ...state, status: 'node-limit', searchChecks: checks };
  if (edges.length > limits.maxEdges) return { ...state, status: 'edge-limit', searchChecks: checks };
  const event = {
    id: eventId, generation,
    inputEdges: inputs.map(e => e.id), outputEdges: outputs.map(e => e.id),
    parents: [...new Set(inputs.flatMap(e => e.creator === null ? [] : [e.creator]))].sort((a, b) => a - b),
  };
  return {
    edges, events: [...state.events, event], nextAtomId, nextEdgeId,
    step: eventId, generation: Math.max(state.generation, generation), status: eventId >= limits.maxEvents ? 'event-limit' : 'ready', searchChecks: checks,
  };
}

export function runEvents(state: ModelState, rule: CompiledRule, count: number, limits: ModelLimits = {}) {
  if (!Number.isSafeInteger(count) || count < 0 || count > 1000) throw new Error('Choose between 0 and 1000 events per batch.');
  let next = state, candidateChecks = 0;
  for (let i = 0; i < count; i++) {
    next = rewriteOnce(next, rule, limits);
    candidateChecks += next.searchChecks;
    if (next.status !== 'ready') break;
  }
  return { state: next, completed: next.step - state.step, candidateChecks };
}
