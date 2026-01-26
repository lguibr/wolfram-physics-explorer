import { evolveUniverse } from './physics/engine';

// Listen for messages from the main thread
self.onmessage = (e: MessageEvent) => {
    try {
        const { currentState, ruleId, maxNodes } = e.data;
        const newState = evolveUniverse(currentState, ruleId, maxNodes);
        self.postMessage(newState);
    } catch (err) {
        console.error("Worker Error:", err);
        // Send back same state to unblock
        self.postMessage(e.data.currentState); 
    }
};