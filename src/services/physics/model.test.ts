import { describe, expect, it } from 'vitest';
import { compileRule } from './customRuleParser';
import { createModelState, rewriteOnce, runEvents, findMatch } from './model';
import type { ModelState, CompiledRule, Hyperedge } from './types';

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

// Independent reference: enumerate occurrence permutations first, then validate
// each complete assignment. No candidate indexes or incremental bound filtering.
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

  it('matches exhaustive small ordered states against a permutation reference', () => {
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
        const actual = findMatch(state.edges, rule, 100000);
        expect(actual.exhausted).toBe(false);
        expect(actual.match).toEqual(bruteFirstMatch(state.edges, rule));
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
    expect(findMatch(state.edges, rule, 1)).toEqual({ match: undefined, checks: 1, exhausted: true });
    const complete = findMatch(state.edges, rule, 2);
    expect(complete.match?.indices).toEqual([0, 1]);
    expect(complete.checks).toBe(2);
    expect(complete.exhausted).toBe(false);
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
