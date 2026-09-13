import { describe, expect, it } from 'vitest';
import { compileRule } from './customRuleParser';
import { createModelState, rewriteOnce, runEvents, findMatch, ORDERINGS } from './model';
import type { ModelState, CompiledRule, EventOrdering, Hyperedge } from './types';

const rule = compileRule;
const tuples = (state: ModelState) => state.edges.map(e => e.atoms);
const step = (signature: string, seed: string[][], limits = {}) => rewriteOnce(createModelState(seed), rule(signature), limits);
const freeze = <T,>(x: T): T => { if (x && typeof x === 'object') { Object.freeze(x); Object.values(x).forEach(freeze); } return x; };

describe('canonical single-event fixtures', () => {
  it.each([
    ['wm148 ordinary edge', '{{x,y}} -> {{x,y},{y,z}}', [['1','2']], [['1','2'],['2','3']]],
    ['wm148 self loop', '{{x,y}} -> {{x,y},{y,z}}', [['1','1']], [['1','1'],['1','2']]],
    ['wm121', '{{x,y}} -> {{x,x},{z,x}}', [['1','1']], [['1','1'],['2','1']]],
    ['SetReplace ternary example', '{{a,b,c},{b,d,e}} -> {{e,f,a},{f,d,b},{d,e,c}}', [['1','2','3'],['2','4','5'],['4','6','7']], [['4','6','7'],['5','8','1'],['8','4','2'],['4','5','3']]],
  ])('%s', (_name, signature, seed, expected) => {
    const state = step(signature as string, seed as string[][]);
    expect(tuples(state)).toEqual(expected);
    expect(state.events).toHaveLength(1);
    expect(state.step).toBe(1);
  });
});

describe('occurrences, matching, freshness and state', () => {
  it('keeps duplicate occurrences distinct', () => {
    const seed = createModelState([['1','2'],['1','2']]);
    const next = rewriteOnce(seed, rule('{{x,y}} -> {{x,y}}'));
    expect(next.edges[0].id).toBe(seed.edges[1].id);
    expect(next.edges[1].id).not.toBe(seed.edges[0].id);
    expect(next.events[0].inputEdges).toEqual([seed.edges[0].id]);
  });
  it('needs two separate occurrences for two input patterns', () => {
    expect(step('{{x,y},{x,y}} -> {{x}}', [['1','2']]).status).toBe('no-match');
    expect(tuples(step('{{x,y},{x,y}} -> {{x}}', [['1','2'],['1','2']]))).toEqual([['1']]);
  });
  it('allows all variables to coincide while enforcing repetitions', () => {
    expect(step('{{x,y},{y,z}} -> {{x,z}}', [['1','1'],['1','1']]).step).toBe(1);
    expect(step('{{x,y,x}} -> {{y}}', [['1','1','2']]).status).toBe('no-match');
  });
  it('does not coerce higher arity to binary', () => {
    expect(step('{{x,y}} -> {{x}}', [['1','2','3']]).status).toBe('no-match');
  });
  it('uses a fresh atom consistently per event, distinct between events', () => {
    const seed = createModelState([['1','2']]);
    const a = rewriteOnce(seed, rule('{{x,y}} -> {{x,z},{z,w},{w,z}}'));
    expect(tuples(a)).toEqual([['1','3'],['3','4'],['4','3']]);
    const b = rewriteOnce(a, rule('{{x,y}} -> {{z}}'));
    expect(b.edges.at(-1)?.atoms).toEqual(['5']);
  });
  it('does not reuse atoms after their last edge is consumed', () => {
    const a = step('{{x,y}} -> {{z}}', [['20','40']]);
    expect(tuples(a)).toEqual([['41']]);
    expect(tuples(rewriteOnce(a, rule('{{x}} -> {{y}}')))).toEqual([['42']]);
  });
  it('preserves immutable input and deterministic histories', () => {
    const seed = freeze(createModelState([['1','1']]));
    const r = rule('{{x,y}} -> {{x,y},{y,z}}');
    expect(runEvents(seed, r, 30).state).toEqual(runEvents(seed, r, 30).state);
    expect(seed.edges).toHaveLength(1);
    expect(seed.events).toEqual([]);
  });
  it('counts only live atoms and preserves unary relations', () => {
    expect(tuples(step('{{x,y}} -> {{y}}', [['1','2']]))).toEqual([['2']]);
    expect(step('{{x}} -> {}', [['1']]).edges).toEqual([]);
  });
  it('backtracks instead of accepting an inconsistent join', () => {
    expect(tuples(step('{{x,y},{y,z}} -> {{x,z}}', [['1','2'],['3','4'],['4','5']]))).toEqual([['1','2'],['3','5']]);
  });
  it('can use arbitrary opaque state labels', () => {
    expect(tuples(step('{{x,y}} -> {{y,x}}', [['alpha','beta']]))).toEqual([['beta','alpha']]);
  });
});

