import { PhysicsRule } from '../types';
import { GraphNode, GraphLink } from '@/types';

export const chaosRules: PhysicsRule[] = [
    {
        id: 'chaos_preferential',
        name: 'Gravity Well',
        category: 'CHAOS',
        description: 'Nodes connect to highly connected hubs.',
        apply: (nodes, links, maxId, step) => {
            const newNodes: GraphNode[] = [];
            const newLinks: GraphLink[] = [];
            let localMaxId = maxId;

            for(let k=0; k<3; k++) {
                localMaxId++;
                const id = localMaxId.toString();
                newNodes.push({ id, group: step });
                
                if (links.length > 0) {
                    const randomLink = links[Math.floor(Math.random() * links.length)];
                    const target = Math.random() > 0.5 ? randomLink.source : randomLink.target;
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const targetId = typeof target === 'object' ? (target as any).id : target;
                    newLinks.push({ source: id, target: targetId });
                } else if (nodes.length > 0) {
                     newLinks.push({ source: id, target: nodes[0].id });
                }
            }
            return { newNodes, newLinks };
        }
    }
];
