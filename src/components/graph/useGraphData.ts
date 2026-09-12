import { useMemo, useRef } from 'react';
import type { ModelState } from '@/services/physics/types';
import { projectGraph, type GraphView, type VisualNode } from './projection';

/** Only these projection copies are mutable by the force layout. */
export function useGraphData(state: ModelState, view: GraphView) {
  const previous = useRef(new Map<string, VisualNode>());
  return useMemo(() => {
    const graph = projectGraph(state, view);
    const active = new Map<string, VisualNode>();
    graph.nodes = graph.nodes.map(node => {
      const visual = previous.current.get(node.id) ?? { ...node };
      Object.assign(visual, node); active.set(node.id, visual); return visual;
    });
    previous.current = active;
    return graph;
  }, [state, view]);
}
