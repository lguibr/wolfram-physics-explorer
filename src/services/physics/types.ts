import { GraphNode, GraphLink } from '../../types';

export interface PhysicsRule {
  id: string;
  name: string;
  category: 'GROWTH' | 'LATTICE' | 'CYCLE' | 'CHAOS' | 'FRACTAL' | 'COSMIC' | 'CUSTOM';
  description: string;
  signature?: string; // Wolfram-style signature for UI auto-fill
   
  apply: (nodes: GraphNode[], links: GraphLink[], maxId: number, step: number) => { newNodes: GraphNode[], newLinks: GraphLink[] };
}
