import { memo, useEffect, useRef } from 'react';
import ForceGraph3D, { type ForceGraphMethods } from 'react-force-graph-3d';
import type { DisplayTheme, ModelState } from '@/services/physics/types';
import { useGraphData } from './useGraphData';
import type { GraphView, VisualNode, VisualLink } from './projection';

export interface GraphRendererProps {
  data: ModelState; view: GraphView; width: number; height: number;
  nodeSize: number; linkDistance: number; fitKey: number;
  theme: DisplayTheme; flat: boolean;
  onSelect: (node: VisualNode) => void;
}
const rendererConfig = { antialias: true, powerPreference: 'high-performance' as const };
// Display palettes. Plain is monochrome: dark atoms and events, grey relation hubs and links.
const palettes: Record<DisplayTheme, { background: string; atom: string; hub: string; event: string; spatialLink: string; causalLink: string; linkOpacity: number }> = {
  dark: { background: '#0b1519', atom: '#72d8bd', hub: '#e7b563', event: '#e7b563', spatialLink: '#477d78', causalLink: '#ab8b56', linkOpacity: 0.7 },
  plain: { background: '#ffffff', atom: '#1f2933', hub: '#8a8f98', event: '#1f2933', spatialLink: '#9aa3ad', causalLink: '#6b7280', linkOpacity: 0.9 },
};
const nodeLabel = (node: VisualNode) => node.kind === 'atom' ? `Atom ${node.label} · ${node.degree} incidences` : `${node.label} · generation ${node.generation}`;
const nodeVal = (node: VisualNode) => node.kind === 'relation' ? 0.35 : 1 + Math.min(node.degree, 20) * 0.12;
const linkCurvature = (link: VisualLink) => link.curvature;
const linkRotation = (link: VisualLink) => link.rotation;

function GraphRenderer({ data, view, width, height, nodeSize, linkDistance, fitKey, theme, flat, onSelect }: GraphRendererProps) {
  const graph = useGraphData(data, view);
  const palette = palettes[theme];
  const nodeColor = (node: VisualNode) => node.kind === 'relation' ? palette.hub : node.kind === 'event' ? palette.event : palette.atom;
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
  }, [fitKey, view, flat]);
  return <ForceGraph3D<VisualNode, VisualLink>
    ref={ref} width={width} height={height} graphData={graph} rendererConfig={rendererConfig}
    backgroundColor={palette.background} showNavInfo={false} numDimensions={flat ? 2 : 3}
    nodeLabel={nodeLabel} nodeColor={nodeColor} nodeVal={nodeVal} nodeRelSize={nodeSize} nodeResolution={8}
    linkLabel="label" linkColor={() => view === 'causal' ? palette.causalLink : palette.spatialLink} linkOpacity={palette.linkOpacity}
    linkWidth={0.65} linkResolution={3} linkCurvature={linkCurvature} linkCurveRotation={linkRotation}
    linkDirectionalArrowLength={3} linkDirectionalArrowRelPos={0.8}
    onNodeClick={onSelect} d3VelocityDecay={0.4} cooldownTicks={120}
    dagMode={view === 'causal' ? 'td' : undefined} dagLevelDistance={linkDistance * 2}
  />;
}
export default memo(GraphRenderer);
