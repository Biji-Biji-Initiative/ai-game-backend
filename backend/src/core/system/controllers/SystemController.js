import fs from 'fs/promises';
import path from 'path';
import os from 'os';

// Define log file paths
const LOG_DIR = path.join(process.cwd(), 'logs'); 
const OUT_LOG_FILE = path.join(LOG_DIR, 'pm2_out.log');
const ERROR_LOG_FILE = path.join(LOG_DIR, 'pm2_error.log');

class SystemController {
    constructor() {
        console.log('[SystemController] Initialized');
    }

    /**
     * Handles GET /api/v1/system/logs
     */
    async getLogs(req, res, next) {
        console.log('[SystemController] getLogs called');
        try {
            const limit = parseInt(req.query.limit, 10) || 500;
            
            // Read both log files
            let outLines = [];
            let errorLines = [];

            try {
                const outLogContent = await fs.readFile(OUT_LOG_FILE, 'utf8');
                outLines = outLogContent.split(os.EOL).filter(line => line);
            } catch (err) {
                if (err.code !== 'ENOENT') {
                    console.error();
                }
            }

            try {
                const errorLogContent = await fs.readFile(ERROR_LOG_FILE, 'utf8');
                errorLines = errorLogContent.split(os.EOL).filter(line => line);
            } catch (err) {
                if (err.code !== 'ENOENT') {
                    console.error();
                }
            }

            // Combine logs
            const allLogEntries = [
                ...errorLines.map(line => ({ timestamp: new Date().toISOString(), level: 'ERROR', message: line, source: 'error' })),
                ...outLines.map(line => ({ timestamp: new Date().toISOString(), level: 'INFO', message: line, source: 'out' }))
            ]
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

            // Apply Limit
            const limitedLogs = allLogEntries.slice(0, limit);

            console.log();

            res.json({
                status: 'success',
                data: {
                    logs: limitedLogs,
                    count: limitedLogs.length,
                    logFile: 
                }
            });

        } catch (error) {
            console.error(, error.stack);
            next(error);
        }
    }
}

export default SystemController;