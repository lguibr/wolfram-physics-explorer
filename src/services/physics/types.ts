import type { GraphNode, GraphLink } from '../../types';

export interface CompiledRule {
  readonly lhs: readonly (readonly string[])[];
  readonly rhs: readonly (readonly string[])[];
}
export interface Hyperedge {
  readonly id: string;
  readonly atoms: readonly string[];
  readonly creator: number | null;
  readonly generation: number;
}
export interface RewriteEvent {
  readonly id: number;
  readonly inputEdges: readonly string[];
  readonly outputEdges: readonly string[];
  readonly parents: readonly number[];
  readonly generation: number;
}
export type StopReason = 'ready' | 'no-match' | 'node-limit' | 'edge-limit' | 'event-limit' | 'match-limit';
export interface ModelState {
  readonly edges: readonly Hyperedge[];
  readonly events: readonly RewriteEvent[];
  readonly nextAtomId: number;
  readonly nextEdgeId: number;
  readonly step: number;
  readonly generation: number;
  readonly status: StopReason;
  readonly searchChecks: number;
}
export interface ModelLimits {
  maxNodes?: number;
  maxEdges?: number;
  maxEvents?: number;
  maxMatchChecks?: number;
}
export interface ModelDefinition {
  id: string;
  name: string;
  description: string;
  signature: string;
  seed: string[][];
  source: string;
}
// Compatibility for retained legacy modules; the active registry uses ModelDefinition.
export interface PhysicsRule {
  id: string;
  name: string;
  category: 'GROWTH' | 'LATTICE' | 'CYCLE' | 'CHAOS' | 'FRACTAL' | 'COSMIC' | 'CUSTOM';
  description: string;
  signature?: string;
  apply: (nodes: GraphNode[], links: GraphLink[], maxId: number, step: number) => {
    newNodes: GraphNode[]; newLinks: GraphLink[]; linksToRemove: GraphLink[];
  };
}
