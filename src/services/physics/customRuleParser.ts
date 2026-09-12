import type { GraphNode, GraphLink } from '@/types';
import type { CompiledRule } from './types';
import { createModelState, rewriteOnce } from './model';

/** Flat ordered relations; intentionally not a Wolfram Language evaluator. */
export function parseRelations(input: string): string[][] {
  if (input.length > 200000) throw new Error('Relation input is too large.');
  let cursor = 0;
  const whitespace = () => { while (/\s/.test(input[cursor] ?? '') && cursor < input.length) cursor++; };
  const take = (token: string) => {
    whitespace();
    if (input[cursor] !== token) throw new Error(`Expected '${token}' at position ${cursor + 1}.`);
    cursor++;
  };
  const relations: string[][] = [];
  take('{'); whitespace();
  if (input[cursor] !== '}') {
    while (true) {
      take('{');
      const atoms: string[] = [];
      while (true) {
        whitespace();
        const token = input.slice(cursor).match(/^(?:[A-Za-z][A-Za-z0-9]*|-?\d+)/)?.[0];
        if (!token) throw new Error(`Expected an atom label at position ${cursor + 1}.`);
        if (/^-?\d+$/.test(token) && (!Number.isSafeInteger(Number(token)) || Number(token) >= Number.MAX_SAFE_INTEGER)) throw new Error('Integer atom labels must fit safe numeric storage.');
        atoms.push(/^-?\d+$/.test(token) ? String(Number(token)) : token); cursor += token.length;
        if (atoms.length > 16) throw new Error('At most 16 positions per relation are supported.');
        whitespace();
        if (input[cursor] !== ',') break;
        cursor++;
      }
      take('}'); relations.push(atoms);
      if (relations.length > 20000) throw new Error('At most 20000 relations are supported.');
      whitespace();
      if (input[cursor] !== ',') break;
      cursor++;
    }
  }
  take('}'); whitespace();
  if (cursor !== input.length) throw new Error(`Unexpected text at position ${cursor + 1}.`);
  return relations;
}

export function compileRule(signature: string): CompiledRule {
  const parts = signature.split(/->|→/);
  if (parts.length !== 2) throw new Error('Use exactly one -> between the input and output relations.');
  const lhs = parseRelations(parts[0]), rhs = parseRelations(parts[1]);
  if (!lhs.length) throw new Error('The left side must contain at least one relation.');
  if (lhs.length > 8 || rhs.length > 32) throw new Error('Supported rules have at most 8 input and 32 output relations.');
  return { lhs, rhs };
}
export const formatRelations = (edges: readonly (readonly string[])[]) => `{${edges.map(e => `{${e.join(',')}}`).join(',')}}`;

/** Legacy delta adapter. The live engine receives the serializable rule directly. */
export function parseAndApplyCustomRule(signature: string, nodes: GraphNode[], links: GraphLink[], maxId: number, step: number) {
  const initial = createModelState(links.map(l => l.nodes ?? [l.source, l.target]));
  const state = { ...initial, nextAtomId: Math.max(initial.nextAtomId, maxId + 1) };
  const result = rewriteOnce(state, compileRule(signature));
  if (!result.step) return { newNodes: [], newLinks: [], linksToRemove: [] };
  const event = result.events[0];
  const oldIds = new Set(nodes.map(n => n.id));
  const outputs = result.edges.filter(e => event.outputEdges.includes(e.id));
  const newNodes = [...new Set(outputs.flatMap(e => [...e.atoms]))].filter(id => !oldIds.has(id)).map(id => ({ id, group: step }));
  const usedIds = new Set(links.map(link => link.id));
  const newLinks = outputs.map(e => {
    const base = `legacy:${step}:${e.id}`;
    let id = base, suffix = 0;
    while (usedIds.has(id)) id = `${base}:${++suffix}`;
    usedIds.add(id);
    return { id, nodes: [...e.atoms], source: e.atoms[0], target: e.atoms[1] ?? e.atoms[0] };
  });
  const linksToRemove = links.filter((_, i) => event.inputEdges.includes(initial.edges[i].id));
  return { newNodes, newLinks, linksToRemove };
}
