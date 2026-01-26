export interface GraphNode {
  id: string;
  group?: number;
  val?: number; // For visualization size
}

export interface GraphLink {
  source: string;
  target: string;
  type?: string; // e.g., 'spatial', 'causal'
}

export interface HypergraphState {
  nodes: GraphNode[];
  links: GraphLink[];
  step: number;
  maxNodeId: number;
}

export interface AnalysisResult {
  summary: string;
  complexity: string;
  dimensionality: string;
}



export interface CustomRuleParams {
  branchingFactor: number;
  loopProbability: number;
  connectionDistance: number;
}