describe('event provenance and generations', () => {
  it('does not confuse shared atoms with causal dependence', () => {
    const state = runEvents(createModelState([['1','2'],['1','3']]), rule('{{x,y}} -> {{x,z},{z,y}}'), 3).state;
    expect(state.events.map(e => e.parents)).toEqual([[],[],[1]]);
    expect(state.events.map(e => e.generation)).toEqual([1,1,2]);
    expect(state.generation).toBe(2);
  });
  it('records dependency when an unchanged tuple is consumed again', () => {
    const state = runEvents(createModelState([['1']]), rule('{{x}} -> {{x}}'), 3).state;
    expect(state.events.map(e => e.parents)).toEqual([[],[1],[2]]);
    expect(new Set(state.events.flatMap(e => e.outputEdges)).size).toBe(3);
  });
});

describe('termination and atomic limits', () => {
  it('does not advance on no match', () => {
    const s = step('{{x,y}} -> {{x,z}}', [['1']]);
    expect(s.status).toBe('no-match'); expect(s.step).toBe(0); expect(tuples(s)).toEqual([['1']]);
  });
  it('rejects whole over-budget events', () => {
    const s = step('{{x}} -> {{x,y},{y,z}}', [['1']], { maxNodes: 2 });
    expect(s.status).toBe('node-limit'); expect(s.step).toBe(0); expect(tuples(s)).toEqual([['1']]); expect(s.nextAtomId).toBe(2);
  });
  it('allows deletion and replacement at the live-atom cap', () => {
    expect(step('{{x,y}} -> {}', [['1','2']], { maxNodes: 2 }).step).toBe(1);
    expect(tuples(step('{{x}} -> {{y}}', [['1']], { maxNodes: 1 }))).toEqual([['2']]);
  });
  it('rejects whole events at an edge budget', () => {
    const s = step('{{x}} -> {{x},{x}}', [['1']], { maxEdges: 1 });
    expect(s.status).toBe('edge-limit'); expect(s.edges).toHaveLength(1); expect(s.step).toBe(0);
  });
  it('distinguishes a global event budget from no match', () => {
    const s = runEvents(createModelState([['1']]), rule('{{x}} -> {{x}}'), 20, { maxEvents: 3 }).state;
    expect(s.status).toBe('event-limit'); expect(s.step).toBe(3);
  });
  it('reports the global event cap on the final permitted event', () => {
    const r = rule('{{x}} -> {{x}}');
    const initial = createModelState([['1']]);
    expect(runEvents(initial, r, 3, { maxEvents: 3 }).state.status).toBe('event-limit');
    expect(rewriteOnce(initial, r, { maxEvents: 1 }).status).toBe('event-limit');
  });
  it('does not claim no match after exhausting search work', () => {
    const s = step('{{x,x}} -> {{x}}', [['1','2'],['2','3']], { maxMatchChecks: 1 });
    expect(s.status).toBe('match-limit'); expect(s.step).toBe(0);
  });
  it('retries unchanged state after raising a resource limit', () => {
    const s = step('{{x}} -> {{x},{y}}', [['1']], { maxNodes: 1 });
    expect(rewriteOnce(s, rule('{{x}} -> {{x},{y}}'), { maxNodes: 2 }).step).toBe(1);
  });
  it.each([NaN, Infinity, -1, 1.5])('rejects invalid limits: %s', maxNodes => {
    expect(() => step('{{x}} -> {{x}}', [['1']], { maxNodes })).toThrow();
  });
});

