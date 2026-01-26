import { HypergraphState, GraphNode, GraphLink } from '@/types';
import { getRuleById } from './registry';

export const createInitialState = (): HypergraphState => {
  return {
    nodes: [{ id: '1', group: 0 }],
    links: [],
    step: 0,
    maxNodeId: 1
  };
};

export const evolveUniverse = (
    currentState: HypergraphState, 
    ruleId: string,
    maxNodesLimit: number = 1000
): HypergraphState => {
  if (currentState.nodes.length >= maxNodesLimit) {
      return currentState;
  }

  const rule = getRuleById(ruleId);
  const newStep = currentState.step + 1;
  const { newNodes, newLinks } = rule.apply(
      currentState.nodes, 
      currentState.links, 
      currentState.maxNodeId, 
      newStep
  );

  const remainingSpace = maxNodesLimit - currentState.nodes.length;
  const nodesToAdd = newNodes.slice(0, remainingSpace);
  const addedNodeIds = new Set(nodesToAdd.map((n: GraphNode) => n.id));
  
  const linksToAdd = newLinks.filter((l: GraphLink) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const targetId = typeof l.target === 'object' ? (l.target as any).id : l.target;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sourceId = typeof l.source === 'object' ? (l.source as any).id : l.source;
      
      const targetOk = addedNodeIds.has(targetId) || currentState.nodes.some((n: GraphNode) => n.id === targetId);
      const sourceOk = addedNodeIds.has(sourceId) || currentState.nodes.some((n: GraphNode) => n.id === sourceId);
      return targetOk && sourceOk;
  });

  const nextNodes = [...currentState.nodes, ...nodesToAdd];
  const nextLinks = [...currentState.links, ...linksToAdd];
  
  let maxId = currentState.maxNodeId;
  nodesToAdd.forEach((n: GraphNode) => {
      const val = parseInt(n.id);
      if (!isNaN(val) && val > maxId) maxId = val;
  });

  return { nodes: nextNodes, links: nextLinks, step: newStep, maxNodeId: maxId };
};
