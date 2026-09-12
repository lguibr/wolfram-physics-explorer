import { describe, expect, it } from 'vitest';
import { parseAndApplyCustomRule, parseRelations } from '../customRuleParser';
import type { GraphLink, GraphNode } from '@/types';

const apply = (rule: string, tuples: string[][], maxId = 2) => {
  const nodes: GraphNode[] = [...new Set(tuples.flat())].map(id => ({ id }));
  const links: GraphLink[] = tuples.map((nodes, i) => ({ id: `e${i}`, nodes, source: nodes[0], target: nodes[1] ?? nodes[0] }));
  return parseAndApplyCustomRule(rule, nodes.length ? nodes : [{ id: '1' }], links, maxId, 1);
};
const tuples = (links: GraphLink[]) => links.map(l => l.nodes ?? [l.source, l.target]);

describe('documented relation rewriting (not automatic growth)', () => {
  it('keeps new legacy delta IDs distinct from surviving occurrences', () => {
    let nodes: GraphNode[] = [{ id: '1' }];
    let links: GraphLink[] = [{ id: 'e0', nodes: ['1', '1'], source: '1', target: '1' }];
    for (let event = 1; event <= 3; event++) {
      const delta = parseAndApplyCustomRule('{{x,y}} -> {{x,y},{y,z}}', nodes, links, event, event);
      links = [...links.filter(link => !delta.linksToRemove.includes(link)), ...delta.newLinks];
      nodes = [...nodes, ...delta.newNodes];
      expect(new Set(links.map(link => link.id)).size).toBe(links.length);
    }
  });
  it('normalizes integer spellings before matching', () => {
    expect(parseRelations('{{01,-0}}')).toEqual([['1', '0']]);
  });
  it('rejects integers outside exact numeric storage', () => {
    expect(() => parseRelations('{{9007199254740992}}')).toThrow();
  });
  it('does not invent a relation when the LHS cannot match', () => {
    expect(apply('{{x,y}} -> {{x,y},{y,z}}', []).newLinks).toEqual([]);
    expect(apply('{{x,y}} -> {{x,y},{y,z}}', []).newNodes).toEqual([]);
  });
  it('retains unary relations as first-class edges', () => {
    expect(tuples(apply('{{x}} -> {{x},{y}}', [['1']], 1).newLinks)).toEqual([['1'], ['2']]);
  });
  it('allows different variables to bind the same atom', () => {
    expect(tuples(apply('{{x,y}} -> {{x,y},{y,z}}', [['1', '1']], 1).newLinks)).toEqual([['1', '1'], ['1', '2']]);
  });
  it('enforces repeated-variable equality', () => {
    expect(apply('{{x,x}} -> {{x,z}}', [['1', '2']]).newLinks).toEqual([]);
  });
  it('does not reuse one occurrence to satisfy two input edges', () => {
    expect(apply('{{x,y},{x,y}} -> {{x,y}}', [['1', '2']]).linksToRemove).toEqual([]);
  });
  it('consumes two duplicate occurrences independently', () => {
    expect(apply('{{x,y},{x,y}} -> {{x,y}}', [['1', '2'], ['1', '2']]).linksToRemove).toHaveLength(2);
  });
  it('supports a deletion-only right side', () => {
    const result = apply('{{x,y}} -> {}', [['1', '2']]);
    expect(result.linksToRemove).toHaveLength(1);
    expect(result.newLinks).toEqual([]);
  });
  it('preserves endpoint order and mixed arity', () => {
    expect(tuples(apply('{{x,y,x}} -> {{y},{x,y,x}}', [['1', '2', '1']]).newLinks)).toEqual([['2'], ['1', '2', '1']]);
  });
  it.each(['{{x,y}} -> {{x,z}} junk', '{{x,y}} -> {{x,z}} -> {}', '{{x,y},} -> {{x}}', '{{x y}} -> {{x}}', '{} -> {{x}}', '{{}} -> {{x}}'])('rejects malformed or unsupported input: %s', signature => {
    expect(() => apply(signature, [['1', '2']])).toThrow();
  });
});
