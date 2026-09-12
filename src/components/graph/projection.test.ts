import { describe, expect, it } from 'vitest';
import { createModelState, runEvents } from '@/services/physics/model';
import { compileRule } from '@/services/physics/customRuleParser';
import { projectGraph } from './projection';

const freeze = <T,>(x: T): T => { if (x && typeof x === 'object') { Object.freeze(x); Object.values(x).forEach(freeze); } return x; };
describe('lossless occurrence-aware display projection', () => {
  it('does not collapse duplicate binary edges', () => {
    const graph = projectGraph(createModelState([['a','b'],['a','b']]));
    expect(graph.links).toHaveLength(2);
    expect(new Set(graph.links.map(l => l.id)).size).toBe(2);
    expect(graph.links[0].curvature).not.toBe(graph.links[1].curvature);
  });
  it('creates distinct hubs for duplicate higher-arity occurrences', () => {
    const graph = projectGraph(createModelState([['a','b','c'],['a','b','c']]));
    expect(graph.nodes.filter(n => n.kind === 'relation')).toHaveLength(2);
    expect(graph.links).toHaveLength(6);
    expect(new Set(graph.links.map(l => l.id)).size).toBe(6);
  });
  it('retains repeated ordered positions and unary relations', () => {
    const graph = projectGraph(createModelState([['a','a','b'],['c']]));
    expect(graph.links.slice(0,3).map(l => l.position)).toEqual([1,2,3]);
    expect(graph.nodes.filter(n => n.kind === 'atom')).toHaveLength(3);
    expect(graph.links).toHaveLength(4);
  });
  it('renders directed self loops', () => {
    const graph = projectGraph(createModelState([['1','1']]));
    expect(graph.links[0].source).toBe(graph.links[0].target);
    expect(graph.links[0].curvature).toBeGreaterThan(0);
  });
  it('isolates mutable renderer data and namespaces identifiers', () => {
    const state = freeze(createModelState([['edge:e0','1','a']]));
    const graph = projectGraph(state);
    expect(new Set(graph.nodes.map(n => n.id)).size).toBe(4);
    graph.nodes[0].x = 99;
    expect(state.edges[0].atoms).toEqual(['edge:e0','1','a']);
  });
  it('projects event provenance rather than spatial connectivity as causality', () => {
    const state = runEvents(createModelState([['1','2'],['1','3']]), compileRule('{{x,y}} -> {{x,z},{z,y}}'), 3).state;
    const graph = projectGraph(state, 'causal');
    expect(graph.nodes).toHaveLength(3);
    expect(graph.links.map(l => [l.source,l.target])).toEqual([['event:1','event:3']]);
  });
});
