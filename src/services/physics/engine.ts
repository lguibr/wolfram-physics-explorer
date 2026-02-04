import { HypergraphState, GraphLink } from '@/types';
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
  // If no space, return early - but rule.apply might have returned empty anyway
  if (remainingSpace <= 0) return currentState;

  const nodesToAdd = newNodes.slice(0, remainingSpace);
  if (nodesToAdd.length === 0 && newLinks.length === 0) {
      return { ...currentState, step: newStep };
  }

  // OPTIMIZATION: Create a Set of all valid Node IDs (both existing and new) for O(1) lookup
  // This replaces the O(N) array search inside the link loop
  const validNodeIds = new Set<string>();
  for (const n of currentState.nodes) validNodeIds.add(n.id);
  for (const n of nodesToAdd) validNodeIds.add(n.id);

  const linksToAdd = newLinks.filter((l: GraphLink) => {
      // Handle potential D3 object references safely without 'any' if possible, 
      // but if runtime data has objects, we need to extract IDs.
      const targetId = typeof l.target === 'object' ? (l.target as {id: string}).id : l.target;
      const sourceId = typeof l.source === 'object' ? (l.source as {id: string}).id : l.source;
      
      return validNodeIds.has(targetId) && validNodeIds.has(sourceId);
  });

  const nextNodes = currentState.nodes.concat(nodesToAdd);
  const nextLinks = currentState.links.concat(linksToAdd);
  
  // OPTIMIZATION: Calculate maxId only from added nodes, stepping up from current max
  let maxId = currentState.maxNodeId;
  for (const n of nodesToAdd) {
       const val = parseInt(n.id, 10);
       if (!isNaN(val) && val > maxId) maxId = val;
  }

  return { nodes: nextNodes, links: nextLinks, step: newStep, maxNodeId: maxId };
};
