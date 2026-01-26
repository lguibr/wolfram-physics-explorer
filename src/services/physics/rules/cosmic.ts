import { PhysicsRule } from '../types';
import { GraphNode, GraphLink } from '@/types';

export const cosmicRules: PhysicsRule[] = [
    {
        id: 'cosmic_black_hole',
        name: 'Singularity (Black Hole)',
        category: 'COSMIC',
        description: 'Matter collapses into a central point. New nodes spiral inward.',
        signature: '{{x,y}} -> {{center,x},{center,y}}',
        apply: (nodes: GraphNode[], _links: GraphLink[], maxId: number, step: number) => {
            const newNodes: GraphNode[] = [];
            const newLinks: GraphLink[] = [];
            let localMaxId = maxId;

            const count = 3;
            // Guard against empty nodes
            if (nodes.length === 0) return { newNodes, newLinks };

            const singularityId = nodes[0].id;
            
            // Ensure Singularity is Massive
            if (nodes[0].val !== 5) {
                nodes[0].val = 5; // Massive center
            }

            for (let i = 0; i < count; i++) {
                localMaxId++;
                const id = localMaxId.toString();
                
                // Propagated Shadow Logic
                // Nodes keep size (val=1) but we track step for visual effects
                newNodes.push({ id, group: step, val: 1 });
                newLinks.push({ source: id, target: singularityId });
                
                const randomTarget = nodes[Math.floor(Math.random() * nodes.length)];
                if (randomTarget.id !== singularityId) {
                    newLinks.push({ source: id, target: randomTarget.id });
                }
            }
            return { newNodes, newLinks };
        }
    },
    {
        id: 'cosmic_inflation',
        name: 'Cosmic Inflation',
        category: 'COSMIC',
        description: 'Rapid exponential expansion of space-time fabric.',
        signature: '{{x}} -> {{x,y},{y,z},{z,x}}',
        apply: (nodes, _links, maxId, step) => {
            const activeNodes = nodes.filter(n => (n.group || 0) >= step - 2);
            const targets = activeNodes.length > 0 ? activeNodes : nodes.slice(-10);
            
            const newNodes: GraphNode[] = [];
            const newLinks: GraphLink[] = [];
            let localMaxId = maxId;

            const limit = Math.min(targets.length, 20);
            for(let i=0; i<limit; i++) {
                const parent = targets[Math.floor(Math.random()*targets.length)];
                for(let k=0; k<2; k++){
                    localMaxId++;
                    const id = localMaxId.toString();
                    newNodes.push({ id, group: step });
                    newLinks.push({ source: parent.id, target: id });
                }
            }
            return { newNodes, newLinks };
        }
    },
    {
        id: 'cosmic_wormhole',
        name: 'Einstein-Rosen Bridge',
        category: 'COSMIC',
        description: 'Connects distant regions of the graph instantly.',
        signature: '{{x,y},{u,v}} -> {{x,y},{u,v},{x,v}}',
        apply: (nodes, _links, maxId, step) => {
            const newLinks: GraphLink[] = [];
            // If universe is too small for wormholes, inflate it first (Genesis)
            if (nodes.length <= 10) {
                 const parent = nodes[Math.floor(Math.random() * nodes.length)];
                 const id = (maxId + 1).toString();
                 return {
                     newNodes: [{ id, group: step, val: 1 }],
                     newLinks: [{ source: parent.id, target: id }]
                 };
            }

            if (nodes.length > 10) {
                const oldNode = nodes[Math.floor(Math.random() * (nodes.length / 4))];
                const newNode = nodes[nodes.length - 1 - Math.floor(Math.random() * 10)];
                newLinks.push({ source: oldNode.id, target: newNode.id, type: 'wormhole' });
            }
            return { newNodes: [], newLinks };
        }
    }
];
