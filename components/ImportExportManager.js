class ImportExportManager {
    constructor() {
        this.exportVersion = '1.0';
        this.supportedCloudProviders = ['local', 'googledrive', 'dropbox', 'onedrive'];
        this.isInitialized = false;
        this.cloudIntegration = null;
    }

    async initialize() {
        if (this.isInitialized) return;
        
        // Wait for aiService to be available
        let attempts = 0;
        while (!window.app?.aiService?.llmCallStorage && attempts < 50) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        this.isInitialized = true;
        
        if (window.app?.aiService?.llmCallStorage) {
            await window.app.aiService.llmCallStorage.waitForInitialization();
        }
    }

    async exportAllData() {
        const exportData = {
            version: this.exportVersion,
            exportedAt: new Date().toISOString(),
            appName: 'AI Text Editor',
            data: {
                localStorage: await this.exportLocalStorageData(),
                indexedDB: await this.exportIndexedDBData()
            }
        };

        return exportData;
    }

    async exportLocalStorageData() {
        const localStorageData = {};
        
        const storageKeys = [
            'aiTextEditor_settings',
            'ai_editor_prompts', 
            'ai_editor_prompt_groups'
        ];

        for (const key of storageKeys) {
            const value = localStorage.getItem(key);
            if (value) {
                try {
                    localStorageData[key] = JSON.parse(value);
                } catch (error) {
                    console.warn(`Failed to parse localStorage item ${key}:`, error);
                    localStorageData[key] = value;
                }
            }
        }

        return localStorageData;
    }

    async exportIndexedDBData() {
        const indexedDBData = {};

        try {
            if (window.app?.aiService?.llmCallStorage) {
                const llmCallStorage = window.app.aiService.llmCallStorage;
                await llmCallStorage.waitForInitialization();
                
                const allCalls = await llmCallStorage.getAllCalls();
                indexedDBData.llm_calls = allCalls;
            }
        } catch (error) {
            console.warn('Failed to export IndexedDB data:', error);
            indexedDBData.llm_calls = [];
        }

        return indexedDBData;
    }

    async importAllData(importData, options = {}) {
        const { 
            overwrite = false, 
            selective = null,
            skipValidation = false 
        } = options;

        if (!skipValidation && !this.validateImportData(importData)) {
            throw new Error('Invalid import data format');
        }

        const results = {
            localStorage: { success: false, imported: 0, errors: [] },
            indexedDB: { success: false, imported: 0, errors: [] }
        };

        if (!selective || selective.includes('localStorage')) {
            try {
                results.localStorage = await this.importLocalStorageData(
                    importData.data.localStorage, 
                    { overwrite }
                );
            } catch (error) {
                results.localStorage.errors.push(error.message);
            }
        }

        if (!selective || selective.includes('indexedDB')) {
            try {
                results.indexedDB = await this.importIndexedDBData(
                    importData.data.indexedDB, 
                    { overwrite }
                );
            } catch (error) {
                results.indexedDB.errors.push(error.message);
            }
        }

        return results;
    }

    async importLocalStorageData(localStorageData, options = {}) {
        const { overwrite = false } = options;
        const results = { success: true, imported: 0, errors: [] };

        for (const [key, value] of Object.entries(localStorageData || {})) {
            try {
                const existingValue = localStorage.getItem(key);
                
                if (existingValue && !overwrite) {
                    if (key === 'ai_editor_prompts' || key === 'ai_editor_prompt_groups') {
                        await this.mergePromptData(key, value);
                        results.imported++;
                    } else {
                        results.errors.push(`Skipped ${key}: already exists (use overwrite option)`);
                    }
                } else {
                    localStorage.setItem(key, JSON.stringify(value));
                    results.imported++;
                }
            } catch (error) {
                results.errors.push(`Failed to import ${key}: ${error.message}`);
                results.success = false;
            }
        }

        if (results.imported > 0) {
            this.notifyManagers();
        }

        return results;
    }

    async importIndexedDBData(indexedDBData, options = {}) {
        const { overwrite = false } = options;
        const results = { success: true, imported: 0, errors: [] };

        try {
            if (indexedDBData.llm_calls && window.app?.aiService?.llmCallStorage) {
                const llmCallStorage = window.app.aiService.llmCallStorage;
                await llmCallStorage.waitForInitialization();

                if (overwrite) {
                    await llmCallStorage.clearHistory();
                }

                if (llmCallStorage.db) {
                    const transaction = llmCallStorage.db.transaction([llmCallStorage.storeName], 'readwrite');
                    const store = transaction.objectStore(llmCallStorage.storeName);
                    
                    for (const call of indexedDBData.llm_calls) {
                        try {
                            await store.add(call);
                            results.imported++;
                        } catch (error) {
                            results.errors.push(`Failed to import LLM call ${call.id}: ${error.message}`);
                        }
                    }
                    
                    await transaction.complete;
                } else {
                    // Fallback to localStorage mode
                    for (const call of indexedDBData.llm_calls) {
                        try {
                            const existingData = await llmCallStorage.getAllCalls();
                            existingData.push(call);
                            localStorage.setItem(llmCallStorage.storageKey, JSON.stringify(existingData));
                            results.imported++;
                        } catch (error) {
                            results.errors.push(`Failed to import LLM call ${call.id}: ${error.message}`);
                        }
                    }
                }
            }
        } catch (error) {
            results.success = false;
            results.errors.push(`IndexedDB import failed: ${error.message}`);
        }

        return results;
    }

    async mergePromptData(key, newData) {
        const existingData = localStorage.getItem(key);
        let existing = existingData ? JSON.parse(existingData) : [];
        
        if (key === 'ai_editor_prompts') {
            const existingNames = new Set(existing.map(p => p.name));
            const newPrompts = Array.isArray(newData) ? newData : [];
            
            const uniqueNewPrompts = newPrompts.filter(p => 
                !existingNames.has(p.name)
            ).map(p => ({
                ...p,
                id: Date.now().toString() + Math.random().toString(36).substr(2)
            }));
            
            existing.push(...uniqueNewPrompts);
        } else if (key === 'ai_editor_prompt_groups') {
            const existingNames = new Set(existing.map(g => g.name));
            const newGroups = Array.isArray(newData) ? newData : [];
            
            const uniqueNewGroups = newGroups.filter(g => 
                !existingNames.has(g.name)
            ).map(g => ({
                ...g,
                id: Date.now().toString() + Math.random().toString(36).substr(2),
                isActive: false
            }));
            
            existing.push(...uniqueNewGroups);
        }

        localStorage.setItem(key, JSON.stringify(existing));
    }

    validateImportData(data) {
        if (!data || typeof data !== 'object') return false;
        if (!data.version || !data.data) return false;
        if (typeof data.data !== 'object') return false;
        
        return true;
    }

    async downloadBackup(filename = null) {
        try {
            const exportData = await this.exportAllData();
            const dataStr = JSON.stringify(exportData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            
            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename || `ai-text-editor-backup-${this.formatDateForFilename(new Date())}.json`;
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            return { success: true, filename: link.download };
        } catch (error) {
            console.error('Download backup failed:', error);
            return { success: false, error: error.message };
        }
    }

    async uploadBackupFromFile(file, options = {}) {
        return new Promise((resolve, reject) => {
            if (!file) {
                reject(new Error('No file provided'));
                return;
            }

            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const importData = JSON.parse(e.target.result);
                    const results = await this.importAllData(importData, options);
                    resolve(results);
                } catch (error) {
                    reject(new Error(`Failed to parse backup file: ${error.message}`));
                }
            };
            
            reader.onerror = () => {
                reject(new Error('Failed to read file'));
            };
            
            reader.readAsText(file);
        });
    }

    async initializeCloudIntegration() {
        if (this.cloudIntegration) return this.cloudIntegration;

        this.cloudIntegration = {
            googledrive: {
                available: false,
                initialized: false,
                clientId: null,
                apiKey: null
            },
            dropbox: {
                available: false,
                initialized: false,
                appKey: null
            },
            onedrive: {
                available: false,
                initialized: false,
                clientId: null
            }
        };

        return this.cloudIntegration;
    }

    async uploadToCloud(provider, filename = null) {
        await this.initializeCloudIntegration();
        
        if (!this.cloudIntegration[provider]?.available) {
            throw new Error(`Cloud provider ${provider} is not available or configured`);
        }

        throw new Error(`Cloud upload for ${provider} not yet implemented`);
    }

    async downloadFromCloud(provider, filename) {
        await this.initializeCloudIntegration();
        
        if (!this.cloudIntegration[provider]?.available) {
            throw new Error(`Cloud provider ${provider} is not available or configured`);
        }

        throw new Error(`Cloud download for ${provider} not yet implemented`);
    }

    formatDateForFilename(date) {
        return date.toISOString()
            .replace(/[:.]/g, '-')
            .replace(/T/, '_')
            .substring(0, 19);
    }

    async resetAllData() {
        const results = {
            localStorage: { success: false, cleared: 0, errors: [] },
            indexedDB: { success: false, cleared: 0, errors: [] }
        };

        // Clear localStorage data
        try {
            const storageKeys = [
                'aiTextEditor_settings',
                'ai_editor_prompts', 
                'ai_editor_prompt_groups'
            ];

            for (const key of storageKeys) {
                if (localStorage.getItem(key)) {
                    localStorage.removeItem(key);
                    results.localStorage.cleared++;
                }
            }
            results.localStorage.success = true;
        } catch (error) {
            results.localStorage.errors.push(`Failed to clear localStorage: ${error.message}`);
        }

        // Clear IndexedDB data
        try {
            if (window.app?.aiService?.llmCallStorage) {
                const llmCallStorage = window.app.aiService.llmCallStorage;
                await llmCallStorage.waitForInitialization();
                
                const callsBefore = await llmCallStorage.getAllCalls();
                const clearedSuccessfully = await llmCallStorage.clearHistory();
                
                if (clearedSuccessfully) {
                    results.indexedDB.cleared = callsBefore.length;
                    results.indexedDB.success = true;
                } else {
                    results.indexedDB.errors.push('Failed to clear IndexedDB history');
                }
            } else {
                results.indexedDB.errors.push('LLMCallStorage not available');
            }
        } catch (error) {
            results.indexedDB.errors.push(`Failed to clear IndexedDB: ${error.message}`);
        }

        // Notify managers to refresh their state
        this.notifyManagers();
        
        // Dispatch reset event
        window.dispatchEvent(new CustomEvent('dataReset', {
            detail: { 
                timestamp: Date.now(),
                results: results
            }
        }));

        return results;
    }

    notifyManagers() {
        if (window.app?.settingsManager) {
            window.app.settingsManager.settings = window.app.settingsManager.loadSettings();
            window.app.settingsManager.notifyChange('reset', true);
        }

        if (window.app?.promptsManager) {
            window.app.promptsManager.prompts = window.app.promptsManager.loadPrompts();
            window.app.promptsManager.groups = window.app.promptsManager.loadGroups();
            window.app.promptsManager.ensureDefaultGroup();
        }

        window.dispatchEvent(new CustomEvent('dataImported', {
            detail: { timestamp: Date.now() }
        }));
    }

    getExportSummary(exportData) {
        const summary = {
            version: exportData.version,
            exportedAt: exportData.exportedAt,
            localStorage: {},
            indexedDB: {}
        };

        if (exportData.data?.localStorage) {
            const ls = exportData.data.localStorage;
            summary.localStorage = {
                settings: ls.aiTextEditor_settings ? 'included' : 'missing',
                prompts: ls.ai_editor_prompts ? `${ls.ai_editor_prompts.length} items` : 'missing',
                promptGroups: ls.ai_editor_prompt_groups ? `${ls.ai_editor_prompt_groups.length} items` : 'missing'
            };
        }

        if (exportData.data?.indexedDB) {
            const idb = exportData.data.indexedDB;
            summary.indexedDB = {
                llmCalls: idb.llm_calls ? `${idb.llm_calls.length} items` : 'missing'
            };
        }

        return summary;
    }

    async getStorageStats() {
        try {
            const exportData = await this.exportAllData();
            const dataStr = JSON.stringify(exportData);
            const sizeInBytes = new Blob([dataStr]).size;
            const sizeInMB = (sizeInBytes / (1024 * 1024)).toFixed(2);

            const summary = this.getExportSummary(exportData);
            
            return {
                totalSizeBytes: sizeInBytes,
                totalSizeMB: parseFloat(sizeInMB),
                summary,
                breakdown: {
                    settings: summary.localStorage.settings !== 'missing',
                    prompts: summary.localStorage.prompts !== 'missing' ? summary.localStorage.prompts : '0 items',
                    promptGroups: summary.localStorage.promptGroups !== 'missing' ? summary.localStorage.promptGroups : '0 items',
                    llmHistory: summary.indexedDB.llmCalls !== 'missing' ? summary.indexedDB.llmCalls : '0 items'
                }
            };
        } catch (error) {
            console.error('Failed to get storage stats:', error);
            return {
                totalSizeBytes: 0,
                totalSizeMB: 0,
                error: error.message
            };
        }
    }
}