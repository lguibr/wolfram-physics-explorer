import { useMemo, useState } from 'react';
import type { ModelState } from '@/services/physics/types';
import { projectGraph, type GraphView, type VisualNode } from './projection';

/** Only these projection copies are mutable by the force layout. Node objects survive re-projection so
 * the layout keeps their positions; the registry map is component state rather than a ref because it is
 * read while rendering. */
export function useGraphData(state: ModelState, view: GraphView) {
  const [retained] = useState(() => new Map<string, VisualNode>());
  return useMemo(() => {
    const graph = projectGraph(state, view);
    const active = new Map<string, VisualNode>();
    graph.nodes = graph.nodes.map(node => {
      const visual = retained.get(node.id) ?? { ...node };
      Object.assign(visual, node); active.set(node.id, visual); return visual;
    });
    retained.clear(); active.forEach((node, id) => retained.set(id, node));
    return graph;
  }, [state, view, retained]);
}
