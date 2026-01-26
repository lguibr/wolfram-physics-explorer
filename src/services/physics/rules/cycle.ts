import { PhysicsRule } from '../types';
import { GraphNode, GraphLink } from '@/types';

export const cycleRules: PhysicsRule[] = [];

for(let size=3; size<=8; size++) {
    cycleRules.push({
        id: `cycle_ring_${size}`,
        name: `Ring Weaver (${size})`,
        category: 'CYCLE',
        description: `Generates independent rings of ${size} nodes.`,
        apply: (nodes, _links, maxId, step) => {
            const newNodes: GraphNode[] = [];
            const newLinks: GraphLink[] = [];
            let localMaxId = maxId;
            const startId = (localMaxId + 1).toString();
            
            const anchor = nodes[Math.floor(Math.random() * nodes.length)];
            let prevId = anchor.id;
            for(let i=0; i<size; i++) {
                localMaxId++;
                const id = localMaxId.toString();
                newNodes.push({ id, group: step });
                newLinks.push({ source: prevId, target: id });
                prevId = id;
            }
            newLinks.push({ source: prevId, target: startId });
            return { newNodes, newLinks };
        }
    });
}
