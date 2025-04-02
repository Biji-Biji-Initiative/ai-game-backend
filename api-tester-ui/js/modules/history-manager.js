/**
 * History Manager Module
 * Manages request history and replay functionality
 */

// Import LZ-String for compression if needed
import { compressToUTF16, decompressFromUTF16 } from "../vendor/lz-string.min.js";

/**
 *
 */
export class HistoryManager {
    /**
     * Creates a new HistoryManager instance
     * @param {Object} options - Configuration options
     */
    constructor(options = {}) {
        this.options = {
            maxEntries: 50,
            storageType: "localStorage", // 'localStorage', 'sessionStorage', 'memory'
            storageKey: "apiTester.history",
            compressionEnabled: true,
            compressionThreshold: 10000, // Compress entries larger than this size (in chars)
            storageQuotaWarningThreshold: 0.8, // 80% of storage quota
            ...options
        };
        
        this.listeners = new Map();
        this.history = [];
        this.storageAvailable = this.checkStorageAvailability();
        
        // If storage is not available, fallback to memory
        if (!this.storageAvailable && this.options.storageType !== "memory") {
            console.warn(`Storage type ${this.options.storageType} not available, falling back to memory storage`);
            this.options.storageType = "memory";
        }
        
        // Load history from storage
        this.loadHistory();
    }
    
    /**
     * Adds an event listener
     * @param {string} event - The event name
     * @param {Function} callback - The callback function
     */
    addEventListener(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }
    
    /**
     * Removes an event listener
     * @param {string} event - The event name
     * @param {Function} callback - The callback function to remove
     */
    removeEventListener(event, callback) {
        if (this.listeners.has(event)) {
            const listeners = this.listeners.get(event);
            const index = listeners.indexOf(callback);
            if (index !== -1) {
                listeners.splice(index, 1);
            }
        }
    }
    