// Independent references: enumerate occurrence permutations first, then validate
// each complete assignment. No candidate indexes or incremental bound filtering.
function bruteMatches(edges: readonly Hyperedge[], rule: CompiledRule) {
  const found: { indices: number[]; bindings: Map<string, string> }[] = [];
  const enumerate = (indices: number[]) => {
    if (indices.length === rule.lhs.length) {
      const bindings = new Map<string, string>();
      for (let patternIndex = 0; patternIndex < rule.lhs.length; patternIndex++) {
        const pattern = rule.lhs[patternIndex], atoms = edges[indices[patternIndex]].atoms;
        if (pattern.length !== atoms.length) return;
        for (let position = 0; position < pattern.length; position++) {
          const variable = pattern[position], atom = atoms[position];
          if (bindings.has(variable) && bindings.get(variable) !== atom) return;
          bindings.set(variable, atom);
        }
      }
      found.push({ indices, bindings });
      return;
    }
    for (let index = 0; index < edges.length; index++) if (!indices.includes(index)) enumerate([...indices, index]);
  };
  enumerate([]);
  return found;
}
// SetReplace default: newest-first position sequence, smallest wins; then rule-input order.
function bruteLeastRecent(edges: readonly Hyperedge[], rule: CompiledRule) {
  const less = (a: number[], b: number[]) => { for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] < b[i]; return false; };
  const key = (m: { indices: number[] }) => [...m.indices].sort((x, y) => y - x);
  return bruteMatches(edges, rule).reduce<{ indices: number[]; bindings: Map<string, string> } | undefined>((best, m) =>
    !best || less(key(m), key(best)) || (!less(key(best), key(m)) && less(m.indices, best.indices)) ? m : best, undefined);
}
function bruteFirstMatch(edges: readonly Hyperedge[], rule: CompiledRule) {
  function enumerate(indices: number[]): { indices: number[]; bindings: Map<string, string> } | undefined {
    if (indices.length === rule.lhs.length) {
      const bindings = new Map<string, string>();
      for (let patternIndex = 0; patternIndex < rule.lhs.length; patternIndex++) {
        const pattern = rule.lhs[patternIndex], atoms = edges[indices[patternIndex]].atoms;
        if (pattern.length !== atoms.length) return undefined;
        for (let position = 0; position < pattern.length; position++) {
          const variable = pattern[position], atom = atoms[position];
          if (bindings.has(variable) && bindings.get(variable) !== atom) return undefined;
          bindings.set(variable, atom);
        }
      }
      return { indices, bindings };
    }
    for (let index = 0; index < edges.length; index++) {
      if (indices.includes(index)) continue;
      const answer = enumerate([...indices, index]);
      if (answer) return answer;
    }
    return undefined;
  }
  return enumerate([]);
}

