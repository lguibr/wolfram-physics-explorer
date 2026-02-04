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

// --- Zero-Copy Architecture ---

export const SHARED_CONFIG = {
    NODE_STRIDE: 4, // [id, group, val, padding]
    LINK_STRIDE: 3, // [sourceId, targetId, typeId]
    HEADER_SIZE: 4  // [nodeCount, linkCount, maxNodeId, step]
};

export interface FlatGraphState {
    buffer: SharedArrayBuffer;
    
    // Views (Managed manually via offsets)
    // header: new Int32Array(buffer, 0, 4)
    // nodes: new Float32Array(buffer, HEADER_OFFSET, MAX_NODES * NODE_STRIDE)
    // links: new Int32Array(buffer, LINKS_OFFSET, MAX_LINKS * LINK_STRIDE)
}