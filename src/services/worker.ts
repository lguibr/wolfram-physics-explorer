import { evolveUniverse } from './physics/engine';
import { SHARED_CONFIG } from '@/types';

// Shared State Container
let sharedBuffer: SharedArrayBuffer | null = null;
let sharedHeader: Int32Array | null = null;

// Listen for messages from the main thread
self.onmessage = (e: MessageEvent) => {
    // 1. Initialization Mode (Zero-Copy)
    if (e.data.type === 'INIT_SHARED') {
        const { buffer } = e.data;
        sharedBuffer = buffer;
        sharedHeader = new Int32Array(sharedBuffer!, 0, SHARED_CONFIG.HEADER_SIZE);
        console.log("Worker: Shared Buffer Initialized", sharedBuffer!.byteLength);
        return;
    }

    // 2. Shared Execution Mode
    if (e.data.type === 'STEP_SHARED' && sharedBuffer) {
        // TODO: Implement direct-buffer physics evolution here
        // For now, signal completion or fallback
        self.postMessage({ type: 'STEP_COMPLETE', step: sharedHeader![3] });
        return;
    }

    // 3. Legacy Mode (Object Copy)
    try {
        const { currentState, ruleId, maxNodes } = e.data;
        if (!currentState) return; // filtering INIT messages that might leak here
        
        const newState = evolveUniverse(currentState, ruleId, maxNodes);
        self.postMessage(newState);
    } catch (err) {
        console.error("Worker Error:", err);
        // Send back same state to unblock
        if (e.data.currentState) self.postMessage(e.data.currentState); 
    }
};