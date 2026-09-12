import { memo, useEffect, useRef } from 'react';
import ForceGraph3D, { type ForceGraphMethods } from 'react-force-graph-3d';
import type { ModelState } from '@/services/physics/types';
import { useGraphData } from './useGraphData';
import type { GraphView, VisualNode, VisualLink } from './projection';

export interface GraphRendererProps {
  data: ModelState; view: GraphView; width: number; height: number;
  nodeSize: number; linkDistance: number; fitKey: number;
  onSelect: (node: VisualNode) => void;
}
const rendererConfig = { antialias: true, powerPreference: 'high-performance' as const };
const nodeColor = (node: VisualNode) => node.kind === 'relation' ? '#e7b563' : node.kind === 'event' ? '#e7b563' : '#72d8bd';
const nodeLabel = (node: VisualNode) => node.kind === 'atom' ? `Atom ${node.label} · ${node.degree} incidences` : `${node.label} · generation ${node.generation}`;
const nodeVal = (node: VisualNode) => node.kind === 'relation' ? 0.35 : 1 + Math.min(node.degree, 20) * 0.12;
const linkCurvature = (link: VisualLink) => link.curvature;
const linkRotation = (link: VisualLink) => link.rotation;

function GraphRenderer({ data, view, width, height, nodeSize, linkDistance, fitKey, onSelect }: GraphRendererProps) {
  const graph = useGraphData(data, view);
  const ref = useRef<ForceGraphMethods<VisualNode, VisualLink> | undefined>(undefined);
  const appliedDistance = useRef<number | null>(null);
  useEffect(() => {
    // The library builds its layout only after the first data update. Reheating before that makes the
    // next animation frame tick an undefined layout, which throws and permanently stops rendering.
    // Set the force distance immediately; reheat only when the distance actually changes later.
    const graph = ref.current;
    if (!graph) return;
    graph.d3Force('link')?.distance(linkDistance);
    if (appliedDistance.current !== null && appliedDistance.current !== linkDistance) graph.d3ReheatSimulation();
    appliedDistance.current = linkDistance;
  }, [linkDistance]);
  useEffect(() => {
    const timer = window.setTimeout(() => ref.current?.zoomToFit(450, 65), 250);
    return () => window.clearTimeout(timer);
  }, [fitKey, view]);
  return <ForceGraph3D<VisualNode, VisualLink>
    ref={ref} width={width} height={height} graphData={graph} rendererConfig={rendererConfig}
    backgroundColor="#0b1519" showNavInfo={false}
    nodeLabel={nodeLabel} nodeColor={nodeColor} nodeVal={nodeVal} nodeRelSize={nodeSize} nodeResolution={8}
    linkLabel="label" linkColor={() => view === 'causal' ? '#ab8b56' : '#477d78'} linkOpacity={0.7}
    linkWidth={0.65} linkResolution={3} linkCurvature={linkCurvature} linkCurveRotation={linkRotation}
    linkDirectionalArrowLength={3} linkDirectionalArrowRelPos={0.8}
    onNodeClick={onSelect} d3VelocityDecay={0.4} cooldownTicks={120}
    dagMode={view === 'causal' ? 'td' : undefined} dagLevelDistance={linkDistance * 2}
  />;
}
export default memo(GraphRenderer);
