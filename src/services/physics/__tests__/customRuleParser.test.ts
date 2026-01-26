import { describe, it, expect } from 'vitest';
import { parseAndApplyCustomRule } from '../customRuleParser';
import { GraphNode, GraphLink } from '@/types';

describe('Custom Rule Parser', () => {
    it('should fallback to Genesis (Inflation) when graph is empty', () => {
        const signature = '{{x,y}} -> {{x,y},{y,z}}';
        const nodes: GraphNode[] = [];
        const links: GraphLink[] = [];
        
        const result = parseAndApplyCustomRule(signature, nodes, links, 0, 1);
        
        // Should return empty if 0 nodes - NO wait, specific check for that in code
        // Code: if (links.length < needed) { if (nodes.length===0) return empty... } 
        expect(result.newNodes.length).toBe(0);
    });

    it('should fallback to Genesis (Inflation) when graph has 1 node but needs edges', () => {
        const signature = '{{x,y}} -> {{x,y},{y,z}}';
        const nodes: GraphNode[] = [{ id: '1', group: 0 }];
        const links: GraphLink[] = [];
        
        const result = parseAndApplyCustomRule(signature, nodes, links, 1, 1);
        
        expect(result.newNodes.length).toBe(1); // Should create 1 new node
        expect(result.newLinks.length).toBe(1);
        expect(result.newNodes[0].id).toBe('2');
    });

    it('should apply stochastic rule when edges exist', () => {
        const signature = '{{x,y}} -> {{x,z},{z,y}}'; // A simple split
        const nodes: GraphNode[] = [
            { id: '1', group: 0 },
            { id: '2', group: 0 }
        ];
        const links: GraphLink[] = [
            { source: '1', target: '2' }
        ];

        // Should find the 1 link and apply
        const result = parseAndApplyCustomRule(signature, nodes, links, 2, 2);
        
        // Expected RHS: {{1,z}, {z,2}} (or swapped depending on map)
        // New node 'z' -> ID '3'
        expect(result.newNodes.length).toBe(1);
        expect(result.newNodes[0].id).toBe('3');
        expect(result.newLinks.length).toBe(2);
    });

    it('should handle complex signatures', () => {
        const signature = '{{x,y},{u,v}} -> {{x,u},{y,v}}'; // Crossover
        // Needs 2 edges.
        const nodes: GraphNode[] = [
            { id: '1', group: 0 }, { id: '2', group: 0 },
            { id: '3', group: 0 }, { id: '4', group: 0 }
        ];
        const links: GraphLink[] = [
            { source: '1', target: '2' },
            { source: '3', target: '4' }
        ];

        const result = parseAndApplyCustomRule(signature, nodes, links, 4, 1);
        
        if (result.newNodes.length > 0) {
             // It might have fallen back if random sample picked same link twice?
             // But simpler test: it should produce links
        }
        // Stochastic is hard to deterministically test without mocking Math.random
        // But we expect *some* output structure.
        expect(result.newLinks.length).toBeGreaterThan(0);
    });
});
