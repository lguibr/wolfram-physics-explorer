import { HypergraphState } from '@/types';


/**
 * Creates the initial state of the universe.
 * @returns {HypergraphState} The genesis state (single node).
 */
export const createInitialState = (): HypergraphState => {
  return {
    nodes: [{ id: '1', group: 0 }],
    links: [],
    step: 0,
    maxNodeId: 1
  };
};



