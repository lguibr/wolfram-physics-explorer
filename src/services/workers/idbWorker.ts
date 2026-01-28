import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface GraphFrame {
    step: number;
    nodes: any;
    links: any;
    timestamp: number;
}

interface PhysicsDB extends DBSchema {
    frames: {
        key: number;
        value: GraphFrame;
        indexes: { 'by-step': number };
    };
}

let dbPromise: Promise<IDBPDatabase<PhysicsDB>> | null = null;

const initDB = () => {
    if (dbPromise) return dbPromise;

    dbPromise = openDB<PhysicsDB>('wolfram-physics-db', 1, {
        upgrade(db) {
            const store = db.createObjectStore('frames', { keyPath: 'id', autoIncrement: true });
            store.createIndex('by-step', 'step');
        },
    });
    return dbPromise;
};

const batchInsert = async (frames: GraphFrame[]) => {
    const db = await initDB();
    const txt = db.transaction('frames', 'readwrite');
    const store = txt.objectStore('frames');
    
    // Promise.all is faster for parallel requests in one tx
    await Promise.all([
        ...frames.map(frame => store.add(frame)),
        txt.done
    ]);
};

const clearDB = async () => {
    const db = await initDB();
    await db.clear('frames');
};

const exportDB = async () => {
    const db = await initDB();
    const allFrames = await db.getAll('frames');
    const blob = new Blob([JSON.stringify(allFrames)], { type: 'application/json' });
    self.postMessage({ type: 'EXPORT_READY', blob });
};

self.onmessage = async (e) => {
    const { type, payload } = e.data;

    try {
        switch (type) {
            case 'INIT':
                await initDB();
                self.postMessage({ type: 'INIT_COMPLETE' });
                break;
            case 'BATCH_INSERT': // Payload is { frames: [...] }
                await batchInsert(payload.frames);
                break;
            case 'RESET_DB':
                await clearDB();
                break;
            case 'EXPORT_DB':
                await exportDB();
                break;
        }
    } catch (err) {
        console.error("IDB Worker Error:", err);
    }
};
