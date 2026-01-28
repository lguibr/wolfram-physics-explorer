import init, { Universe } from '../rust/wolfram-physics-wasm/pkg/wolfram_physics_wasm.js';

let isWasmInitialized = false;
let universe: Universe | null = null;

/**
 * Initializes the WASM module if it hasn't been loaded yet.
 * Ensures single initialization to prevent race conditions or reloading errors.
 */
async function bootstrap() {
    if (!isWasmInitialized) {
        await init();
        isWasmInitialized = true;
        universe = Universe.new();
        console.log("Creating Rust WASM Physics Engine... [OK]");
    }
}

// Listen for messages from the main thread
self.onmessage = async (e: MessageEvent) => {
    try {
        await bootstrap();
        
        if (!universe) throw new Error("Universe not initialized");

        const { currentState, ruleId } = e.data;
        
        // Update Universe configuration if needed
        universe.set_rule(ruleId);
        
        // Tick the universe
        universe.tick();
        
        // Retrieve state
        const nodes = universe.get_nodes();
        const links = universe.get_links();
        
        // We need step and maxNodeId. 
        // For now, assume step increases by 1 each tick.
        // TODO: Expose getters from Rust for these.
        const nextStep = currentState.step + 1;
        const nextMaxNodeId = (universe as any).max_node_id || 0; 

        const newState = {
            nodes: nodes,
            links: links,
            step: nextStep,
            maxNodeId: nextMaxNodeId
        };
        
        self.postMessage(newState);
    } catch (err) {
        console.error("Worker Error (WASM):", err);
        // Send back same state to unblock
        self.postMessage(e.data?.currentState); 
    }
};