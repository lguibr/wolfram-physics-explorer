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
  it('rejects unknown IDs without falling back to another universe', () => {
    expect(() => getRuleById('not-a-rule')).toThrow();
    expect(() => evolveUniverse(createInitialState(), 'not-a-rule')).toThrow();
  });
});
