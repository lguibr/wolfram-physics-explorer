import { GraphNode, GraphLink } from '../../types';

/**
 * Interface defining a physics rule in the Wolfram model.
 * A rule determines how the graph topology evolves from step N to N+1.
 */
export interface PhysicsRule {
  /** Unique identifier for the rule registry. */
  id: string;
  /** Human-readable display name. */
  name: string;
  /** Category for UI grouping. */
  category: 'GROWTH' | 'LATTICE' | 'CYCLE' | 'CHAOS' | 'FRACTAL' | 'COSMIC' | 'CUSTOM';
  /** Brief explanation of the rule's behavior. */
  description: string;
  /** Wolfram-style signature (e.g., {{x,y}} -> {{x,z},{z,y}}) for UI/Parser. */
  signature?: string;
   
  /**
   * Applies the rule to the current graph state.
   * @param nodes Current list of nodes.
   * @param links Current list of edges.
   * @param maxId The highest node ID currently in use.
   * @param step The current simulation step number.
   * @returns Object containing the new nodes/links to add.
   */
  apply: (nodes: GraphNode[], links: GraphLink[], maxId: number, step: number) => { newNodes: GraphNode[], newLinks: GraphLink[] };
}
