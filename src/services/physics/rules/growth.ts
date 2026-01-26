import { PhysicsRule } from '../types';
import { GraphNode, GraphLink } from '@/types';

export const growthRules: PhysicsRule[] = [];

// Binary to Hexary Trees
for (let i = 2; i <= 4; i++) {
  growthRules.push({
    id: `growth_tree_${i}`,
    name: `${i}-way Expansion`,
    category: 'GROWTH',
    description: `Each active node splits into ${i} new branches.`,
    signature: `{{x}} -> {{x,y1}...${i > 2 ? ',{x,y'+i+'}' : ''}}`,
    apply: (nodes, _links, maxId, step) => {
      const activeNodes = nodes.filter(n => (n.group || 0) === step - 1);
      const targets = activeNodes.length > 0 ? activeNodes : [nodes[nodes.length - 1]];
      const newNodes: GraphNode[] = [];
      const newLinks: GraphLink[] = [];
      let localMaxId = maxId;

      const processList = targets.length > 50 ? targets.slice(0, 50) : targets;

      processList.forEach(node => {
        for (let b = 0; b < i; b++) {
          localMaxId++;
          const id = localMaxId.toString();
          newNodes.push({ id, group: step, val: 1 });
          newLinks.push({ source: node.id, target: id });
        }
      });
      return { newNodes, newLinks };
    }
  });
}
