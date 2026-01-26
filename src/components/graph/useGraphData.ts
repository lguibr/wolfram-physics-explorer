/* eslint-disable */
import { useMemo, useRef } from 'react';
import { HypergraphState, GraphNode, GraphLink } from '@/types';

export const useGraphData = (data: HypergraphState) => {
    // Persistent visual state references to maintain object identity across renders
    // where possible, preventing ForceGraph3D from resetting physics/positions.
    const visualNodesMap = useRef<Map<string, GraphNode>>(new Map());
    const visualLinksMap = useRef<Map<string, GraphLink>>(new Map());

    return useMemo(() => {
        // 0. Calculate Degrees (Pure calculation)
        const degreeMap = new Map<string, number>();
        data.links.forEach((l) => {
            
           const s = typeof l.source === 'object' ? (l.source as any).id : l.source;
            
           const t = typeof l.target === 'object' ? (l.target as any).id : l.target;
           degreeMap.set(s, (degreeMap.get(s) || 0) + 1);
           degreeMap.set(t, (degreeMap.get(t) || 0) + 1);
        });
  
        // 1. Sync Nodes (Recycle Objects)
        const currentNodes = data.nodes.map((n) => {
            if (!visualNodesMap.current.has(n.id)) {
                visualNodesMap.current.set(n.id, { ...n });
            }
            const visualNode = visualNodesMap.current.get(n.id)!;
            
            // Update properties
            visualNode.group = n.group;
            visualNode.val = n.val;
             
            (visualNode as any).degree = degreeMap.get(n.id) || 0;
            
            // REMOVED: Direct visual mutation (updateNodeVisuals).
            // This hook is now PURE data. Visual updates happen in the Renderer component.
            
            return visualNode;
        });
  
        // 2. Sync Links (Recycle Objects)
        const currentLinks = data.links.map((l) => {
            // Generate a unique ID for the link to track it
             
            const s = typeof l.source === 'object' ? (l.source as any).id : l.source;
             
            const t = typeof l.target === 'object' ? (l.target as any).id : l.target;
            const linkId = `${s}-${t}-${l.type}`;

            if (!visualLinksMap.current.has(linkId)) {
                // Create new visual link object
                visualLinksMap.current.set(linkId, {
                    source: s,
                    target: t,
                    type: l.type
                });
            }
            
            // Return the STABLE object reference
            return visualLinksMap.current.get(linkId)!;
        });
  
        // 3. Cleanup: Remove old nodes/links from maps if they are no longer in data
        // We do a simple pass to keep memory clean
        const activeNodeIds = new Set(data.nodes.map(n => n.id));
        for (const id of visualNodesMap.current.keys()) {
            if (!activeNodeIds.has(id)) {
                visualNodesMap.current.delete(id);
            }
        }
        
        // Link cleanup is trickier with compound IDs, skipping for now as per original logic 
        // to avoid performance hit on large graphs, but could be added if needed.

        return { 
            nodes: currentNodes, 
            links: currentLinks,
            nodeMap: visualNodesMap.current 
        };
    }, [data]);
};
