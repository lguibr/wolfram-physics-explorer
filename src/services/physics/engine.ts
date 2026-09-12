import { compileRule } from './customRuleParser';
import { createModelState, rewriteOnce } from './model';
import { getRuleById, RULE_REGISTRY } from './registry';
import type { ModelDefinition, ModelState } from './types';

export function createInitialState(rule: string | ModelDefinition = RULE_REGISTRY[0].id): ModelState {
  return createModelState(typeof rule === 'string' ? getRuleById(rule).seed : rule.seed);
}
export function evolveUniverse(state: ModelState, rule: string | ModelDefinition, maxNodes = 5000): ModelState {
  const definition = typeof rule === 'string' ? getRuleById(rule) : rule;
  return rewriteOnce(state, compileRule(definition.signature), { maxNodes });
}