    /**
     * Emits an event to all registered listeners
     * @param {string} event - The event name
     * @param {Object} data - The event data
     */
    emit(event, data) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(callback => callback(data));
        }
    }
    
    /**
     * Checks if the storage type is available
     * @returns {boolean} Whether storage is available
     */
    checkStorageAvailability() {
        if (this.options.storageType === "memory") {
            return true;
        }
        
        try {
            const storage = this.options.storageType === "localStorage" ? localStorage : sessionStorage;
            const testKey = "__storage_test__";
            storage.setItem(testKey, testKey);
            storage.removeItem(testKey);
            return true;
        } catch (e) {
            return false;
        }
    }
    
    /**
     * Gets the current storage usage percentage
     * @returns {number} The storage usage percentage (0-1)
     */
    getStorageUsage() {
        if (this.options.storageType === "memory") {
            return 0;
        }
        
        try {
            // Most browsers have a limit of 5MB per domain
            const maxStorage = 5 * 1024 * 1024; // 5MB in bytes
            const storage = this.options.storageType === "localStorage" ? localStorage : sessionStorage;
            let totalSize = 0;
            
            for (let i = 0; i < storage.length; i++) {
                const key = storage.key(i);
                const value = storage.getItem(key);
                totalSize += (key.length + value.length) * 2; // Approximation, UTF-16 uses 2 bytes per char
            }
            
            return totalSize / maxStorage;
        } catch (e) {
            return 0;
        }
    }
    
    /**
     * Loads history from storage
     */
    loadHistory() {
        if (this.options.storageType === "memory") {
            return;
        }
        
        try {
            let storedHistory = null;
            
            // Load from appropriate storage
            if (this.options.storageType === "localStorage") {
                storedHistory = localStorage.getItem(this.options.storageKey);
            } else if (this.options.storageType === "sessionStorage") {
                storedHistory = sessionStorage.getItem(this.options.storageKey);
            }
            
            // Parse history if it exists
            if (storedHistory) {
                // Check if it's compressed (starts with a specific marker)
                if (storedHistory.startsWith("COMPRESSED:")) {
                    // Remove marker and decompress
                    const compressedData = storedHistory.substring(11);
                    storedHistory = decompressFromUTF16(compressedData);
                }
                
                try {
                    const parsed = JSON.parse(storedHistory);
                    if (Array.isArray(parsed)) {
                        this.history = parsed;
                        
                        // Trim history if it exceeds max entries
                        if (this.history.length > this.options.maxEntries) {
                            this.history = this.history.slice(0, this.options.maxEntries);
                        }
                        
                        // Emit event
                        this.emit("history:loaded", this.history);
                    } else {
                        throw new Error("Stored history is not an array");
                    }
                } catch (parseError) {
                    console.error("Failed to parse history from storage:", parseError);
                    this.history = [];
                }
            }
        } catch (error) {
            console.error("Failed to load history from storage:", error);
            this.history = [];
        }
    }
    
    /**
     * Saves history to storage
     */
    saveHistory() {
        if (this.options.storageType === "memory") {
            return;
        }
        
        try {
            // Check storage usage before saving
            const storageUsage = this.getStorageUsage();
            if (storageUsage > this.options.storageQuotaWarningThreshold) {
                console.warn(`Storage usage is high (${Math.round(storageUsage * 100)}%). Consider clearing some history.`);
                // Remove older entries if storage is running out
                if (this.history.length > 20) {
                    this.history = this.history.slice(0, Math.floor(this.history.length * 0.8));
                    console.info("Trimmed history to save storage space.");
                }
            }
            
            // Convert history to string
            let historyString = JSON.stringify(this.history);
            
            // Compress if enabled and string is larger than threshold
            let useCompression = false;
            if (this.options.compressionEnabled && historyString.length > this.options.compressionThreshold) {
                const compressedString = compressToUTF16(historyString);
                
                // Only use compression if it actually saves space
                if (compressedString.length < historyString.length) {
                    historyString = "COMPRESSED:" + compressedString;
                    useCompression = true;
                }
            }
            
            // Save to appropriate storage
            try {
                if (this.options.storageType === "localStorage") {
                    localStorage.setItem(this.options.storageKey, historyString);
                } else if (this.options.storageType === "sessionStorage") {
                    sessionStorage.setItem(this.options.storageKey, historyString);
                }
            } catch (storageError) {
                // If storage quota is exceeded, try saving with compression
                if (!useCompression && this.options.compressionEnabled) {
                    const compressedString = "COMPRESSED:" + compressToUTF16(JSON.stringify(this.history));
                    
                    if (this.options.storageType === "localStorage") {
                        localStorage.setItem(this.options.storageKey, compressedString);
                    } else if (this.options.storageType === "sessionStorage") {
                        sessionStorage.setItem(this.options.storageKey, compressedString);
                    }
                } else {
                    // If still fails, trim history and try again
                    this.history = this.history.slice(0, Math.floor(this.history.length * 0.5));
                    this.saveHistory();
                }
            }
        } catch (error) {
            console.error("Failed to save history to storage:", error);
            
            // If everything fails, switch to memory storage
            if (this.options.storageType !== "memory") {
                console.warn("Switching to memory storage due to persistent storage errors");
                this.options.storageType = "memory";
                this.emit("history:storage-error", { error, fallbackUsed: true });
            }
        }
    }
    
    /**
     * Adds a request to the history
     * @param {Object} requestInfo - Information about the request
     * @param {Object} responseData - Response data from the request
     * @returns {Object} The history entry
     */
    addEntry(requestInfo, responseData) {
        // Create history entry
        const entry = {
            id: `history-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            timestamp: new Date().toISOString(),
            method: requestInfo.method,
            url: requestInfo.url,
            path: requestInfo.path || this.extractPathFromUrl(requestInfo.url),
            headers: this.sanitizeHeaders(requestInfo.headers),
            requestBody: requestInfo.body,
            status: responseData.status,
            statusText: responseData.statusText,
            responseData: this.sanitizeResponseData(responseData.data),
            duration: responseData.duration,
            success: responseData.success
        };
        
        // Add to history
        this.history.unshift(entry);
        
        // Trim history if it exceeds max entries
        if (this.history.length > this.options.maxEntries) {
            this.history = this.history.slice(0, this.options.maxEntries);
        }
        
        // Save to storage
        this.saveHistory();
        
        // Emit event
        this.emit("history:added", entry);
        this.emit("history:changed", this.history);
        
        return entry;
    }
    
    /**
     * Gets all history entries
     * @returns {Array} The history entries
     */
    getEntries() {
        return [...this.history];
    }
    
    /**
     * Gets a history entry by ID
     * @param {string} id - The entry ID
     * @returns {Object} The history entry or null if not found
     */
    getEntryById(id) {
        return this.history.find(entry => entry.id === id) || null;
    }
    
    /**
     * Deletes a history entry by ID
     * @param {string} id - The entry ID
     * @returns {boolean} Whether the entry was deleted
     */
    deleteEntry(id) {
        const initialLength = this.history.length;
        this.history = this.history.filter(entry => entry.id !== id);
        
        // If history changed, save it
        if (this.history.length !== initialLength) {
            this.saveHistory();
            
            // Emit event
            this.emit("history:deleted", id);
            this.emit("history:changed", this.history);
            
            return true;
        }
        
        return false;
    }
    
    /**
     * Clears all history entries
     */
    clearHistory() {
        this.history = [];
        this.saveHistory();
        
        // Emit event
        this.emit("history:cleared");
        this.emit("history:changed", this.history);
    }
    
    /**
     * Extracts the path from a URL
     * @param {string} url - The URL
     * @returns {string} The path
     */
    extractPathFromUrl(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.pathname;
        } catch (error) {
            return url;
        }
    }
    
    /**
     * Sanitizes headers to remove sensitive information
     * @param {Object} headers - The headers object
     * @returns {Object} The sanitized headers
     */
    sanitizeHeaders(headers) {
        if (!headers) return {};
        
        const sanitized = {...headers};
        
        // Redact authorization headers
        if (sanitized.Authorization) {
            sanitized.Authorization = "Bearer [REDACTED]";
        }
        
        if (sanitized.authorization) {
            sanitized.authorization = "Bearer [REDACTED]";
        }
        
        // Redact other sensitive headers
        const sensitiveHeaders = ["cookie", "set-cookie", "x-auth-token", "api-key"];
        sensitiveHeaders.forEach(header => {
            if (sanitized[header]) {
                sanitized[header] = "[REDACTED]";
            }
        });
        
        return sanitized;
    }
    
    /**
     * Sanitizes response data to reduce storage size
     * @param {Object} data - The response data
     * @returns {Object} The sanitized data
     */
    sanitizeResponseData(data) {
        if (!data) return null;
        
        // Convert to string to check size
        let jsonData;
        try {
            jsonData = JSON.stringify(data);
        } catch (error) {
            // If can't stringify, return a placeholder
            return {
                unsupported: true,
                message: "Response data could not be serialized for history storage",
                type: typeof data
            };
        }
        
        // Large binary responses (like images) should be summarized
        if (data.blobData) {
            return {
                binaryData: true,
                contentType: data.contentType || "application/octet-stream",
                size: data.size || (data.blobData ? data.blobData.size : 0),
                summary: `Binary data: ${data.contentType || "unknown type"}, ${this.formatBytes(data.size || 0)}`
            };
        }
        
        // If response is too large, truncate it
        if (jsonData.length > 100000) {
            // For large JSON, try to keep the structure but truncate nested objects
            if (typeof data === "object" && data !== null) {
                const truncated = this.truncateObject(data);
                return {
                    truncated: true,
                    originalSize: jsonData.length,
                    data: truncated,
                    message: `Response was too large (${this.formatBytes(jsonData.length)}) and was truncated for storage`
                };
            }
            
            // For other types, just truncate the string
            return {
                truncated: true,
                originalSize: jsonData.length,
                preview: jsonData.substring(0, 1000) + "...",
                message: `Response was too large (${this.formatBytes(jsonData.length)}) and was truncated for history storage`
            };
        }
        
        return data;
    }
    
    /**
     * Truncates a large object for storage
     * @param {Object} obj - The object to truncate
     * @param {number} depth - Current recursion depth
     * @param {number} maxDepth - Maximum recursion depth
     * @returns {Object} The truncated object
     */
    truncateObject(obj, depth = 0, maxDepth = 2) {
        if (depth > maxDepth) {
            return "[Nested data truncated]";
        }
        
        if (Array.isArray(obj)) {
            // For arrays, limit to first few items
            const maxItems = 5;
            if (obj.length <= maxItems) {
                return obj.map(item => 
                    typeof item === "object" && item !== null 
                        ? this.truncateObject(item, depth + 1, maxDepth) 
                        : item
                );
            } else {
                const truncated = obj.slice(0, maxItems).map(item => 
                    typeof item === "object" && item !== null 
                        ? this.truncateObject(item, depth + 1, maxDepth) 
                        : item
                );
                truncated.push(`[${obj.length - maxItems} more items...]`);
                return truncated;
            }
        } else if (typeof obj === "object" && obj !== null) {
            const result = {};
            
            // For objects, keep all keys but truncate nested objects
            Object.keys(obj).forEach(key => {
                const value = obj[key];
                if (typeof value === "object" && value !== null) {
                    result[key] = this.truncateObject(value, depth + 1, maxDepth);
                } else {
                    result[key] = value;
                }
            });
            
            return result;
        }
        
        return obj;
    }
    
    /**
     * Formats bytes into a human-readable format
     * @param {number} bytes - The number of bytes
     * @returns {string} The formatted string
     */
    formatBytes(bytes) {
        if (bytes === 0) return "0 Bytes";
        
        const k = 1024;
        const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    }
    
    /**
     * Searches history entries
     * @param {string} query - The search query
     * @returns {Array} The matching history entries
     */
    searchHistory(query) {
        if (!query) {
            return this.getEntries();
        }
        
        const lowerQuery = query.toLowerCase();
        
        return this.history.filter(entry => {
            const method = entry.method.toLowerCase();
            const path = entry.path.toLowerCase();
            const url = entry.url.toLowerCase();
            
            return method.includes(lowerQuery)
                || path.includes(lowerQuery)
                || url.includes(lowerQuery);
        });
    }
    
    /**
     * Filters history entries by method
     * @param {string} method - The HTTP method
     * @returns {Array} The matching history entries
     */
    filterByMethod(method) {
        if (!method) {
            return this.getEntries();
        }
        
        return this.history.filter(entry => entry.method === method);
    }
    
    /**
     * Filters history entries by status code
     * @param {number} statusCode - The HTTP status code
     * @returns {Array} The matching history entries
     */
    filterByStatus(statusCode) {
        if (!statusCode) {
            return this.getEntries();
        }
        
        return this.history.filter(entry => entry.status === statusCode);
    }
    
    /**
     * Filters history entries by success or failure
     * @param {boolean} success - Whether the request was successful
     * @returns {Array} The matching history entries
     */
    filterBySuccess(success) {
        return this.history.filter(entry => entry.success === success);
    }
    
    /**
     * Imports history from JSON
     * @param {string} jsonString - The JSON string to import
     * @returns {Object} Import result
     */
    importHistory(jsonString) {
        try {
            const importedData = JSON.parse(jsonString);
            
            if (!Array.isArray(importedData)) {
                throw new Error("Imported data is not an array");
            }
            
            // Validate each entry has required fields
            const validEntries = importedData.filter(entry => 
                entry && 
                typeof entry === "object" && 
                entry.id && 
                entry.method && 
                entry.url
            );
            
            if (validEntries.length === 0) {
                throw new Error("No valid history entries found in import");
            }
            
            // Add entries to history
            const newEntries = [];
            validEntries.forEach(entry => {
                // Check if entry already exists
                if (!this.history.some(e => e.id === entry.id)) {
                    this.history.unshift(entry);
                    newEntries.push(entry);
                }
            });
            
            // Trim history if it exceeds max entries
            if (this.history.length > this.options.maxEntries) {
                this.history = this.history.slice(0, this.options.maxEntries);
            }
            
            // Save to storage
            this.saveHistory();
            
            // Emit event
            if (newEntries.length > 0) {
                this.emit("history:imported", newEntries);
                this.emit("history:changed", this.history);
            }
            
            return {
                success: true,
                totalImported: validEntries.length,
                newEntries: newEntries.length,
                message: `Imported ${newEntries.length} new entries out of ${validEntries.length} valid entries.`
            };
        } catch (error) {
            console.error("Failed to import history:", error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Exports history to JSON
     * @returns {string} The exported JSON string
     */
    exportHistory() {
        try {
            return JSON.stringify(this.history);
        } catch (error) {
            console.error("Failed to export history:", error);
            return JSON.stringify({
                error: "Failed to export history: " + error.message
            });
        }
    }
} 