import sqlite3InitModule from '@sqlite.org/sqlite-wasm';

let db: any = null;
let sqlite3: any = null;

const initDB = async () => {
    try {
        if (db) return;
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sqlite3 = await (sqlite3InitModule as any)({
            print: console.log,
            printErr: console.error,
        });

        if ('opfs' in sqlite3) {
            db = new sqlite3.oo1.OpfsDb('/graph_recording.sqlite3');
            console.log('OPFS is available, created persistent database at /graph_recording.sqlite3');
        } else {
             db = new sqlite3.oo1.DB('/graph_recording.sqlite3', 'ct');
             console.log('OPFS not available, created memory-backed database');
        }

        db.exec(`
            CREATE TABLE IF NOT EXISTS frames (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                step INTEGER,
                nodes TEXT,
                links TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("Recorder DB initialized");

    } catch (err) {
        console.error("Failed to initialize SQLite:", err);
    }
};

const recordFrame = (step: number, nodes: any[], links: any[]) => {
    if (!db) {
         console.warn("DB not initialized, skipping frame");
         return;
    }
    try {
        // Optimize: Prepared statement is better but this is fine for now
        db.exec({
            sql: 'INSERT INTO frames (step, nodes, links) VALUES (?, ?, ?)',
            bind: [step, JSON.stringify(nodes), JSON.stringify(links)]
        });
    } catch (e) {
        console.error("Error recording frame:", e);
    }
};

const exportDatabase = () => {
    if (!db || !sqlite3) return;
    try {
        const byteArray = sqlite3.capi.sqlite3_js_db_export(db);
        const blob = new Blob([byteArray.buffer], { type: 'application/x-sqlite3' });
        self.postMessage({ type: 'EXPORT_READY', blob });
    } catch (e) {
        console.error("Export failed:", e);
    }
};

const resetDatabase = async () => {
     if(db) {
         try {
             db.close();
         } catch(e) { /* ignore */ }
         db = null;
     }

      // Re-init (clears data if not persistent, but for OPFS we might need to delete)
      // For now, simpler to just re-create the table or delete rows
     await initDB(); 
     db.exec('DELETE FROM frames'); // Clear table for new recording
};

self.onmessage = async (e) => {
    const { type, payload } = e.data;

    switch (type) {
        case 'INIT':
            await initDB();
            break;
        case 'RECORD_FRAME':
            await recordFrame(payload.step, payload.nodes, payload.links);
            break;
        case 'EXPORT_DB':
            exportDatabase();
            break;
        case 'RESET_DB':
            await resetDatabase();
            break;
        default:
            break;
    }
};
