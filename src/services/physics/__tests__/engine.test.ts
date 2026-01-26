import { describe, it, expect } from 'vitest';
import { createInitialState, evolveUniverse } from '../engine';
import { RULE_REGISTRY } from '../registry';

describe('Physics Engine', () => {
    it('creates valid initial state', () => {
        const state = createInitialState();
        expect(state.nodes.length).toBe(1);
        expect(state.links.length).toBe(0);
        expect(state.step).toBe(0);
        expect(state.maxNodeId).toBe(1);
    });

    it('evolves state using a preset rule', () => {
        const initialState = createInitialState();
        // Use first rule (Inflation)
        const ruleId = RULE_REGISTRY[0].id; // Big Bang / Inflation
        
        // Step 1
        const nextState = evolveUniverse(initialState, ruleId, 100);
        
        // Inflation usually adds nodes
        expect(nextState.nodes.length).toBeGreaterThan(initialState.nodes.length);
        expect(nextState.step).toBe(1);
        expect(nextState.maxNodeId).toBeGreaterThan(initialState.maxNodeId);
    });

    it('respects max nodes limit', () => {
        const state = createInitialState();
        state.nodes = Array(10).fill(null).map((_, i) => ({ id: i.toString(), group: 0 }));
        
        const maxNodes = 5;
        // Should not evolve if we are already over limit? 
        // Logic: if (currentState.nodes.length >= maxNodesLimit) return currentState;
        
        const nextState = evolveUniverse(state, RULE_REGISTRY[0].id, maxNodes);
        
        expect(nextState.nodes.length).toBe(10); // Unchanged
        expect(nextState).toEqual(state);
    });
    
    it('evolves with wormhole rule (checking genesis)', () => {
        const state = createInitialState();
        // Wormhole rule id
        const rule = RULE_REGISTRY.find(r => r.name.includes('Einstein'));
        if (!rule) throw new Error('Wormhole rule not found');

        const nextState = evolveUniverse(state, rule.id, 100);
        
        // Should trigger genesis (add nodes) because start is 1 node
        expect(nextState.nodes.length).toBeGreaterThan(1);
    });
});
