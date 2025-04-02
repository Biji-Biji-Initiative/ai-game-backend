'use strict';

import fs from 'fs/promises';
import path from 'path';
import os from 'os';

export default class LogService {
    constructor({ logger }) {
        this.logger = logger || console;
        this.logDir = path.join(process.cwd(), 'logs');
        this.outLogFile = path.join(this.logDir, 'pm2_out.log');
        this.errorLogFile = path.join(this.logDir, 'pm2_error.log');
    }

    async getLogs(options = {}) {
        const { limit = 500, level, search } = options;
        try {
            const [outLogs, errorLogs] = await Promise.all([
                this._readLogFile(this.outLogFile, 'INFO'),
                this._readLogFile(this.errorLogFile, 'ERROR')
            ]);
            
            let allLogs = [...outLogs, ...errorLogs].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            
            if (level) {
                allLogs = allLogs.filter(log => log.level === level.toUpperCase());
            }
            
            if (search) {
                const searchTerm = search.toLowerCase();
                allLogs = allLogs.filter(log => log.message.toLowerCase().includes(searchTerm));
            }
            
            return allLogs.slice(0, limit);
        } catch (error) {
            this.logger.error('Error getting logs', { error });
            throw error;
        }
    }

    async _readLogFile(filePath, defaultLevel) {
        try {
            const content = await fs.readFile(filePath, 'utf8');
            return content.split(os.EOL)
                .filter(Boolean)
                .map(line => this._parseLogLine(line, defaultLevel, path.basename(filePath)));
        } catch (err) {
            if (err.code === 'ENOENT') {
                return [];
            }
            throw err;
        }
    }

    _parseLogLine(line, defaultLevel, source) {
        const timestampMatch = line.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
        const timestamp = timestampMatch ? timestampMatch[0] : new Date().toISOString();
        
        let level = defaultLevel;
        if (line.includes('ERROR') || line.includes('error')) level = 'ERROR';
        else if (line.includes('WARN') || line.includes('warn')) level = 'WARN';
        else if (line.includes('INFO') || line.includes('info')) level = 'INFO';
        else if (line.includes('DEBUG') || line.includes('debug')) level = 'DEBUG';
        
        return {
            timestamp,
            level,
            message: line,
            source
        };
    }
}
