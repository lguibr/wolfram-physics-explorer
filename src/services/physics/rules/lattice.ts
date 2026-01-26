import { PhysicsRule } from '../types';
import { GraphNode, GraphLink } from '@/types';

export const latticeRules: PhysicsRule[] = [
    {
        id: 'lattice_mesh_2d',
        name: 'Triangular Mesh',
        category: 'LATTICE',
        description: 'Attempts to close triangles to form a surface.',
        apply: (nodes, _links, maxId, step) => {
            const targets = nodes.slice(-Math.min(nodes.length, 10)); // Look at recent nodes
            const newNodes: GraphNode[] = [];
            const newLinks: GraphLink[] = [];
            let localMaxId = maxId;

            targets.forEach((t, idx) => {
                if (idx % 2 === 0) {
                    localMaxId++;
                    const id = localMaxId.toString();
                    newNodes.push({ id, group: step });
                    newLinks.push({ source: t.id, target: id });
                    if (idx > 0) {
                        newLinks.push({ source: id, target: targets[idx-1].id });
                    }
                }
            });
            return { newNodes, newLinks };
        }
    }
];
