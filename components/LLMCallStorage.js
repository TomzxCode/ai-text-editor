class LLMCallStorage {
    constructor() {
        this.dbName = 'ai_text_editor_history';
        this.dbVersion = 1;
        this.storeName = 'llm_calls';
        this.db = null;
        this.storageKey = 'llm_call_history'; // For migration
        this.isInitialized = false;
        this.initPromise = null;
        
        this.initPromise = this.initDB();
    }

    async initDB() {
        try {
            this.db = await this.openDB();
            await this.migrateFromLocalStorage();
            this.isInitialized = true;
        } catch (error) {
            console.error('Failed to initialize IndexedDB:', error);
            console.log('Falling back to localStorage mode');
            this.isInitialized = true; // Mark as initialized even in fallback mode
        }
    }

    async waitForInitialization() {
        if (this.initPromise) {
            await this.initPromise;
        }
        return this.isInitialized;
    }

    openDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                if (!db.objectStoreNames.contains(this.storeName)) {
                    const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
                    
                    // Create indexes for efficient querying
                    store.createIndex('timestamp', 'timestamp', { unique: false });
                    store.createIndex('promptIdentifier', 'promptIdentifier', { unique: false });
                    store.createIndex('sessionId', 'sessionId', { unique: false });
                    store.createIndex('filePath', 'filePath', { unique: false });
                    store.createIndex('provider', 'provider', { unique: false });
                }
            };
        });
    }

    async migrateFromLocalStorage() {
        if (!this.db) return;
        
        try {
            const localData = localStorage.getItem(this.storageKey);
            if (!localData) return;
            
            const calls = JSON.parse(localData);
            if (calls.length === 0) return;
            
            console.log(`Migrating ${calls.length} calls from localStorage to IndexedDB`);
            
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            
            for (const call of calls) {
                // Add missing fields for migrated data
                const enhancedCall = {
                    ...call,
                    filePath: call.filePath || null,
                    feedbackContent: call.feedbackContent || '',
                    responseType: call.responseType || 'unknown'
                };
                await store.add(enhancedCall);
            }
            
            await transaction.complete;
            
            // Clear localStorage after successful migration
            localStorage.removeItem(this.storageKey);
            console.log('Migration completed successfully');
            
        } catch (error) {
            console.error('Migration failed:', error);
        }
    }

    async storeLLMCall(promptIdentifier, usage = null, sessionId = null, provider = null, model = null, duration = null, filePath = null, feedbackContent = '', responseType = 'html') {
        const callData = {
            id: this.generateId(),
            promptIdentifier: promptIdentifier,
            usage: usage,
            sessionId: sessionId,
            provider: provider,
            model: model,
            duration: duration,
            filePath: filePath,
            feedbackContent: feedbackContent,
            responseType: responseType,
            timestamp: new Date().toISOString()
        };

        try {
            if (this.db) {
                // Use IndexedDB
                const transaction = this.db.transaction([this.storeName], 'readwrite');
                const store = transaction.objectStore(this.storeName);
                await store.add(callData);
                await transaction.complete;
            } else {
                // Fallback to localStorage
                const existingData = await this.getAllCalls();
                existingData.push(callData);
                localStorage.setItem(this.storageKey, JSON.stringify(existingData));
            }
            
            console.log(`Stored LLM call for prompt: ${promptIdentifier}`);
            return callData.id;
        } catch (error) {
            console.error('Error storing LLM call:', error);
            return null;
        }
    }

    async getAllCalls() {
        try {
            // Wait for initialization to complete
            await this.waitForInitialization();
            
            if (this.db) {
                // Use IndexedDB
                const transaction = this.db.transaction([this.storeName], 'readonly');
                const store = transaction.objectStore(this.storeName);
                const request = store.getAll();
                return new Promise((resolve, reject) => {
                    request.onsuccess = () => resolve(request.result);
                    request.onerror = () => reject(request.error);
                });
            } else {
                // Fallback to localStorage
                const data = localStorage.getItem(this.storageKey);
                return data ? JSON.parse(data) : [];
            }
        } catch (error) {
            console.error('Error retrieving LLM calls:', error);
            return [];
        }
    }

    async getCallsByPrompt(promptIdentifier) {
        try {
            if (this.db) {
                const transaction = this.db.transaction([this.storeName], 'readonly');
                const store = transaction.objectStore(this.storeName);
                const index = store.index('promptIdentifier');
                const request = index.getAll(promptIdentifier);
                return new Promise((resolve, reject) => {
                    request.onsuccess = () => resolve(request.result);
                    request.onerror = () => reject(request.error);
                });
            } else {
                const allCalls = await this.getAllCalls();
                return allCalls.filter(call => call.promptIdentifier === promptIdentifier);
            }
        } catch (error) {
            console.error('Error retrieving calls by prompt:', error);
            return [];
        }
    }

    async getCallsBySession(sessionId) {
        try {
            if (this.db) {
                const transaction = this.db.transaction([this.storeName], 'readonly');
                const store = transaction.objectStore(this.storeName);
                const index = store.index('sessionId');
                const request = index.getAll(sessionId);
                return new Promise((resolve, reject) => {
                    request.onsuccess = () => resolve(request.result);
                    request.onerror = () => reject(request.error);
                });
            } else {
                const allCalls = await this.getAllCalls();
                return allCalls.filter(call => call.sessionId === sessionId);
            }
        } catch (error) {
            console.error('Error retrieving calls by session:', error);
            return [];
        }
    }

    async getCallsByDate(dateString) {
        const allCalls = await this.getAllCalls();
        const targetDate = new Date(dateString).toDateString();
        return allCalls.filter(call => {
            const callDate = new Date(call.timestamp).toDateString();
            return callDate === targetDate;
        });
    }

    async getCallsInDateRange(startDate, endDate) {
        const allCalls = await this.getAllCalls();
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        return allCalls.filter(call => {
            const callDate = new Date(call.timestamp);
            return callDate >= start && callDate <= end;
        });
    }

    async getUsageStatistics() {
        const allCalls = await this.getAllCalls();
        const stats = {
            totalCalls: allCalls.length,
            totalTokensUsed: 0,
            totalPromptTokens: 0,
            totalCompletionTokens: 0,
            totalDuration: 0,
            avgDuration: 0,
            callsByPrompt: {},
            callsByDate: {},
            callsByProvider: {},
            callsByModel: {}
        };

        allCalls.forEach(call => {
            if (call.usage) {
                stats.totalTokensUsed += call.usage.total_tokens || 0;
                stats.totalPromptTokens += call.usage.input_tokens || 0;
                stats.totalCompletionTokens += call.usage.output_tokens || 0;
            }

            if (call.duration && typeof call.duration === 'number') {
                stats.totalDuration += call.duration;
            }

            stats.callsByPrompt[call.promptIdentifier] = (stats.callsByPrompt[call.promptIdentifier] || 0) + 1;
            
            const callDate = new Date(call.timestamp).toDateString();
            stats.callsByDate[callDate] = (stats.callsByDate[callDate] || 0) + 1;
            
            if (call.provider) {
                stats.callsByProvider[call.provider] = (stats.callsByProvider[call.provider] || 0) + 1;
            }
            
            if (call.model) {
                stats.callsByModel[call.model] = (stats.callsByModel[call.model] || 0) + 1;
            }
        });

        // Calculate average duration
        if (stats.totalCalls > 0) {
            stats.avgDuration = stats.totalDuration / stats.totalCalls;
        }

        return stats;
    }

    async getUsageStatisticsBySession(sessionId) {
        const sessionCalls = await this.getCallsBySession(sessionId);
        const stats = {
            totalCalls: sessionCalls.length,
            totalTokensUsed: 0,
            totalPromptTokens: 0,
            totalCompletionTokens: 0,
            totalDuration: 0,
            avgDuration: 0,
            callsByPrompt: {},
            callsByProvider: {},
            callsByModel: {},
            sessionId: sessionId
        };

        sessionCalls.forEach(call => {
            if (call.usage) {
                stats.totalTokensUsed += call.usage.total_tokens || 0;
                stats.totalPromptTokens += call.usage.input_tokens || 0;
                stats.totalCompletionTokens += call.usage.output_tokens || 0;
            }

            if (call.duration && typeof call.duration === 'number') {
                stats.totalDuration += call.duration;
            }

            stats.callsByPrompt[call.promptIdentifier] = (stats.callsByPrompt[call.promptIdentifier] || 0) + 1;
            
            if (call.provider) {
                stats.callsByProvider[call.provider] = (stats.callsByProvider[call.provider] || 0) + 1;
            }
            
            if (call.model) {
                stats.callsByModel[call.model] = (stats.callsByModel[call.model] || 0) + 1;
            }
        });

        // Calculate average duration
        if (stats.totalCalls > 0) {
            stats.avgDuration = stats.totalDuration / stats.totalCalls;
        }

        return stats;
    }

    async clearHistory() {
        try {
            if (this.db) {
                const transaction = this.db.transaction([this.storeName], 'readwrite');
                const store = transaction.objectStore(this.storeName);
                await store.clear();
                await transaction.complete;
            } else {
                localStorage.removeItem(this.storageKey);
            }
            console.log('LLM call history cleared');
            return true;
        } catch (error) {
            console.error('Error clearing LLM call history:', error);
            return false;
        }
    }

    async clearOldCalls(daysToKeep = 30) {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
            
            const allCalls = await this.getAllCalls();
            const callsToDelete = allCalls.filter(call => {
                const callDate = new Date(call.timestamp);
                return callDate < cutoffDate;
            });
            
            if (this.db) {
                const transaction = this.db.transaction([this.storeName], 'readwrite');
                const store = transaction.objectStore(this.storeName);
                
                for (const call of callsToDelete) {
                    await store.delete(call.id);
                }
                
                await transaction.complete;
            } else {
                const filteredCalls = allCalls.filter(call => {
                    const callDate = new Date(call.timestamp);
                    return callDate >= cutoffDate;
                });
                localStorage.setItem(this.storageKey, JSON.stringify(filteredCalls));
            }
            
            console.log(`Cleared ${callsToDelete.length} LLM calls older than ${daysToKeep} days`);
            return callsToDelete.length;
        } catch (error) {
            console.error('Error clearing old LLM calls:', error);
            return 0;
        }
    }

    async exportHistory() {
        const allCalls = await this.getAllCalls();
        const exportData = {
            exportDate: new Date().toISOString(),
            totalCalls: allCalls.length,
            calls: allCalls
        };
        
        return JSON.stringify(exportData, null, 2);
    }

    // New methods for feedback history management
    async getFeedbackByFile(filePath, limit = 50, offset = 0) {
        try {
            if (this.db) {
                const transaction = this.db.transaction([this.storeName], 'readonly');
                const store = transaction.objectStore(this.storeName);
                const index = store.index('filePath');
                const request = index.getAll(filePath);
                
                return new Promise((resolve, reject) => {
                    request.onsuccess = () => {
                        const results = request.result
                            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                            .slice(offset, offset + limit);
                        resolve(results);
                    };
                    request.onerror = () => reject(request.error);
                });
            } else {
                const allCalls = await this.getAllCalls();
                return allCalls
                    .filter(call => call.filePath === filePath)
                    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                    .slice(offset, offset + limit);
            }
        } catch (error) {
            console.error('Error retrieving feedback by file:', error);
            return [];
        }
    }

    async getRecentFeedback(limit = 20) {
        try {
            const allCalls = await this.getAllCalls();
            return allCalls
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                .slice(0, limit);
        } catch (error) {
            console.error('Error retrieving recent feedback:', error);
            return [];
        }
    }

    async searchFeedback(searchTerm, limit = 50) {
        try {
            if (!searchTerm || searchTerm.trim() === '') return [];
            
            const allCalls = await this.getAllCalls();
            const searchLower = searchTerm.toLowerCase();
            
            return allCalls
                .filter(call => {
                    return (call.feedbackContent && call.feedbackContent.toLowerCase().includes(searchLower)) ||
                           (call.promptIdentifier && call.promptIdentifier.toLowerCase().includes(searchLower)) ||
                           (call.filePath && call.filePath.toLowerCase().includes(searchLower));
                })
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                .slice(0, limit);
        } catch (error) {
            console.error('Error searching feedback:', error);
            return [];
        }
    }

    async getFileHistory(filePath) {
        try {
            const calls = await this.getFeedbackByFile(filePath);
            return calls.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        } catch (error) {
            console.error('Error retrieving file history:', error);
            return [];
        }
    }

    async getFilesWithFeedback() {
        try {
            const allCalls = await this.getAllCalls();
            const files = new Set();
            
            allCalls.forEach(call => {
                if (call.filePath) {
                    files.add(call.filePath);
                }
            });
            
            return Array.from(files).sort();
        } catch (error) {
            console.error('Error retrieving files with feedback:', error);
            return [];
        }
    }

    async getFeedbackStats() {
        try {
            const allCalls = await this.getAllCalls();
            const stats = {
                totalFeedback: allCalls.length,
                filesWithFeedback: 0,
                promptsUsed: new Set(),
                providersUsed: new Set(),
                dateRange: { earliest: null, latest: null }
            };

            const files = new Set();
            const dates = [];

            allCalls.forEach(call => {
                if (call.filePath) files.add(call.filePath);
                if (call.promptIdentifier) stats.promptsUsed.add(call.promptIdentifier);
                if (call.provider) stats.providersUsed.add(call.provider);
                if (call.timestamp) dates.push(new Date(call.timestamp));
            });

            stats.filesWithFeedback = files.size;
            stats.promptsUsed = Array.from(stats.promptsUsed);
            stats.providersUsed = Array.from(stats.providersUsed);

            if (dates.length > 0) {
                dates.sort((a, b) => a - b);
                stats.dateRange.earliest = dates[0].toISOString();
                stats.dateRange.latest = dates[dates.length - 1].toISOString();
            }

            return stats;
        } catch (error) {
            console.error('Error retrieving feedback stats:', error);
            return {
                totalFeedback: 0,
                filesWithFeedback: 0,
                promptsUsed: [],
                providersUsed: [],
                dateRange: { earliest: null, latest: null }
            };
        }
    }

    generateId() {
        return Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 9);
    }
}