describe('occurrence indexes preserve ordered matching', () => {
  it('finds a late two-edge join within a linear candidate budget', () => {
    const decoys = 1000;
    const seed = [...Array.from({ length: decoys }, (_, i) => [`a${i}`, `b${i}`]), ['start', 'middle'], ['middle', 'end']];
    const next = rewriteOnce(createModelState(seed), compileRule('{{x,y},{y,z}} -> {{x,z}}'), { maxMatchChecks: 3000 });
    expect(next.status).toBe('ready');
    expect(next.events[0].inputEdges).toEqual(['e1000', 'e1001']);
    expect(next.edges.at(-1)?.atoms).toEqual(['start', 'end']);
    expect(next.searchChecks).toBeLessThanOrEqual(3000);
  });

  it.each(ORDERINGS)('matches exhaustive small ordered states against a permutation reference: %s', ordering => {
    const tuples = [['a'], ['b'], ['a','a'], ['a','b'], ['b','a'], ['b','b'], ['a','b','a']];
    const rules = [
      '{{x}} -> {}', '{{x,x}} -> {}', '{{x,y},{y,z}} -> {}', '{{x,y},{x,y}} -> {}',
      '{{x},{y,x}} -> {}', '{{x,y},{z,x}} -> {}', '{{x},{x,y,x}} -> {}',
      '{{x,y},{y,z},{z,x}} -> {}',
    ].map(compileRule);
    let cases = 0;
    const check = (seed: string[][]) => {
      const state = createModelState(seed);
      for (const rule of rules) {
        const actual = findMatch(state.edges, rule, 100000, ordering);
        expect(actual.exhausted).toBe(false);
        expect(actual.match).toEqual(ordering === 'oldest-edge' ? bruteFirstMatch(state.edges, rule) : bruteLeastRecent(state.edges, rule));
        cases++;
      }
    };
    const enumerate = (seed: string[][]) => {
      check(seed);
      if (seed.length === 3) return;
      for (const tuple of tuples) enumerate([...seed, tuple]);
    };
    enumerate([]);
    expect(cases).toBe(3200);
  });

  it('validates repetitions and every bound position after choosing a narrow bucket', () => {
    const state = createModelState([['a','b'], ['a','c','d'], ['a','b','c'], ['a','c','c'], ['a','b','b']]);
    const repeated = findMatch(state.edges, compileRule('{{x,y},{x,z,z}} -> {}'), 100);
    expect(repeated.match?.indices).toEqual([0, 3]);
    const allBound = findMatch(state.edges, compileRule('{{x,y},{x,y,y}} -> {}'), 100);
    expect(allBound.match?.indices).toEqual([0, 4]);
  });

  it('keeps occurrence order when a later bucket is narrower', () => {
    const state = createModelState([['a','b'], ['a','q','b'], ['a','r','b'], ['a','q','c'], ['a','q','d']]);
    const actual = findMatch(state.edges, compileRule('{{x,y},{x,z,y}} -> {}'), 100);
    expect(actual.match?.indices).toEqual([0, 1]);
  });

  it('does not cache stale indexes across immutable rewritten states', () => {
    const rule = compileRule('{{x,y},{y,z}} -> {{x,z},{z,y}}');
    const initial = createModelState([['a','b'], ['b','c']]);
    const next = rewriteOnce(initial, rule);
    expect(findMatch(initial.edges, rule, 100).match?.indices).toEqual([0, 1]);
    expect(findMatch(next.edges, rule, 100).match).toEqual(bruteFirstMatch(next.edges, rule));
  });

  it('retains the single-input scan and candidate-budget stop reason', () => {
    const state = createModelState([['a'], ['a','b'], ['b','b']]);
    const rule = compileRule('{{x,x}} -> {{x}}');
    expect(findMatch(state.edges, rule, 1)).toEqual({ match: undefined, checks: 1, exhausted: true });
    const complete = findMatch(state.edges, rule, 2);
    expect(complete.match?.indices).toEqual([2]);
    expect(complete.checks).toBe(2);
    expect(complete.exhausted).toBe(false);
  });

  it('reports a limited indexed search and succeeds with exactly enough candidates', () => {
    const state = createModelState([['a','b'], ['b','c']]);
    const rule = compileRule('{{x,y},{y,z}} -> {}');
    expect(findMatch(state.edges, rule, 1, 'oldest-edge')).toEqual({ match: undefined, checks: 1, exhausted: true });
    const complete = findMatch(state.edges, rule, 2, 'oldest-edge');
    expect(complete.match?.indices).toEqual([0, 1]);
    expect(complete.checks).toBe(2);
    expect(complete.exhausted).toBe(false);
  });
  it('withholds a found match when the least-recent search is cut short', () => {
    const state = createModelState([['a','b'], ['b','c']]);
    const rule = compileRule('{{x,y},{y,z}} -> {}');
    // The first match costs two unifications; certifying it needs the third candidate examined.
    expect(findMatch(state.edges, rule, 2)).toEqual({ match: undefined, checks: 2, exhausted: true });
    const complete = findMatch(state.edges, rule, 3);
    expect(complete.match?.indices).toEqual([0, 1]);
    expect(complete.exhausted).toBe(false);
    expect(step('{{x,y},{y,z}} -> {{x,z}}', [['a','b'], ['b','c']], { maxMatchChecks: 2 }).status).toBe('match-limit');
  });
});


