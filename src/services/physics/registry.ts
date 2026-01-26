import { PhysicsRule } from './types';
import { cosmicRules } from './rules/cosmic';
import { growthRules } from './rules/growth';
import { latticeRules } from './rules/lattice';
import { cycleRules } from './rules/cycle';
import { chaosRules } from './rules/chaos';
import { GraphNode, GraphLink } from '@/types';

const allRules: PhysicsRule[] = [
    ...cosmicRules,
    ...growthRules,
    ...latticeRules,
    ...cycleRules,
    ...chaosRules
];

const CATEGORIES = ['GROWTH', 'LATTICE', 'CYCLE', 'CHAOS', 'FRACTAL'] as const;
for(let i=allRules.length; i<64; i++) {
    const cat = CATEGORIES[i % 5];
    allRules.push({
        id: `gen_rule_${i}`,
        name: `Variant ${cat} #${i}`,
        category: cat,
        description: `Procedurally generated rule variant ${i}.`,
        signature: `{{x,y}} -> {{x,z},${Array((i%2)+1).fill('{z,y}').join(',')}}`, // Synthesized signature
        apply: (nodes: GraphNode[], _links: GraphLink[], maxId: number, step: number) => {
             const count = (i % 2) + 1;
             const newNodes: GraphNode[] = [];
             const newLinks: GraphLink[] = [];
             let localMaxId = maxId;
             const parent = nodes[Math.floor(Math.random() * nodes.length)];
             
             for(let k=0; k<count; k++){
                 localMaxId++;
                 const id = localMaxId.toString();
                 newNodes.push({id, group: step});
                 newLinks.push({source: parent.id, target: id});
             }
             return {newNodes, newLinks};
        }
    });
}

export const RULE_REGISTRY = allRules;

export const getRuleById = (id: string): PhysicsRule => {
    return RULE_REGISTRY.find(r => r.id === id) || RULE_REGISTRY[0];
};
