import { describe, expect, it } from 'vitest';
import { createInitialState, evolveUniverse } from '../engine';
import { RULE_REGISTRY, getRuleById } from '../registry';
import { compileRule } from '../customRuleParser';
import { rewriteOnce } from '../model';

describe('published preset definitions', () => {
  it('starts from the selected explicit seed', () => {
    for (const rule of RULE_REGISTRY) expect(createInitialState(rule.id).edges.map(e => e.atoms)).toEqual(rule.seed);
  });
  it('executes exactly the signature shown for every preset', () => {
    for (const rule of RULE_REGISTRY) {
      const state = createInitialState(rule.id);
      expect(evolveUniverse(state, rule.id, 100)).toEqual(rewriteOnce(state, compileRule(rule.signature), { maxNodes: 100 }));
      expect(rule.source).toMatch(/^https:\/\//);
    }
  });
  it('lists each model once with a self-loop seed matching its rule arities for registry universes', () => {
    expect(new Set(RULE_REGISTRY.map(rule => rule.id)).size).toBe(RULE_REGISTRY.length);
    expect(RULE_REGISTRY.length).toBe(18);
    for (const rule of RULE_REGISTRY.filter(r => r.group === 'Registry of notable universes')) {
      const lhs = compileRule(rule.signature).lhs;
      expect(rule.seed.map(edge => edge.length)).toEqual(lhs.map(pattern => pattern.length));
      for (const edge of rule.seed) expect(new Set(edge).size).toBe(1);
      expect(rule.source).toBe(`https://www.wolframphysics.org/universes/${rule.id}/`);
    }
  });
  it('rejects unknown IDs without falling back to another universe', () => {
    expect(() => getRuleById('not-a-rule')).toThrow();
    expect(() => evolveUniverse(createInitialState(), 'not-a-rule')).toThrow();
  });
});