describe('event ordering', () => {
  const orderingExample = [['1','2'], ['a','b'], ['b','c'], ['2','3']];
  it('selects the least recent complete match by default, as the SetReplace ordering example documents', () => {
    // github.com/maxitg/SetReplace, Options/EventOrderingFunction.md at 44c868b: LeastRecentEdge selects edges 2 and 3.
    const s = step('{{x,y},{y,z}} -> {{x,x}}', orderingExample);
    expect(s.events[0].inputEdges).toEqual(['e1', 'e2']);
  });
  it('keeps the oldest-edge convention selectable, which the same example attributes to OldestEdge', () => {
    const s = rewriteOnce(createModelState(orderingExample), rule('{{x,y},{y,z}} -> {{x,x}}'), {}, 'oldest-edge');
    expect(s.events[0].inputEdges).toEqual(['e0', 'e3']);
  });
  it('breaks ties on the same occurrence set by rule-input order', () => {
    const s = step('{{x,y},{z,w}} -> {{x,w}}', [['1','2'], ['3','4'], ['5','6']]);
    expect(s.events[0].inputEdges).toEqual(['e0', 'e1']);
  });
  it.each(ORDERINGS as EventOrdering[])('leaves single-input evolutions identical under %s', ordering => {
    const reference = runEvents(createModelState([['1','1']]), rule('{{x,y}} -> {{x,y},{y,z}}'), 50, {}, 'oldest-edge').state;
    expect(runEvents(createModelState([['1','1']]), rule('{{x,y}} -> {{x,y},{y,z}}'), 50, {}, ordering).state).toEqual(reference);
  });
  it('reproduces the published live-edge set after event 12 of a three-input rule', () => {
    // github.com/maxitg/SetReplace, Properties/StatesAsEdgeIndices.md at 44c868b: "StateEdgeIndicesAfterEvent", 12.
    const seed = [['1','1','1'], ['1','1','1'], ['1','1'], ['1','1'], ['1','1']];
    const r = rule('{{a,b,c},{d,e,f},{a,d}} -> {{b,g,h},{c,i,j},{e,k,l},{f,m,n},{h,l},{k,j},{m,g},{n,i}}');
    const state = runEvents(createModelState(seed), r, 12).state;
    const published = [18,19,29,34,35,36,37,39,40,42,43,44,45,49,50,51,52,53, ...Array.from({ length: 47 }, (_, i) => 55 + i)];
    expect(state.edges.map(e => Number(e.id.slice(1)) + 1)).toEqual(published);
    expect(runEvents(createModelState(seed), r, 12, {}, 'oldest-edge').state.edges.map(e => Number(e.id.slice(1)) + 1)).not.toEqual(published);
  });
  it('rejects an unknown ordering', () => {
    expect(() => findMatch(createModelState([['1']]).edges, rule('{{x}} -> {{x}}'), 10, 'random' as EventOrdering)).toThrow();
  });
});

describe('mixed input arity and deletion generations', () => {
  it('matches unary and binary inputs without dropping tuple positions', () => {
    const state = step('{{x},{x,y}} -> {{y,x,y}}', [['a'], ['a','b']]);
    expect(tuples(state)).toEqual([['b','a','b']]);
    expect(state.events[0].inputEdges).toEqual(['e0','e1']);
  });
  it('assigns a deletion event one plus the greatest consumed generation', () => {
    const first = step('{{x}} -> {{x,x}}', [['a'], ['b','c']]);
    const deleted = rewriteOnce(first, rule('{{x,y},{z,z}} -> {}'));
    expect(tuples(deleted)).toEqual([]);
    expect(deleted.events[1]).toMatchObject({ generation: 2, inputEdges: ['e1','e2'], parents: [1], outputEdges: [] });
    expect(deleted.generation).toBe(2);
  });
});
