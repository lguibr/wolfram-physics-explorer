import React, { useRef } from 'react';
import ForceGraph3D from 'react-force-graph-3d';
import { useGraphData } from './useGraphData';
import { createNodeObject, getNodeColor, updateNodeVisuals } from './factories/nodeFactory';
import { createLinkParticle } from './factories/linkFactory';
import { HypergraphState, GraphNode, GraphLink } from '@/types';

// Extra visual configuration passed dynamically
export interface VisualProps {
  shadowGrowth: number;
  nodeSize: number;
  auraOpacity: number;
  emissionSpeed: number;
  linkDistance: number;
  particleSize: number;
  linkWidth: number;
  linkOpacity: number;
  particleCount: number;
  friction: number;
  autoRotateSpeed: number;
}

interface GraphRendererProps {
  data: HypergraphState;
  extraVisualProps?: VisualProps;
  width: number;
  height: number;
}

export interface GraphRendererHandle {
    focusNode: (nodeId: string) => void;
}

const GraphRenderer = React.memo(React.forwardRef<GraphRendererHandle, GraphRendererProps>(({ data, extraVisualProps, width, height }, ref) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fgRef = useRef<any>(null);
  
  const { nodes, links, nodeMap } = useGraphData(data); // Pass to hook
  const graphData = React.useMemo(() => ({ nodes, links }), [nodes, links]); 

  // Direct Visual Update (Avoids Physics Reset)
  React.useEffect(() => {
      // Defaults
      const growth = extraVisualProps?.shadowGrowth ?? 1.05;
      const size = extraVisualProps?.nodeSize ?? 1.0;
      const opacity = extraVisualProps?.auraOpacity ?? 0.3;
      const dist = extraVisualProps?.linkDistance ?? 50;
      
      // Update Physics Engine Link Distance dynamically
      // Update Physics Engine Link Distance dynamically
      // Update Physics Engine Link Distance dynamically
      // Safely deferred to next tick to avoid 'tick' crashes
      setTimeout(() => {
          if (fgRef.current) {
              const linkForce = fgRef.current.d3Force('link');
              if (linkForce) {
                  linkForce.distance(dist);
                  fgRef.current.d3ReheatSimulation();
              }
          }
      }, 0);
      
      // Access the internal graph data of the component
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let targetNodes: any[] = [];
      if (fgRef.current && typeof fgRef.current.graphData === 'function') {
           const gData = fgRef.current.graphData();
           if (gData && gData.nodes) targetNodes = gData.nodes;
      } else {
           targetNodes = nodes; 
      }

      if (targetNodes.length > 0) {
           targetNodes.forEach((node: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
               if (node.__threeObj) {
                   updateNodeVisuals(node.__threeObj, node, { 
                       shadowGrowth: growth, 
                       nodeSize: size, 
                       auraOpacity: opacity 
                   });
               }
           });
      }
  }, [extraVisualProps, nodes]); 

  // Auto Rotate Logic
  React.useEffect(() => {
      if (fgRef.current) {
          const controls = fgRef.current.controls();
          if (controls) {
              const speed = extraVisualProps?.autoRotateSpeed ?? 0;
              controls.autoRotate = speed > 0;
              controls.autoRotateSpeed = speed;
          }
      }
  }, [extraVisualProps?.autoRotateSpeed]);

  // Interaction State
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lockedNodeRef = useRef<any>(null); 

  // Focus Logic
  const focusNode = React.useCallback((nodeId: string) => {
      const node = nodeMap.get(nodeId);
      if (!node) {
          lockedNodeRef.current = null; // Unlock if invalid
          return;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const n = node as any; // ForceGraph node has x,y,z
      lockedNodeRef.current = n; // Set Lock

      const distance = 100;
      const distRatio = 1 + distance/Math.hypot(n.x, n.y, n.z);

      const newPos = n.x || n.y || n.z
        ? { x: n.x * distRatio, y: n.y * distRatio, z: n.z * distRatio }
        : { x: 0, y: 0, z: distance }; 

      fgRef.current?.cameraPosition(
          newPos, 
          n, 
          3000
      );
  }, [nodeMap]);

  // Tick Loop to enforce Frame Lock
  React.useEffect(() => {
      let frameId: number;
      
      const tick = () => {
          if (lockedNodeRef.current && fgRef.current) {
               const n = lockedNodeRef.current;
               const controls = fgRef.current.controls();
               if (controls && n.x !== undefined) {
                   controls.target.set(n.x, n.y, n.z);
               }
          }
          frameId = requestAnimationFrame(tick);
      };
      
      tick();
      return () => cancelAnimationFrame(frameId);
  }, []);

  // Expose Handle
  React.useImperativeHandle(ref, () => ({
      focusNode
  }));

  // Click handler to changing orbit center
  const handleClick = React.useCallback((node: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
      focusNode(node.id);
  }, [focusNode]);

  // Memoized Accessors
  const getNodeColorCb = React.useCallback((node: any) => getNodeColor(node as GraphNode), []); // eslint-disable-line @typescript-eslint/no-explicit-any
  
  // Pass dynamic props to creation
  const nodeThreeObjectCb = React.useCallback((node: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
        // We use the current refs for creation. 
        // Note: Ideally we want to pass current props, but ForceGraph memoizes this heavily.
        // It's better to create with defaults and let the useEffect update it immediately 
        // OR pass the props in closed over scope if we want initial state correct used.
        // Since we update in useEffect, simple creation is fine, but let's try to grab latest if we can.
        // Actually, just pass clean defaults, updateNodeVisuals handles the rest in the tick/effect.
        return createNodeObject(node as GraphNode, {
            shadowGrowth: extraVisualProps?.shadowGrowth ?? 1.05,
            nodeSize: extraVisualProps?.nodeSize ?? 1.0,
            auraOpacity: extraVisualProps?.auraOpacity ?? 0.3
        });
  }, [extraVisualProps?.shadowGrowth, extraVisualProps?.nodeSize, extraVisualProps?.auraOpacity]);

  const linkColorCb = React.useCallback(() => {
        const opacity = extraVisualProps?.linkOpacity ?? 0.2;
        return `rgba(255, 255, 255, ${opacity})`;
  }, [extraVisualProps?.linkOpacity]);
  
  // Custom Particle Speed
  const linkParticleSpeedCb = React.useCallback((d: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
      const idStr = (typeof d.source === 'object' ? d.source.id : d.source) + 
                    (typeof d.target === 'object' ? d.target.id : d.target);
      let hash = 0;
      for (let i = 0; i < idStr.length; i++) {
          hash = (hash << 5) - hash + idStr.charCodeAt(i);
          hash |= 0;
      }
      const rand = Math.abs(hash % 1000) / 1000;
      const baseSpeed = 0.02 + (rand * 0.03); 
      
      // Apply Multiplier
      return baseSpeed * (extraVisualProps?.emissionSpeed ?? 1.0);
  }, [extraVisualProps?.emissionSpeed]);

  const linkParticleObjectCb = React.useCallback((link: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
      const l = link as GraphLink;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sourceId = typeof l.source === 'object' ? (l.source as any).id : l.source;
      const sourceNode = nodeMap.get(sourceId);
      
      // Use particle Size
      const sizeMultiplier = extraVisualProps?.particleSize ?? 1.0;
      return createLinkParticle(l, sourceNode, sizeMultiplier);
  }, [nodeMap, extraVisualProps?.particleSize]);

  // Dynamic particle count
  const particleCount = extraVisualProps?.particleCount ?? 1;
  const linkWidth = extraVisualProps?.linkWidth ?? 0.5;

  return (
      <ForceGraph3D
        ref={fgRef}
        width={width}
        height={height}
        graphData={graphData}
        onNodeClick={handleClick}
        
        rendererConfig={{ 
            powerPreference: 'high-performance',
            antialias: true
        }}
        
        nodeLabel="id"
        nodeColor={getNodeColorCb}
        nodeThreeObject={nodeThreeObjectCb}
        nodeResolution={8}
        
        linkLabel="type"
        linkWidth={linkWidth} 
        linkColor={linkColorCb} 
        linkResolution={3}
        
        // --- CUSTOM PARTICLES ---
        linkDirectionalParticles={particleCount} 
        
        // Desynchronized Speed: "Own time clock"
        linkDirectionalParticleSpeed={linkParticleSpeedCb}
        
        linkDirectionalParticleWidth={2 * (extraVisualProps?.particleSize ?? 1.0)}
        linkDirectionalParticleThreeObject={linkParticleObjectCb}
        
        backgroundColor="#050508"
        showNavInfo={false}
        d3VelocityDecay={extraVisualProps?.friction ?? 0.3} 
        warmupTicks={10} 
      />
  );
}));

export default GraphRenderer;
