import type { ModelState } from '@/services/physics/types';

export type GraphView = 'spatial' | 'causal';
export interface VisualNode {
  id: string; label: string; kind: 'atom' | 'relation' | 'event'; generation: number;
  degree: number; tuple?: readonly string[]; x?: number; y?: number; z?: number;
}
export interface VisualLink {
  id: string; source: string | VisualNode; target: string | VisualNode;
  label: string; curvature: number; rotation: number; position?: number;
}
export interface VisualGraph { nodes: VisualNode[]; links: VisualLink[] }

export function projectGraph(state: ModelState, view: GraphView = 'spatial'): VisualGraph {
  if (view === 'causal') return {
    nodes: state.events.map(e => ({ id:`event:${e.id}`, label:`Event ${e.id}`, kind:'event', generation:e.generation, degree:e.parents.length })),
    links: state.events.flatMap(e => e.parents.map(parent => ({ id:`causal:${parent}:${e.id}`, source:`event:${parent}`, target:`event:${e.id}`, label:`Event ${parent} → ${e.id}`, curvature:0, rotation:0 }))),
  };
  const nodes = new Map<string, VisualNode>();
  const links: VisualLink[] = [];
  for (const edge of state.edges) {
    for (const atom of edge.atoms) {
      const id = `atom:${atom}`;
      if (!nodes.has(id)) nodes.set(id, { id, label:atom, kind:'atom', generation:edge.generation, degree:0 });
      const node = nodes.get(id)!;
      node.degree++; node.generation = Math.min(node.generation, edge.generation);
    }
    const label = `${edge.id} · {${edge.atoms.join(', ')}}`;
    if (edge.atoms.length === 2) {
      links.push({ id:edge.id, source:`atom:${edge.atoms[0]}`, target:`atom:${edge.atoms[1]}`, label, curvature:0, rotation:0 });
    } else {
      const hub = `edge:${edge.id}`;
      nodes.set(hub, { id:hub, label, kind:'relation', generation:edge.generation, degree:edge.atoms.length, tuple:edge.atoms });
      edge.atoms.forEach((atom, i) => links.push({ id:`${edge.id}:${i}`, source:hub, target:`atom:${atom}`, label:`${label} · position ${i + 1}`, position:i + 1, curvature:0, rotation:0 }));
    }
  }
  const parallel = new Map<string, VisualLink[]>();
  for (const link of links) {
    const key = JSON.stringify([link.source,link.target].sort());
    const group = parallel.get(key) ?? []; group.push(link); parallel.set(key,group);
  }
  for (const group of parallel.values()) group.forEach((link, i) => {
    link.curvature = link.source === link.target ? 0.6 + i * 0.15 : group.length === 1 ? 0 : 0.15 + i * 0.16;
    link.rotation = i * Math.PI * 2 / group.length;
  });
  return { nodes:[...nodes.values()], links };
}
